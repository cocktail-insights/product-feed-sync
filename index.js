'use strict'

const Shopify = require('shopify-api-node');
const crypto = require('crypto');
const json2csv = require('json2csv');
const rss = require('rss');
const json2rss = require('./json2rss');
const constants = require('./constants');
const utils = require('./shopify_utils.js');
const _ = require('underscore');
const cloudinary = require('cloudinary');


/**
 *
 * Create ProductRSSRoute instance
 *
 * @param {Object} options - Configuration options
 * @param {String} options.shop - The .myshopify.com domain of the shop
 * @param {String} options.accessToken - Access token for making api calls to shop
 * @param {String} options.sharedSecret - Secret token for Public shopify app
 * @param {String} options.cloudinary.cloudName - Cloud name from Cloudinary
 * @param {String} options.cloudinary.apiKey - API Key from Cloudinary
 * @param {String} options.cloudinary.apiSecret - API Secret from Cloudinary
 * @param {String[]} options.uploadedImages - Array of public IDs of images already uploaded to Cloudinary
 * @param {Boolean} options.optimize - Optimize Images
 * @constructor
 * @public
 */
class ShopifyFeed {
  constructor(options) {
    if (!options ||
      !options.shop ||
      !options.currency ||
      !options.accessToken ||
      !options.sharedSecret ||
      !options.cloudinary.cloudName ||
      !options.cloudinary.apiKey ||
      !options.cloudinary.apiSecret ||
      !options.uploadedImages
    ) {
      throw new Error('Missing or invalid options');
    }
    // check for optimize, a boolean, breaks if. Setting default to false, to be overriden by options.optimize if available
    this.options = Object.assign({}, {
      optimize: false
    }, options);
  }


  /**
   *
   * Signature verification to sure request is from Shopify
   *
   * @param {Object} query - Url query params
   * @param {String} query.signature - Verifies that the request is from Shopify
   * @param {String} query.shop - The name of the shop E.g. example is the name *                  of the shop if example.myshopify.com is the domain
   * @param {String} query.path_prefix - The proxy sub-path prefix at which the
   *                  shop was accessed
   * @param {String} query.timestamp - The time in seconds since midnight of
   *                  January 1, 1970 UTC
   * @param {String} sharedSecret - The shared secret from your app credentials
   * @returns {Boolean}
   */
  isValidSignature(query) {
    return ShopifyFeed.isValidSignature(query, this.options.sharedSecret);
  }


  /**
   *
   * Generate update-to-date product listings from shop
   */
  toRSS() {
    const productsPromise = retrieveAllProducts(this.options);
    return productsPromise.then(generateRSS.bind(null, this.options));
  }

  toCSV() {
    const productsPromise = retrieveAllProducts(this.options);
    return productsPromise.then(generateCSV.bind(null, this.options));
  }
}


/**
 *
 * Signature verification to sure request is from Shopify
 *
 * @param {Object} query - Url query params
 * @param {String} query.signature - Verifies that the request is from Shopify
 * @param {String} query.shop - The name of the shop E.g. example is the name
 *                  of the shop if example.myshopify.com is the domain
 * @param {String} query.path_prefix - The proxy sub-path prefix at which the
 *                  shop was accessed
 * @param {String} query.timestamp - The time in seconds since midnight of
 *                  January 1, 1970 UTC
 * @param {String} sharedSecret - The shared secret from your app credentials
 * @returns {Boolean}
 */
ShopifyFeed.isValidSignature = function (query, sharedSecret) {
  const signature = query.signature || '';

  if (!signature) return false;

  delete query.signature;
  const input = utils.objectToString(query);
  const hash =
    crypto
    .createHmac('sha256', sharedSecret)
    .update(input)
    .digest('hex');

  if (hash !== signature) {
    return false;
  }

  return true;
}

/**
 *
 * Remove all character/string references from a word
 *
 * @param {String} word - Source word
 * @param {String[]} search - Character(s) to be removed
 * @returns {String}
 */
function removeAll(word, ...search) {
  return search.reduce((currentWord, searchSequence) => {
    return currentWord.replace(new RegExp(searchSequence, 'g'), '');
  }, word)
}


/**
 *
 * Get unique image name from image url
 *
 * @param {String} imageUrl - Image's URL
 * @returns {String}
 */
function getPublicIdFromImageUrl(imageUrl) {
  let lastSlashPosition = imageUrl.lastIndexOf('/');
  let unsafeUniqueName = imageUrl.substring(lastSlashPosition + 1, imageUrl.length);
  let safeUniqueName = removeAll(unsafeUniqueName, '\\.', '\\?', '\\=', 'v');

  return safeUniqueName;
}


/**
 *
 * Checks if image has already been uploaded to Cloudinary and uploads if not.
 *
 * @param {String} imageUrl - Image's URL
 * @param {String} options.cloudinary.cloudName - The cloudinary subdomain domain name
 * @param {String} options.cloudinary.apiKey - The cloudinary API key
 * @param {String} options.cloudinary.apiSecret - The cloudinary API secret
 * @param {String[]} options.uploadedImages - Public ID array of already uploaded images
 * @param {Boolean} options.optimize - Optimize images using cloudinary or not
 * @returns {Promise}
 */
function doCheckAndUpload(imageURL, options) {
  return new Promise((resolve, reject) => {
    let public_id = getPublicIdFromImageUrl(imageURL);
    let imageExists = options.uploadedImages.includes(public_id);
    if (!imageExists && options.optimize) { // TODO: Add Check for threshhold
      cloudinary.config({
        cloud_name: options.cloudinary.cloudName,
        api_key: options.cloudinary.apiKey,
        api_secret: options.cloudinary.apiSecret
      });
      cloudinary.uploader.upload(imageURL, (result) => {
        result && resolve({
          public_id,
          imageURL: `https://res.cloudinary.com/${options.cloudinary.cloudName}/image/upload/${result.public_id}`
        });
        !result && reject(new Error('Something went wrong with upload.'));
      }, {
        public_id,
        width: 1080,
        height: 1080,
        crop: 'scale'
      });
    } else if (imageExists) {
      resolve({
        public_id: null,
        imageURL: `https://res.cloudinary.com/${options.cloudinary.cloudName}/image/upload/${public_id}`
      });
    } else {
      resolve({
        public_id: null,
        imageURL
      });
    }
  });
}

/**
 *
 * Check if image has already been uploaded to Cloudinary
 *
 * @param {String} publicId - Image's URL
 * @returns {Boolean}
 */
function getCloudinaryImageLink(publicId) {
  // find public_id in Atachments collection
  return 'ImageURL';
}

/**
 *
 * Retrieve all products from Shopify
 *
 * @function retrieveAllProducts
 *
 * @param {Object} options - Shop credentials
 * @param {String} options.shop - The name of the shop
 * @param {String} options.accessToken - The access token required for making api calls
 *                                to the shop
 * @returns [Promise]
 */
function retrieveAllProducts(options) {
  // make sure shop always has name only and not domain
  const shopName = utils.shopDomainToName(options.shop);
  const accessToken = options.accessToken;

  const shopify = new Shopify({
    shopName,
    accessToken
  });

  return shopify
    .product
    .list({
      fields: 'id,title,variants,images,options,handle,body_html,product_type'
    })
    .then(products => products)
    .catch(error => {
      console.log(error);
    });
}

/**
 * Generate facebook optimized RSS
 *
 * @function generateRSS
 *
 * @param [Object] products - An array of all the products along with their variants
 * @param {String} shop - The name of domain of the shop
 * @returns {Promise}
 */
function generateRSS(options, products) {
  const formattedProductsPromise = parseProducts(products, options);

  return formattedProductsPromise.then(({
    resolvedProducts,
    savedImages
  }) => {
    if (!resolvedProducts.length) return;

    const shopName = utils.shopDomainToName(options.shop);
    const feedUrl = `${shopName}/a/product_catalog`
    const feed = json2rss({
      title: shopName,
      description: `Product Feed for ${shopName}`,
      link: feedUrl,
      data: resolvedProducts
    });

    return {
      rss: feed,
      savedImages
    };
  });
}

/**
 * Generate facebook optimized CSV
 *
 * @function generateCSV
 *
 * @param {Object} options - The shop object
 * @param [Object] products - An array of all the products along with their variants
 * @returns {Promise}
 */
function generateCSV(options, products) {
  const parsedProductsPromise = parseProducts(products, options);
  return parsedProductsPromise.then(({
    resolvedProducts,
    savedImages
  }) => {
    if (!resolvedProducts.length) return;

    const csvFieldsAsArray = constants.csvFields.split(',');
    const csvFieldsAsObject = utils.arrayToObject(csvFieldsAsArray);

    const formattedProducts = resolvedProducts.map((product) => {
      const copy = Object.assign({}, csvFieldsAsObject);
      const newProductObject = _.defaults(copy, product);
      return newProductObject;
    });

    const csvFields = Object.keys(csvFieldsAsObject);

    const csv = json2csv({
      data: formattedProducts,
      fields: csvFields,
    });

    return {
      csv,
      savedImages
    };
  });
}

/**
 * Map products array to key value pairs matching facebook's product feed
 * required fields.
 * See https://developers.facebook.com/docs/marketing-api/dynamic-product-ads/product-catalog#required-fields
 *
 * @function parseProducts
 *
 * @param [Object] products - List of all products
 * @param {String} options.shop - Shopify domain url
 * @param {String} options.currency - The default currency used by shop
 * @param {String} options.cloudinary.cloudName - The cloudinary subdomain domain name
 * @param {String} options.cloudinary.apiKey - The cloudinary API key
 * @param {String} options.cloudinary.apiSecret - The cloudinary API secret
 * @returns {Promise}
 */
function parseProducts(products, options) {
  const savedImages = [];

  let parsedProducts = products.filter((product) => {
    return !!(
      product.id &&
      product.body_html &&
      product.product_type &&
      (product.images && product.images.length) &&
      (product.variants && product.variants.length) &&
      (product.variants[0].barcode || product.variants[0].sku) &&
      Number(product.variants[0].inventory_quantity) &&
      product.variants[0].title &&
      product.variants[0].price
    );
  });

  parsedProducts = parsedProducts.map((product) => {
    return doCheckAndUpload(product.images[0].src, options)
      .then(({
        public_id,
        imageURL
      }) => {
        public_id && savedImages.push(public_id);
        const variant = product.variants[0];
        const obj = {
          id: product.id,
          availability: 'in stock', // availability is always 'in stock' as only stocked products are filtered
          condition: 'new',
          description: product.body_html,
          image_link: imageURL,
          link: `https:\/\/${utils.shopNameToDomain(options.shop)}\/products/${product.handle}`,
          mpn: variant.sku,
          gtin: variant.barcode,
          price: `${variant.price} ${options.currency}`,
          title: product.title,
          brand: product.product_type
        };
        return utils.compactObject(obj);
      });
  });

  return Promise.all(parsedProducts)
    .then(resolvedProducts => {
      return {
        resolvedProducts,
        savedImages
      };
    });
}

module.exports = exports.ShopifyRSSRoute = ShopifyFeed;