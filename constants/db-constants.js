'use strict';

const config = require('./../config');

/*
 * Related a table name with a database
 */
module.exports = {
    dbNames: {
        buyer: config.databaseInfo.databaseName,
        categories: config.databaseInfo.databaseName,
        products: config.databaseInfo.databaseName,
        seller: config.databaseInfo.databaseName
    },

    tables: {
        buyer: 'buyer',
        categories:'categories',
        products:'products',
        seller:'seller'
    }
};
