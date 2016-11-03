'use strict';
const {
  authRequest,
  request
} = require('../lib/request');
const filters = require('./filters');
const queryMetadata = require('./query-metadata');
const queryString = require('query-string');
const schema = require('validate');

exports = module.exports = provider;

function provider(token) {
  const api = authRequest(token);
  const ctx = {
    get: (url, transform) => {
      return api.get(url)
        .then(transform)
        .catch(extractErrorMessageFromResponse);
    }
  };
  return collectMethodsWithContext(ctx, [accounts, markets, quotes, symbols, time, user]);
}

function collectMethodsWithContext(context, methods) {
  const result = {};
  methods.forEach(method => {
    result[method.name] = function() {
      return method.apply(context, [...arguments]);
    };
  });
  return result;
}

function accounts(...args) {
  const accountIdGiven = (typeof args[0] == 'undefined');
  const isValidAccountNumber = Number(args[0])
    .toString()
    .length === 8;
  if (isValidAccountNumber) {
    const accountId = Number(args[0]);
    const ctx = {
      get: (url, transform) => this.get('accounts/' + accountId + '/' + url, transform)
    };
    return collectMethodsWithContext(ctx, [activities, balances, executions, instruments, orders, positions]); // TODO optimization: don't reconstruct this on every call, have it ready from before
  } else if (accountIdGiven) {
    const url = 'accounts';
    const transform = response => response.entity.accounts;
    return this.get(url, transform);
  } else throw new Error('Invalid account number passed to accounts()');
}

function activities(options = {}) {
  const parameters = buildQueryString(options, queryMetadata.accounts);
  const url = 'activities' + ((parameters) ? ('?' + parameters) : '');
  const transform = response => response.entity.activities;
  return this.get(url, transform);
}

function balances() {
  const url = 'balances';
  const transform = response => response.entity;
  return this.get(url, transform);
}

function executions(options = {}) {
  const parameters = buildQueryString(options, queryMetadata.accounts);
  const url = 'executions' + ((parameters) ? ('?' + parameters) : '');
  const transform = response => response.entity.executions;
  return this.get(url, transform);
}

function instruments(...args) {
  if (args.length === 0) throw new Error('No arguments passed to instruments()');

  const convertSymbol = (value) => {
    if (typeof value === 'object') return value.symbolId;
    else return value;
  };

  let ids = ((Array.isArray(args[0])) ? args[0] : args)
    .map(convertSymbol);
  const argsAreNumbers = isNumberOrArrayOfNumbers(ids);
  if (!argsAreNumbers) throw new Error('Non-number arguments passed to instruments(): ' + ids);
  return ids;
}

function markets() {
  const url = 'markets';
  const transform = response => response.entity.markets;
  return this.get(url, transform);
}

function orders(options = {}) {
  const getById = isNumberOrArrayOfNumbers(options);
  const transform = response => response.entity.orders;
  if (getById) {
    const id = options;
    const url = (Array.isArray(id)) ? ('orders?ids=' + id.join(',')) : ('orders/' + id);
    return this.get(url, transform);
  } else {
    const parameters = buildQueryString(options, queryMetadata.accounts);
    const url = 'orders' + ((parameters) ? ('?' + parameters) : '');
    return this.get(url, transform);
  }
}

function positions() {
  const url = 'positions';
  const transform = response => response.entity.positions;
  return this.get(url, transform);
}

function quotes(id) {
  const url = (Array.isArray(id)) ? ('markets/quotes?ids=' + id.join(',')) : ('markets/quotes/' + id);
  const transform = response => response.entity.quotes;
  return this.get(url, transform);
}

function symbols(...args) {
  const searchByDescription = !isNumberOrArrayOfNumbers(args[0]);
  if (searchByDescription) {
    const [description, offset] = args;
    const invalidOffset = typeof offset !== 'undefined' && (offset < 0 || !Number.isInteger(Number(offset)));
    if (invalidOffset) throw new Error('Offset must be an integer greater than or equal to zero.Given value: ' + offset + ' [' + typeof offset + ']');
    const url = 'symbols/search?prefix=' + description + ((typeof offset === 'undefined') ? '' : ('&offset=' + offset));
    const transform = response => filters.array.tradableSymbol(response.entity.symbols); // TODO opportunity to simplify through a function pipe
    return this.get(url, transform);
  } else {
    const id = args[0];
    const url = (Array.isArray(id)) ? ('symbols?ids=' + id.join(',')) : ('symbols/' + id);
    const transform = response => response.entity.symbols;
    return this.get(url, transform);
  }
}

function time() {
  const url = 'time';
  const transform = response => new Date(response.entity.time); // TODO document that this is result is GMT+0;
  return this.get(url, transform);
}

function user() {
  const url = 'accounts';
  const transform = response => response.entity.userId;
  return this.get(url, transform);
}

exports.refresh = function refresh(token) {
  const refresh_token = (typeof token === 'string') ? token : token.refresh_token;
  return request()
    .get('https://login.questrade.com/oauth2/token?grant_type=refresh_token&refresh_token=' + refresh_token)
    .then(response => response.entity)
    .catch(extractErrorMessageFromResponse);
};

exports.verify = function verify(token) {
  return authRequest(token)
    .get('time')
    .catch(extractErrorMessageFromResponse);
};

function extractErrorMessageFromResponse(response) {
  if (response.error) throw response.error.code;
  else if (response.entity) {
    if (response.entity.message) throw response.entity.message;
    else throw response.entity;
  } else throw new Error('Unknown internal error');
}

function buildQueryString(data, metadata) {
  const validators = {};
  const querydata = {};

  Object.keys(metadata)
    .forEach(key => {
      const obj = Object.assign({}, metadata[key]);
      if (obj.name) delete obj.name;
      if (obj.transform) delete obj.transform;
      validators[key] = obj;
      if (data[key]) {
        const transform = (metadata[key].transform) ? metadata[key].transform : (value => value);
        querydata[metadata[key].name] = transform(data[key]);
      }
    });

  const validationErrors = schema(validators)
    .validate(data);
  if (validationErrors.length > 0) throw validationErrors;
  return queryString.stringify(querydata);
}

function isNumberOrArrayOfNumbers(data) {
  function isArray(value) {
    return Array.isArray(value);
  }

  function allValuesOfArrayAreTrue(value) {
    return value.indexOf(false) === -1;
  }

  function isNumber(value) {
    return !Number.isNaN(Number(value)) && !Number.isNaN(parseInt(value));
  }

  if (isArray(data)) {
    return allValuesOfArrayAreTrue(data.map(isNumber));
  } else {
    return isNumber(data);
  }
}
