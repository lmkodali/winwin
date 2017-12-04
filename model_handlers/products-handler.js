'use strict';

const dbConstants = require('../constants/db-constants');
const queryCreator = require('../db/query-creator');
const sqlPool = require('../db/sql-pool');
const logger = require('../utils/logger');
const errors = require('../errors/lattis-errors');

const listProducts = function (callback) {
	let queryListProducts = queryCreator.customQuery('winwin', "select p.*,c.tTitle as Category_Title,s.vFirstname,s.vLastname,s.vPhoto,s.vEmail from products p,categories c,seller s where p.iCategoryId=c.iCategoryId and p.iSellerId=s.iSellerId and p.eStatus='Active'");
    sqlPool.makeQuery(queryListProducts, function (error, products) {
	    if (error) {
	        logger('Error: making list products query : ', queryListProducts);
	        callback(error, null);
	        return;
	    }
	    callback(null, products);
	});
};

const addProduct = (reqParams, callback) => {
	let querySaveProduct = queryCreator.insertSingle(dbConstants.tables.products, reqParams);
	sqlPool.makeQuery(querySaveProduct, (error) => {
		if (error) {
		    logger('Error: making add product query with ', _.keys(reqParams), ':', querySaveProduct);
		    callback(errors.internalServer(false), null);
		    return;
		}
		return callback(null, null);
	});
};

const editProduct = (reqParams, callback) => {
	const queryEditProduct = queryCreator.updateSingle(
        dbConstants.tables.products,
        reqParams,
        {iProductId: reqParams.iProductId});
    sqlPool.makeQuery(queryEditProduct, (error) => {
        if (error) {
            logger('Error: making update-product query with iProductId : ', reqParams.iProductId, ':', queryEditProduct);
            return callback(errors.internalServer(false), null);
        }
        return callback(null, null);
    })
};

module.exports = {
    listProducts:listProducts,
    addProduct:addProduct,
    editProduct:editProduct
};
