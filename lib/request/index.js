const timeoutInterval = require('./config')
  .timeoutInterval;

const rest = require('rest');
const defaultRequest = require('rest/interceptor/defaultRequest');
const errorCode = require('rest/interceptor/errorCode');
const mime = require('rest/interceptor/mime');
const pathPrefix = require('rest/interceptor/pathPrefix');
const timeout = require('rest/interceptor/timeout');
const responseTime = require('rest-interceptor-responsetime');
const subpath = require('./interceptor/subpath');

exports.request = request;
exports.authRequest = authRequest;

function authRequest(token) {
  return request({
    provider: 'questrade',
    authHeaderName: 'Authorization',
    pathPrefix: token.api_server + 'v1/',
    tokenPrefix: token.token_type,
    token: token.access_token
  });
}

function request(options = {}) {
  const headers = {};
  if (options.authHeaderName) headers[options.authHeaderName] = options.tokenPrefix + ' ' + options.token;

  const restClientTemplate = rest.wrap(mime)
    .wrap(errorCode)
    .wrap(pathPrefix, {
      prefix: options.pathPrefix
    })
    .wrap(defaultRequest, {
      headers: headers,
      mixin: {
        provider: options.provider
      }
    })
    .wrap(timeout, {
      timeout: timeoutInterval
    })
    .wrap(responseTime)
    .wrap(subpath);

  return {
    get: function(path) {
      const options = {
        path: path
      };
      if (arguments.length == 2) options.entity = arguments[1];
      return restClientTemplate(options);
    },
    post: function(path, entity) {
      return restClientTemplate({
        method: 'POST',
        entity: entity,
        path: path
      });
    }
  };
}
