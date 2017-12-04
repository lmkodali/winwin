'use strict';

const dbConstants = require('../constants/db-constants');
const queryCreator = require('../db/query-creator');
const sqlPool = require('../db/sql-pool');
const logger = require('../utils/logger');
const errors = require('../errors/lattis-errors');

const listCategories = function (callback) {
    const listCategories = queryCreator.selectWithAnd(dbConstants.tables.categories, ['iCategoryId','tTitle'], {eStatus: 'Active'});
    sqlPool.makeQuery(listCategories, function (error, categories) {
	    if (error) {
	        logger('Error: making list categories query : ', listCategories);
	        callback(error, null);
	        return;
	    }
	    callback(null, categories);
	});
};

const addCategory = (reqParams, callback) => {
	let querySaveCategory = queryCreator.insertSingle(dbConstants.tables.categories, reqParams);
	sqlPool.makeQuery(querySaveCategory, (error) => {
		if (error) {
		    logger('Error: making add category query with ', _.keys(reqParams), ':', querySaveCategory);
		    callback(errors.internalServer(false), null);
		    return;
		}
		return callback(null, null);
	});
};

const editCategory = (reqParams, callback) => {
	const queryEditCategory = queryCreator.updateSingle(
        dbConstants.tables.categories,
        reqParams,
        {iCategoryId: reqParams.iCategoryId});
    sqlPool.makeQuery(queryEditCategory, (error) => {
        if (error) {
            logger('Error: making update-category query with iCategoryId : ', reqParams.iCategoryId, ':', queryEditCategory);
            return callback(errors.internalServer(false), null);
        }
        return callback(null, null);
    })
};

module.exports = {
    listCategories:listCategories,
    addCategory:addCategory,
    editCategory:editCategory
};
