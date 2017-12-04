'use strict';

let _ = require('underscore');


module.exports = {
    /**
     * Formats a list of objects so that all keys are aligned.
     * Returns the objects as an array with sub arrays with each
     * value at in index that corresponds to the columns (keys)
     * for each object
     * 
     * @param {Array} objectsToFormat Objects that must have the same keys
     * @returns {{columns: Array, objects: Array}} 
     */
    formatObjectsForMultipleQuery: function(objectsToFormat) {
        if (!objectsToFormat || objectsToFormat.length === 0) {
            throw new Error('No objects provided to format');
        }

        let columns = this._allKeysForObjects(objectsToFormat);
        let values = [];
        _.each(objectsToFormat, function(objectToFormat) {
            let formattedObject = [];
            _.each(columns, function(column) {
                formattedObject.push(objectToFormat[column]);
            });

            values.push(formattedObject);
        });
        
        return {
            columns: columns,
            values: values
        };
    },

    /**
     * Formats columns for selection with a select with or query.
     * This type of query is where we're selecting based upon a single
     * column.
     *
     * @param {string} column
     * @param {Array} values
     * @returns {{columns: Array, values: Array}}
     */
    formatForSelectWithOr: function(column, values) {
        let columns = [];
        _.each(values, (value) => {
             columns.push(column);
        });

        return {
            columns: columns,
            values: values
        };
    },

    _allKeysForObjects: function(objects) {
        let keys = {};
        _.each(objects, function(object) {
            _.each(object, function(value, key) {
                if (!_.has(keys, key)) {
                    keys[key] = true;
                }
            });
        });

        return _.keys(keys);
    }
};
