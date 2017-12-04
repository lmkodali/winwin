'use strict';

const jsonResponse = require('./../utils/json-response');
const responseCodes = require('./response-codes');


module.exports = function(res, error, payload) {
    let status;
    if (!!error) {
        status = error.code || responseCodes.BadRequest;
    } else {
        status = responseCodes.OK;
    }

    jsonResponse(res, status, error, payload);
};
