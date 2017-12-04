'use strict';

let express = require('express');
let path = require('path');
let router = express.Router();

/* Code for demo1 */
router.get('/demo1', function(req, res) {
	res.sendFile(path.join(__dirname, "../public/product-list.html"));
});

/* Code for demo2 */
router.get('/demo2', function(req, res) {
	res.sendFile(path.join(__dirname, "../public/product-list2.html"));
});

/* Code for demo3 */
router.get('/demo3', function(req, res) {
	res.sendFile(path.join(__dirname, "../public/product-list3.html"));
});

/* Code for demo4 */
router.get('/demo4', function(req, res) {
	res.sendFile(path.join(__dirname, "../public/product-list4.html"));
});

/* Code for demo5 */
router.get('/demo5', function(req, res) {
	res.sendFile(path.join(__dirname, "../public/product-list5.html"));
});

/* Code for login */
router.get('/demo5Login', function(req, res) {
	res.render('loginForm.ejs',{
		messages : req.flash('info')
	});
});

/* Code for register */
router.get('/demo5Register', function(req, res) {
	res.render('registerForm.ejs',{
		messages : req.flash('info')
	});
});

/* Code for list bank accounts */
router.post('/demo5BankAccounts', function(req, res) {
	res.sendFile(path.join(__dirname, "../public/bankAccounts.ejs"));
});

/* Code for list bank accounts */
router.post('/demo5BankAccountsList', function(req, res) {
	res.render(path.join(__dirname, "../public/bankAccounts.ejs"));
});

/* Code for Demo 5 Success */
router.get('/demo5PaymentSuccess', function(req, res) {
	res.render(path.join(__dirname, "../public/payment-success5.ejs"));
});


/* Code for login  DEMO 6 */
router.get('/demo6Login', function(req, res) {
	res.render('demo6Login.ejs',{
		messages : req.flash('info')
	});
});

/* Code for Forgotpassword  DEMO 6 */
router.get('/demo6ForgotPassword', function(req, res) {
	res.render('demo6ForgotPassword.ejs',{
		messages : req.flash('info')
	});
});

router.get('/demo6EmailVerified', function(req, res) {
	res.render('demo6EmailVerified.ejs',{
		messages : req.flash('info')
	});
});

/* Code for register DEMO 6 */
router.get('/demo6Register', function(req, res) {
	res.render('demo6Register.ejs',{
		messages : req.flash('info')
	});
});

/* Code for bank accounts list */
router.get('/demo6bankAccounts', function(req, res) {
	res.render('demo6bankAccounts.ejs',{
		messages : req.flash('info')
	});
});

/* Code for list buyer details */
router.post('/demo6buyerDetails',function(req,res){
	res.render('demo6buyerDetails.ejs',{
		messages : req.flash('info')
	});
});

/* Code for Add Admin  DEMO 6 */
router.get('/demo6AddAdmin', function(req, res) {
	res.render('demo6AddAdmin.ejs',{
		messages : req.flash('info')
	});
});

/* Code for List Admin  DEMO 6 */
router.get('/demo6AdminList', function(req, res) {
	res.render('demo6ListAdminList.ejs',{
		messages : req.flash('info')
	});
});

/* Code for Admin login  DEMO 6 */
router.get('/demo6AdminLogin', function(req, res) {
	res.render('demo6AdminLogin.ejs',{
		messages : req.flash('info')
	});
});

/* Code for Forgotpassword  DEMO 6 */
router.get('/demo6AdminForgotPassword', function(req, res) {
	res.render('demo6AdminForgotPassword.ejs',{
		messages : req.flash('info')
	});
});

/* Code for Admin register DEMO 6 */
router.get('/demo6AdminRegister', function(req, res) {
	res.render('demo6AdminRegister.ejs',{
		messages : req.flash('info')
	});
});

/* Code for Admin register DEMO 6 */
router.get('/demo6AddBuyer', function(req, res) {
	res.render('demo6AddBuyer.ejs',{
		messages : req.flash('info')
	});
});

/* Code for Admin register DEMO 6 */
router.get('/demo6BuyersList', function(req, res) {
	res.render('demo6BuyersList.ejs',{
		messages : req.flash('info')
	});
});

/* Code for Admin register DEMO 6 */
router.get('/demo6EditBuyer/:id', function(req, res) {
	res.render('demo6EditBuyer.ejs',{
		messages : req.flash('info')
	});
});

/* Code for Socialmedia register DEMO 6 */
router.get('/demo6socialmedia', function(req, res) {
	res.render('socialmedia.ejs',{
		messages : req.flash('info')
	});
});


/* Code for demo6 product list */
router.get('/demo6ProductList', function(req, res) {
	res.render('demo6ProductList.ejs',{
		messages : req.flash('info')
	});
});


router.get('/demo6SellerProfile', function(req, res) {
	res.render('demo6SellerProfile.ejs',{
		messages : req.flash('info')
	});
});

/* Code for Seller login  DEMO 6 */
router.get('/demo6SellerLogin', function(req, res) {
	res.render('demo6SellerLogin.ejs',{
		messages : req.flash('info')
	});
});

/* Code for List Sellers in admin DEMO 6 */
router.get('/demo6SellersList', function(req, res) {
	res.render('demo6SellersList .ejs',{
		messages : req.flash('info')
	});
});

/* Code for add seller Admin module  DEMO 6 */
router.get('/demo6AddSeller', function(req, res) {
	res.render('demo6AddSeller.ejs',{
		messages : req.flash('info')
	});
});

router.get('/privacypolicy',function(req,res){
	res.render('privacypolicy.ejs',{
		messages : req.flash('info')
	});
});

router.get('/termofuse',function(req,res){
	res.render('termOfUse.ejs',{
		messages : req.flash('info')
	});
});

router.get('/twitter',function(req,res){
	res.render('twitterLogin.ejs',{
		messages : req.flash('info')
	});
});

router.get('/facebook',function(req,res){
	res.render('facebookLogin.ejs',{
		messages : req.flash('info')
	});
});
module.exports = router;
