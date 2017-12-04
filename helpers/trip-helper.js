'use strict';

const _ = require('underscore');
let pointHandler = require('./../handlers/point-handler');



/**
 * This method will calculate trip distance for particular trip
 *
 * @param {Object} trip - trip detail to calculate distance
 */
const getTripDistance = function(trip) {
    let steps = trip.steps;
    if (!steps || steps.length < 2) {
        return 0.0;
    }

    let distance = 0.0;
    let previousPoint = null;
    _.each(steps, function (step) {
        const point = {latitude: step[0], longitude: step[1]};
        if (previousPoint) {
            distance += pointHandler.distanceBetweenPoints(previousPoint, point);
        }
        previousPoint = point;
    });

    return distance;
};

/**
 * This method will calculate trip duration for particular trip
 *
 * @param {Object} trip - trip detail to calculate duration
 */
const getTripDuration = function(trip) {
    if (!trip.steps || trip.steps.length < 2) {
        return 0.0;
    }
    trip.steps = JSON.parse(trip.steps);
    return trip.steps[trip.steps.length-1][2] - trip.steps[0][2];
};


module.exports = {
    getTripDistance: getTripDistance,
    getTripDuration: getTripDuration
};
