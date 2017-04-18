const utils = require('../shopify_utils');
const constants = require('../constants');
const should = require('should');

describe('#objectToString', function() {
  it('should return `foo=bar` when passed {foo: bar}', function() {
    const object = {
      foo: 'bar'
    };

    const stringifiedObject = utils.objectToString(object);
    stringifiedObject.should.equal('foo=bar');
  });
});

describe('#arrayToObject', function() {
  it('should return object when passed an array', function() {
    const array = ['foo', 'bar'];

    utils.arrayToObject(array).should.have.properties('foo', 'bar');
  });

  it('should return keys of constants object when passed constants.split(\',\')', function() {
    const array = constants.csvFields.split(',');

    const transformedArray = utils.arrayToObject(array);
    transformedArray.should.be.an.Object;
  })
});
