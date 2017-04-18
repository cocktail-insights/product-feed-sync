const ShopifyFeed = require('../index');
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
      cloudinaryCloudName: 'foobar-cloudname',
      cloudinaryAPIKey: '3142',
      cloudinaryAPISecret: 'supersecretkey',
      uploadedImages: ['foo', 'bar']
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

    it('show throw an error if cloudinaryCloudName is not a field in the parameter object', function () {
      delete options.cloudinaryCloudName;
      (function () {
        const rss = new ShopifyFeed(options);
      }).should.throw();
    });

    it('show throw an error if cloudinaryAPIKey is not a field in the parameter object', function () {
      delete options.cloudinaryAPIKey;
      (function () {
        const rss = new ShopifyFeed(options);
      }).should.throw();
    });

    it('show throw an error if cloudinaryAPISecret is not a field in the parameter object', function () {
      delete options.cloudinaryAPISecret;
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