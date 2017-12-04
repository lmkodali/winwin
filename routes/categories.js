'use strict';

const categoriesHandler = require('./../model_handlers/categories-handler');
const errors = require('../errors/lattis-errors');
const responseCodes = require('../helpers/response-codes');
const jsonResponse = require('../utils/json-response');
const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const _ = require('underscore');

router.get('/list-category', function(req, res) {
    categoriesHandler.listCategories(function (error, categories) {
        if (error) {
            jsonResponse(res, responseCodes.InternalServer, errors.internalServer(true), null);
            return;
        }
        jsonResponse(res, responseCodes.OK, errors.noError(), categories);
    });
});

router.post('/add-category', function(req, res) {
    if (!_.has(req.body, 'tTitle')) {
        logger('Error: Some Parameters are missing in this request');
        jsonResponse(res, errors.missingParameter(true), null);
        return;
    }
    categoriesHandler.addCategory(req.body, function(error,status) {
        if (error) {
            logger('Error: could not add category : ', error);
            jsonResponse(res, errors.formatErrorForWire(error), null);
            return;
        }
        jsonResponse(res, responseCodes.OK, errors.noError(), status);
    });
});

router.post('/edit-category', function(req, res) {
    if (!_.has(req.body, 'iCategoryId') || (!_.has(req.body, 'tTitle') && (!_.has(req.body, 'eStatus')))) {
        logger('Error: Some Parameters are missing in this request');
        jsonResponse(res, errors.missingParameter(true), null);
        return;
    }
    categoriesHandler.editCategory(req.body, function(error,status) {
        if (error) {
            logger('Error: could not update category : ', error);
            jsonResponse(res, errors.formatErrorForWire(error), null);
            return;
        }
        jsonResponse(res, responseCodes.OK, errors.noError(), status);
    });
});

module.exports = router;