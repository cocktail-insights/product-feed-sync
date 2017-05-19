const utils = require('../dist/shopify_utils');
const constants = require('../dist/constants');
const should = require('should');

describe('#objectToString', () => {
  it('should return `foo=bar` when passed {foo: bar}', () => {
    const object = {
      foo: 'bar',
    };

    const stringifiedObject = utils.objectToString(object);
    stringifiedObject.should.equal('foo=bar');
  });
});

describe('#arrayToObject', () => {
  it('should return object when passed an array', () => {
    const array = ['foo', 'bar'];

    utils.arrayToObject(array).should.have.properties('foo', 'bar');
  });

  it('should return keys of constants object when passed constants.split(\',\')', () => {
    const array = constants.csvFields.split(',');

    const transformedArray = utils.arrayToObject(array);
    transformedArray.should.be.an.Object;
  });
});
