AdGeek Logger
=========

Generate RSS and CSV feeds for Shopify (other platforms coming soon) products.

## Usage
```javascript
const ShopifyFeed = require('product-feed-sync');

const demoStoreFeed = new ShopifyFeed({
  shop: 'demostore.myshopify.com',
  currency: 'USD',
  accessToken: '<shopify_access_token>',
  sharedSecret: '<shopify_shared_secret>',
  cloudinaryCloudName: '<cloudinary_cloud_name>',
  cloudinaryApiKey: '<cloudinary_api_key>',
  cloudinaryApiSecret: '<cloudinary_api_secret>',
  uploadedImages: ['foo', 'bar] // array of public ids of already uploaded images.
});

// Get CSV feed
demoStoreFeed.toCSV()
  .then(({ csv, savedImages }) => {
    console.log('CSV', csv);
    console.log('Images that were uploaded', savedImages);
  })
  .catch(err => console.log(err));

// Get RSS feed
demoStoreFeed.toRSS()
  .then(({ rss, savedImages }) => {
    console.log('RSS', csv);
    console.log('Images that were uploaded', savedImages);
  })
  .catch(err => console.log(err));
```

## Tests

  `npm test`

## Contributing

In lieu of a formal style guide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code.
