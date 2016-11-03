'use strict';

exports.tradableSymbol = function(symbol) {
  return symbol.isTradable; // TODO document this, only returns tradable securities
};

const arrayFilters = {};

Object.keys(exports)
  .forEach(function attachArrayFilter(filter) {
    arrayFilters[filter] = function(arr) {
      return arr.filter(exports[filter]);
    };
  });

exports.array = arrayFilters;
