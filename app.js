'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const routes = require('./routes/index');
const products = require('./routes/products');
const sellers = require('./routes/sellers');
const categories = require('./routes/categories');
const logger = require('./utils/logger');
const jsonResponse = require('./utils/json-response');
const errors = require('./errors/lattis-errors');
const passport = require('passport');
const multiparty = require('connect-multiparty');
const clear = require('clear');
const multipartyMiddleWare = multiparty();
const fileUpload = require('express-fileupload');
clear();

const app = express()

app.use(favicon(path.join(__dirname, './public/img', 'favicon.png')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'uploads')));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '50mb'}));
app.use(multipartyMiddleWare);
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
// start cs
app.set('views','./public');
app.set('view engine','ejs');
const flash=require('req-flash');
app.use(flash());
app.use(fileUpload());
//end cs

// import routes
app.use('/',routes);
app.use('/api/products',products);
app.use('/api/sellers',sellers);
app.use('/api/categories',categories);

// catch 404 and forward to error handler
app.use((req, res) => {
	logger('Error: No route found or Wrong method name');
	jsonResponse(res, errors.resourceNotFound(true), null);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use((err, req, res) => {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
			error: err
		});
	});
}

// production error handler
// no stack traces leaked to user
app.use((err, req, res) => {
	res.status(err.status || 500);
	res.render('error', {
	message: err.message,
		error: {}
	});
});

 app.listen(3000, function() {
        logger('Listening on port 3000' );
 });

module.exports = app;