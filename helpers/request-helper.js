'use strict';

const _ = require('underscore');
const errors = require('./../errors/lattis-errors');
const jsonResponse = require('./../utils/json-response');
const logger = require('./../utils/logger');
const authHelper = require('./../helpers/authorization-helper');
const requestHelperConstants = require('./../constants/request-helper-constants');


/**
 * This method will check if the user is valid to pass into the Api.
 *
 * @param {object} req
 * @param {object} res
 * @param {boolean} shouldCheckVerification
 * @param {function} callback
 */
const userAuthorizationValidator = (req, res, shouldCheckVerification, callback) => {
    if (!_.has(req.headers, requestHelperConstants.headers.authorization)) {
        logger('Failed to authorize user. No authorization token in the request headers.');
        jsonResponse(res, errors.tokenInvalid(true), null);
        callback(errors.tokenInvalid(false), null);
        return;
    }

    authHelper.isAuthorizationTokenValid(req.headers,
        requestHelperConstants.userTypes.user,
        (error, user, isValid, hasExpired) => {
        if (error) {
            logger('Error: authenticating authorization token:', error);
            jsonResponse(res, errors.formatErrorForWire(error), null);
            callback(error, user);
            return;
        }

        if (!isValid) {
            logger(
                'Failed to authenticate authorization token:',
                req.headers.authorization,
                'Rest token invalid'
            );
            jsonResponse(res, errors.tokenInvalid(true), null);
            callback(errors.tokenInvalid(false), user);
            return;
        }

        if (hasExpired) {
            logger(
                'Failed to authenticate authorization token:',
                req.headers.authorization,
                'Rest token has expired'
            );
            jsonResponse(res, errors.tokenInvalid(true), null);
            callback(errors.tokenInvalid(false), user);
            return;
        }

        if (!user) {
            logger('Failed to authenticate user:', user.user_id, 'no user in database');
            jsonResponse(res, errors.resourceNotFound(true), null);
            callback(errors.resourceNotFound(false), null);
        }

        if (shouldCheckVerification) {
            if (user.verified) {
                logger(user.users_id, 'has a valid auth token');
                callback(null, user);
            } else {
                logger('user:', user.users_id, 'is not verified');
                jsonResponse(res, errors.unauthorizedAccess(true), null);
                callback(errors.unauthorizedAccess(true), null);
            }
        } else {
            logger(user.users_id, 'has a valid auth token');
            callback(null, user);
        }
    });
};

/**
 * This method will check if the operator is valid to pass into the Api.
 *
 * @param {object} req
 * @param {object} res
 * @param {function} callback
 */
const operatorAuthorizationValidator = (req, res, callback) => {
    if (!_.has(req.headers, 'authorization')) {
        logger('Failed to authorize user. No authorization token in the request headers.');
        jsonResponse(res, errors.tokenInvalid(true), null);
        callback(errors.tokenInvalid(false), null);
        return;
    }

    authHelper.isAuthorizationTokenValid(req.headers,
        requestHelperConstants.userTypes.operator,
        (error, operator, isValid, hasExpired) => {
        if (error) {
            logger('Error: authenticating authorization token:', error);
            jsonResponse(res, errors.formatErrorForWire(error), null);
            callback(error, operator);
            return;
        }

        if (!isValid) {
            logger(
                'Failed to authenticate authorization token:',
                req.headers.authorization,
                'Rest token invalid'
            );
            jsonResponse(res, errors.tokenInvalid(true), null);
            callback(errors.tokenInvalid(false), operator);
            return;
        }

        if (hasExpired) {
            logger(
                'Failed to authenticate authorization token:',
                req.headers.authorization,
                'Rest token has expired'
            );
            jsonResponse(res, errors.tokenInvalid(true), null);
            callback(errors.tokenInvalid(false), operator);
            return;
        }

        if (!operator) {
            logger('Failed to authenticate user:', operator.username, 'no user in database');
            jsonResponse(res, errors.resourceNotFound(true), null);
            callback(errors.resourceNotFound(false), null);
        }
        logger(operator.username, 'has a valid auth token');
        callback(errors.noError(), operator);
    });
};


module.exports = {
    userAuthorizationValidator: userAuthorizationValidator,
    operatorAuthorizationValidator: operatorAuthorizationValidator
};
