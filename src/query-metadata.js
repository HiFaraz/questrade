'use strict';

const isValidDate = require('is-valid-date-object');

function optionalIsValidDate(value) {
  return typeof value === 'undefined' || isValidDate(value);
}

function optionalIsValidState(value) {
  return typeof value === 'undefined' || (['All', 'Open', 'Closed'].indexOf(value) > -1);
}

exports.accounts = {
  start: {
    name: 'startTime',
    required: false,
    use: optionalIsValidDate,
    message: 'start must be an instance of the Date object with a valid value',
    transform: obj => obj.toISOString(),
  },
  end: {
    name: 'endTime',
    required: false,
    use: optionalIsValidDate,
    message: 'end must be an instance of the Date object with a valid value',
    transform: obj => obj.toISOString(),
  },
  state: {
    name: 'stateFilter',
    required: false,
    use: optionalIsValidState,
    message: 'state must be a string with a value of either \'All\', \'Open\', or \'Closed\'',
  },
};
