const ShopifyFeed = require('../dist/index');
const should = require('should');
const crypto = require('crypto');

describe('ShopifyFeed', function () {
  var options = {};
  beforeEach('create options object', function () {
    options = {
      shop: 'demostore.myshopify.com',
      accessToken: 'weoi2048104nx0djdioDijIDoIJ',
      sharedSecret: 'weoidcndisos',
      currency: 'USD',
      cloudinary: {
        cloudName: 'foobar-cloudname',
        apiKey: '3142',
        apiSecret: 'supersecretkey',
      },
      uploadedImages: ['foo', 'bar'],
      optimize: false,
    };
  });

  describe('#constructor', function () {

    it('should return instance of ShopifyFeed when called', function () {
      const rss = new ShopifyFeed(options);
      rss.should.be.an.instanceof(ShopifyFeed);
    });

    it('should throw an error if options parameter does not exist', function () {
      (function () {
        const rss = new ShopifyFeed();
      }).should.throw();
    });

    it('should throw an error if shop is not a field in the parameter object', function () {

      delete options.shop;
      (function () {
        const rss = new ShopifyFeed(options);
      }).should.throw();
    });

    it('show throw an error if currency is not a field in the parameter object', function () {
      delete options.currency;
      (function () {
        const rss = new ShopifyFeed(options);
      }).should.throw();
    });

    it('show throw an error if accessToken is not a field in the parameter object', function () {
      delete options.accessToken;
      (function () {
        const rss = new ShopifyFeed(options);
      }).should.throw();
    });

    it('show throw an error if sharedSecret is not a field in the parameter object', function () {
      delete options.sharedSecret;
      (function () {
        const rss = new ShopifyFeed(options);
      }).should.throw();
    });

    it('show throw an error if cloudinary.cloudName is not a field in the parameter object', function () {
      delete options.cloudinary.cloudName;
      (function () {
        const rss = new ShopifyFeed(options);
      }).should.throw();
    });

    it('show throw an error if cloudinary.apiKey is not a field in the parameter object', function () {
      delete options.cloudinary.apiKey;
      (function () {
        const rss = new ShopifyFeed(options);
      }).should.throw();
    });

    it('show throw an error if cloudinary.apiSecret is not a field in the parameter object', function () {
      delete options.cloudinary.apiSecret;
      (function () {
        const rss = new ShopifyFeed(options);
      }).should.throw();
    });
  });

  describe('#isValidSignature', function () {
    var query = {};
    var sharedSecret = '';

    beforeEach(function () {
      query.timestamp = Date.UTC(2016, 10, 06);
      query.path_prefix = '/a/product_catalog';
      query.shop = 'demostore.myshopify.com';
      var input = `path_prefix=${query.path_prefix}shop=${query.shop}timestamp=${query.timestamp}`;
      sharedSecret = 'sharedSecret';
      var signature = crypto
        .createHmac('sha256', sharedSecret)
        .update(input)
        .digest('hex');

      query.signature = signature;
    });

    it('should return true if signature is from shopify', function () {
      ShopifyFeed.isValidSignature(query, sharedSecret).should.be.true();
    });

    it('should return false if signature does not match that from shopify', function () {
      query.signature = 'notfromshopify';
      const rss = new ShopifyFeed(options);
      rss.isValidSignature(query, sharedSecret).should.be.false();
    });
  });
});
