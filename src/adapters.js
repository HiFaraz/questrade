'use strict';

exports.account = function accountAdapter(account) {
  return {
    id: account.number,
    status: account.status,
    type: account.type
  };
};

exports.symbol = function symbolAdapter(symbol) {
  const result = Object.assign({
    id: symbol.symbolId
  }, symbol);
  delete result.symbolId;
  if (result.securityType) {
    result.type = result.securityType;
    delete result.securityType;
  }
  return result;
};

const arrayAdapters = {};

Object.keys(exports)
  .forEach(function attachArrayAdapter(adapter) {
    arrayAdapters[adapter] = function(arr) {
      return arr.map(exports[adapter]);
    };
  });

exports.array = arrayAdapters;
