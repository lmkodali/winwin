'use strict';

const mysql = require('mysql');
const config = require('./../config');
const logger = require('./../utils/logger');
const _ = require('underscore');
const lattisErrors = require('./../errors/lattis-errors');
const async = require('async');


module.exports = {
    _mainPool: null,

    initMainPool: function(shouldUseDatabase) {
        if (this._mainPool) {
            return;
        }

        if (shouldUseDatabase) {
            this._mainPool = mysql.createPool({
                host: config.databaseInfo.host,
                user: config.databaseInfo.userName,
                password: config.databaseInfo.password,
                database: config.databaseInfo.databaseName,
                port: config.databaseInfo.port
            });
        } else {
            this._mainPool = mysql.createPool({
                host: config.databaseInfo.host,
                user: config.databaseInfo.userName,
                password: config.databaseInfo.password,
                port: config.databaseInfo.port
            });
        }
    },

    initPools: function(shouldUseDatabase) {
        this.initMainPool(shouldUseDatabase);
    },

    _getMainPool: function() {
        if (!this._mainPool) {
            this.initMainPool(true);
        }

        return this._mainPool;
    },


    /**
     * This method makes a query against the given database.
     * 
     * @param {object} queryInfo - key is the database and the value is the query.
     *      Also contains join value if the query spans multiple databases.
     * @param {function} callback
     */
    makeQuery: function(queryInfo, callback) {
        if (_.has(queryInfo, config.databaseInfo.databaseName)) {
            this._makeQuery(
                config.databaseInfo.databaseName,
                queryInfo[config.databaseInfo.databaseName],
                function(error, data) {
                    if (error) {
                        logger('Error: making async main query');
                        callback(error, null);
                        return;
                    }
                    callback(null, data);
                }
            );
        }
    },

    _makeQuery: function(database, query, callback) {
        let pool;
        if (database === config.databaseInfo.databaseName) {
            pool = this._getMainPool();
        }

        if (!pool) {
            logger('Error: database name was not passed into sql pool query.');
            callback(lattisErrors.incorrectDatabase(false), null);
            return;
        }

        pool.getConnection(function(error, connection) {
            if (error) {
                logger('Error: got error for query:', query, 'error:', error);
                if (connection) {
                    connection.release();
                }
                callback(error, null);
                return;
            }

            connection.query(query, function(error, rows) {
                if (error) {
                    logger('Error making query:', query, 'Error:',  lattisErrors.errorWithMessage(error));
                }

                if (connection) {
                    connection.release();
                }
                callback(error, rows);
            });
        });
    },

    destroyPools: function(callback) {
        this.destroyMainPool(function(error) {
            if (error) {
                callback(error);
                return;
            }
            this.destroyUsersPool(callback);
        }.bind(this));
    },

    destroyMainPool: function(callback) {
        if (!this._mainPool) {
            callback(null);
            return;
        }

        this._mainPool.end(function(error) {
            if (error) {
                callback(error);
                return;
            }
            this._mainPool = null;
            callback(null);
        }.bind(this));
    },

    _performJoin: function(joinOnValue, results1, results2) {
        // FIXME: This method should not rely on the two result parameters. It should accept an
        // array of parameters and be smart enough to perform a join on all of them. This is
        // something that should be added in the future.
        if (results1.length === 0 || results2.length === 0) {
            return results1;
        }

        let joinedResults = [];
        _.each(results1, function(result1) {
            _.each(results2, function(result2) {
                if (result1[joinOnValue] === result2[joinOnValue]) {
                    joinedResults.push(_.extend(result1, result2));
                }
            });
        });

        return joinedResults;
    }
};
