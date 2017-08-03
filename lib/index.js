'use strict';

const Shopify = require('shopify-api-node');
const crypto = require('crypto');
const json2csv = require('json2csv');
const json2rss = require('./json2rss');
const constants = require('./constants');
const utils = require('./shopify_utils.js');
const _ = require('underscore');
const cloudinary = require('cloudinary');


/**
 *
 * Remove all character/string references from a word
 *
 * @param {String} word - Source word
 * @param {String[]} search - Character(s) to be removed
 * @returns {String}
 */
function removeAll(word, search) {
  return search.reduce((currentWord, searchSequence) => currentWord.replace(new RegExp(searchSequence, 'g'), ''), word);
}


/**
 *
 * Get unique image name from image url
 *
 * @param {String} imageUrl - Image's URL
 * @returns {String}
 */
function getPublicIdFromImageUrl(imageUrl) {
  const lastSlashPosition = imageUrl.lastIndexOf('/');
  const unsafeUniqueName = imageUrl.substring(lastSlashPosition + 1, imageUrl.length);
  const safeUniqueName = removeAll(unsafeUniqueName, ['\\.', '\\?', '\\=', 'v']);

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
    const publicId = getPublicIdFromImageUrl(imageURL);
    const imageExists = options.uploadedImages.includes(publicId);
    if (!imageExists && options.optimize) { // TODO: Add Check for threshhold
      cloudinary.config({
        cloud_name: options.cloudinary.cloudName,
        api_key: options.cloudinary.apiKey,
        api_secret: options.cloudinary.apiSecret,
      });
      cloudinary.uploader.upload(imageURL, (result) => {
        result && resolve({
          publicId,
          imageURL: `https://res.cloudinary.com/${options.cloudinary.cloudName}/image/upload/${result.publicId}`,
        });
        !result && reject(new Error('Something went wrong with upload.'));
      }, {
        publicId,
        width: 1080,
        height: 1080,
        crop: 'scale',
      });
    } else if (imageExists) {
      resolve({
        publicId: null,
        imageURL: `https://res.cloudinary.com/${options.cloudinary.cloudName}/image/upload/${publicId}`,
      });
    } else {
      resolve({
        publicId: null,
        imageURL,
      });
    }
  });
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
    accessToken,
  });

  return shopify
    .product
    .list({
      fields: 'id,title,variants,images,options,handle,body_html,product_type',
    })
    .then(products => products)
    .catch((error) => {
      console.log(error);
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

  // const x = products.map(({ id, body_html, product_type, images, variants }) => ({
  //   id,
  //   body_html,
  //   product_type,
  //   images,
  //   variants,
  // }));

  // console.log(x);

  let parsedProducts = products.filter(product => !!(
      product.id &&
      product.body_html &&
      (product.images && product.images.length) &&
      (product.variants && product.variants.length) &&
      (product.variants[0].barcode || product.variants[0].sku) &&
      Number(product.variants[0].inventory_quantity) &&
      product.variants[0].title &&
      product.variants[0].price
    ));

  parsedProducts = parsedProducts.map(product => doCheckAndUpload(product.images[0].src, options)
      .then(({
        publicId,
        imageURL,
      }) => {
        publicId && savedImages.push(publicId);
        const variant = product.variants[0];
        const obj = {
          id: product.id,
          availability: 'in stock', // availability is always 'in stock' as only stocked products are filtered
          condition: 'new',
          description: product.body_html,
          image_url: imageURL,
          image_link: imageURL,
          url: `https://${utils.shopNameToDomain(options.shop)}/products/${product.handle}`,
          link: `https://${utils.shopNameToDomain(options.shop)}/products/${product.handle}`,
          mpn: variant.sku,
          gtin: variant.barcode,
          currency: options.currency,
          category: product.product_type || product.title,
          price: `${variant.price} ${options.currency}`,
          name: product.title,
          brand: product.product_type,
        };
        return utils.compactObject(obj);
      }));

  return Promise.all(parsedProducts)
    .then(resolvedProducts => ({
      resolvedProducts,
      savedImages,
    }));
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
    savedImages,
  }) => {
    if (!resolvedProducts.length) return;

    const shopName = utils.shopDomainToName(options.shop);
    const feedUrl = `${shopName}/a/product_catalog`;
    const feed = json2rss({
      title: shopName,
      description: `Product Feed for ${shopName}`,
      link: feedUrl,
      data: resolvedProducts,
    });

    return { // eslint-disable-line
      rss: feed,
      savedImages,
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
    savedImages,
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

    return { // eslint-disable-line
      csv,
      savedImages,
    };
  });
}


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
 * @param {String[]} options.uploadedImages - public IDs of images already uploaded to Cloudinary
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
      !options.sharedSecret
    ) {
      throw new Error('Missing or invalid options');
    }
    // check for optimize, setting default to false to be overriden by options.optimize if available
    this.options = Object.assign({}, {
      optimize: false,
      uploadedImages: [],
    }, options);
  }


  /**
   *
   * Signature verification to sure request is from Shopify
   *
   * @param {Object} query - Url query params
   * @param {String} query.signature - Verifies that the request is from Shopify
   * @param {String} query.shop - The name of the shop
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
ShopifyFeed.isValidSignature = (query, sharedSecret) => {
  const signature = query.signature || '';

  if (!signature) return false;

  delete query.signature; // eslint-disable-line
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
};

export default ShopifyFeed;
