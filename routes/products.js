'use strict';

const productsHandler = require('./../model_handlers/products-handler');
const errors = require('../errors/lattis-errors');
const responseCodes = require('../helpers/response-codes');
const jsonResponse = require('../utils/json-response');
const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const _ = require('underscore');
var md5 = require('md5');
const mysql = require('mysql');
var flash = require('req-flash');
var async = require('async');
var fs = require('fs');
var crypto = require('crypto');
var fileUpload = require('express-fileupload');

var connection = mysql.createConnection({
   host     : process.env.WINWIN_DB_HOST,
   user     : process.env.WINWIN_DB_USERNAME,
   password : process.env.WINWIN_DB_PASSWORD,
   database : process.env.WINWIN_DB_NAME
});


connection.connect(function(err) {
    if (err){
        console.log("Database Connection error : "+err);
        throw err;
    }
    else{
        console.log("Database connection succesful.");
    }
});
//End Database connection


router.get('/list-products', function(req, res) {
    let baseUrl = req.protocol + '://' + req.get('host');
    productsHandler.listProducts(function (error, products) {
        if (error) {
            jsonResponse(res, responseCodes.InternalServer, errors.internalServer(true), null);
            return;
        }
        for(let pro=0;pro<products.length;pro++){
            products[pro].tPhoto = baseUrl+'/products/'+products[pro].iProductId+'/'+products[pro].tPhoto;
        }
        jsonResponse(res, responseCodes.OK, errors.noError(), products);
    });
});

router.post('/add-product', function(req, res) {
    if (!_.has(req.body, 'iCategoryId') || !_.has(req.body, 'iSellerId') || !_.has(req.body, 'tTitle') || !_.has(req.body, 'tPhoto') || !_.has(req.body, 'dAmount' || !_.has(req.body, 'eFreeShipping'))) {
        logger('Error: Some Parameters are missing in this request');
        jsonResponse(res, errors.missingParameter(true), null);
        return;
    }
    productsHandler.addProduct(req.body, function(error,status) {
        if (error) {
            logger('Error: could not add product : ', error);
            jsonResponse(res, errors.formatErrorForWire(error), null);
            return;
        }
        jsonResponse(res, responseCodes.OK, errors.noError(), status);
    });
});

router.post('/edit-product', function(req, res) {
    if (!_.has(req.body, 'iProductId')) {
        logger('Error: Some Parameters are missing in this request');
        jsonResponse(res, errors.missingParameter(true), null);
        return;
    }
    productsHandler.editProduct(req.body, function(error,status) {
        if (error) {
            logger('Error: could not update product : ', error);
            jsonResponse(res, errors.formatErrorForWire(error), null);
            return;
        }
        jsonResponse(res, responseCodes.OK, errors.noError(), status);
    });
});

router.post('/edit-product', function(req, res) {
    if (!_.has(req.body, 'iProductId')) {
        logger('Error: Some Parameters are missing in this request');
        jsonResponse(res, errors.missingParameter(true), null);
        return;
    }
    productsHandler.editProduct(req.body, function(error,status) {
        if (error) {
            logger('Error: could not update product : ', error);
            jsonResponse(res, errors.formatErrorForWire(error), null);
            return;
        }
        jsonResponse(res, responseCodes.OK, errors.noError(), status);
    });
});

router.post('/stripe-charge', function(req, res) {
    const stripe = require("stripe")('sk_test_0blHDqbeNrogruXPieEXq6Ny');
    const path = require('path');
    let successUrl = path.dirname(require.main.filename);
    let baseUrl = req.protocol + '://' + req.get('host');
    let amount = req.body.dAmount;
    console.log(req.body.stripeToken);
    stripe.customers.create({
        email: req.body.stripeEmail,
        source: req.body.stripeToken
    })
    .then(customer =>
      stripe.charges.create({
        amount,
        description: "Sample Charge",
           currency: "usd",
           customer: customer.id
      }))
    .then(charge => 
        res.redirect(baseUrl+'/payment-success.html')
    );
});

router.post('/stripe-charge2', function(req, res) {
    let store = require('store2');
    const stripe = require("stripe")('sk_test_0blHDqbeNrogruXPieEXq6Ny');
    const path = require('path');
    let successUrl = path.dirname(require.main.filename);
    let baseUrl = req.protocol + '://' + req.get('host');
    let amount = req.body.dAmount;
    let platformFees = ((amount * req.body.iPercentageFees) / 100);
    let transferGroupCode = "order"+Math.floor(Math.random() * (9999 - 1111 + 1)) + 1111;
    stripe.charges.create({
      amount: amount,
      currency: "usd",
      source: "tok_visa",
      transfer_group: transferGroupCode,
    }).then(function(charge) {
        // Create a Transfer to the connected account (later):
        stripe.transfers.create({
          amount: platformFees,
          currency: "usd",
          destination: store('stripe_user_id'),
          transfer_group: transferGroupCode
        }).then(function(transfer) {
          console.log(transfer);
          res.redirect(baseUrl+'/payment-success2.html')
        });
    });
});

router.post('/stripe-charge3', function(req, res) {
    let store = require('store2');
    store.remove('stripe_installment_charge');    
    var remainingAmount = (req.body.dAmount - req.body.dDownPayment);
    var perInstallmentAmount = Math.ceil(remainingAmount/req.body.iNoOfInstallment);
    let payInstallment = {
        iNoOfInstallment : req.body.iNoOfInstallment,
        payPerInstallment : perInstallmentAmount,
        payInterestRate : req.body.iPercentageFees
    };
    store('stripe_installment_charge', payInstallment);
    const stripe = require("stripe")('sk_test_0blHDqbeNrogruXPieEXq6Ny');
    const path = require('path');
    let successUrl = path.dirname(require.main.filename);
    let baseUrl = req.protocol + '://' + req.get('host');
    let amount = Math.ceil(req.body.dDownPayment);
    let platformFees = Math.ceil((req.body.dDownPayment * req.body.iPercentageFees) / 100);
    let transferGroupCode = "order"+Math.floor(Math.random() * (9999 - 1111 + 1)) + 1111;
    stripe.charges.create({
      amount: amount,
      currency: "usd",
      source: "tok_visa",
      transfer_group: transferGroupCode,
    }).then(function(charge) {
        // Create a Transfer to the connected account (later):
        stripe.transfers.create({
          amount: platformFees,
          currency: "usd",
          destination: store('stripe_user_id'),
          transfer_group: transferGroupCode
        }).then(function(transfer) {
          res.redirect(baseUrl+'/payment-success3.html')
        });
    });
});

router.get('/stripe-charge3-ajax-call', function(req, res) {
    let store = require('store2');
    if(store('stripe_installment_charge')){
        var installment_charge = store('stripe_installment_charge');  
        store.remove('stripe_installment_charge');
        if(installment_charge.iNoOfInstallment>0){
            installment_charge.iNoOfInstallment-= 1;
            let payInstallment = {
                iNoOfInstallment : installment_charge.iNoOfInstallment,
                payPerInstallment : installment_charge.payPerInstallment,
                payInterestRate : installment_charge.payInterestRate
            };
            store('stripe_installment_charge', payInstallment);

            const stripe = require("stripe")('sk_test_0blHDqbeNrogruXPieEXq6Ny');
            const path = require('path');
            let successUrl = path.dirname(require.main.filename);
            let baseUrl = req.protocol + '://' + req.get('host');
            let amount = Math.ceil(installment_charge.payPerInstallment);
            let platformFees = Math.ceil((amount * installment_charge.payInterestRate) / 100);
            let transferGroupCode = "order"+Math.floor(Math.random() * (9999 - 1111 + 1)) + 1111;
            stripe.charges.create({
              amount: amount,
              currency: "usd",
              source: "tok_visa",
              transfer_group: transferGroupCode,
            }).then(function(charge) {
                // Create a Transfer to the connected account (later):
                stripe.transfers.create({
                  amount: platformFees,
                  currency: "usd",
                  destination: store('stripe_user_id'),
                  transfer_group: transferGroupCode
                }).then(function(transfer) {
                  console.log(payInstallment);
                });
            });
        }
    }
});

router.get('/stripe-connect-account', function(req, res) {
    let baseUrl = req.protocol + '://' + req.get('host');
    let request = require('request');
    let myObj = {
        client_secret: 'sk_test_0blHDqbeNrogruXPieEXq6Ny', 
        code: req.query.code,
        grant_type : 'authorization_code'
    }

    request({
        url: "https://connect.stripe.com/oauth/token",
        method: "POST",
        json: true,   // <--Very important!!!
        body: myObj
    }, function (error, response, body){
        if (error) {
            console.log(error);
            logger('Error: stripe error:', errors.errorWithMessage(error));
            callback(errors.internalServer(false), null);
            return;
        }
        let store = require('store2');
        store('stripe_user_id', body.stripe_user_id)
        res.redirect(baseUrl+'/demo3');
    });
});

//STRIPE PLAID INTEGRATION (REAL ACCOUNT)
router.post('/stripe-charge4', function(req, res) {
    // Using Plaid's Node.js bindings (https://github.com/plaid/plaid-node)
    var plaid = require('plaid');
    var plaidClient = new plaid.Client('59bf97694e95b85652804861',
                                       '1b83f2284f78b3f5a90ea2a393e7ac',
                                       'fbe1cc3bcc84559827cff90979f305',
                                       plaid.environments.development);
    plaidClient.exchangePublicToken(req.query.public_token, function(err, resExchange) {
    var accessToken = resExchange.access_token;
    console.log('Access Token : ' + accessToken);
    // Generate a bank account token
    plaidClient.createStripeToken(accessToken, req.query.account_id, function(err, resCreateToken) {
    var bankAccountToken = resCreateToken.stripe_bank_account_token;
    console.log('Bank Account Token : ' + bankAccountToken);
    // Get the bank token submitted by the form
    var tokenID = bankAccountToken;
    // Create a Customer
    const stripe = require("stripe")('sk_live_yHaX0pipxf1W17dEsb77fRTk');
    stripe.customers.create({
        source: tokenID,
        description: "Lauren's Plaid Payment"
        },  function(err, customer) {
            console.log("CustomerErr : " + err);
            console.log("Customer Obj : " + customer);
            stripe.charges.create({
                amount: req.query.amount,
                currency: "usd",
                customer: customer.id,
                source:customer.default_source
                }, function(err, chargeRes) {
                    console.log("Creating charge : " + err);
                    console.log("Charge Response : " + chargeRes);
                    res.send(chargeRes);
                });
            });
        });
    });
});

//STRIPE MICRO TRANSACTION INTEGRATION (TEST ACCOUNT)
router.post('/stripe-charge5', function(req, res) {
    let baseUrl = req.protocol + '://' + req.get('host');
    let amount = req.body.dAmount;
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
    let store = require('store2');
    var routing_number=req.body.routingNumber; 
    var account_number= req.body.accountNumber;
    var account_holder_name=req.body.accountHolderName;
    var account_holder_type=req.body.accountHolderType;
    console.log("Account Routing Number : "+routing_number);
    console.log("Account Number : "+account_number);
    console.log("Account Holder Name : "+account_holder_name);
    console.log("Account Holder Type : "+account_holder_type);
     stripe.tokens.create({
        'bank_account': {
        country: 'us',
        currency: 'usd',
        routing_number:req.body.routingNumber, 
        account_number: req.body.accountNumber,
        account_holder_name:req.body.accountHolderName,
        account_holder_type:req.body.accountHolderType
        }
    }, function(err,result) {
        if(err){
         res.send("\n <a href='/demo5'>Buy Again?</a><br><br>Error Type: "+err.type+"<br>"+err);
                        return false;
        }
        if(result){
            // Get the bank token submitted by the form
            var tokenID = result.id;
            // Create a Customer
            stripe.customers.create({
            source: tokenID,
            description:account_holder_name+ "'s Micro Transaction Payment",
            }, function(err, customer) {
                    //Varify customers bank account
                    if(err){
                        res.send("\n <a href='/demo5'>Buy Again?</a><br><br>Error Type: "+err.type+"<br>"+err);
                        return false;
                    }
                    if(customer){
                        res.redirect('/demo5?msg="Customer_created"');
                    }
                });
            }
        else {
            res.send("\n <a href='/demo5'>Buy Again?</a><br><br>Error Type: "+err.type+"<br>"+err);
            return false;

        }
    });
});

//Register New Customer
router.post('/register',function(req,res){
    var fname=req.body.firstName;
    var lname=req.body.lastName;
    var email=req.body.emailid;
    var password=md5(req.body.pwd);
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
    //sk_live_yHaX0pipxf1W17dEsb77fRTk
    //sk_test_R1lTgEqRcnMjAUsO0BR9sjBB
    var sql="SELECT * FROM customers WHERE email='"+email+"'";
    connection.query(sql,function(err,result){
        if(err){
            return false;
        }
        else{
            if(result.length==0){
                stripe.customers.create({
                    email:email,
                    description: 'Customer for '+email
                    }, function(err, customer) {
                    if (err){
                        return false;
                    }
                    else{
                        var stripe_cust_id=customer.id;       
                        var sql="INSERT INTO customers (stripe_cust_id,fname,lname,email,password) VALUES('"+stripe_cust_id+"','"+fname+"','"+lname+"','"+email+"','"+password+"')";
                        connection.query(sql, function (err, result) {
                            if (err) {
                                throw err;
                            }
                            else{
                                req.flash('info', 'Thank you for sign up at winwin!');
                                res.redirect('/demo5Login');
                            }        
                        });    
                    }
                }); 
            } //end result.length         
            else{
                req.flash('info', 'Email ID Already exist!');
                res.redirect('/demo5Register');
            }  
        }
    }); 
});

//Check Login
router.post('/checkLogin',function(req,res){
    var email=req.body.emailid;
    var password=md5(req.body.pwd);
    var sql="SELECT * FROM customers WHERE email='"+email+"'AND password='"+password+"'";
        connection.query(sql, function (err, result) {
        if (err) {
            throw err;
            return false;
        }
        if(result==''){
            req.flash('info', 'Invalid Email ID or Password!');
            res.redirect('/demo5Login');
        }
        else{
            req.session.stripe_cust_id=result[0].stripe_cust_id;
            req.session.fname=result[0].fname;
            req.session.lname=result[0].lname;
            req.session.email=result[0].email;
            req.session.customer_id=result[0].customer_id;
            var customer_id=result[0].customer_id;
            return res.redirect('/api/products/bank_details_list');
        }
    });    
});

//list bank details 
router.get('/bank_details_list',function(req,res){
    if(req.session.customer_id){
        var sql="SELECT * FROM bank_details where customer_id='"+req.session.customer_id+"'";
            connection.query(sql, function (err, bank_details) {
                if (err) {
                    throw err;
                }
                else{
                    res.render('bankAccounts',{
                        bank_details:bank_details,
                        customer_id:req.session.customer_id,
                        messages : req.flash('info')
                    });
                }                                        
        });
    }
    else {
        req.flash('info', 'Unauthorize access!');
        res.redirect('/demo5Login');
    }
})
//Add Bank Account
router.post('/addBankAccount',function(req,res){
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
    //sk_live_yHaX0pipxf1W17dEsb77fRTk
    //sk_test_R1lTgEqRcnMjAUsO0BR9sjBB
    var routing_number=req.body.routing_no;
    var account_number=req.body.acc_number;
    var account_holder_name=req.body.acc_holder_name;
    var account_holder_type=req.body.acc_holder_type;
    var customer_id=req.body.customer_id;
    var sql="SELECT * FROM bank_details WHERE account_number='"+account_number+"' AND customer_id='"+customer_id+"'AND routing_number='"+routing_number+"'";
    connection.query(sql,function(err,result){
        if(err){
            throw err;
            return false;
        }
        else{
            if(result==0){
                stripe.tokens.create({
                    'bank_account': {
                    country: 'us',
                    currency: 'usd',
                    routing_number:routing_number, 
                    account_number:account_number ,
                    account_holder_name:account_holder_name,
                    account_holder_type:account_holder_type
                    }
                }, function(err,result) {
                    if(err){
                        req.flash('info', 'Stripe - Error! while creating Bank Token.');
                        res.redirect('bank_details_list');
                    }
                    else{
                        var tokenID = result.id; 
                        var bank_acc_id = result.bank_account.id;
                        stripe.customers.update(req.session.stripe_cust_id, {
                            source:tokenID
                        }, function(err, customer) {
                            if(err){
                                req.flash('info', 'Stripe - Error! while adding bank account.');
                                res.redirect('bank_details_list');
                                console.log("Customer update failed");
                                return false;
                            }
                            else{
                                var sql="INSERT INTO bank_details (customer_id,routing_number,account_number,account_holder_name,account_holder_type,bank_acc_id) VALUES('"+customer_id+"','"+routing_number+"','"+account_number+"','"+account_holder_name+"','"+account_holder_type+"','"+bank_acc_id+"')";
                                connection.query(sql, function (err, result) {
                                    if (err) {
                                        throw err;
                                    }
                                    else{
                                        var sql="SELECT * FROM bank_details";
                                        connection.query(sql, function (err, result) {
                                            if (err) {
                                                throw err;
                                            }
                                            else{
                                                req.flash('info', 'Bank account added successfully.');
                                                res.redirect('bank_details_list');
                                            }                                        
                                        });
                                    }
                                });                
                            }
                        });
                    }
                });
            }
            else{
                req.flash('info', 'Bank account already exists.');
                return res.redirect('/api/products/bank_details_list');
            }
        }
    });
    
});

router.post('/buynow_dashboard',function(req,res){
    req.session.bank_acc_id=req.body.id;
    res.send(req.session.bank_acc_id);
});

//purchase and make payment
router.post('/purchase',function(req,res){
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
    /*sk_live_yHaX0pipxf1W17dEsb77fRTk*/
    /*sk_test_R1lTgEqRcnMjAUsO0BR9sjBB*/
     stripe.charges.create({
        amount:req.body.amount,
        currency: "usd",
        customer: req.session.stripe_cust_id, // Previously stored, then retrieved       
        source :req.session.bank_acc_id
        },function(err, stripeChargeRes) {
            if(err){
                req.flash('info', 'Stripe payment failed.');
                return res.redirect('/api/products/bank_details_list');
            }
            else {
                req.session.bank_acc_id='';
                res.redirect('/demo5PaymentSuccess');
            }
        });

});
//demo5 logout
router.get('/logout',function(req,res){
    req.session.destroy();
    res.redirect('/demo5Login');
});
//demo5 verify bank account
router.post('/bank-verify',function(req,res){
    var bank_full_acc=req.body.bank_full_acc;
    var bank_acc=req.body.bank_acc;
    var bank_acc_id=req.body.bank_acc_id;
    var deposit1=req.body.first_deposit;
    var deposit2=req.body.second_deposit;
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
    /*sk_live_yHaX0pipxf1W17dEsb77fRTk
    sk_test_R1lTgEqRcnMjAUsO0BR9sjBB*/
    stripe.customers.retrieve(
        req.session.stripe_cust_id,
        function(err, customer) {
            console.log("customer : "+customer);
        // asynchronously called
        stripe.customers.verifySource(
            req.session.stripe_cust_id,
            bank_acc_id,
            {
               amounts: [deposit1,deposit2]
            },function(err, bankAccount) {
            if(err){
                req.flash('info', 'Bank account verification failed.');
                return res.redirect('/api/products/bank_details_list');                        
            }
            else{
                console.log("Bank account verified");
                var sql="UPDATE bank_details SET status='Verified' where account_number='"+bank_full_acc+"'";
                connection.query(sql, function (err, bank_details) {
                    req.flash('info', 'Bank account verify successfully.');
                    res.redirect('bank_details_list');
                });
            }
        });
    });
});

//demo6 register 
router.post('/demo6register',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var name = req.body.uname;
    var email = req.body.emailid;
    var phone = req.body.mobile;
    var fb_id = req.body.fb_id;
    var algorithm="aes256";
    var key="encrypt";
    var cipher = crypto.createCipher(algorithm, key); 
    var encrypted = cipher.update(req.body.pwd, 'utf8', 'hex') + cipher.final('hex'); 
    var password =encrypted;
    var date =new Date();
    var dd =date.getDate();
    var mm=date.getMonth();
    var yyyy=date.getFullYear();
    var minutes=date.getMinutes();
    var hours=date.getHours();  
    var seconds=date.getSeconds();    
    var dt =mm+"/"+ dd +"/"+yyyy;
    var time=hours+":"+ minutes +":"+seconds;
    var otp = Math.floor(Math.random()*89999+10000);
    var share_id = Math.floor(Math.random()*89999+10000);
    var api_key = 'key-43cf4c016eb85a389fc22df0dd7bf6f4';
    var domain = 'dotzapper.com';
    var file = fs.readFileSync('./emailTemplateOTPWinWin.html', "utf8");
    var file2 = fs.readFileSync('./emailTemplateEmailVerifyWinWin.html', "utf8");
    file = file.replace('#NAME#',name);
    file = file.replace('#OTP#',otp);
    file = file.replace('#OTPDATE#',dt);
    file = file.replace('#OTPTIME#',time);
    file2 = file2.replace('#LINK#',fullUrl+'/api/products/verify/'+email);
    var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});
      var data1 = {
          from: 'Win Win <demo1.testing1@gmail.com>',
          to: email,
          subject: 'WinWin Email Verification Code',
          html: file2
        };
        mailgun.messages().send(data1, function (error, body) {
            var data2 = {
              from: 'Win Win <demo1.testing1@gmail.com>',
              to: email,
              subject: 'WinWin OTP Verification Code',
              html: file
            };
            mailgun.messages().send(data2, function (error, body) {
                var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
                //sk_live_yHaX0pipxf1W17dEsb77fRTk
                //sk_test_R1lTgEqRcnMjAUsO0BR9sjBB
                var sql="SELECT * FROM ts_buyers WHERE email='"+email+"'";
                connection.query(sql,function(err,result){
                    if(err){
                        console.log("Database connection error");
                        return false;
                    }
                    else{
                        if(result.length==0){
                            stripe.customers.create({
                                email:email,
                                description: 'Customer for '+email
                                }, function(err, customer) {
                                if (err){
                                    req.flash('info', 'Stripe customer creation error.');
                                    res.redirect('/demo6Register');
                                }
                                else{
                                    var stripe_customer_id=customer.id;   
                                    if(fb_id!='')
                                    {
                                        var trust_score=25;
                                    }   
                                    else
                                    {
                                        var trust_score=0;
                                    } 
                                    var sql="INSERT INTO ts_buyers (stripe_customer_id,name,email,phone,password,fb_id,otp_code,share_id,invite_id,trust_score) VALUES('"+stripe_customer_id+"','"+name+"','"+email+"','"+phone+"','"+password+"','"+fb_id+"','"+otp+"','"+share_id+"','"+req.body.invite_id+"','"+trust_score+"')";
                                    connection.query(sql, function (err, result) {
                                        if (err) {
                                            throw err;
                                        }
                                        else{
                                           
                                            if(req.body.invite_id)
                                            {
                                                 var  getInvite_id=("select * from ts_buyers where invite_id='"+req.body.invite_id+"'");
                                                connection.query(getInvite_id,function(err,getinvite_id){
                                                    if(getinvite_id.length<=4){
                                                        var fetchBuyersDetails = ("select * from ts_buyers where share_id='"+req.body.invite_id+"'");
                                                        connection.query(fetchBuyersDetails,function(err,fetchBuyersDetails){
                                                            var trustscore=fetchBuyersDetails[0].trust_score+50 ;                                                   
                                                            var updateTrustScore="update ts_buyers set trust_score='"+trustscore+"' where share_id='"+fetchBuyersDetails[0].share_id+"'";
                                                            connection.query(updateTrustScore,function(err,updateTrustScore){
                                                                var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"'";
                                                                connection.query(transactionSql, function (err, transaction) {
                                                                    req.flash('info', 'Thank you for sign up at winwin!');
                                                                    res.redirect('/demo6Login');
                                                                });    
                                                            });
                                                       });
                                                    }
                                                    else{
                                                        req.flash('info', 'Thank you for sign up at winwin!');
                                                        res.redirect('/demo6Login');
                                                    }
                                                });
                                            }
                                            else
                                            {
                                                req.flash('info', 'Thank you for sign up at winwin!');
                                                res.redirect('/demo6Login');
                                            }
                                        }        
                                    });    
                                }
                            });//end stripe customer creation 
                        } //end result.length         
                        else{
                            req.flash('info', 'Email ID Already exist!');
                            res.redirect('/demo6Register');
                        }  
                    }
                }); 
            });
        });
});

//demo6 send email or otp from tabs
router.get('/sendMail/:email/:type',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var email=req.params.email;
    var type=req.params.type;
    var date =new Date();
    var dd =date.getDate();
    var mm=date.getMonth();
    var yyyy=date.getFullYear();
    var minutes=date.getMinutes();
    var hours=date.getHours();  
    var seconds=date.getSeconds();    
    var dt =mm+"/"+ dd +"/"+yyyy;
    var time=hours+":"+ minutes +":"+seconds;
    var otp = Math.floor(Math.random()*89999+10000);
    var api_key = 'key-43cf4c016eb85a389fc22df0dd7bf6f4';
    var domain = 'dotzapper.com';
    if(type=='email')
    {
        var file = fs.readFileSync('./emailTemplateEmailVerifyWinWin.html', "utf8");
        file=file.replace('#LINK#',fullUrl+'/api/products/verify/'+email);
        var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});
        var data = {
          from: 'Win Win <demo1.testing1@gmail.com>',
          to: email,
          subject: 'WinWin Email Verification Code',
          html: file
        };
        mailgun.messages().send(data, function (error, body) {
        }); 
    }
    if(type=='otp')
    {
        var file2 = fs.readFileSync('./emailTemplateOTPWinWin.html', "utf8");
        file2 = file2.replace('#NAME#',req.session.name);
        file2 = file2.replace('#OTP#',otp);
        file2 = file2.replace('#OTPDATE#',dt);
        file2 = file2.replace('#OTPTIME#',time);
        var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});
        var data2 = {
          from: 'Win Win <demo1.testing1@gmail.com>',
          to: email,
          subject: 'WinWin OTP Verification Code',
          html: file2
        };
        mailgun.messages().send(data2, function (error, body) {
            console.log(body);
        });
    }
    var getprofileDetails="select * from ts_buyers where email='"+email+"'";
    connection.query(getprofileDetails, function (err, result) {
        var updateOtp="update ts_buyers set otp_code='"+otp+"' where email='"+email+"'";
        connection.query(updateOtp, function (err, updatedotp) {
            var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
            connection.query(bankaccountsql, function (err, bankaccount) {
               var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                connection.query(cardDetailssql, function (err, cardDetails) {
                    var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"'";
                    connection.query(transactionSql, function (err, transaction) {
                        req.session.tab='profile';
                        var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                        req.flash('info','We have sended Email to Your account,Please Check it.');
                        res.render('demo6buyerDetails',{
                            stripe_customer_id :req.session.stripe_customer_id,
                            buyer_id : req.session.buyer_id,
                            name : req.session.name,
                            email : req.session.email,
                            phone : req.session.phone,
                            address : result[0].address,
                            country : result[0].country,
                            city : result[0].city,
                            zip_code : result[0].zip_code,
                            unique_id : result[0].unique_id,
                            stripe_customer_id : result[0].stripe_customer_id,
                            email_status : result[0].email_status,
                            phone_status : result[0].phone_status,
                            share_link : share_link,
                            share_id : result[0].share_id,
                            trust_score : result[0].trust_score,
                            otp_code : result[0].otp_code,
                            edu_emp : result[0].edu_emp,
                            tab:req.session.tab,
                            bankaccount :bankaccount,
                            cardDetails : cardDetails,
                            result : result[0],
                            messages : req.flash('info')
                        }); 
                    });    
                });            
            })            
        });
    });
});

//demo6 Verify Email id 
router.get('/verify/:email',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var sql="select * from ts_buyers where email='"+req.params.email+"'";
    connection.query(sql, function (err, result) {
        if(result.length>0)
        {
            var trustscore=result[0].trust_score+25;
            var emailVerify="update ts_buyers set email_status='verified',trust_score='"+trustscore+"' where email='"+req.params.email+"'";
                connection.query(emailVerify, function (err, result1) {
                    req.session.stripe_customer_id=result[0].stripe_customer_id;
                    req.session.buyer_id=result[0].buyer_id;
                    req.session.name=result[0].name;
                    req.session.email=result[0].email;            
                    req.session.phone=result[0].phone;
                    res.redirect('/demo6EmailVerified');
                });
        }
        else
        {

        }
    });
});

//view all transactions of logged in user
router.get('/demo6AdminListTransactions',function(req,res){
    var transactionSql="SELECT * FROM ts_transactions ORDER BY transaction_id DESC" ;
    connection.query(transactionSql, function (err, transaction) {
        res.render('demo6AdminTransactionList',{
            email : req.session.email,
            name : req.session.name,
            transaction : transaction,
            messages : req.flash('info')
        }); 
    });    
}); 

//called when ajax call 
router.get('/demo6ShowAdminListTransactions',function(req,res){
    var transactionSql="SELECT * FROM ts_transactions ORDER BY transaction_id DESC" ;
    connection.query(transactionSql, function (err, transaction) {
        req.flash('info','Transaction disputed successfully.');
        res.render('demo6AdminTransactionList',{
            email : req.session.email,
            name : req.session.name,
            transaction : transaction,
            messages : req.flash('info')
        }); 
    });    
}); 


//view all transactions of logged in user
router.get('/demo6ViewTransactions',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var getprofileDetails="select * from ts_buyers where email='"+req.session.email+"'";
    connection.query(getprofileDetails, function (err, result) {
        var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
        connection.query(bankaccountsql, function (err, bankaccount) {
           var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
            connection.query(cardDetailssql, function (err, cardDetails) {
                var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                connection.query(transactionSql, function (err, transaction) {
                    var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                    req.session.tab = 'recentTransaction';
                    res.render('demo6buyerDetails',{
                        stripe_customer_id :req.session.stripe_customer_id,
                        buyer_id : req.session.buyer_id,
                        name : req.session.name,
                        email : req.session.email,
                        phone : req.session.phone,
                        address : result[0].address,
                        country : result[0].country,
                        city : result[0].city,
                        zip_code : result[0].zip_code,
                        unique_id : result[0].unique_id,
                        stripe_customer_id : result[0].stripe_customer_id,
                        email_status : result[0].email_status,
                        phone_status : result[0].phone_status,
                        share_link : share_link,
                        share_id : result[0].share_id,
                        trust_score : result[0].trust_score,
                        otp_code : result[0].otp_code,
                        edu_emp : result[0].edu_emp,
                        tab:req.session.tab,
                        transaction : transaction,
                        bankaccount :bankaccount,
                        cardDetails : cardDetails,
                        result : result[0],
                        messages : req.flash('info')
                    }); 
                });    
            });            
        })            
    });
}); 

//view all transactions of logged in seller
router.get('/demo6SellerListTransactions',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var transactionSql="SELECT * FROM ts_transactions WHERE seller_id='"+req.session.seller_id+"' ORDER BY transaction_id DESC" ;
    connection.query(transactionSql, function (err, transaction) {
        res.render('demo6SellerTransactionList',{
            seller_id : req.session.seller_id,
            name : req.session.name,
            email : req.session.email,
            phone : req.session.phone,
            transaction : transaction,
            messages : req.flash('info')
        }); 
    });    
}); 


// Demo6 check seller  already exist or not
router.post('/demo6SellerCheckLogin',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var email=req.body.emailid;
    var algorithm="aes256";
    var key="encrypt";
    var cipher = crypto.createCipher(algorithm, key); 
    var encrypted = cipher.update(req.body.pwd, 'utf8', 'hex') + cipher.final('hex'); 
    var fetchSellerssql="SELECT * FROM ts_sellers WHERE email='"+email+"'AND password='"+encrypted+"'" ;
    connection.query(fetchSellerssql, function (err, sellers) {
        if(sellers.length==0){
            req.flash('info', 'Invalid Email ID or Password!');
            res.redirect('/demo6SellerLogin');
        }
        else{
            var checkStatus="SELECT * FROM ts_sellers WHERE email='"+email+"'AND status='Active'" ;
            connection.query(checkStatus, function (err, result) {
                if(result.length==0){
                    req.flash('info', 'Your account is deactivated by admin.');
                    res.redirect('/demo6SellerLogin'); 
                }
                else{
                    req.session.seller_id=result[0].seller_id;
                    req.session.name=result[0].seller_name;
                    req.session.email=result[0].email;            
                    req.session.mobile=result[0].mobile;
                    res.redirect('/api/products/demo6SellerProfile');
                }    
            });    
        }
    });    
});

//Demo6 seller profile
router.get('/demo6SellerProfile',function(req,res){
    var fetchSellersql="SELECT * FROM ts_sellers where seller_id ='"+req.session.seller_id+"'";
    connection.query(fetchSellersql, function (err, seller) {
        res.render('demo6SellerProfile',{
            email : req.session.email,
            name : req.session.name,
            seller : seller[0],
            messages : req.flash('info')
        });
    });    
});

//Demo6 Seller Logout
router.get('/demo6SellerLogout',function(req,res){
    req.session.destroy();
    res.redirect('/demo6SellerLogin');
});
// demo6 purchase
router.post('/demo6Purchase',function(req,res){
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
    /*sk_live_yHaX0pipxf1W17dEsb77fRTk*/
    /*sk_test_R1lTgEqRcnMjAUsO0BR9sjBB*/
    var amount=req.body.amount/100;
    stripe.charges.create({
        amount:req.body.amount,
        currency: "usd",
        customer: req.session.stripe_customer_id, // Previously stored, then retrieved       
        source :req.session.stripe_bank_account_id
        },function(err, stripeChargeRes) {
            var stripe_payment_id=stripeChargeRes.id;
            if(err){
                console.log("Stripe payment failed");
                req.flash('info', 'Stripe payment failed.');
                return res.redirect('/api/products/bank_details_list');
            }
            else {
                var highestGoodTransactionSql = "select stripe_customer_id ,count(transaction_status) as count from ts_transactions where transaction_status='Good Transaction' group by stripe_customer_id order by count desc limit 1";
                connection.query(highestGoodTransactionSql, function (err, highestGoodTransactions) {      
                    var highestGoodTransactionCustomer = highestGoodTransactions[0].stripe_customer_id ;
                    var transactionSql="insert into ts_transactions(buyer_id,stripe_customer_id,seller_name,transaction_type,product_name,transaction_amount,stripe_payment_id,seller_id) values('"+req.session.buyer_id+"','"+req.session.stripe_customer_id+"','"+req.body.product_seller+"','Bank','"+req.body.product_name+"','"+amount+"','"+stripe_payment_id+"','"+req.body.seller_id+"')";
                    connection.query(transactionSql, function (err, transaction) {
                        res.redirect('/api/products/demo6PurchaseGoodTransaction/'+highestGoodTransactionCustomer);
                        /*req.flash("info",'Payment successful.');
                        res.redirect('/demo6ProductList');        */
                        /*res.render('demo6ProductList',{
                            messages : req.flash('info')
                        });*/
                    });         
                });    
            }
        });
});

//checking good transaction at time of Purchase made 
router.get('/demo6PurchaseGoodTransaction/:id',function(req,res){
    console.log("in demo6purchasegoodtransaction");
    var highestGoodTransactionCustomer = req.params.id;
    console.log("Already Good customer: "+highestGoodTransactionCustomer);
    var newhighestGoodTransactionSql = "select stripe_customer_id ,count(transaction_status) as count from ts_transactions where transaction_status='Good Transaction' group by stripe_customer_id order by count desc limit 1";
    connection.query(newhighestGoodTransactionSql, function (err, newhighestGoodTransactions) {      
        var newhighestGoodTransactionCustomer = newhighestGoodTransactions[0].stripe_customer_id ;
        console.log("New Good customer: "+newhighestGoodTransactionCustomer);
        if(newhighestGoodTransactionCustomer ==  highestGoodTransactionCustomer){
            console.log("Already given");
            var transactionSql="SELECT * FROM ts_transactions " ;
            connection.query(transactionSql, function (err, transaction) {
                //req.flash("info",'Payment successful.');
                res.redirect('/demo6ProductList');        
                /*res.render('demo6ProductList',{
                    messages : req.flash('info')
                });*/
            });
        }
        else{
            console.log("give+300");
            var fetchTrustScore="SELECT trust_score FROM ts_buyers WHERE stripe_customer_id='"+newhighestGoodTransactionCustomer+"'" ;
            connection.query(fetchTrustScore, function (err, trustScore) {
                var trust_score = trustScore[0].trust_score+300;
                var updatedTrustScoreSql="update ts_buyers set trust_score='"+trust_score+"'where  stripe_customer_id='"+newhighestGoodTransactionCustomer+"'";
                connection.query(updatedTrustScoreSql, function (err, newTrustScore) {
                    var transactionSql="SELECT * FROM ts_transactions ORDER BY transaction_id DESC" ;
                    connection.query(transactionSql, function (err, transaction) {
                        //req.flash("info",'Payment successful.');
                        res.redirect('/demo6ProductList');        
                        /*res.render('demo6ProductList',{
                            messages : req.flash('info')
                        });*/
                    });
                });//update trust score
            });//fetch trust score 
        }
    });//newhighest good transaction    
});


//Bank accounts List
router.get('/demo6BankAccountsList',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var getprofileDetails="select * from ts_buyers where email='"+req.session.email+"'";
    connection.query(getprofileDetails, function (err, result) {
        var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
        connection.query(bankaccountsql, function (err, bankaccount) {
           var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
            connection.query(cardDetailssql, function (err, cardDetails) {
                var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                connection.query(transactionSql, function (err, transaction) {
                    var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                    req.session.tab = 'bankaccounts';
                    res.render('demo6buyerDetails',{
                        stripe_customer_id :req.session.stripe_customer_id,
                        buyer_id : req.session.buyer_id,
                        name : req.session.name,
                        email : req.session.email,
                        phone : req.session.phone,
                        address : result[0].address,
                        country : result[0].country,
                        city : result[0].city,
                        zip_code : result[0].zip_code,
                        unique_id : result[0].unique_id,
                        stripe_customer_id : result[0].stripe_customer_id,
                        email_status : result[0].email_status,
                        phone_status : result[0].phone_status,
                        share_link : share_link,
                        share_id : result[0].share_id,
                        trust_score : result[0].trust_score,
                        otp_code : result[0].otp_code,
                        edu_emp : result[0].edu_emp,
                        tab:req.session.tab,
                        transaction : transaction,
                        bankaccount :bankaccount,
                        cardDetails : cardDetails,
                        result : result[0],
                        messages : req.flash('info')
                    }); 
                });    
            });            
        })            
    });
}); 
//view all transactions of logged in user
router.get('/demo6ViewProfile',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var getprofileDetails="select * from ts_buyers where email='"+req.session.email+"'";
    connection.query(getprofileDetails, function (err, result) {
        var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
        connection.query(bankaccountsql, function (err, bankaccount) {
           var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
            connection.query(cardDetailssql, function (err, cardDetails) {
                var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                connection.query(transactionSql, function (err, transaction) {
                    var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                    req.session.tab = 'profile';
                    res.render('demo6buyerDetails',{
                        stripe_customer_id :req.session.stripe_customer_id,
                        buyer_id : req.session.buyer_id,
                        name : req.session.name,
                        email : req.session.email,
                        phone : req.session.phone,
                        address : result[0].address,
                        country : result[0].country,
                        city : result[0].city,
                        zip_code : result[0].zip_code,
                        unique_id : result[0].unique_id,
                        stripe_customer_id : result[0].stripe_customer_id,
                        email_status : result[0].email_status,
                        phone_status : result[0].phone_status,
                        share_link : share_link,
                        share_id : result[0].share_id,
                        trust_score : result[0].trust_score,
                        otp_code : result[0].otp_code,
                        edu_emp : result[0].edu_emp,
                        tab:req.session.tab,
                        transaction : transaction,
                        bankaccount :bankaccount,
                        cardDetails : cardDetails,
                        result : result[0],
                        messages : req.flash('info')
                    }); 
                });    
            });            
        })            
    });
});    

// Demo6 Check Login user exist or not
router.post('/demo6checkLogin',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var email=req.body.emailid;
    var role=req.body.role;
    var algorithm="aes256";
    var key="encrypt";
    var cipher = crypto.createCipher(algorithm, key); 
    var encrypted = cipher.update(req.body.pwd, 'utf8', 'hex') + cipher.final('hex'); 
    var fetchData="SELECT * FROM ts_buyers WHERE email='"+email+"'AND password='"+encrypted+"'";
    connection.query(fetchData, function (err, fetchedData) {
        if(fetchedData.length==0){
            req.flash('info', 'Invalid Email ID or Password!');
            res.redirect('/demo6Login');
        }
        else{
            var checkStatus="SELECT * FROM ts_buyers WHERE email='"+email+"'AND status='Active'";
            connection.query(checkStatus, function (err, result) {
                if(result.length>0){
                    req.session.stripe_customer_id=result[0].stripe_customer_id;
                    req.session.buyer_id=result[0].buyer_id;
                    req.session.name=result[0].name;
                    req.session.email=result[0].email;            
                    req.session.phone=result[0].phone;
                    req.session.tab='profile';
                    var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
                    connection.query(bankaccountsql, function (err, bankaccount) {
                        var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                        connection.query(cardDetailssql, function (err, cardDetails) {
                            var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                            connection.query(transactionSql, function (err, transaction) {
                                var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                connection.query(transactionSql, function (err, transaction) {
                                    var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                    res.render('demo6buyerDetails',{
                                        stripe_customer_id :req.session.stripe_customer_id,
                                        buyer_id : req.session.buyer_id,
                                        name : req.session.name,
                                        email : req.session.email,
                                        phone : req.session.phone,
                                        address : result[0].address,
                                        country : result[0].country,
                                        city : result[0].city,
                                        zip_code : result[0].zip_code,
                                        unique_id : result[0].unique_id,
                                        stripe_customer_id : result[0].stripe_customer_id,
                                        email_status : result[0].email_status,
                                        phone_status : result[0].phone_status,
                                        share_id : result[0].share_id,
                                        share_link : share_link,
                                        trust_score : result[0].trust_score,
                                        otp_code : result[0].otp_code,
                                        edu_emp : result[0].edu_emp,
                                        tab:req.session.tab,
                                        transaction : transaction,
                                        bankaccount : bankaccount,
                                        cardDetails : cardDetails,
                                        result : result[0],
                                        result : result[0],
                                        messages : req.flash('info')
                                    });
                                });    
                            });    
                        });
                    });   
                }    
                else{
                    req.flash('info', 'Your account is deactivated by admin.');
                    res.redirect('/demo6Login'); 
                }
            });
        }
    });    
});

//demo6 facebook login
router.get('/demo6FBLogin/:fb_id',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var fb_id=req.params.fb_id;
    var sql="SELECT * FROM ts_buyers WHERE fb_id='"+fb_id+"'";
    connection.query(sql, function (err, result) {
        if(result.length==0){
            req.flash('info', 'Please Register First.');
            res.redirect('/demo6Register');
            return false;
        }
        else{
            req.session.stripe_customer_id=result[0].stripe_customer_id;
            req.session.buyer_id=result[0].buyer_id;
            req.session.name=result[0].name;
            req.session.email=result[0].email;            
            req.session.phone=result[0].phone;
            req.session.tab='profile';
            var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
            connection.query(bankaccountsql, function (err, bankaccount) {
                var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                connection.query(cardDetailssql, function (err, cardDetails) {
                    var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                    connection.query(transactionSql, function (err, transaction) {
                        var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                        res.render('demo6buyerDetails',{
                            stripe_customer_id :req.session.stripe_customer_id,
                            buyer_id : req.session.buyer_id,
                            name : req.session.name,
                            email : req.session.email,
                            phone : req.session.phone,
                            address : result[0].address,
                            country : result[0].country,
                            city : result[0].city,
                            zip_code : result[0].zip_code,
                            unique_id : result[0].unique_id,
                            stripe_customer_id : result[0].stripe_customer_id,
                            email_status : result[0].email_status,
                            phone_status : result[0].phone_status,
                            share_link : share_link,
                            trust_score : result[0].trust_score,
                            otp_code : result[0].otp_code,
                            edu_emp : result[0].edu_emp,
                            tab:req.session.tab,
                            transaction : transaction,
                            bankaccount : bankaccount,
                            cardDetails : cardDetails,
                            result : result[0],
                            messages : req.flash('info')
                        });
                    });    
                });        
            });        
        }
    });    
});

//demo6 update profile
router.get('/updateProfile/:id',function(req,res){
    console.log("UPDATE profile with params");
    var fullUrl = req.protocol + '://' + req.get('host');
    var id=req.params.id;
    var role=req.body.role;
    var sql="SELECT * FROM ts_buyers WHERE buyer_id='"+id+"'";
    connection.query(sql, function (err, result) {
        req.session.tab='profile';
        var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
        connection.query(bankaccountsql, function (err, bankaccount) {
            var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
            connection.query(cardDetailssql, function (err, cardDetails) {
                var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                connection.query(transactionSql, function (err, transaction) {
                    var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                    res.render('demo6buyerDetails',{
                        stripe_customer_id :req.session.stripe_customer_id,
                        buyer_id : req.session.buyer_id,
                        name : req.session.name,
                        email : req.session.email,
                        phone : req.session.phone,
                        address : result[0].address,
                        country : result[0].country,
                        city : result[0].city,
                        zip_code : result[0].zip_code,
                        unique_id : result[0].unique_id,
                        stripe_customer_id : result[0].stripe_customer_id,
                        email_status : result[0].email_status,
                        phone_status : result[0].phone_status,
                        share_link : share_link,
                        share_id : result[0].share_id,
                        trust_score : result[0].trust_score,
                        otp_code : result[0].otp_code,
                        edu_emp : result[0].edu_emp,
                        tab:req.session.tab,
                        transaction : transaction,
                        bankaccount : bankaccount,
                        cardDetails : cardDetails,
                        result : result[0],
                        messages : req.flash('info')
                    });
                });    
            });        
        });       
    });    
});

//demo6 update profile
router.post('/update_profile',function(req,res){
    console.log("Update Profile");
    var fullUrl = req.protocol + '://' + req.get('host');
    var id = req.body.id;
    var address=req.body.address.trim();
    var sampleFile='';
    /*console.log(req.files);
    return false;*/
    /*if(req.files.unique_id)
    {
        var length = 10;
        var fileName = Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);    
        var fileExt = req.files.unique_id.name.split('.').pop();    
        fileName = fileName+'.'+fileExt;    
        sampleFile = req.files.unique_id; 
        console.log(sampleFile);
        sampleFile.mv('./public/img/'+fileName, function(err) 
        {    
            if (err)      
                return res.status(500).send(err);    
        }); 
         req.body.unique_id=fileName;  

    }*/
    /*if(req.file.unique_id)
    {
        var sql="update ts_buyers set name='"+req.body.name+"',address='"+address+"',country='"+req.body.country+"',city='"+req.body.city+"',zip_code='"+req.body.zip_code+"',unique_id='"+req.body.unique_id+"',edu_emp='"+req.body.edu_emp+"' where buyer_id='"+id+"'";
    }
    else
    {
        var sql="update ts_buyers set name='"+req.body.name+"',address='"+address+"',country='"+req.body.country+"',city='"+req.body.city+"',zip_code='"+req.body.zip_code+"',edu_emp='"+req.body.edu_emp+"' where buyer_id='"+id+"'";
    }*/
    var sql="update ts_buyers set name='"+req.body.name+"',address='"+address+"',country='"+req.body.country+"',city='"+req.body.city+"',zip_code='"+req.body.zip_code+"',unique_id='"+req.body.unique_id+"',edu_emp='"+req.body.edu_emp+"' where buyer_id='"+id+"'";
        connection.query(sql, function (err, result) {
            req.flash('info', 'Your profile updated successfully!');
            res.redirect('/api/products/updateProfile/'+id);
    });    
});

//demo6 verify otp
router.post('/verifyOTP',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var otpcode = req.body.otpcode;
    var sql="SELECT * FROM ts_buyers WHERE email='"+req.session.email+"'AND otp_code='"+otpcode+"'";
    connection.query(sql, function (err, getdetails) {
        if (err) {
            console.log("Database connection error");
            throw err;
            return false;
        }
        else
        { 
            if(getdetails.length>0){
                var trustscore=getdetails[0].trust_score+25;
                var verifyOtpPhone="update ts_buyers set phone_status='verified',otp_code='',trust_score='"+trustscore+"' where email='"+req.session.email+"'";
                connection.query(verifyOtpPhone, function (err, verifyotpphone) {
                    if (err) {
                        throw err;
                        return false;
                    }
                    else
                    {
                        req.flash('info','Phone Number verified successfully');
                        var fetchDetail="SELECT * FROM ts_buyers WHERE email='"+req.session.email+"'";
                        connection.query(fetchDetail, function (err, result) {
                            if (err) {
                                throw err;
                                return false;
                            }
                            else
                            {
                                var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
                                connection.query(bankaccountsql, function (err, bankaccount) {
                                    if (err) {
                                        throw err;
                                        return false;
                                    }
                                    else
                                    {
                                        var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                        connection.query(cardDetailssql, function (err, cardDetails) {
                                            if (err) {
                                                throw err;
                                                return false;
                                            }
                                            else
                                            {
                                                var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                connection.query(transactionSql, function (err, transaction) {
                                                    var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                    req.session.tab='profile';
                                                    res.render('demo6buyerDetails',{
                                                        stripe_customer_id :req.session.stripe_customer_id,
                                                        buyer_id : req.session.buyer_id,
                                                        name : req.session.name,
                                                        email : req.session.email,
                                                        phone : req.session.phone,
                                                        address : result[0].address,
                                                        country : result[0].country,
                                                        city : result[0].city,
                                                        zip_code : result[0].zip_code,
                                                        unique_id : result[0].unique_id,
                                                        stripe_customer_id : result[0].stripe_customer_id,
                                                        email_status : result[0].email_status,
                                                        phone_status : result[0].phone_status,
                                                        share_link : share_link,
                                                        share_id : result[0].share_id,
                                                        trust_score : result[0].trust_score,
                                                        otp_code : result[0].otp_code,
                                                        edu_emp : result[0].edu_emp,
                                                        tab:req.session.tab,
                                                        transaction : transaction,
                                                        bankaccount : bankaccount,
                                                        cardDetails  :cardDetails,
                                                        result : result[0],
                                                        messages : req.flash('info')
                                                    });
                                                });    
                                            }
                                        });        
                                    }
                                });        
                            }
                        });
                        
                    }
                });
            }
            else{
                var fetchDetail="SELECT * FROM ts_buyers WHERE email='"+req.session.email+"'";
                 req.flash('info','OTP Not Match, Please try again.');
                 connection.query(fetchDetail, function (err, result) {
                    if (err) {
                        console.log("Database connection error");
                        throw err;
                        return false;
                    }
                    else
                    {
                        var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
                        connection.query(bankaccountsql, function (err, bankaccount) {
                            if (err) {
                                console.log("Database connection error");
                                throw err;
                                return false;
                            }
                            else
                            {

                                var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                connection.query(cardDetailssql, function (err, cardDetails) {
                                    if (err) {
                                        console.log("Database connection error");
                                        throw err;
                                        return false;
                                    }
                                    else
                                    {
                                        var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                        connection.query(transactionSql, function (err, transaction) {
                                            var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                            req.session.tab='profile';
                                            res.render('demo6buyerDetails',{
                                                stripe_customer_id :req.session.stripe_customer_id,
                                                buyer_id : req.session.buyer_id,
                                                name : req.session.name,
                                                email : req.session.email,
                                                phone : req.session.phone,
                                                address : result[0].address,
                                                country : result[0].country,
                                                city : result[0].city,
                                                zip_code : result[0].zip_code,
                                                unique_id : result[0].unique_id,
                                                stripe_customer_id : result[0].stripe_customer_id,
                                                email_status : result[0].email_status,
                                                phone_status : result[0].phone_status,
                                                share_link : share_link,
                                                share_id : result[0].share_id,
                                                trust_score : result[0].trust_score,
                                                otp_code : result[0].otp_code,
                                                edu_emp : result[0].edu_emp,
                                                tab:req.session.tab,
                                                transaction : transaction,
                                                bankaccount : bankaccount,
                                                cardDetails : cardDetails,
                                                result : result[0],
                                                messages : req.flash('info')
                                            });
                                        });   
                                    }
                                });        
                            }
                        });
                    }
                });
                        
            }    
        }
    });    
});

//demo6 change password
router.post('/demo6changePassword',function(req,res){
  var fullUrl = req.protocol + '://' + req.get('host');  
  var password=req.body.new_password;
  var algorithm="aes256";
  var key="encrypt";
  var cipher = crypto.createCipher(algorithm, key); 
  var encrypted = cipher.update(password, 'utf8', 'hex') + cipher.final('hex');
  var updatepasswordsql="update ts_buyers set password='"+encrypted+"' where buyer_id='"+req.session.buyer_id+"'";
    connection.query(updatepasswordsql, function (err,passwordchanged) {
        if (err) {
            throw err;
            console.log("No Erorr");
        }
        else{
            req.session.tab="changepassword";
            req.flash('info','Password changed successfully.');
            var fetchDetail="SELECT * FROM ts_buyers WHERE email='"+req.session.email+"'";
            connection.query(fetchDetail, function (err, result) {
                if (err) {
                    console.log("Database connection error");
                    throw err;
                    return false;
                }
                else
                {
                    var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
                    connection.query(bankaccountsql, function (err, bankaccount) {
                        if (err) {
                            console.log("Database connection error");
                            throw err;
                            return false;
                        }
                        else
                        {
                            var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                            connection.query(cardDetailssql, function (err, cardDetails) {
                                console.log(cardDetails);
                                if (err) {
                                    console.log("Database connection error");
                                    throw err;
                                    return false;
                                }
                                else
                                {
                                    var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                    connection.query(transactionSql, function (err, transaction) {
                                        var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                        res.render('demo6buyerDetails',{
                                            stripe_customer_id :req.session.stripe_customer_id,
                                            buyer_id : req.session.buyer_id,
                                            name : req.session.name,
                                            email : req.session.email,
                                            phone : req.session.phone,
                                            address : result[0].address,
                                            country : result[0].country,
                                            city : result[0].city,
                                            zip_code : result[0].zip_code,
                                            unique_id : result[0].unique_id,
                                            stripe_customer_id : result[0].stripe_customer_id,
                                            email_status : result[0].email_status,
                                            phone_status : result[0].phone_status,
                                            share_link : share_link,
                                            share_id : result[0].share_id,
                                            trust_score : result[0].trust_score,
                                            otp_code : result[0].otp_code,
                                            edu_emp : result[0].edu_emp,
                                            tab:req.session.tab,
                                            transaction : transaction,
                                            bankaccount : bankaccount,
                                            cardDetails : cardDetails,
                                            result : result[0],
                                            messages : req.flash('info')
                                        });
                                    });    
                                }    
                            });    
                        }
                    });        
                }
            });
        }                                        
    });
});
//Demo 6 Forgot password
router.post('/demo6ForgotPassword',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var algorithm="aes256";
    var key="encrypt";
    var email=req.body.email;
    var fetchRecord="select * from ts_buyers where email='"+email+"'";
     connection.query(fetchRecord,function(err,result){
        if(err){
            throw err;
            return false;
        }
        else{
            if(result.length>0)
            {
                var decipher = crypto.createDecipher(algorithm, key);
                var decrypted = decipher.update(result[0].password, 'hex', 'utf8') + decipher.final('utf8');
                var api_key = 'key-43cf4c016eb85a389fc22df0dd7bf6f4';
                var domain = 'dotzapper.com';
                req.flash('info','We sended mail to your account for login credentials. Please check it');
                var file = fs.readFileSync('./emailTemplateLoginCredentials.html', "utf8");
                file=file.replace('#NAME#',result[0].name);
                file=file.replace('#EMAIL#',result[0].email);
                file=file.replace('#PASSWORD#',decrypted);
                var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});
                var data = {
                  from: 'Win Win <demo1.testing1@gmail.com>',
                  to: email,
                  subject: 'WinWin Login Credentials',
                  html: file
                };
                mailgun.messages().send(data, function (error, body) {
                }); 
                res.render('demo6ForgotPassword',{
                 messages : req.flash('info')   
               });
            }
            else
            {
               req.flash('info','Email address not exists.');
               res.render('demo6ForgotPassword',{
                 messages : req.flash('info')   
               }); 
            }
        }
    });

});

//Demo6 Add bank account
router.post('/demo6AddBankAccount',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
    //sk_live_yHaX0pipxf1W17dEsb77fRTk
    //sk_test_R1lTgEqRcnMjAUsO0BR9sjBB
    var sql="SELECT * FROM ts_buyers_bank_accounts WHERE account_number='"+req.body.account_number+"' AND buyer_id='"+req.session.buyer_id+"'AND routing_number='"+req.body.routing_number+"'";
    connection.query(sql,function(err,result){
        if(err){
            throw err;
            return false;
        }
        else{
            //check bank account already exists or not
            if(result.length>0){
                var fetchbankaccount="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"'";
                connection.query(fetchbankaccount, function (err,bankaccount) {
                    var buyerdetails="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                    connection.query(buyerdetails, function (err,result) {
                        var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                        connection.query(cardDetailssql, function (err, cardDetails) {
                            var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                            connection.query(transactionSql, function (err, transaction) {
                                var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                req.flash('info',"Bank account already exists");
                                req.session.tab='bankaccounts';
                                res.render('demo6buyerDetails',{
                                    stripe_customer_id :req.session.stripe_customer_id,
                                    buyer_id : req.session.buyer_id,
                                    name : req.session.name,
                                    email : req.session.email,
                                    phone : req.session.phone,
                                    address : result[0].address,
                                    country : result[0].country,
                                    city : result[0].city,
                                    zip_code : result[0].zip_code,
                                    unique_id : result[0].unique_id,
                                    stripe_customer_id : result[0].stripe_customer_id,
                                    email_status : result[0].email_status,
                                    phone_status : result[0].phone_status,
                                    share_link : share_link,
                                    share_id : result[0].share_id,
                                    trust_score : result[0].trust_score,
                                    otp_code : result[0].otp_code,
                                    edu_emp : result[0].edu_emp,
                                    tab:req.session.tab,
                                    transaction : transaction,
                                    bankaccount : bankaccount,
                                    cardDetails : cardDetails,
                                    result : result[0],
                                    messages : req.flash('info')
                                });
                            });    
                        });        
                    });
                });
            }
            else{
                stripe.tokens.create({
                  'bank_account': {
                  country: 'us',
                  currency: 'usd',
                  routing_number:req.body.routing_number, 
                  account_number:req.body.account_number ,
                  account_holder_name:req.body.account_holder_name,
                  account_holder_type:req.body.account_holder_type
                  }
                }, function(err,token) {
                    if(err){
                        console.log('Error creating bank account token');
                        var fetchDetail="SELECT * FROM ts_buyers WHERE email='"+req.session.email+"'";
                        connection.query(fetchDetail, function (err, result) {
                            if (err) {
                                console.log("Database connection error");
                                throw err;
                                return false;
                            }
                            else
                            {
                                var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
                                connection.query(bankaccountsql, function (err, bankaccount) {
                                    if (err) {
                                        console.log("Database connection error");
                                        throw err;
                                        return false;
                                    }
                                    else
                                    {
                                        var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                        connection.query(cardDetailssql, function (err, cardDetails) {
                                            if (err) {
                                                console.log("Database connection error");
                                                throw err;
                                                return false;
                                            }
                                            else
                                            {
                                                var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                connection.query(transactionSql, function (err, transaction) {
                                                    var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                    req.session.tab='bankaccounts' ;
                                                    req.flash('info', 'Error! Problem saving your Bank Details, please recheck the details and try again.');
                                                    res.render('demo6buyerDetails',{
                                                        stripe_customer_id :req.session.stripe_customer_id,
                                                        buyer_id : req.session.buyer_id,
                                                        name : req.session.name,
                                                        email : req.session.email,
                                                        phone : req.session.phone,
                                                        address : result[0].address,
                                                        country : result[0].country,
                                                        city : result[0].city,
                                                        zip_code : result[0].zip_code,
                                                        unique_id : result[0].unique_id,
                                                        stripe_customer_id : result[0].stripe_customer_id,
                                                        email_status : result[0].email_status,
                                                        phone_status : result[0].phone_status,
                                                        share_link : share_link,
                                                        share_id : result[0].share_id,
                                                        trust_score : result[0].trust_score,
                                                        otp_code : result[0].otp_code,
                                                        edu_emp : result[0].edu_emp,
                                                        tab:req.session.tab,
                                                        transaction : transaction,
                                                        bankaccount : bankaccount,
                                                        cardDetails : cardDetails,
                                                        result : result[0],
                                                        messages : req.flash('info')
                                                    });
                                                });    
                                            }    
                                        });    
                                    }
                                });  //end bank account sql      
                            }
                        });//end fetch detail
                    }//ERROR CREATING TOKEN
                    else{
                        console.log("token created");
                        var tokenID = token.id; 
                        var stripe_bank_account_id = token.bank_account.id
                        stripe.customers.createSource(
                          req.session.stripe_customer_id,
                          { source: tokenID },
                          function(err, bankAcc) {
                            if(err){
                                var fetchDetail="SELECT * FROM ts_buyers WHERE email='"+req.session.email+"'";
                                connection.query(fetchDetail, function (err, result) {
                                    if (err) {
                                        console.log("Database connection error");
                                        throw err;
                                        return false;
                                    }
                                    else
                                    {
                                        var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
                                        connection.query(bankaccountsql, function (err, bankaccount) {
                                            if (err) {
                                                console.log("Database connection error");
                                                throw err;
                                                return false;
                                            }
                                            else
                                            {
                                                var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                                connection.query(cardDetailssql, function (err, cardDetails) {
                                                    if (err) {
                                                        console.log("Database connection error");
                                                        throw err;
                                                        return false;
                                                    }
                                                    else
                                                    {
                                                        var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                        connection.query(transactionSql, function (err, transaction) {
                                                            var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                            req.session.tab='bankaccounts' ;
                                                            req.flash('info', 'Error! Problem saving your Bank Details, please recheck the details and try again.');
                                                            res.render('demo6buyerDetails',{
                                                                stripe_customer_id :req.session.stripe_customer_id,
                                                                buyer_id : req.session.buyer_id,
                                                                name : req.session.name,
                                                                email : req.session.email,
                                                                phone : req.session.phone,
                                                                address : result[0].address,
                                                                country : result[0].country,
                                                                city : result[0].city,
                                                                zip_code : result[0].zip_code,
                                                                unique_id : result[0].unique_id,
                                                                stripe_customer_id : result[0].stripe_customer_id,
                                                                email_status : result[0].email_status,
                                                                phone_status : result[0].phone_status,
                                                                share_link : share_link,
                                                                share_id : result[0].share_id,
                                                                trust_score : result[0].trust_score,
                                                                otp_code : result[0].otp_code,
                                                                edu_emp : result[0].edu_emp,
                                                                tab:req.session.tab,
                                                                transaction : transaction,
                                                                bankaccount : bankaccount,
                                                                cardDetails : cardDetails,
                                                                result : result[0],
                                                                messages : req.flash('info')
                                                            });
                                                        });    
                                                    }    
                                                });    
                                            }
                                        });  //end bank account sql      
                                    }
                                });//end fetch detail
                            }//bankAcc create err
                            else{
                                console.log("bank account source added");
                                console.log("customer updated");
                                //insert bank account code
                                var addBankAccSql="insert into ts_buyers_bank_accounts(routing_number,account_number,account_holder_name,account_holder_type,stripe_bank_account_id,buyer_id) values('"+req.body.routing_number+"','"+req.body.account_number+"','"+req.body.account_holder_name+"','"+req.body.account_holder_type+"','"+stripe_bank_account_id+"','"+req.session.buyer_id+"')";
                                connection.query(addBankAccSql, function (err,addedbankaccount) {
                                    if (err) {
                                        throw err;
                                        console.log("No Erorr");
                                    }
                                    else{
                                        req.session.tab='bankaccounts';
                                        var fetchbankaccount="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"'";
                                        connection.query(fetchbankaccount, function (err,bankaccount) {
                                            if (err) {
                                                throw err;
                                                console.log("No Erorr");
                                            }
                                            else{
                                                req.flash('info','Bank Account Added successfully.');
                                                var buyerdetails="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                                connection.query(buyerdetails, function (err,result) {
                                                    if (err) {
                                                        throw err;
                                                        console.log("No Erorr");
                                                    }
                                                    else{
                                                        var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                                        connection.query(cardDetailssql, function (err, cardDetails) {
                                                            if (err) {
                                                                console.log("Database connection error");
                                                                throw err;
                                                                return false;
                                                            }
                                                            else
                                                            {
                                                                var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                                connection.query(transactionSql, function (err, transaction) {
                                                                    var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                                    res.render('demo6buyerDetails',{
                                                                        stripe_customer_id :req.session.stripe_customer_id,
                                                                        buyer_id : req.session.buyer_id,
                                                                        name : req.session.name,
                                                                        email : req.session.email,
                                                                        phone : req.session.phone,
                                                                        address : result[0].address,
                                                                        country : result[0].country,
                                                                        city : result[0].city,
                                                                        zip_code : result[0].zip_code,
                                                                        unique_id : result[0].unique_id,
                                                                        stripe_customer_id : result[0].stripe_customer_id,
                                                                        email_status : result[0].email_status,
                                                                        phone_status : result[0].phone_status,
                                                                        share_link : share_link,
                                                                        share_id : result[0].share_id,
                                                                        trust_score : result[0].trust_score,
                                                                        otp_code : result[0].otp_code,
                                                                        edu_emp : result[0].edu_emp,
                                                                        tab:req.session.tab,
                                                                        transaction : transaction,
                                                                        bankaccount : bankaccount,
                                                                        cardDetails : cardDetails,
                                                                        result : result[0],
                                                                        messages : req.flash('info')
                                                                    });
                                                                });    
                                                            }
                                                        });        
                                                    }
                                                });
                                            }
                                        });
                                    }                                        
                                });
                            }//source bank account added
                        });
                    }
                });
            }
        }   
   }); 
});

//Demo6 Bank verify with deposits(Micro transaction).
router.post('/demo6bankVerify',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var stripe_bank_account_id=req.body.stripe_bank_account_id;
    var deposit1=req.body.firstDeposit;
    var deposit2=req.body.secondDeposit;
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
    //sk_live_yHaX0pipxf1W17dEsb77fRTk
    //sk_test_R1lTgEqRcnMjAUsO0BR9sjBB
    stripe.customers.retrieve(
        req.session.stripe_customer_id,
        function(err, customer) {
            if(err){
                var cardDetails="select * from ts_buyers_creditcards where buyer_id='"+req.session.buyer_id+"'";
                connection.query(cardDetails, function (err,cards) {
                    if (err) {
                        throw err;
                        console.log("No Erorr");
                    }
                    else{
                        var buyerDetailsql="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                        connection.query(buyerDetailsql, function (err,buyerDetails) {
                            if (err) {
                                throw err;
                                console.log("No Erorr");
                            }
                            else{
                                var fetchbankaccount="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"'";
                                connection.query(fetchbankaccount, function (err,bankaccount) {
                                    if (err) {
                                        throw err;
                                        console.log("No Erorr");
                                    }
                                    else{
                                        var buyerdetails="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                        connection.query(buyerdetails, function (err,result) {
                                            if (err) {
                                                throw err;
                                                console.log("No Erorr");
                                            }
                                            else{
                                                var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                                connection.query(cardDetailssql, function (err, cardDetails) {
                                                    if (err) {
                                                        console.log("Database connection error");
                                                        throw err;
                                                        return false;
                                                    }
                                                    else
                                                    {
                                                        var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                        connection.query(transactionSql, function (err, transaction) {
                                                            var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                            req.session.tab='bankaccounts';
                                                            req.flash('info', 'Error! Problem fetching your Bank Details, please recheck the details and try again.');
                                                            res.render('demo6buyerDetails',{
                                                                stripe_customer_id :req.session.stripe_customer_id,
                                                                buyer_id : req.session.buyer_id,
                                                                name : req.session.name,
                                                                email : req.session.email,
                                                                phone : req.session.phone,
                                                                address : result[0].address,
                                                                country : result[0].country,
                                                                city : result[0].city,
                                                                zip_code : result[0].zip_code,
                                                                unique_id : result[0].unique_id,
                                                                stripe_customer_id : result[0].stripe_customer_id,
                                                                email_status : result[0].email_status,
                                                                phone_status : result[0].phone_status,
                                                                share_link : share_link,
                                                                share_id : result[0].share_id,
                                                                trust_score : result[0].trust_score,
                                                                otp_code : result[0].otp_code,
                                                                edu_emp : result[0].edu_emp,
                                                                tab:req.session.tab,
                                                                transaction : transaction,
                                                                bankaccount : bankaccount,
                                                                cardDetails : cardDetails,
                                                                result : result[0],
                                                                messages : req.flash('info')
                                                            });
                                                        });    
                                                    }
                                                });        
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });    
            }
            else{/*}*/
                console.log("Retrived customer : "+customer);    
                console.log(req.session.stripe_customer_id);
                console.log(stripe_bank_account_id);
                stripe.customers.verifySource(
                    req.session.stripe_customer_id,
                    stripe_bank_account_id,
                    {
                       amounts: [deposit1,deposit2]
                    },function(err, bankAccount) {
                    if(err){
                        console.log("BANK ACCOUNT VERIFICATION ERROR");
                        var fetchDetail="SELECT * FROM ts_buyers WHERE email='"+req.session.email+"'";
                        connection.query(fetchDetail, function (err, result) {
                            if (err) {
                                console.log("Database connection error");
                                throw err;
                                return false;
                            }
                            else
                            {
                                var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
                                connection.query(bankaccountsql, function (err, bankaccount) {
                                    if (err) {
                                        console.log("Database connection error");
                                        throw err;
                                        return false;
                                    }
                                    else
                                    {
                                        var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                        connection.query(cardDetailssql, function (err, cardDetails) {
                                            if (err) {
                                                console.log("Database connection error");
                                                throw err;
                                                return false;
                                            }
                                            else
                                            {
                                                var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                connection.query(transactionSql, function (err, transaction) {
                                                    var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                    req.flash('info', 'Error! Problem verifying your Bank account, please recheck the details and try again.');
                                                    req.session.tab='bankaccounts' ;
                                                    res.render('demo6buyerDetails',{
                                                        stripe_customer_id :req.session.stripe_customer_id,
                                                        buyer_id : req.session.buyer_id,
                                                        name : req.session.name,
                                                        email : req.session.email,
                                                        phone : req.session.phone,
                                                        address : result[0].address,
                                                        country : result[0].country,
                                                        city : result[0].city,
                                                        zip_code : result[0].zip_code,
                                                        unique_id : result[0].unique_id,
                                                        stripe_customer_id : result[0].stripe_customer_id,
                                                        email_status : result[0].email_status,
                                                        phone_status : result[0].phone_status,
                                                        share_link : share_link,
                                                        share_id : result[0].share_id,
                                                        trust_score : result[0].trust_score,
                                                        otp_code : result[0].otp_code,
                                                        edu_emp : result[0].edu_emp,
                                                        tab:req.session.tab,
                                                        transaction : transaction,
                                                        bankaccount : bankaccount,
                                                        cardDetails : cardDetails,
                                                        result : result[0],
                                                        messages : req.flash('info')
                                                    });
                                                });    
                                            }    
                                        });    
                                    }
                                });  //end bank account sql      
                            }
                        });//end fetch detail
                    }
                    else{
                        console.log("Bank account verified");
                        //working
                        var getVerifiedAccounts="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"' AND status='verified'";                
                        connection.query(getVerifiedAccounts, function (err, getverifiedAccounts) {
                            console.log(getverifiedAccounts.length);
                            //if first time verification
                            if(getverifiedAccounts.length==0){
                                var fetchTrustScore="SELECT * FROM ts_buyers WHERE email='"+req.session.email+"'";
                                connection.query(fetchTrustScore, function (err, fetchTrustScore) {
                                    var trustscore=fetchTrustScore[0].trust_score+50;
                                    var update_trustscore="UPDATE ts_buyers SET trust_score='"+trustscore+"' where buyer_id='"+req.session.buyer_id+"'";    
                                    connection.query(update_trustscore, function (err, update_trustscore) {
                                        var sql="UPDATE ts_buyers_bank_accounts SET status='verified' where stripe_bank_account_id='"+stripe_bank_account_id+"'";
                                        connection.query(sql, function (err, bank_details) {
                                            var fetchDetail="SELECT * FROM ts_buyers WHERE email='"+req.session.email+"'";
                                            connection.query(fetchDetail, function (err, result) {
                                                if (err) {
                                                    throw err;
                                                    return false;
                                                }
                                                else
                                                {
                                                    var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
                                                    connection.query(bankaccountsql, function (err, bankaccount) {
                                                        if (err) {
                                                            throw err;
                                                            return false;
                                                        }
                                                        else
                                                        {
                                                            var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                                            connection.query(cardDetailssql, function (err, cardDetails) {
                                                                if (err) {
                                                                    throw err;
                                                                    return false;
                                                                }
                                                                else
                                                                {
                                                                    var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                                    connection.query(transactionSql, function (err, transaction) {
                                                                        var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                                        req.session.tab='bankaccounts' ;
                                                                        req.flash('info', 'Bank account verified successfully.');
                                                                        res.render('demo6buyerDetails',{
                                                                            stripe_customer_id :req.session.stripe_customer_id,
                                                                            buyer_id : req.session.buyer_id,
                                                                            name : req.session.name,
                                                                            email : req.session.email,
                                                                            phone : req.session.phone,
                                                                            address : result[0].address,
                                                                            country : result[0].country,
                                                                            city : result[0].city,
                                                                            zip_code : result[0].zip_code,
                                                                            unique_id : result[0].unique_id,
                                                                            stripe_customer_id : result[0].stripe_customer_id,
                                                                            email_status : result[0].email_status,
                                                                            phone_status : result[0].phone_status,
                                                                            share_link : share_link,
                                                                            share_id : result[0].share_id,
                                                                            trust_score : result[0].trust_score,
                                                                            otp_code : result[0].otp_code,
                                                                            edu_emp : result[0].edu_emp,
                                                                            tab:req.session.tab,
                                                                            transaction : transaction,
                                                                            bankaccount : bankaccount,
                                                                            cardDetails : cardDetails,
                                                                            result : result[0],
                                                                            messages : req.flash('info')
                                                                        });
                                                                    });    
                                                                }
                                                            });        
                                                        }
                                                    });        
                                                }
                                            });
                                        });
                                    });//end update score
                                });//fetch trustscore
                            }
                                //if not first time verification
                            else{
                                var sql="UPDATE ts_buyers_bank_accounts SET status='verified' where stripe_bank_account_id='"+stripe_bank_account_id+"'";
                                connection.query(sql, function (err, bank_details) {
                                    var fetchDetail="SELECT * FROM ts_buyers WHERE email='"+req.session.email+"'";
                                    connection.query(fetchDetail, function (err, result) {
                                        if (err) {
                                            throw err;
                                            return false;
                                        }
                                        else
                                        {
                                            var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts WHERE buyer_id='"+req.session.buyer_id+"'";
                                            connection.query(bankaccountsql, function (err, bankaccount) {
                                                if (err) {
                                                    throw err;
                                                    return false;
                                                }
                                                else
                                                {
                                                    var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                                    connection.query(cardDetailssql, function (err, cardDetails) {
                                                        if (err) {
                                                            throw err;
                                                            return false;
                                                        }
                                                        else
                                                        {
                                                            var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                            connection.query(transactionSql, function (err, transaction) {
                                                                var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                                req.session.tab='bankaccounts' ;
                                                                req.flash('info', 'Bank account verified successfully.');
                                                                res.render('demo6buyerDetails',{
                                                                    stripe_customer_id :req.session.stripe_customer_id,
                                                                    buyer_id : req.session.buyer_id,
                                                                    name : req.session.name,
                                                                    email : req.session.email,
                                                                    phone : req.session.phone,
                                                                    address : result[0].address,
                                                                    country : result[0].country,
                                                                    city : result[0].city,
                                                                    zip_code : result[0].zip_code,
                                                                    unique_id : result[0].unique_id,
                                                                    stripe_customer_id : result[0].stripe_customer_id,
                                                                    email_status : result[0].email_status,
                                                                    phone_status : result[0].phone_status,
                                                                    share_link : share_link,
                                                                    share_id : result[0].share_id,
                                                                    trust_score : result[0].trust_score,
                                                                    otp_code : result[0].otp_code,
                                                                    edu_emp : result[0].edu_emp,
                                                                    tab:req.session.tab,
                                                                    transaction : transaction,
                                                                    bankaccount : bankaccount,
                                                                    cardDetails : cardDetails,
                                                                    result : result[0],
                                                                    messages : req.flash('info')
                                                                });
                                                            });    
                                                        }
                                                    });        
                                                }
                                            });        
                                        }
                                    });
                                });
                            }
                        });
                        //working     
                    }
                });//end stripe verify
            }
    });
});

//Demo6 Add Card
router.post('/demo6AddCard',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");
        //sk_test_R1lTgEqRcnMjAUsO0BR9sjBB 
        //sk_live_yHaX0pipxf1W17dEsb77fRTk 
    //check card exist or not
    var sql="SELECT * FROM ts_buyers_creditcards WHERE card_number='"+req.body.card_number+"' AND buyer_id='"+req.session.buyer_id+"'";
    connection.query(sql,function(err,result){
        console.log(result);
        if(err){
            throw err;
            return false;
        }
        else{
            //if card already exist 
            if(result.length>0){
                var fetchbankaccount="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"'";
                connection.query(fetchbankaccount, function (err,bankaccount) {
                    if (err) {
                        throw err;
                        console.log("No Erorr");
                    }
                    else{
                        var buyerdetails="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                        connection.query(buyerdetails, function (err,result) {
                            if (err) {
                                throw err;
                                console.log("No Erorr");
                            }
                            else{
                                var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                connection.query(cardDetailssql, function (err, cardDetails) {
                                    if (err) {
                                        console.log("Database connection error");
                                        throw err;
                                        return false;
                                    }
                                    else
                                    {
                                        var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                        connection.query(transactionSql, function (err, transaction) {
                                            var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                            req.flash('info',"Card already exists");
                                            req.session.tab='cards';
                                            res.render('demo6buyerDetails',{
                                                stripe_customer_id :req.session.stripe_customer_id,
                                                buyer_id : req.session.buyer_id,
                                                name : req.session.name,
                                                email : req.session.email,
                                                phone : req.session.phone,
                                                address : result[0].address,
                                                country : result[0].country,
                                                city : result[0].city,
                                                zip_code : result[0].zip_code,
                                                unique_id : result[0].unique_id,
                                                stripe_customer_id : result[0].stripe_customer_id,
                                                email_status : result[0].email_status,
                                                phone_status : result[0].phone_status,
                                                share_link : share_link,
                                                share_id : result[0].share_id,
                                                trust_score : result[0].trust_score,
                                                otp_code : result[0].otp_code,
                                                edu_emp : result[0].edu_emp,
                                                tab:req.session.tab,
                                                transaction : transaction,
                                                bankaccount : bankaccount,
                                                cardDetails : cardDetails,
                                                result : result[0],
                                                messages : req.flash('info')
                                            });
                                        });    
                                    }
                                });        
                            }
                        });
                    }
                });
            }
            else{
                //check if first card or not
                var cardexistssql="select * from ts_buyers_creditcards where buyer_id='"+req.session.buyer_id+"'";
                connection.query(cardexistssql, function (err,cards) {
                    if (err) {
                        throw err;
                        console.log("No Erorr");
                    }
                    else{
                        // if first card
                        if(cards.length==0){
                            console.log("Creating first card token");
                            stripe.tokens.create({
                              card: {
                                "number":req.body.card_number,
                                "exp_month":req.body.expire_month,
                                "exp_year":req.body.expire_year,
                                "cvc": req.body.cvc
                              }
                            }, function(err, token) {
                                if(err){
                                    var cardDetails="select * from ts_buyers_creditcards where buyer_id='"+req.session.buyer_id+"'";
                                    connection.query(cardDetails, function (err,cards) {
                                        if (err) {
                                            throw err;
                                            console.log("No Erorr");
                                        }
                                        else{
                                            var buyerDetailsql="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                            connection.query(buyerDetailsql, function (err,buyerDetails) {
                                                if (err) {
                                                    throw err;
                                                    console.log("No Erorr");
                                                }
                                                else{
                                                    var fetchbankaccount="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"'";
                                                    connection.query(fetchbankaccount, function (err,bankaccount) {
                                                        if (err) {
                                                            throw err;
                                                            console.log("No Erorr");
                                                        }
                                                        else{
                                                            var buyerdetails="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                                            connection.query(buyerdetails, function (err,result) {
                                                                if (err) {
                                                                    throw err;
                                                                    console.log("No Erorr");
                                                                }
                                                                else{
                                                                    var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                                                    connection.query(cardDetailssql, function (err, cardDetails) {
                                                                        if (err) {
                                                                            console.log("Database connection error");
                                                                            throw err;
                                                                            return false;
                                                                        }
                                                                        else
                                                                        {
                                                                            var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                                            connection.query(transactionSql, function (err, transaction) {
                                                                                var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                                                req.session.tab='cards';
                                                                                req.flash('info', 'Error! Problem saving your Card Details, please recheck the details and try again.');
                                                                                res.render('demo6buyerDetails',{
                                                                                    stripe_customer_id :req.session.stripe_customer_id,
                                                                                    buyer_id : req.session.buyer_id,
                                                                                    name : req.session.name,
                                                                                    email : req.session.email,
                                                                                    phone : req.session.phone,
                                                                                    address : result[0].address,
                                                                                    country : result[0].country,
                                                                                    city : result[0].city,
                                                                                    zip_code : result[0].zip_code,
                                                                                    unique_id : result[0].unique_id,
                                                                                    stripe_customer_id : result[0].stripe_customer_id,
                                                                                    email_status : result[0].email_status,
                                                                                    phone_status : result[0].phone_status,
                                                                                    share_link : share_link,
                                                                                    share_id : result[0].share_id,
                                                                                    trust_score : result[0].trust_score,
                                                                                    otp_code : result[0].otp_code,
                                                                                    edu_emp : result[0].edu_emp,
                                                                                    tab:req.session.tab,
                                                                                    transaction : transaction,
                                                                                    bankaccount : bankaccount,
                                                                                    cardDetails : cardDetails,
                                                                                    result : result[0],
                                                                                    messages : req.flash('info')
                                                                                });
                                                                            });    
                                                                        }
                                                                    });        
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });    
                                }//end token err
                                else{
                                    console.log("Fitst card token");
                                    var tokenID=token.id;
                                    var stripe_card_id=token.card.id;
                                    stripe.customers.createSource(
                                      req.session.stripe_customer_id,
                                      { source: tokenID },
                                      function(err, card) {
                                        if(err){
                                            var cardDetails="select * from ts_buyers_creditcards where buyer_id='"+req.session.buyer_id+"'";
                                            connection.query(cardDetails, function (err,cards) {
                                                if (err) {
                                                    throw err;
                                                }
                                                else{
                                                    var buyerDetailsql="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                                    connection.query(buyerDetailsql, function (err,buyerDetails) {
                                                        if (err) {
                                                            throw err;
                                                        }
                                                        else{
                                                            var fetchbankaccount="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"'";
                                                            connection.query(fetchbankaccount, function (err,bankaccount) {
                                                                if (err) {
                                                                    throw err;
                                                                }
                                                                else{
                                                                    var buyerdetails="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                                                    connection.query(buyerdetails, function (err,result) {
                                                                        if (err) {
                                                                            throw err;
                                                                        }
                                                                        else{
                                                                            var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                                                            connection.query(cardDetailssql, function (err, cardDetails) {
                                                                                if (err) {
                                                                                    throw err;
                                                                                }
                                                                                else
                                                                                {
                                                                                    var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                                                    connection.query(transactionSql, function (err, transaction) {
                                                                                        var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                                                        req.session.tab='cards';
                                                                                        req.flash('info', 'Stripe - Error! while creating card token in Stripe.');
                                                                                        res.render('demo6buyerDetails',{
                                                                                            stripe_customer_id :req.session.stripe_customer_id,
                                                                                            buyer_id : req.session.buyer_id,
                                                                                            name : req.session.name,
                                                                                            email : req.session.email,
                                                                                            phone : req.session.phone,
                                                                                            address : result[0].address,
                                                                                            country : result[0].country,
                                                                                            city : result[0].city,
                                                                                            zip_code : result[0].zip_code,
                                                                                            unique_id : result[0].unique_id,
                                                                                            stripe_customer_id : result[0].stripe_customer_id,
                                                                                            email_status : result[0].email_status,
                                                                                            phone_status : result[0].phone_status,
                                                                                            share_link : share_link,
                                                                                            share_id : result[0].share_id,
                                                                                            trust_score : result[0].trust_score,
                                                                                            otp_code : result[0].otp_code,
                                                                                            edu_emp : result[0].edu_emp,
                                                                                            tab:req.session.tab,
                                                                                            transaction : transaction,
                                                                                            bankaccount : bankaccount,
                                                                                            cardDetails : cardDetails,
                                                                                            result : result[0],
                                                                                            messages : req.flash('info')
                                                                                        });
                                                                                    });    
                                                                                }
                                                                            });        
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });    
                                        }
                                        //customer add card err
                                        else{
                                            console.log("card source added successfully ");
                                            var cardDetails="select * from ts_buyers_creditcards where buyer_id='"+req.session.buyer_id+"'";
                                            connection.query(cardDetails, function (err,cards) {
                                                if (err) {
                                                    throw err;
                                                    console.log("No Erorr");
                                                }
                                                else{
                                                    var buyerDetailsql="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                                    connection.query(buyerDetailsql, function (err,buyerDetails) {
                                                        if (err) {
                                                            throw err;
                                                            console.log("No Erorr");
                                                        }
                                                        else{
                                                            var trustscore=buyerDetails[0].trust_score+50;
                                                            console.log("trustScore"+trustscore);
                                                            var updateTrustScoreSql="update ts_buyers set trust_score='"+trustscore+"' where buyer_id='"+req.session.buyer_id+"'";
                                                            connection.query(updateTrustScoreSql, function (err, updatetrustScore) {
                                                                if (err) {
                                                                    console.log("Database connection error");
                                                                    throw err;
                                                                    return false;
                                                                }
                                                                else
                                                                {  
                                                                    var addCardSql="insert into ts_buyers_creditcards(buyer_id,stripe_card_token,stripe_card_id,card_holder_name,card_number,expire_month,expire_year,cvc) values('"+req.session.buyer_id+"','"+tokenID+"','"+stripe_card_id+"','"+req.body.card_holder_name+"','"+req.body.card_number+"','"+req.body.expire_month+"','"+req.body.expire_year+"','"+req.body.cvc+"')";
                                                                    connection.query(addCardSql, function (err,addedcard) {
                                                                        if (err) {
                                                                            throw err;
                                                                            console.log("No Erorr");
                                                                        }
                                                                        else{
                                                                            req.session.tab='cards';
                                                                            var fetchbankaccount="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"'";
                                                                            connection.query(fetchbankaccount, function (err,bankaccount) {
                                                                                if (err) {
                                                                                    throw err;
                                                                                    console.log("No Erorr");
                                                                                }
                                                                                else{
                                                                                    req.flash('info','Card Added successfully.');
                                                                                    var buyerdetails="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                                                                    connection.query(buyerdetails, function (err,result) {
                                                                                        if (err) {
                                                                                            throw err;
                                                                                            console.log("No Erorr");
                                                                                        }
                                                                                        else{
                                                                                            var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                                                                            connection.query(cardDetailssql, function (err, cardDetails) {
                                                                                                if (err) {
                                                                                                    console.log("Database connection error");
                                                                                                    throw err;
                                                                                                    return false;
                                                                                                }
                                                                                                else
                                                                                                {
                                                                                                    var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                                                                    connection.query(transactionSql, function (err, transaction) {
                                                                                                        var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                                                                        res.render('demo6buyerDetails',{
                                                                                                            stripe_customer_id :req.session.stripe_customer_id,
                                                                                                            buyer_id : req.session.buyer_id,
                                                                                                            name : req.session.name,
                                                                                                            email : req.session.email,
                                                                                                            phone : req.session.phone,
                                                                                                            address : result[0].address,
                                                                                                            country : result[0].country,
                                                                                                            city : result[0].city,
                                                                                                            zip_code : result[0].zip_code,
                                                                                                            unique_id : result[0].unique_id,
                                                                                                            stripe_customer_id : result[0].stripe_customer_id,
                                                                                                            email_status : result[0].email_status,
                                                                                                            phone_status : result[0].phone_status,
                                                                                                            share_link : share_link,
                                                                                                            share_id : result[0].share_id,
                                                                                                            trust_score : result[0].trust_score,
                                                                                                            otp_code : result[0].otp_code,
                                                                                                            edu_emp : result[0].edu_emp,
                                                                                                            tab:req.session.tab,
                                                                                                            transaction : transaction,
                                                                                                            bankaccount : bankaccount,
                                                                                                            cardDetails : cardDetails,
                                                                                                            result : result[0],
                                                                                                            messages : req.flash('info')
                                                                                                        });
                                                                                                    });    
                                                                                                }
                                                                                            });        
                                                                                        }
                                                                                    });
                                                                                }
                                                                            });
                                                                        }                                        
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }//if not err customer update
                                    });//end create card source in  customer
                                }
                            });//end creating card token
                        } 
                        //if not first card
                        else{
                            console.log("Creating Second card token");
                            stripe.tokens.create({
                              card: {
                                "number":req.body.card_number,
                                "exp_month":req.body.expire_month,
                                "exp_year":req.body.expire_year,
                                "cvc": req.body.cvc
                              }
                            }, function(err, token) {
                                console.log("card token created successfully : "+token);
                                if(err){
                                    var cardDetails="select * from ts_buyers_creditcards where buyer_id='"+req.session.buyer_id+"'";
                                    connection.query(cardDetails, function (err,cards) {
                                        if (err) {
                                            throw err;
                                            console.log("No Erorr");
                                        }
                                        else{
                                            var buyerDetailsql="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                            connection.query(buyerDetailsql, function (err,buyerDetails) {
                                                if (err) {
                                                    throw err;
                                                    console.log("No Erorr");
                                                }
                                                else{
                                                    var fetchbankaccount="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"'";
                                                    connection.query(fetchbankaccount, function (err,bankaccount) {
                                                        if (err) {
                                                            throw err;
                                                            console.log("No Erorr");
                                                        }
                                                        else{
                                                            var buyerdetails="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                                            connection.query(buyerdetails, function (err,result) {
                                                                if (err) {
                                                                    throw err;
                                                                    console.log("No Erorr");
                                                                }
                                                                else{
                                                                    var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                                                    connection.query(cardDetailssql, function (err, cardDetails) {
                                                                        if (err) {
                                                                            console.log("Database connection error");
                                                                            throw err;
                                                                            return false;
                                                                        }
                                                                        else
                                                                        {
                                                                            var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                                            connection.query(transactionSql, function (err, transaction) {
                                                                                var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                                                req.session.tab='cards';
                                                                                req.flash('info', 'Error! Problem saving your Card Details, please recheck the details and try again."');
                                                                                res.render('demo6buyerDetails',{
                                                                                    stripe_customer_id :req.session.stripe_customer_id,
                                                                                    buyer_id : req.session.buyer_id,
                                                                                    name : req.session.name,
                                                                                    email : req.session.email,
                                                                                    phone : req.session.phone,
                                                                                    address : result[0].address,
                                                                                    country : result[0].country,
                                                                                    city : result[0].city,
                                                                                    zip_code : result[0].zip_code,
                                                                                    unique_id : result[0].unique_id,
                                                                                    stripe_customer_id : result[0].stripe_customer_id,
                                                                                    email_status : result[0].email_status,
                                                                                    phone_status : result[0].phone_status,
                                                                                    share_link : share_link,
                                                                                    share_id : result[0].share_id,
                                                                                    trust_score : result[0].trust_score,
                                                                                    otp_code : result[0].otp_code,
                                                                                    edu_emp : result[0].edu_emp,
                                                                                    tab:req.session.tab,
                                                                                    transaction : transaction,
                                                                                    bankaccount : bankaccount,
                                                                                    cardDetails : cardDetails,
                                                                                    result : result[0],
                                                                                    messages : req.flash('info')
                                                                                });
                                                                            });    
                                                                        }
                                                                    });        
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });    
                                }
                                else{
                                    var tokenID=token.id;
                                    var stripe_card_id=token.card.id;
                                    stripe.customers.createSource(
                                      req.session.stripe_customer_id,
                                      { source: tokenID },
                                      function(err, card) {
                                        if(err){
                                            var cardDetails="select * from ts_buyers_creditcards where buyer_id='"+req.session.buyer_id+"'";
                                            connection.query(cardDetails, function (err,cards) {
                                                if (err) {
                                                    throw err;
                                                    console.log("No Erorr");
                                                }
                                                else{
                                                    var buyerDetailsql="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                                    connection.query(buyerDetailsql, function (err,buyerDetails) {
                                                        if (err) {
                                                            throw err;
                                                            console.log("No Erorr");
                                                        }
                                                        else{
                                                            var fetchbankaccount="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"'";
                                                            connection.query(fetchbankaccount, function (err,bankaccount) {
                                                                if (err) {
                                                                    throw err;
                                                                    console.log("No Erorr");
                                                                }
                                                                else{
                                                                    var buyerdetails="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                                                    connection.query(buyerdetails, function (err,result) {
                                                                        if (err) {
                                                                            throw err;
                                                                            console.log("No Erorr");
                                                                        }
                                                                        else{
                                                                            var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                                                            connection.query(cardDetailssql, function (err, cardDetails) {
                                                                                if (err) {
                                                                                    console.log("Database connection error");
                                                                                    throw err;
                                                                                    return false;
                                                                                }
                                                                                else
                                                                                {
                                                                                    var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                                                    connection.query(transactionSql, function (err, transaction) {
                                                                                        var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                                                        req.session.tab='cards';
                                                                                        req.flash('info', 'Error! Problem saving your Card Details, Please recheck the details and try again."');
                                                                                        res.render('demo6buyerDetails',{
                                                                                            stripe_customer_id :req.session.stripe_customer_id,
                                                                                            buyer_id : req.session.buyer_id,
                                                                                            name : req.session.name,
                                                                                            email : req.session.email,
                                                                                            phone : req.session.phone,
                                                                                            address : result[0].address,
                                                                                            country : result[0].country,
                                                                                            city : result[0].city,
                                                                                            zip_code : result[0].zip_code,
                                                                                            unique_id : result[0].unique_id,
                                                                                            stripe_customer_id : result[0].stripe_customer_id,
                                                                                            email_status : result[0].email_status,
                                                                                            phone_status : result[0].phone_status,
                                                                                            share_link : share_link,
                                                                                            share_id : result[0].share_id,
                                                                                            trust_score : result[0].trust_score,
                                                                                            otp_code : result[0].otp_code,
                                                                                            edu_emp : result[0].edu_emp,
                                                                                            tab:req.session.tab,
                                                                                            transaction : transaction,
                                                                                            bankaccount : bankaccount,
                                                                                            cardDetails : cardDetails,
                                                                                            result : result[0],
                                                                                            messages : req.flash('info')
                                                                                        });
                                                                                    });    
                                                                                }
                                                                            });        
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });    
                                        }
                                        else{
                                            console.log("Card Source added successfully");
                                            var addCardSql="insert into ts_buyers_creditcards(buyer_id,stripe_card_token,stripe_card_id,card_holder_name,card_number,expire_month,expire_year,cvc) values('"+req.session.buyer_id+"','"+tokenID+"','"+stripe_card_id+"','"+req.body.card_holder_name+"','"+req.body.card_number+"','"+req.body.expire_month+"','"+req.body.expire_year+"','"+req.body.cvc+"')";
                                            connection.query(addCardSql, function (err,addedcard) {
                                                if (err) {
                                                    throw err;
                                                    console.log("No Erorr");
                                                }
                                                else{
                                                    var fetchbankaccount="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"'";
                                                    connection.query(fetchbankaccount, function (err,bankaccount) {
                                                        if (err) {
                                                            throw err;
                                                            console.log("No Erorr");
                                                        }
                                                        else{
                                                            var buyerdetails="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                                                            connection.query(buyerdetails, function (err,result) {
                                                                if (err) {
                                                                    throw err;
                                                                    console.log("No Erorr");
                                                                }
                                                                else{
                                                                    var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                                                                    connection.query(cardDetailssql, function (err, cardDetails) {
                                                                        if (err) {
                                                                            console.log("Database connection error");
                                                                            throw err;
                                                                            return false;
                                                                        }
                                                                        else
                                                                        {
                                                                            var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                                                                            connection.query(transactionSql, function (err, transaction) {
                                                                                var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                                                                                req.session.tab='cards';
                                                                                req.flash('info','Card Added successfully.');
                                                                                res.render('demo6buyerDetails',{
                                                                                    stripe_customer_id :req.session.stripe_customer_id,
                                                                                    buyer_id : req.session.buyer_id,
                                                                                    name : req.session.name,
                                                                                    email : req.session.email,
                                                                                    phone : req.session.phone,
                                                                                    address : result[0].address,
                                                                                    country : result[0].country,
                                                                                    city : result[0].city,
                                                                                    zip_code : result[0].zip_code,
                                                                                    unique_id : result[0].unique_id,
                                                                                    stripe_customer_id : result[0].stripe_customer_id,
                                                                                    email_status : result[0].email_status,
                                                                                    phone_status : result[0].phone_status,
                                                                                    share_link : share_link,
                                                                                    share_id : result[0].share_id,
                                                                                    trust_score : result[0].trust_score,
                                                                                    otp_code : result[0].otp_code,
                                                                                    edu_emp : result[0].edu_emp,
                                                                                    tab:req.session.tab,
                                                                                    transaction : transaction,
                                                                                    bankaccount : bankaccount,
                                                                                    cardDetails : cardDetails,
                                                                                    result : result[0],
                                                                                    messages : req.flash('info')
                                                                                });
                                                                            });    
                                                                        }
                                                                    });        
                                                                }
                                                            });
                                                        }
                                                    });
                                                }                                        
                                            });
                                        }
                                    });//add card source to customer customer
                                }
                            });//stripe card token
                        }
                    }
                });
            }    
        }
    });
});

//Demo6 Logout
router.get('/demo6Logout',function(req,res){
    req.session.destroy();
    res.redirect('/demo6Login');
});

//demo6 Admin register 
router.post('/demo6AdminRegister',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var name = req.body.name;
    var email = req.body.email;
    var phone = req.body.phone;
    var algorithm="aes256";
    var key="encrypt";
    var cipher = crypto.createCipher(algorithm, key); 
    var encrypted = cipher.update(req.body.password, 'utf8', 'hex') + cipher.final('hex'); 
    var password =encrypted;
    var date =new Date();
    var dd =date.getDate();
    var mm=date.getMonth();
    var yyyy=date.getFullYear();
    var minutes=date.getMinutes();
    var hours=date.getHours();  
    var seconds=date.getSeconds();    
    var dt =mm+"/"+ dd +"/"+yyyy;
    var time=hours+":"+ minutes +":"+seconds;
    var otp = Math.floor(Math.random()*89999+10000);
    var share_id = Math.floor(Math.random()*89999+10000);
    var api_key = 'key-43cf4c016eb85a389fc22df0dd7bf6f4';
    var domain = 'dotzapper.com';
    var otpFile = fs.readFileSync('./emailTemplateOTPWinWin.html', "utf8");
    var emailFile = fs.readFileSync('./emailTemplateEmailVerifyWinWin.html', "utf8");
    otpFile = otpFile.replace('#NAME#',name);
    otpFile = otpFile.replace('#OTP#',otp);
    otpFile = otpFile.replace('#OTPDATE#',dt);
    otpFile = otpFile.replace('#OTPTIME#',time);
    emailFile = emailFile.replace('#LINK#',fullUrl+'/api/products/verify/'+email);
    var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});
      var data1 = {
          from: 'Win Win <demo1.testing1@gmail.com>',
          to: email,
          subject: 'WinWin Email Verification Code',
          html: emailFile
        };
        mailgun.messages().send(data1, function (error, body) {
            var data2 = {
              from: 'Win Win <demo1.testing1@gmail.com>',
              to: email,
              subject: 'WinWin OTP Verification Code',
              html: otpFile
            };
            mailgun.messages().send(data2, function (error, body) {
                var fetchAdmins="SELECT * FROM ts_administrators WHERE email='"+email+"' AND status !='Deleted'";
                connection.query(fetchAdmins,function(err,fetchAdmins){
                    if(fetchAdmins.length==0){
                        var addAdminSql="INSERT INTO ts_administrators (name,email,mobile,password) VALUES('"+req.body.name+"','"+req.body.email+"','"+phone+"','"+password+"')";
                        connection.query(addAdminSql, function (err, addAdmin) {
                            var fetchAdminsql="SELECT * FROM ts_administrators where status != 'Deleted' ";
                            connection.query(fetchAdminsql, function (err, fetchAdmin) {
                                req.flash('info',"Record Inserted Successfully.");
                                res.render('demo6AdminList',{
                                    email : req.session.email,
                                    name : req.session.name,
                                    fetchAdmin : fetchAdmin,
                                    messages : req.flash('info')
                                });
                            }); /*end fetchadmin sql*/
                        });    
                    } //end fetchAdmins.length         
                    else{
                        var fetchAdminsql="SELECT * FROM ts_administrators where status != 'Deleted' ";
                        connection.query(fetchAdminsql, function (err, fetchAdmin) {
                            req.flash('info',"Email-id Already exist.");
                            res.render('demo6AdminList',{
                                email : req.session.email,
                                name : req.session.name,
                                fetchAdmin : fetchAdmin,
                                messages : req.flash('info')
                            });
                        }); /*end fetchadmin sql*/
                    }  
                }); 
            });
        });
});

// Demo6 check Admin  already exist or not
router.post('/demo6AdminCheckLogin',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var email=req.body.emailid;
    var algorithm="aes256";
    var key="encrypt";
    var cipher = crypto.createCipher(algorithm, key); 
    var encrypted = cipher.update(req.body.pwd, 'utf8', 'hex') + cipher.final('hex'); 
    
    var sql="SELECT * FROM ts_administrators WHERE email='"+email+"'AND password='"+encrypted+"'" ;
    connection.query(sql, function (err, fetchadmin) {
        if(fetchadmin.length==0){
            req.flash('info', 'Invalid Email ID or Password!');
            res.redirect('/demo6AdminLogin');
        }
        else{
            var checkStatus="SELECT * FROM ts_administrators WHERE email='"+email+"'AND status='Active'" ;
            connection.query(checkStatus, function (err, result) {
                if(result.length==0){
                    req.flash('info', 'Your account is deactivated by admin.');
                    res.redirect('/demo6AdminLogin'); 
                }
                else{
                    req.session.admin_id=result[0].admin_id;
                    req.session.name=result[0].name;
                    req.session.email=result[0].email;            
                    req.session.phone=result[0].phone;
                    res.redirect('/api/products/demo6AdminList');
                    /*res.redirect('/api/products/demo6BuyersList');*/
                }    
            });    
        }
    });    
});

//Demo6 list all buyers in admin section
router.get('/demo6BuyersList',function(req,res){
    var fetchAdminsql="SELECT * FROM ts_administrators";
    connection.query(fetchAdminsql, function (err, fetchAdmin) {
        var fetchDetail="SELECT * FROM ts_buyers where status != 'Deleted' ";
        connection.query(fetchDetail, function (err, fetchDetail) {
            var bankaccountsql="SELECT * FROM ts_buyers_bank_accounts";
            connection.query(bankaccountsql, function (err, bankaccount) {
                var cardDetailssql="SELECT * FROM ts_buyers_creditcards";
                connection.query(cardDetailssql, function (err, cardDetails) {
                    req.flash('info',req.params.messages);
                    res.render('demo6BuyersList',{
                        email : req.session.email,
                        name : req.session.name,
                        fetchAdmin : fetchAdmin,
                        fetchDetail : fetchDetail,
                        bankaccount : bankaccount,
                        cardDetails : cardDetails,
                        messages : req.flash('info')
                    });
                });  /* card details*/     
            }); /* bankaccounts*/
        });/*fetch details*/
    });    
});


//Demo6 list all sellers in admin section
router.get('/demo6SellersList',function(req,res){
    var fetchSellerDetail="SELECT * FROM ts_sellers where status != 'Deleted' ";
    connection.query(fetchSellerDetail, function (err, fetchSeller) {
        req.flash('info',req.params.messages);
        res.render('demo6SellersList',{
            email : req.session.email,
            name : req.session.name,
            fetchSeller : fetchSeller,
            messages : req.flash('info')
        });
    });/*fetch details*/
});


//Demo6 list all admins in admin section
router.get('/demo6AdminList',function(req,res){
    var fetchAdminsql="SELECT * FROM ts_administrators where status != 'Deleted' ";
    connection.query(fetchAdminsql, function (err, fetchAdmin) {
        res.render('demo6AdminList',{
            email : req.session.email,
            name : req.session.name,
            fetchAdmin : fetchAdmin,
            messages : req.flash('info')
        });
    });    
});


//Demo6 Admin Forgot password
router.post('/demo6AdminForgotPassword',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var algorithm="aes256";
    var key="encrypt";
    var email=req.body.email;
    var fetchRecord="select * from ts_administrators where email='"+email+"'";
     connection.query(fetchRecord,function(err,result){
        if(err){
            throw err;
            return false;
        }
        else{
            if(result.length>0)
            {
                var decipher = crypto.createDecipher(algorithm, key);
                var decrypted = decipher.update(result[0].password, 'hex', 'utf8') + decipher.final('utf8');
                var api_key = 'key-43cf4c016eb85a389fc22df0dd7bf6f4';
                var domain = 'dotzapper.com';
                var file = fs.readFileSync('./emailTemplateLoginCredentials.html', "utf8");
                file=file.replace('#NAME#',result[0].name);
                file=file.replace('#EMAIL#',result[0].email);
                file=file.replace('#PASSWORD#',decrypted);
                var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});
                var data = {
                  from: 'Win Win <demo1.testing1@gmail.com>',
                  to: email,
                  subject: 'WinWin Login Credentials',
                  html: file
                };
                mailgun.messages().send(data, function (error, body) {
                }); 
                req.flash('info','We sended mail to your account for login credentials. Please check it');
                res.render('demo6AdminForgotPassword',{
                 messages : req.flash('info')   
               });
            }
            else
            {
               req.flash('info','Email address not exists.');
               res.render('demo6AdminForgotPassword',{
                 messages : req.flash('info')   
               }); 
            }
        }
    });
});

//Demo6 Admin  Logout
router.get('/demo6AdminLogout',function(req,res){
    req.session.destroy();
    res.redirect('/demo6AdminLogin');
});

// route to edit page specific buyer data
router.get('/demo6EditBuyer/:id',function(req,res){
    var editBuyerSql="select * from ts_buyers where buyer_id='"+req.params.id+"'";
    connection.query(editBuyerSql, function (err, editBuyer) {
        req.flash('info', '');
        res.render('demo6EditBuyer',{
            email : req.session.email,
            name : req.session.name,
            editBuyer : editBuyer[0],
            messages : req.flash('info')
        });
    })
});

// route to edit page specific admin data
router.get('/demo6EditAdmin/:id',function(req,res){
    var editAdminSql="select * from ts_administrators where admin_id='"+req.params.id+"'";
    connection.query(editAdminSql, function (err, editAdmin) {
        req.flash('info', '');
        res.render('demo6EditAdmin',{
            email : req.session.email,
            name : req.session.name,
            editAdmin : editAdmin[0],
            messages : req.flash('info')
        });
    })
});

//Update specific buyer
router.post('/demo6UpdateBuyer',function(req,res){
    var fetchData="select * from ts_buyers where buyer_id='"+req.body.buyer_id+"'";
    connection.query(fetchData, function (err, fetchData) {
        var address_status=fetchData[0].address_status;
        var edu_emp_status = fetchData[0].edu_emp_status;
        var trust_score=fetchData[0].trust_score;
        if(address_status != 'Approved' && req.body.address_status=='Approved'){
            trust_score+=25;
        }
        if(edu_emp_status !='Approved'  && req.body.edu_emp_status=='Approved'){
            trust_score+=25;   
        }
        var updateBuyerSql="update ts_buyers set name='"+req.body.name+"',address='"+req.body.address+"',country='"+req.body.country+"',city='"+req.body.city+"',zip_code='"+req.body.zip_code+"',unique_id='"+req.body.unique_id+"',edu_emp='"+req.body.edu_emp+"',address_status='"+req.body.address_status+"',edu_emp_status='"+req.body.edu_emp_status+"',status='"+req.body.status+"',trust_score='"+trust_score+"' where buyer_id='"+req.body.buyer_id+"'";
        connection.query(updateBuyerSql, function (err, updatedBuyer) {
            var fetchData="select * from ts_buyers where status !='Deleted'";
            connection.query(fetchData, function (err, fetchDetail) {
                req.flash('info', 'Record Updated Successfully!');
                res.render('demo6BuyersList',{
                    name : req.session.name,
                    fetchDetail : fetchDetail,
                    messages : req.flash('info')
                });
            });/*fetchdata*/    
        })/*update buyer*/
    });/*fetchData*/
});

//Update specific admin
router.post('/demo6UpdateAdmin',function(req,res){
    var fetchData="select * from ts_administrators where admin_id='"+req.body.admin_id+"'";
    connection.query(fetchData, function (err, fetchData) {
        var updateAdminSql="update ts_administrators set name='"+req.body.name+"',email='"+req.body.email+"',mobile='"+req.body.mobile+"',status='"+req.body.status+"' where admin_id='"+req.body.admin_id+"'";
        connection.query(updateAdminSql, function (err, updatedBuyer) {
            var fetchAdminsql="SELECT * FROM ts_administrators where status != 'Deleted' ";
            connection.query(fetchAdminsql, function (err, fetchAdmin) {
                req.flash('info',"Record Updated Successfully.");
                res.render('demo6AdminList',{
                    email : req.session.email,
                    name : req.session.name,
                    fetchAdmin : fetchAdmin,
                    messages : req.flash('info')
                });
            }); /*end fetchadmin sql*/
        })/*update buyer*/
    });/*fetchData*/
});

/*Code for add new buyer Demo 6 */
router.post('/demo6AddBuyer',function(req,res){
    var trust_score=0;
    var fullUrl = req.protocol + '://' + req.get('host');
    var name = req.body.name;
    var email = req.body.email;
    var algorithm="aes256";
    var key="encrypt";
    var cipher = crypto.createCipher(algorithm, key); 
    var encrypted = cipher.update(req.body.password, 'utf8', 'hex') + cipher.final('hex'); 
    var password =encrypted;
    var date =new Date();
    var dd =date.getDate();
    var mm=date.getMonth();
    var yyyy=date.getFullYear();
    var minutes=date.getMinutes();
    var hours=date.getHours();  
    var seconds=date.getSeconds();    
    var dt =mm+"/"+ dd +"/"+yyyy;
    var time=hours+":"+ minutes +":"+seconds;
    var otp = Math.floor(Math.random()*89999+10000);
    var share_id = Math.floor(Math.random()*89999+10000);
    var api_key = 'key-43cf4c016eb85a389fc22df0dd7bf6f4';
    var domain = 'dotzapper.com';
    var file = fs.readFileSync('./emailTemplateOTPWinWin.html', "utf8");
    var file2 = fs.readFileSync('./emailTemplateEmailVerifyWinWin.html', "utf8");
    file = file.replace('#NAME#',name);
    file = file.replace('#OTP#',otp);
    file = file.replace('#OTPDATE#',dt);
    file = file.replace('#OTPTIME#',time);
    file2 = file2.replace('#LINK#',fullUrl+'/api/products/verify/'+email);
    var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});
        var data1 = {
           from: 'Win Win <demo1.testing1@gmail.com>',
           to: email,
           subject: 'WinWin Email Verification Code',
           html: file2
        };
        mailgun.messages().send(data1, function (error, body) {
            var data2 = {
               from: 'Win Win <demo1.testing1@gmail.com>',
               to: email,
               subject: 'WinWin OTP Verification Code',
               html: file
            };
            mailgun.messages().send(data2, function (error, body) {
                var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
                //sk_live_yHaX0pipxf1W17dEsb77fRTk
                //sk_test_R1lTgEqRcnMjAUsO0BR9sjBB
                var sql="SELECT * FROM ts_buyers WHERE email='"+email+"' AND status !='Deleted'" ;
                connection.query(sql,function(err,result){
                    if(result.length==0){
                        stripe.customers.create({
                            email:email,
                            description: 'Customer for '+email
                            }, function(err, customer) {
                            if (err){   
                                req.flash('info', 'Stripe customer creation error.');
                                res.redirect('/demo6Register');
                            }
                            else{
                                console.log("stripe customer created");
                                var stripe_customer_id=customer.id;   
                                var sql="INSERT INTO ts_buyers (stripe_customer_id,name,email,phone,password,otp_code,share_id,trust_score,address,city,country,zip_code,unique_id,edu_emp,status) VALUES('"+stripe_customer_id+"','"+req.body.name+"','"+req.body.email+"','"+req.body.phone+"','"+password+"','"+otp+"','"+share_id+"','"+trust_score+"','"+req.body.address+"','"+req.body.city+"','"+req.body.country+"','"+req.body.zip_code+"','"+req.body.unique_id+"','"+req.body.edu_emp+"','"+req.body.status+"')";
                                connection.query(sql, function (err, result) {
                                    var fetchDetails="SELECT * FROM ts_buyers where status != 'Deleted'";
                                    connection.query(fetchDetails, function (err, fetchDetail) {
                                        req.flash('info', 'Record Added Successfully!');
                                        res.render('demo6BuyersList',{
                                            name : req.session.name,
                                            fetchDetail : fetchDetail,
                                            messages : req.flash('info')
                                        });
                                    });     
                                });    
                            }
                        });//end stripe customer creation 
                    } //end result.length         
                    else{
                        var fetchDetails="SELECT * FROM ts_buyers where  status !='Deleted'";
                        connection.query(fetchDetails, function (err, fetchDetail) {
                            req.flash('info', 'Emai-id Already exists!');
                            res.render('demo6BuyersList',{
                                name : req.session.name,
                                fetchDetail : fetchDetail,
                                messages : req.flash('info')
                            });
                        });     
                    }  
                }); 
            });
        });

});

// code for activete de activate and delete buyer
router.post('/list_action',function(req,res,next){
    var async = require('async');
    var action = req.body.btnAction;
    var ids=req.body.iId;
    var str = (req.body.iId.length>1) ? 'Records' : 'Record';
    async.forEachSeries(req.body.iId, function(n1, callback_s1) {
        var updateBuyerSql="update ts_buyers set status='"+req.body.btnAction+"'where  buyer_id='"+n1+"'";
        connection.query(updateBuyerSql, function (err, updatedBuyer) {
            callback_s1();
        });    
    }, function (err) {
        if(req.body.btnAction=='Deleted'){
            req.flash('info', str+' Deleted Successfully.');
        }
        else {
            req.flash('info', str+' Updated Successfully.');
        }
        var fetchDetails="SELECT * FROM ts_buyers where status != 'Deleted'";
        connection.query(fetchDetails, function (err, fetchDetail) {
            res.render('demo6BuyersList',{
                name : req.session.name,
                fetchDetail : fetchDetail,
                messages : req.flash('info')
            });
        });         
    });
});

// code for activete de activate and delete buyer
router.post('/admin_list_action',function(req,res,next){
    var async = require('async');
    var action = req.body.btnAction;
    var ids=req.body.iId;
    var str = (req.body.iId.length>1) ? 'Records' : 'Record';
    async.forEachSeries(req.body.iId, function(n1, callback_s1) {
        var updateAdminSql="update ts_administrators set status='"+req.body.btnAction+"'where  admin_id='"+n1+"'";
        connection.query(updateAdminSql, function (err, updatedAdmin) {
            callback_s1();
        });    
    }, function (err) {
        if(req.body.btnAction=='Deleted'){
            req.flash('info', str+' Deleted Successfully.');
        }
        else {
            req.flash('info', str+' Updated Successfully.');
        }
        var fetchAdmins="SELECT * FROM ts_administrators where status != 'Deleted'";
        connection.query(fetchAdmins, function (err, fetchAdmin) {
            res.render('demo6AdminList',{
                name : req.session.name,
                fetchAdmin : fetchAdmin,
                messages : req.flash('info')
            });
        });         
    });
});

// code for activete de activate and delete buyer
router.post('/demo6SellerListAction',function(req,res,next){
    var async = require('async');
    var action = req.body.btnAction;
    var ids=req.body.iId;
    var str = (req.body.iId.length>1) ? 'Records' : 'Record';
    async.forEachSeries(req.body.iId, function(n1, callback_s1) {
        var updateSellerSql="update ts_sellers set status='"+req.body.btnAction+"'where  seller_id='"+n1+"'";
        connection.query(updateSellerSql, function (err, updatedSeller) {
            callback_s1();
        });    
    }, function (err) {
        if(req.body.btnAction=='Deleted'){
            req.flash('info', str+' Deleted Successfully.');
        }
        else {
            req.flash('info', str+' Updated Successfully.');
        }
        var fetchSellers="SELECT * FROM ts_sellers where status != 'Deleted'";
        connection.query(fetchSellers, function (err, fetchSeller) {
            res.render('demo6SellersList',{
                name : req.session.name,
                fetchSeller : fetchSeller,
                messages : req.flash('info')
            });
        });         
    });
});

/*route to add admin page*/
router.get('/addAdmin',function(req,res){
    res.render('demo6AddAdmin',{
        name : req.session.name,
        messages : req.flash('info')
    });
});

/*route to add buyer page */
router.get('/addBuyer',function(req,res){
    res.render('demo6AddBuyer',{
        name : req.session.name,
        messages : req.flash('info')
    });
});

router.post('/demo6BuynowDashboard',function(req,res){
    req.session.stripe_bank_account_id=req.body.id;
    res.send(req.session.stripe_bank_account_id);
});

router.get('/demo6ProductList',function(req,res){
    req.flash('info','Hello');
    res.render('demo6ProductList',{
        stripe_customer_id : req.session.stripe_customer_id,
        stripe_bank_account_id : req.session.stripe_bank_account_id ,
        messages : req.flash('info')
    });
    return false; 
});

/*Buyer ratings to seller*/
router.post('/demo6buyerrating',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
    var setBuyerRatingSql="update ts_transactions set buyer_rating='"+req.body.rating+"'where  stripe_payment_id='"+req.body.stripe_payment_id+"'";
    connection.query(setBuyerRatingSql, function (err, ratings) {
        var buyerDetailsql="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
        connection.query(buyerDetailsql, function (err,buyerDetails) {
            var fetchbankaccount="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"'";
            connection.query(fetchbankaccount, function (err,bankaccount) {
                var buyerdetails="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
                connection.query(buyerdetails, function (err,result) {
                    var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                    connection.query(cardDetailssql, function (err, cardDetails) {
                        var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                        connection.query(transactionSql, function (err, transaction) {
                            var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                            req.session.tab='recentTransaction';
                            req.flash('info', 'Thanks for rating  transaction.');
                            res.render('demo6buyerDetails',{
                                stripe_customer_id :req.session.stripe_customer_id,
                                buyer_id : req.session.buyer_id,
                                name : req.session.name,
                                email : req.session.email,
                                phone : req.session.phone,
                                address : result[0].address,
                                country : result[0].country,
                                city : result[0].city,
                                zip_code : result[0].zip_code,
                                unique_id : result[0].unique_id,
                                stripe_customer_id : result[0].stripe_customer_id,
                                email_status : result[0].email_status,
                                phone_status : result[0].phone_status,
                                share_link : share_link,
                                share_id : result[0].share_id,
                                trust_score : result[0].trust_score,
                                otp_code : result[0].otp_code,
                                edu_emp : result[0].edu_emp,
                                tab:req.session.tab,
                                transaction : transaction,
                                bankaccount : bankaccount,
                                cardDetails : cardDetails,
                                result : result[0],
                                messages : req.flash('info')
                            });
                        });
                    });        
                });
            });
        });
    });    
});

/*Seller ratings to buyer and calculate rating vs rating of other member on the site*/
router.post('/demo6SellerRating',function(req,res){
    /*select stripe_customer_id,  Sum(seller_rating) as sum from ts_transactions group by stripe_customer_id order by sum desc limit 1*/
    var fetchData="select * from ts_buyers where stripe_customer_id='"+req.body.stripe_customer_id+"'" ;        
    connnection.query(fetchData,function(err,buyerDetails){
        var highestRatingSql="select stripe_customer_id,  Sum(seller_rating) as sum from ts_transactions group by stripe_customer_id order by sum desc limit 1" ;
        connection.query(highestRatingSql, function (err, highestRating) {      
            var highestRatingCustomer = highestRating[0].stripe_customer_id ;
            console.log("Already highest : "+highestRatingCustomer);
            var setSellerRatingSql="update ts_transactions set seller_rating='"+req.body.rating+"'where  stripe_payment_id='"+req.body.stripe_payment_id+"'";
            connection.query(setSellerRatingSql, function (err, ratings) {
                var newhighestRatingSql="select stripe_customer_id,  Sum(seller_rating) as sum from ts_transactions group by stripe_customer_id order by sum desc limit 1" ;
                connection.query(newhighestRatingSql, function (err, newhighestRating) {
                    var newhighestRatingCustomer = newhighestRating[0].stripe_customer_id ;
                    console.log(' new highestRatingCustomer : '+newhighestRatingCustomer);
                    // if new highest rated customer is already highest rated customer
                    if(newhighestRatingCustomer ==  highestRatingCustomer){
                        var transactionSql="SELECT * FROM ts_transactions WHERE seller_id='"+req.session.seller_id+"' ORDER BY transaction_id DESC" ;
                        connection.query(transactionSql, function (err, transaction) {
                            req.flash('info', 'Thanks for rating transaction.');
                            res.render('demo6SellerTransactionList',{
                                seller_id : req.session.seller_id,
                                name : req.session.name,
                                email : req.session.email,
                                transaction : transaction,
                                messages : req.flash('info')
                            });
                        });
                    }
                    // if this customer is new highest rated customer 
                    else{
                        var fetchTrustScore="SELECT trust_score FROM ts_buyers WHERE stripe_customer_id='"+newhighestRatingCustomer+"'" ;
                        connection.query(fetchTrustScore, function (err, trustScore) {
                            var trust_score = trustScore[0].trust_score+200;
                            var updatedTrustScoreSql="update ts_buyers set trust_score='"+trust_score+"'where  stripe_customer_id='"+newhighestRatingCustomer+"'";
                            connection.query(updatedTrustScoreSql, function (err, newTrustScore) {
                                var transactionSql="SELECT * FROM ts_transactions WHERE seller_id='"+req.session.seller_id+"' ORDER BY transaction_id DESC" ;
                                connection.query(transactionSql, function (err, transaction) {
                                    req.flash('info', 'Thanks for rating transaction.');
                                    res.render('demo6SellerTransactionList',{
                                        seller_id : req.session.seller_id,
                                        name : req.session.name,
                                        email : req.session.email,
                                        transaction : transaction,
                                        messages : req.flash('info')
                                    });
                                });
                            });
                        });    
                    }
                });   
            });    
        });
    });    
});

/*route to add seller page */
router.get('/addSeller',function(req,res){
    res.render('demo6AddSeller',{
        name : req.session.name,
        messages : req.flash('info')
    });
});


/* Dispute transaction by admin and give good transaction vs good transactions of others on site*/
router.post('/disputeTransaction',function(req,res){
    var highestGoodTransactionSql = "select stripe_customer_id ,count(transaction_status) as count from ts_transactions where transaction_status='Good Transaction' group by stripe_customer_id order by count desc limit 1";
    connection.query(highestGoodTransactionSql, function (err, highestGoodTransactions) {      
        var highestGoodTransactionCustomer = highestGoodTransactions[0].stripe_customer_id ;

        var highestBadTransactionSql = "select stripe_customer_id ,count(transaction_status) as count from ts_transactions where transaction_status='Bad Transaction' group by stripe_customer_id order by count desc limit 1";
        connection.query(highestBadTransactionSql, function (err, highestBadTransactions) {      
            if(highestBadTransactions.length <= 0 ){
                var highestBadTransactionCustomer = req.body.disputed_customer;
                var updatedTransactionStatusSql="update ts_transactions set transaction_status='Bad Transaction' where  stripe_payment_id ='"+req.body.disputed_transaction+"'";
                connection.query(updatedTransactionStatusSql, function (err, newTransactionStatus) {
                    var fetchTrustScore="SELECT trust_score FROM ts_buyers WHERE stripe_customer_id='"+highestBadTransactionCustomer+"'" ;
                    connection.query(fetchTrustScore, function (err, trustScore) {
                        var trust_score = trustScore[0].trust_score-200;
                        var updatedTrustScoreSql="update ts_buyers set trust_score='"+trust_score+"'where  stripe_customer_id='"+highestBadTransactionCustomer+"'";
                        connection.query(updatedTrustScoreSql, function (err, newTrustScore) {
                            var transactionSql="SELECT * FROM ts_transactions ORDER BY transaction_id DESC" ;
                            connection.query(transactionSql, function (err, transaction) {
                                res.redirect('/api/products/demo6maxGoodTransaction/'+highestGoodTransactionCustomer);
                                /*res.send("successful");*/
                            });
                        });
                    });
                });    
            }
            else{
                var highestBadTransactionCustomer = highestBadTransactions[0].stripe_customer_id ;
                console.log("Already highest  bad transaction customer : "+highestBadTransactionCustomer);
                var updatedTransactionStatusSql="update ts_transactions set transaction_status='Bad Transaction' where  stripe_payment_id ='"+req.body.disputed_transaction+"'";
                connection.query(updatedTransactionStatusSql, function (err, newTransactionStatus) {
                    var newhighestBadTransactionSql = "select stripe_customer_id ,count(transaction_status) as count from ts_transactions where transaction_status='Bad Transaction' group by stripe_customer_id order by count desc limit 1";
                    connection.query(newhighestBadTransactionSql, function (err, newhighestBadTransactions) {      
                        var newhighestBadTransactionCustomer = newhighestBadTransactions[0].stripe_customer_id ;
                        console.log("new highest  bad transaction customer: "+newhighestBadTransactionCustomer);
                        if(newhighestBadTransactionCustomer ==  highestBadTransactionCustomer){
                            console.log("already bad transaction customer");
                            var transactionSql="SELECT * FROM ts_transactions " ;
                            connection.query(transactionSql, function (err, transaction) {
                                res.redirect('/api/products/demo6maxGoodTransaction/'+highestGoodTransactionCustomer);
                                /*res.send('Successful');*/
                            });
                        }
                        else{
                            console.log("NEW BAD CUSTOMER");
                            var fetchTrustScore="SELECT trust_score FROM ts_buyers WHERE stripe_customer_id='"+newhighestBadTransactionCustomer+"'" ;
                            connection.query(fetchTrustScore, function (err, trustScore) {
                                var trust_score = trustScore[0].trust_score-200;
                                var updatedTrustScoreSql="update ts_buyers set trust_score='"+trust_score+"'where  stripe_customer_id='"+newhighestBadTransactionCustomer+"'";
                                connection.query(updatedTrustScoreSql, function (err, newTrustScore) {
                                    res.redirect('/api/products/demo6maxGoodTransaction/'+highestGoodTransactionCustomer);
                                    /*res.send("Successful");*/
                                });//update trust score
                            });//fetch trust score 
                        }
                    });//newhighest bad transaction    
                });//update transaction as bad transaction    
            }
        });//highest bad transaction sql    
    });//already highest good transaction customer
});    

//checking good transaction at time of disputing the transaction
router.get('/demo6maxGoodTransaction/:id',function(req,res){
    var highestGoodTransactionCustomer = req.params.id;
    console.log("Already Good customer: "+highestGoodTransactionCustomer);
    var newhighestGoodTransactionSql = "select stripe_customer_id ,count(transaction_status) as count from ts_transactions where transaction_status='Good Transaction' group by stripe_customer_id order by count desc limit 1";
    connection.query(newhighestGoodTransactionSql, function (err, newhighestGoodTransactions) {      
        var newhighestGoodTransactionCustomer = newhighestGoodTransactions[0].stripe_customer_id ;
        console.log("New Good customer: "+newhighestGoodTransactionCustomer);
        if(newhighestGoodTransactionCustomer ==  highestGoodTransactionCustomer){
            console.log("Already given");
            var transactionSql="SELECT * FROM ts_transactions " ;
            connection.query(transactionSql, function (err, transaction) {
                res.send('Successful');
            });
        }
        else{
            console.log("give+300");
            var fetchTrustScore="SELECT trust_score FROM ts_buyers WHERE stripe_customer_id='"+newhighestGoodTransactionCustomer+"'" ;
            connection.query(fetchTrustScore, function (err, trustScore) {
                var trust_score = trustScore[0].trust_score+300;
                var updatedTrustScoreSql="update ts_buyers set trust_score='"+trust_score+"'where  stripe_customer_id='"+newhighestGoodTransactionCustomer+"'";
                connection.query(updatedTrustScoreSql, function (err, newTrustScore) {
                    var transactionSql="SELECT * FROM ts_transactions ORDER BY transaction_id DESC" ;
                    connection.query(transactionSql, function (err, transaction) {
                        res.send("Successful");
                    });
                });//update trust score
            });//fetch trust score 
        }
    });//newhighest bad transaction    
});


// (TWITTER LOGIN )require social-oauth-client 
var soc = require('social-oauth-client');
// Twitter (REPLACE WITH YOUR OWN APP SETTINGS) 
var twitter = new soc.Twitter({
  "CONSUMER_KEY": "NhPGdDhZGSSxJZsUpAG0KRQYn",
  "CONSUMER_SECRET": "HxDLfgSuIW4vOwRwzdi9NCVZlfuLBfVBGJxpqs8hxPxzurw56U",
});

// go to Twitter authorize page 
router.get('/twitter_authorize', function (req, res) {
var fullUrl = req.protocol + '://' + req.get('host'); 
var twitter = new soc.Twitter({
  "CONSUMER_KEY": "NhPGdDhZGSSxJZsUpAG0KRQYn",
  "CONSUMER_SECRET": "HxDLfgSuIW4vOwRwzdi9NCVZlfuLBfVBGJxpqs8hxPxzurw56U",
  "REDIRECT_URL": fullUrl+"/api/products/twitter_callback"
});
  // twitter OAuth scope is managed by management console. 
  var url = twitter.getAuthorizeUrl().then(function(url) {
    console.log("url");
    res.redirect(url);
  }, function(err) {
    res.send(err);
  });
});
     
// TWITTER OAuth redirection url 
router.get('/twitter_callback', function (req, res) {
    // delegate to social-oauth-client 
  twitter.callback(req, res).then(function(user) {
    // oauth token & user basic info will be shown 
    var twitter_id = user.info.id;
    var twitter_followers = user.info.followers_count;
    var twitterCreatedDate = user.info.created_at;
    var twitterCreatedDate = new Date(twitterCreatedDate);
    console.log("twitterCreatedDate"+twitterCreatedDate);
    var date=new Date();
    var timeDiff = Math.abs(date.getTime() - twitterCreatedDate.getTime()); 
    var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    var twitter_age=diffDays;
    var highestFollowersBuyerSql = "select stripe_customer_id,twitter_followers,twitter_followers_percentile from ts_buyers order by twitter_followers desc limit 1";
    connection.query(highestFollowersBuyerSql, function (err, highestFollowersBuyer) {      
        var highestFollowersBuyer= highestFollowersBuyer[0].stripe_customer_id;
        var addTwitterData="UPDATE ts_buyers SET twitter_id='"+twitter_id+"',twitter_followers='"+twitter_followers+"',twitter_age='"+twitter_age+"' WHERE stripe_customer_id = '"+req.session.stripe_customer_id+"'";
        connection.query(addTwitterData, function (err, twitter) {
            //get no. of buyers who have less followers then current buyer            
            var followersPercentileSql="select count(twitter_followers) as count from ts_buyers where twitter_followers <'"+twitter_followers+"'";
            connection.query(followersPercentileSql,function(err,followersPercentile){
                //get Total number of receords
                var fetchDataFollowersSql="SELECT * , count(buyer_id) as count FROM ts_buyers";
                connection.query(fetchDataFollowersSql,function(err,fetchDataFollowers){
                    var fetchData="SELECT * from ts_buyers order by twitter_followers Desc";
                    connection.query(fetchData,function(err,fetchData){
                        var total_buyers=fetchDataFollowers[0].count;//total no. of buyers
                        var m=followersPercentile[0].count;//no. of buyers who have less followers  than this buyer
                        var percentile = Math.ceil(m / total_buyers)*100;//percentile 
                        //insert percentile for current  buyer 
                        var insertPercentileFollowers ="UPDATE ts_buyers SET twitter_followers_percentile='"+percentile+"'WHERE stripe_customer_id = '"+req.session.stripe_customer_id+"'";
                        connection.query(insertPercentileFollowers,function(err,followerPercentile){
                            //calculate percentile for all buyers
                            async.forEachSeries(fetchData, function(n1, callback_s1) {
                                var percentile= n1.twitter_followers/total_buyers*100;
                                console.log(n1.buyer_id+"  :  "+n1.twitter_followers+"  :  "+percentile);
                                var updatePercentile="UPDATE ts_buyers SET twitter_followers_percentile='"+percentile+"'WHERE buyer_id = '"+n1.buyer_id+"'";    
                                connection.query(updatePercentile,function(err,percentileList){
                                        callback_s1();    
                                })                                
                            }, function (err) {
                                
                                var newHighestFollowersSql = "select stripe_customer_id,twitter_followers,twitter_followers_percentile from ts_buyers order by twitter_followers desc limit 1";
                                connection.query(newHighestFollowersSql, function (err, newHighestFollowersBuyer) {      
                                    var newHighestFollowersBuyer= newHighestFollowersBuyer[0].stripe_customer_id ;
                                    console.log("Already Higher : "+highestFollowersBuyer);
                                    console.log("NEW Buyer :  "+newHighestFollowersBuyer);
                                    if(newHighestFollowersBuyer == highestFollowersBuyer){
                                        console.log("Already Given");
                                        res.redirect('/api/products/addTwitterDetails');
                                    }
                                    else{
                                        console.log("give +25");
                                       var fetchTrustScore="SELECT trust_score FROM ts_buyers WHERE stripe_customer_id='"+newHighestFollowersBuyer+"'" ;
                                        connection.query(fetchTrustScore, function (err, trustScore) {
                                            var trust_score = trustScore[0].trust_score+25;
                                            var updatedTrustScoreSql="update ts_buyers set trust_score='"+trust_score+"'where  stripe_customer_id='"+newHighestFollowersBuyer+"'";
                                            connection.query(updatedTrustScoreSql, function (err, newTrustScore) {
                                                res.redirect('/api/products/addTwitterDetails');            
                                            });//update trust score
                                        });//fetch trust score 
                                    }
                                 });   
                            });
                        });
                    });    
                });
            });
        });
    });    
  }, function(err) {
    res.send(err);
  });
});

//show buyer details after connect twitter account
router.get('/addTwitterDetails',function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host'); 
    var buyerDetailsql="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
    connection.query(buyerDetailsql, function (err,buyerDetails) {
        var fetchbankaccount="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"'";
        connection.query(fetchbankaccount, function (err,bankaccount) {
            var buyerdetails="select * from ts_buyers where buyer_id='"+req.session.buyer_id+"'";
            connection.query(buyerdetails, function (err,result) {
                var cardDetailssql="SELECT * FROM ts_buyers_creditcards WHERE buyer_id='"+req.session.buyer_id+"'";
                connection.query(cardDetailssql, function (err, cardDetails) {
                    var transactionSql="SELECT * FROM ts_transactions WHERE buyer_id='"+req.session.buyer_id+"' ORDER BY transaction_id DESC" ;
                    connection.query(transactionSql, function (err, transaction) {
                        var share_link=fullUrl+"/demo6Register?invite_id="+result[0].share_id;
                        req.session.tab='socialmedia';
                        req.flash('info', 'Twitter Account Connected Successfully.');
                        res.render('demo6buyerDetails',{
                            stripe_customer_id :req.session.stripe_customer_id,
                            buyer_id : req.session.buyer_id,
                            name : req.session.name,
                            email : req.session.email,
                            phone : req.session.phone,
                            address : result[0].address,
                            country : result[0].country,
                            city : result[0].city,
                            zip_code : result[0].zip_code,
                            unique_id : result[0].unique_id,
                            stripe_customer_id : result[0].stripe_customer_id,
                            email_status : result[0].email_status,
                            phone_status : result[0].phone_status,
                            share_link : share_link,
                            share_id : result[0].share_id,
                            trust_score : result[0].trust_score,
                            otp_code : result[0].otp_code,
                            edu_emp : result[0].edu_emp,
                            tab:req.session.tab,
                            transaction : transaction,
                            bankaccount : bankaccount,
                            cardDetails : cardDetails,
                            result : result[0],
                            messages : req.flash('info')
                        });
                    });
                });        
            });
        });
    });
});  



/*// require social-oauth-client 
var soc = require('social-oauth-client');
// Facebook (REPLACE WITH YOUR OWN APP SETTINGS) 
var facebook = new soc.Facebook( {
  "APP_ID": "263408090855653",
  "APP_SECRET": "d8bc94d2ef3edc3c6e8d5e3b49a342a2",
  "CLIENT_ID": "110720946380377",
});
// go to Facebook authorize page 
router.post('/facebook_authorize', function (req, res) {
    var fullUrl = req.protocol + '://' + req.get('host');       
    var facebook = new soc.Facebook( {
      "APP_ID": "263408090855653",
      "APP_SECRET": "d8bc94d2ef3edc3c6e8d5e3b49a342a2",
      "CLIENT_ID": "110720946380377",
      "REDIRECT_URL": fullUrl+"/api/products/facebook_callback"
    }); 
  var url = facebook.getAuthorizeUrl(); // default scope public_profile 
  // var url = facebook.getAuthorizeUrl(['email','user_friends']); 
  console.log(url);
  res.redirect(url);
});
     
// Facebook OAuth redirection url 
router.get('/facebook_callback', function (req, res) {
    console.log("in facebook_callback");
  // delegate to social-oauth-client 
  facebook.callback(req, res).then(function(user) {
    // oauth token & user basic info will be shown 
    console.log("No error");
    res.send(user);
  }, function(err) {
    console.log("error: "+err);
    res.send(err);
  });
});

*/

// get instance for Google (REPLACE WITH YOUR OWN APP SETTINGS) 
var google = new soc.Google({
  "CLIENT_ID": "554068925645-40te798keuk33t72r05000ehojl5t2r6.apps.googleusercontent.com",
  "CLIENT_SECRET": " dujmvz1iHI1ASz6ko3fnqnH6"  
});
 
// go to Google authorize page 
router.post('/google_authorize', function (req, res) {
    var fullUrl = req.protocol + '://' + req.get('host');  
    var google = new soc.Google({
      "CLIENT_ID": "554068925645-40te798keuk33t72r05000ehojl5t2r6.apps.googleusercontent.com",
      "CLIENT_SECRET": "dujmvz1iHI1ASz6ko3fnqnH6",
      "REDIRECT_URL": fullUrl+"/api/products/google_callback"
    });
  //var url = google.getAuthorizeUrl(); // default scope 'https://www.googleapis.com/auth/plus.me' 
   var url = google.getAuthorizeUrl(['https://www.googleapis.com/auth/plus.me', 
    'https://www.googleapis.com/auth/gmail.settings.basic']); 
    res.redirect(url);
});
 
// Google OAuth redirection url 
router.get('/google_callback', function (req, res) {
 
  // delegate to social-oauth-client 
  google.callback(req, res).then(function(user) {
 
    // oauth token & user basic info will be shown 
    console.log(user);
    console.log(JSON.stringify(user));
    res.send(user);
  }, function(err) {
    console.log("err : "+err);
    res.send(err);
  });
});
 
router.get('/', function (req, res) {
  var demo = '<h2>Social OAuth Client Demo!</h2>';
  demo+= '<a href="/google_authorize">Google</a><br/>';
  res.send(demo);
});
    
module.exports = router;
