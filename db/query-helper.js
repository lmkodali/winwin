'use strict';

const _ = require('underscore');
const mysql = require('mysql');
const config = require('./../config');
const dbConstants = require('./../constants/db-constants');


/*
 * This method adds the database name before the name of the table.
 *
 * @param {Array} || {String} tables
 * @returns {Array} || {String}
 */
const addDatabaseName = function(tables) {
    if (Array.isArray(tables)) {
        if (!tables || tables.length === 0) {
            return null;
        }

        for (let i = 0; i < tables.length; i++) {
            tables[i] = addBackTick(dbConstants.dbNames[tables[i]]) + '.' + addBackTick(tables[i]);
        }

        return tables;
    }

    return addBackTick(dbConstants.dbNames[tables]) + '.' + addBackTick(tables);
};

const getDatabaseNameForTable = function(table) {
    return dbConstants.dbNames[table];
};

const querySubString = function (values, deliminator, terminator, shouldEscape) {
    let subQuery = '';
    let counter = 0;
    if (_.isArray(values)) {
        _.each(values, function (value) {
            value = shouldEscape ? mysql.escape(value) : value;
            _.contains(value, '`') ? subQuery += value + (counter === values.length - 1 ? terminator : deliminator) :
                subQuery += '`' + value + '`' + (counter === values.length - 1 ? terminator : deliminator);
            counter++;
        });
    } else {
        _.each(values, function (value, key) {
            subQuery += '`' + key + '`=' + mysql.escape(value) + +(counter === values.length - 1 ? terminator : deliminator);
            counter++;
        });
    }

    return subQuery;
};

const valuesQuerySubString = function (values, deliminator, terminator) {
    let query = '';
    let counter = 0;
    _.each(values, function (value) {
        if (_.isArray(value)) {
            query = valuesQuerySubString(value, deliminator, terminator)
                + (counter === values.length - 1 ? '' : ',');
        } else {
            query += mysql.escape(value) + (counter === values.length - 1 ? terminator : deliminator);
        }

        counter++;
    });

    return query;
};

/**
 * This method returns a sub query for
 *
 * @param {object} columnsAndValues
 * @param {string} deliminator
 * @returns {string}
 */
const whereEqualQuery = function(columnsAndValues, deliminator) {
    let query = '';
    let counter = 0;
    const length = _.keys(columnsAndValues).length;
    _.each(columnsAndValues, function (value, column) {
        if (_.isArray(value)) {
            query += '`' + column + '` IN ' + '(' + mysql.escape(value) + ')';
        } else {
            query += '`' + column + '`' + '=' + mysql.escape(value);
        }
        query += (counter === length - 1 ? '' : deliminator);
        counter++;
    });

    return query;
};


/**
 * Creates a substring to use in a join query.
 *
 * @param {string} table1
 * @param {string} table2
 * @param {string} deliminator
 * @param {string} comparisonColumn
 * @param {string} separator
 * @returns {string}
 */
const tablesQuerySubString = function(table1, table2, deliminator, comparisonColumn, separator) {
    table1 = addDatabaseName(table1);
    table2 = addDatabaseName(table2);
    comparisonColumn = addBackTick(comparisonColumn);

    return separator + table2 + deliminator + table1 +
        '.' + comparisonColumn + '=' + table2 + '.' + comparisonColumn;
};

/**
 *
 * @param {string} value
 * @returns {boolean}
 * @private
 */
const _hasBackTicks = function(value) {
    if (value.length === 0) {
        return false;
    }

    return value[0] === '`' && value[value.length - 1] === '`';
};

/**
 * To add back ticks for a value.
 *
 * @param {string} value
 * @returns {string}
 */
const addBackTick = function(value) {
    const parts = value.split('.');
    if (parts.length <= 1) {
        return '`' + value + '`';
    }

    return '`' + parts[0] + '`.`' + parts[1] + '`';
};

/**
 * This method remove the back ticks from a string.
 *
 * @param {string} value
 * @returns {string}
 */
const removeBackTicks = function(value) {
    if (value[0] === '`' && value[value.length - 1] === '`') {
        value = value.substring(1, value.length);
        value = value.substring(0, value.length - 1);
    }

    return value;
};

/**
 * This method determines if a given set of tables use separate databases.
 *
 * @param {Array} tables
 * @returns {boolean}
 */
const hasMultipleDatabases = function(tables) {
    if (tables.length === 0 || tables.length === 1) {
        return false;
    }

    let target = dbConstants.dbNames[tables[0]];
    for (let i=1; i < tables.length; i++) {
        if (target !== dbConstants.dbNames[tables[i]]) {
            return true;
        }
    }

    return false;
};

/**
 * This method is used to add db and table Names for columns.
 *
 * @param {Array} tables
 * @returns {boolean}
 */
const addDbAndTableNameForColumns = function (table, column) {
    let dbName = addBackTick(getDatabaseNameForTable(table));
    let tableName = addBackTick(table);
    let columnName = addBackTick(column);
    return dbName +'.'+ tableName+ '.'+ columnName;
};



module.exports = {
    querySubString: querySubString,
    valuesQuerySubString: valuesQuerySubString,
    whereEqualQuery: whereEqualQuery,
    tablesQuerySubString: tablesQuerySubString,
    addBackTick: addBackTick,
    addDatabaseName: addDatabaseName,
    hasMultipleDatabases: hasMultipleDatabases,
    getDatabaseNameForTable: getDatabaseNameForTable,
    addDbAndTableNameForColumns: addDbAndTableNameForColumns
};
