'use strict'

module.exports = {
  /**
   * Convert Object to String literal E.g. { foo: 'bar' } => 'foo=bar'
   *
   * @function objectToString
   *
   * @param {Object} obj - An object of key value pair to convert
   * @returns {String}
   */
  objectToString(obj) {
    return Object.keys(obj)
      .sort()
      .map((key) => {
        let value = obj[key];
        value = Array.isArray(value) 
          ? value 
          : [value];
        return `${key}=${value}`;
      })
    .join('');
  },


  /**
   * @function shopNameToDomain
   *
   * Convert a Shopify store's name to a domain
   * @param {String} name - Name of shop
   * @returns {String}
   */
  shopNameToDomain(name) {
    const isShopifyDomain = /.myshopify.com/.test(name);

    if (isShopifyDomain) {
      return name;
    }

    return `${name}.myshopify.com`;
  },


  /**
   * @function shopDomainToName
   *
   * Get Shopify store's name from domain
   * @param {String} domain - Shopify store domain
   * @returns {String}
   */
  shopDomainToName(domain) {
    const regex = /(https?:\/\/|.myshopify.com(.*)?)/g
      return domain.replace(regex, '');
  },


  /**
   * @function compactObject
   *
   * Remove all falsy fields from object
   *
   * @param {Object} obj
   * @returns {Object}
   */
  compactObject(obj) {
    let clone = Object.assign({}, obj);
    for (const property in clone) {
      if (!clone[property]) {
        delete clone[property];
      }
    }

    return clone;
  },


  /**
   * @function arrayToObject
   *
   * @param [String/Number] arr - Array of String values to convert to Object
   * @returns {Object}
   */
  arrayToObject(arr) {
    return arr.reduce((accumulator, currentValue) => {
      accumulator[currentValue] = undefined;
      return accumulator;
    }, {});
  }
};
