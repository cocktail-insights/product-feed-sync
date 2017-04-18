'use strict'

const rss = require('rss');

/**
 * @function json2rss
 *
 * @param {Object} options
 * @param {String} options.title - Title of Feed
 * @param {String} options.description - Description of Feed 
 * @param [Object] options.data - Array of items to be used to populate feed
 * @returns {RSS}
 */
function json2rss(options) {
  if (
      !options
      || !options.title
      || !options.description
      || !options.link
      || !options.data.length 
     ) {
    throw new Error('Missing required fields in object parameter');
  }

  const feed = new rss({
    title: options.title,
    description: options.description,
    feed_url: options.link,
    custom_namespaces: {
      g: 'http://base.google.com/ns/1.0'
    }
  });

  options.data.forEach((item) => {
    feed.item({
      title: item.title,
      custom_elements: [
        {'g:id': item.id},
        {'g:title': item.title},
        {'g:description': item.descirption},
        {'g:image_link': item.image_link},
        {'g:link': item.link},
        {'g:mpn': item.mpn || '' },
        {'g:gtin': item.gtin || ''},
        {'g:price': item.price},
        {'g:availability': item.availability},
        {'g.condition': item.condition}
      ]
    });
  });

  return feed.xml({indent: true});
};

module.exports = json2rss;
