'use strict';

const _ = require('underscore');
const errors = require('./../errors/lattis-errors');
const logger = require('./../utils/logger');
const encryptionHandler = require('./../handlers/encryption-handler');
const userHandler = require('./../model_handlers/users');
const operatorHandler = require('./../model_handlers/operators');
const requestHelperConstants = require('./../constants/request-helper-constants');
const moment = require('moment');


/**
 * This property is used to separate the user's name and the expiration date
 * in a decoded (not base64 encoded) authorization token.
 *
 * @type {string}
 * @private
 */
const authorizationTokenDeliminator = '*deliminator*';

/**
 * This property determines how many milli seconds and an authorization token will
 * be valid.
 *
 * @type {number}
 */
const authTokenExpirationTime = 28 * 24 * 3600 * 1000;

/**
 * This method will validate an incoming REST Token
 *
 * @param {object} requestHeaders
 * @param {String} userType
 * @param {Function} callback
 */
const isAuthorizationTokenValid = (requestHeaders, userType, callback) => {
    if (!_.has(requestHeaders, requestHelperConstants.headers.authorization)) {
        callback(errors.unauthorizedAccess(false), null, false, false);
        return;
    }
    const incomingRestToken = requestHeaders.authorization;
    const decryptedToken = decryptAuthToken(incomingRestToken);
    logger(decryptedToken.split(authorizationTokenDeliminator));
    const parts = decryptedToken.split(authorizationTokenDeliminator);
    if (parts.length !== 2) {
        callback(new Error('Authorization token is invalid format'), null, false, false);
        return;
    }
    const usersId = parts[0];

    _getAuthUser({users_id:usersId, type:userType}, (error, user) => {
        if (error) {
            logger('Error: failed to check authorization token validity with error:', error);
            callback(error, null, false, false);
            return;
        }

        if (!user) {
            logger(
                'Can not validate rest token. There is no user in database with users_id',
                usersId,
                'incoming token:',
                incomingRestToken
            );
            callback(errors.tokenInvalid(false), null, false, false);
            return;
        }

        if (user.rest_token !== incomingRestToken) {
            logger(
                'User rest token does not match incoming token. User token:',
                user.rest_token,
                'incoming token:',
                incomingRestToken
            );
            callback(null, user, false, false);
            return;
        }

        if (moment().unix() - parseInt(parts[2]) > authTokenExpirationTime) {
            // Token has expired.
            logger('Rest token for:', usersId, 'has expired');
            callback(null, null, false, true);
            return;
        }
        callback(null, user, true, false);
    });
};


/**
 * This method returns the unencrypted value of the user's authorization token.
 *
 * @param {string} encodedToken
 * @returns {*|string}
 */
const decryptAuthToken = (encodedToken) => {
    return encryptionHandler.decryptDbValue(encodedToken);
};

/**
 * This method returns the unencrypted value of the user's authorization token.
 *
 * @param {Object} user - to get the appropriate user profiles
 * @param {Function} callback
 */
const _getAuthUser = (user, callback) => {
    if (user.type === requestHelperConstants.userTypes.operator){
        operatorHandler.getOperators({username: user.users_id}, callback);
    }else {
        userHandler.getUsers(_.pick(user, 'users_id'), callback);
    }
};


module.exports = {
    isAuthorizationTokenValid: isAuthorizationTokenValid
};
