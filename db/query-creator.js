'use strict';

const _ = require('underscore');
const mysql = require('mysql');
const queryHelper = require('./query-helper');
const logger = require('./../utils/logger');


module.exports = {
    /**
     * Select query where comparison is done by unique columns and values.
     *
     * @param {string} table Name of table to select from
     * @param {Array} columnsToSelect Columns to select
     * @param {object} comparisonColumnsAndValues Values and column
     *     names to filter query by
     * @returns {object} - The key is the database and the value is the query
     */
    selectWithAnd: function (table, columnsToSelect, comparisonColumnsAndValues) {
        const database = queryHelper.getDatabaseNameForTable(table);
        table = queryHelper.addDatabaseName(table);
        let query = 'SELECT ';
        query += (!columnsToSelect || columnsToSelect.length === 0) ? '* ' :
            queryHelper.querySubString(columnsToSelect, ',', ' ', false);
        query += 'FROM ' + table;
        query += comparisonColumnsAndValues ?
            (' WHERE ' + queryHelper.whereEqualQuery(comparisonColumnsAndValues, ' AND ')) : '';

        let queryObject = {};
        queryObject[database] = query;
        return queryObject;
    },

    /**
     * Select query where comparison is done by unique columns and values.
     *
     * @param {string} table Name of table to select from
     * @param {Array} columnsToSelect Columns to select
     * @param {object} comparisonColumns columns to filter by
     * @param {object} comparisonValues Values to filter by
     *     names to filter query by
     * @returns {object} - The key is the database and the value is the query
     */
    selectWithOr: function (table, columnsToSelect, comparisonColumns, comparisonValues) {
        const database = queryHelper.getDatabaseNameForTable(table);
        table = queryHelper.addDatabaseName(table);
        let query = 'SELECT ';
        query += (!columnsToSelect || columnsToSelect.length === 0) ? '* ' :
            queryHelper.querySubString(columnsToSelect, ',', ' ', false);
        query += 'FROM ' + table;

        if (comparisonColumns && comparisonValues) {
            query += ' WHERE ';
            for (let i=0; i < comparisonColumns.length; i++) {
                query += '`' + comparisonColumns[i] + '`' + '=' + mysql.escape(comparisonValues[i]);
                query += (i === comparisonColumns.length - 1 ? '' : ' OR ');
            }
        }

        let queryObject = {};
        queryObject[database] = query;
        return queryObject;
    },


    /**
     * Inserts single record
     *
     * @param {string} table Name of table to select from
     * @param {object} columnsAndValues Values and column
     *     names to filter query by
     * @returns {object} - The key is the database and the value is the query
     */

    insertSingle: function (table, columnsAndValues) {
        const database = queryHelper.getDatabaseNameForTable(table);
        let columns = _.keys(columnsAndValues);
        let values = [];
        _.each(columns, function (column) {
            values.push(columnsAndValues[column]);
        });

        table = queryHelper.addDatabaseName(table);
        const query = 'INSERT INTO ' + table + '(' + queryHelper.querySubString(columns, ',', ')', false) +
            ' VALUES (' + queryHelper.valuesQuerySubString(values, ',', '') + ')';

        let queryObject = {};
        queryObject[database] = query;
        return queryObject;
    },

    /**
     * Inserts Multiple records
     *
     * @param {string} table Name of table to select from
     * @param {Array} columns to insert
     * @param {Array} values to insert according to the columns
     * @returns {object} - The key is the database and the value is the query
     */
    insertMultiple: function (table, columns, values) {
        const database = queryHelper.getDatabaseNameForTable(table);
        table = queryHelper.addDatabaseName(table);
        let query = 'INSERT INTO ' + table + '(' + queryHelper.querySubString(columns, ',', ')', false)
            + ' VALUES ';
        let counter = 0;
        _.each(values, function (subValue) {
            query += '(' + queryHelper.valuesQuerySubString(subValue, ',', '') + ')' +
                (counter === values.length - 1 ? '' : ',');
            counter++;
        });

        let queryObject = {};
        queryObject[database] = query;
        return queryObject;
    },

    /**
     * Updates a single record
     *
     * @param {string} table Table to update
     * @param {Object} columnsAndValues Columns and values to update
     * @param {Object} targetColumnsAndValues ColumnsAndValues to identify the update record
     *
     * @returns {object} - The key is the database and the value is the query
     */
    updateSingle: function (table, columnsAndValues, targetColumnsAndValues) {
        const database = queryHelper.getDatabaseNameForTable(table);
        let columns = _.keys(columnsAndValues);
        let values = [];
        _.each(columns, function (column) {
            values.push(columnsAndValues[column]);
        });
        table = queryHelper.addDatabaseName(table);
        const query = 'UPDATE ' + table + ' SET ' + queryHelper.whereEqualQuery(columnsAndValues, ',') +
            ' WHERE ' + queryHelper.whereEqualQuery(targetColumnsAndValues, ' AND ');

        let queryObject = {};
        queryObject[database] = query;
        return queryObject;
    },

    /**
     * Deletes a single entry form a table.
     *
     * @param table
     * @param targetColumnsAndValues
     */
    deleteSingle: function(table, targetColumnsAndValues) {
        const database = queryHelper.getDatabaseNameForTable(table);
        table = queryHelper.addDatabaseName(table);
        const query = 'DELETE FROM ' + table + ' WHERE '
            + queryHelper.whereEqualQuery(targetColumnsAndValues, ' AND ');

        let queryObject = {};
        queryObject[database] = query;
        return queryObject;
    },

    /**
     * Create a query string for a join statement
     *
     * @param {string} table1 - Name of the first table to join
     * @param {string} table2 - Name of the second table to be joined
     * @param {Array} table1ColumnsToSelect - Names of the columns for the select statement
     * @param {string} comparisonColumn - Column name to run the comparison on
     * @param {string} filterColumn - Column to filter with in where clause
     * @param {Array} filterValues - Values for filtering in where clause
     * @returns {object} - The key is the database and the value is the query
     */
    join: function (table1, table2, table1ColumnsToSelect, comparisonColumn, filterColumn, filterValues) {
        let queryObject = {};
        const database1 = queryHelper.getDatabaseNameForTable(table1);
        if (queryHelper.hasMultipleDatabases([table1, table2])) {
            const database2 = queryHelper.getDatabaseNameForTable(table2);
            let comparisonColumnsAndValues = null;
            if(filterColumn){
                comparisonColumnsAndValues = {};
                comparisonColumnsAndValues[filterColumn] = filterValues[0];
            }
            queryObject[database1] = this.selectWithAnd(
                table1,
                table1ColumnsToSelect,
                comparisonColumnsAndValues
            )[database1];

            // FIXME: We're currently pulling all the information for the table from the db.
            // We should be more discreet when doing this query. There should be some filter
            // values added. I think a select with or query needs to be added for the second
            // query.
            queryObject[database2] = this.selectWithAnd(table2, null, null)[database2];
            if (comparisonColumn) {
                queryObject.join = comparisonColumn;
                queryObject.primaryDatabase = database1;
                queryObject.secondaryDatabase = database2;
            }
        } else {
            queryObject[database1] = this.selectWithAnd(table1, table1ColumnsToSelect, null)[database1] +
                queryHelper.tablesQuerySubString(table1, table2, ' ON ', comparisonColumn, ' JOIN ');
        }

        return queryObject;
    },

    /**
     * Create a query string for a join With or statement
     *
     * @param {string} table1 Name of the first table to join
     * @param {string} table2 - Name of the second table to be joined
     * @param {Array} table1ColumnsToSelect Names of the colums for the select statement
     * @param {string} comparisonColumn Column name to run the comparison on
     * @param {string} filterColumn Column to filter with in where clause
     * @param {Array} filterValues Values for filtering in where clause
     * @returns {object} - The key is the database and the value is the query
     */

    joinWithOr: function (
        table1,
        table2,
        table1ColumnsToSelect,
        comparisonColumn,
        filterColumn,
        filterValues
    ) {
        let counter = 0;
        const equalClause = queryHelper.addDbAndTableNameForColumns(table1,filterColumn) + '=';
        let queryObject = this.join(table1, table2, table1ColumnsToSelect, comparisonColumn);
        let query = queryObject[_.keys(queryObject)[0]] + ((filterValues) ? ' WHERE ' : ' ');
        _.each(filterValues, function (filterValue) {
            query += equalClause + mysql.escape(filterValue) +
                (counter === filterValues.length - 1 ? '' : ' OR ');
            counter++;
        });
        queryObject[_.keys(queryObject)[0]] = query;
        return queryObject;
    },

    /**
     * Creates a join statement with a where and 'AND' clause for multiple
     * columns in a table.
     *
     * @param {String} table1 - Name of the first table to select during join
     * @param {string} table2 - Name of the second table to be joined
     * @param {Array} table1ColumnsToSelect - Names of the colums for the select statement
     * @param {String} comparisonColumn - Column name to run the comparison on
     * @param {String} filterColumn - Column to filter with in where clause
     * @param {Array} filterValues - Values for filtering in where clause
     * @returns {object} - The key is the database and the value is the query
     */

    joinWithAnd: function (
        table1,
        table2,
        table1ColumnsToSelect,
        comparisonColumn,
        filterColumn,
        filterValues
    ) {
        // FIXME: I don't understand exactly what's going on here. Unfortunately,
        // I don't have the time to figure it out right now, so I'm just going to
        // return a query that will gather all data if there are multiple databases.
        // This should be looked at further in the very near future.
        let counter = 0;
        let queryObject = this.join(
            table1,
            table2,
            table1ColumnsToSelect,
            comparisonColumn,
            filterColumn,
            filterValues
        );
        const keys = _.keys(queryObject);
        if (keys.length === 1) {
            let query = queryObject[keys[0]] + (!!filterValues ? ' WHERE ' : ' ');
            table1 = queryHelper.addDatabaseName(table1);
            const equalClause = table1 + '.' + filterColumn + '=';
            if (filterValues) {
                _.each(filterValues, function (filterValue) {
                    query += equalClause + mysql.escape(filterValue) +
                        (counter === filterValues.length - 1 ? '' : ' AND ');
                    counter++;
                });
            }

            queryObject[keys[0]] = query;
        }
        return queryObject;
    },
    customQuery : function(dbName, customQuery){
        let queryObject = {};
        queryObject[dbName] = customQuery;
        return queryObject
    }
    
};
