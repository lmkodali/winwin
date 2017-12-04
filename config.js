'use strict';

const _ = require('underscore');

const requiredParams = [
	'WINWIN_DB_USERNAME',
	'WINWIN_DB_PASSWORD',
	'WINWIN_DB_NAME',
	'WINWIN_DB_HOST',
	'WINWIN_LOG_PATH'
];

for (let i = 0; i < requiredParams.length; i++) {
	if (!_.has(process.env, requiredParams[i])) {
		console.log(
			'Error: environment variables have not been properly setup for the WinWin Platform. The variable:',
			requiredParams[i],
			'was not found.'
		);
		throw new Error('WinWin Platform Environment Variables Not Properly Set');
	}
}

module.exports = {
    databaseInfo: {
        userName: process.env.WINWIN_DB_USERNAME,
        password: process.env.WINWIN_DB_PASSWORD,
        databaseName: process.env.WINWIN_DB_NAME,
        host: process.env.WINWIN_DB_HOST
    }
};