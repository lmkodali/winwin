'use strict';

const _ = require('underscore');
const responseCodes = require('./../helpers/response-codes');

function LattisError(message, code, name) {
    this.name = (!name) ? 'LattisError' : name;
    this.message = message || 'Default Message';
    this.code = code;
    this.stack = (new Error()).stack;
}

LattisError.prototype = Object.create(Error.prototype);
LattisError.prototype.constructor = LattisError;

module.exports = {
    missingParameter: function(formatForWire){
        const error = new LattisError(
            'There are one or more parameters missing in the supplied request',
            responseCodes.BadRequest,
            'MissingParameter'
        );
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    duplicateUser: function(formatForWire){
        const error = new LattisError('Duplicate user in database', responseCodes.Conflict, 'DuplicateUser');
        return formatForWire ? this.formatErrorForWire(error) : error;
    },

    invalidCreditCard: function(formatForWire) {
        const error = new LattisError('Invalid Card', responseCodes.Conflict, 'InvalidCard');
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    cardNotExist: function(formatForWire) {
        const error = new LattisError('Card Not Exist', responseCodes.Conflict, 'cardNotExist');
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    cardExist: function(formatForWire) {
        const error = new LattisError('Card Already Exist', responseCodes.Conflict, 'cardExist');
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    stripeConnectAccount: function(formatForWire) {
        const error = new LattisError('Stripe Connect Account Not Created', responseCodes.Conflict, 'stripeConnectAccount');
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    stripePayment: function(formatForWire) {
        const error = new LattisError('Stripe Payment Failure', responseCodes.Conflict, 'stripePayment');
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    unverifiedUser: function(formatForWire) {
        const error = new LattisError('Unverified User', responseCodes.Forbidden, 'UnverifiedUser');
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    invalidPassword: function(formatForWire){
        const error = new LattisError('Passwords do not match', responseCodes.Unauthorized, 'InvalidPassword');
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    internalServer: function(formatForWire){
        const error = new LattisError(
            'Internal server error',
            responseCodes.InternalServer,
            'InternalServerError'
        );
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    incorrectDatabase: function(formatForWire){
        const error = new LattisError(
            'Incorrect database selected',
            responseCodes.InternalServer,
            'IncorrectDatabase'
        );
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    tokenInvalid: function(formatForWire){
        const error = new LattisError('Token is invalid', responseCodes.TokenInvalid, 'InvalidToken');
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    fbAuthenticationFailure: function(formatForWire){
        const error = new LattisError(
            'Facebook Authentication Failed',
            responseCodes.Unauthorized,
            'FacebookAuthenticationFailure'
        );
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    failedRestCall: function(formatForWire){
        const error = new LattisError('Failed To Make Rest Call', 'FailedRestCall');
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    confirmationCodeInvalid: function(formatForWire){
        const error = new LattisError(
            'Registration code is invalid',
            responseCodes.Unauthorized,
            'InvalidRegistrationCode'
        );
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    resourceNotFound: function(formatForWire){
        const error = new LattisError('Resource Not Found', responseCodes.ResourceNotFound, 'ResourceNotFound');
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    unauthorizedAccess: function(formatForWire){
        const error = new LattisError(
            'Unauthorized access to resource',
            responseCodes.Unauthorized,
            'UnauthorizedAccess'
        );
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    lockAlreadyRegistered: function(formatForWire){
        const error = new LattisError(
            'This lock has already been registered',
            responseCodes.Conflict,
            'LockAlreadyRegistered'
        );
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    sharingLimitReached: function(formatForWire){
        const error = new LattisError(
            'This ellipse has been shared the maximum amount',
            responseCodes.Forbidden,
            'MaxSharingLimitReached'
        );
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    invalidParameter: function(formatForWire){
        const error = new LattisError(
            'Invalid parameter in request body',
            responseCodes.BadRequest,
            'InvalidParameter'
        );
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    apiLimitExceeded: function(formatForWire){
        const error = new LattisError(
            'Too many request made to API',
            responseCodes.BadRequest,
            'APILimitExceeded'
        );
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    cannotSendEmail: function(formatForWire){
        const error = new LattisError(
            'Cannot send Email at this time',
            responseCodes.InternalServer,
            'CannotSendEmail'
        );
        return formatForWire ? this.formatErrorForWire(error) : error;
    },
    noError: function(){
        return null;
    },
    errorWithMessage: function(error){
        return new LattisError((_.has(error, 'message') ? error.message : ''));
    },
    formatErrorForWire: function(lattisError){
        return _.omit(lattisError, 'stack');
    },
    customError: function(message, code, name, formatForWire){
        const error = new LattisError(message, code, name);
        return formatForWire ? this.formatErrorForWire(error) : error;
    }
};
