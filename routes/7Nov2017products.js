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
         throw err;
       console.log("Database Connection error : "+err);
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
    var stripe = require("stripe")("sk_live_yHaX0pipxf1W17dEsb77fRTk");  
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
    var stripe = require("stripe")("sk_live_yHaX0pipxf1W17dEsb77fRTk");  
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
    return false;
});
router.post('/purchase',function(req,res){
    var stripe = require("stripe")("sk_live_yHaX0pipxf1W17dEsb77fRTk");  
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
router.get('/logout',function(req,res){
    req.session.destroy();
    res.redirect('/demo5Login');
});
router.post('/bank-verify',function(req,res){
    var bank_full_acc=req.body.bank_full_acc;
    var bank_acc=req.body.bank_acc;
    var bank_acc_id=req.body.bank_acc_id;
    var deposit1=req.body.first_deposit;
    var deposit2=req.body.second_deposit;
    var stripe = require("stripe")("sk_live_yHaX0pipxf1W17dEsb77fRTk");  
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

//Register New Buyer Or Seller
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
                                    var sql="INSERT INTO ts_buyers (stripe_customer_id,name,email,phone,password,fb_id,otp_code,trust_score) VALUES('"+stripe_customer_id+"','"+name+"','"+email+"','"+phone+"','"+password+"','"+fb_id+"','"+otp+"','"+trust_score+"')";
                                    connection.query(sql, function (err, result) {
                                        if (err) {
                                            throw err;
                                        }
                                        else{
                                            req.flash('info', 'Thank you for sign up at winwin!');
                                            res.redirect('/demo6Login');
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

//send mail or otp from profile tab
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
        if (err) {
            console.log("Database connection error");
            throw err;
            return false;
        }
        else
        {
            var updateOtp="update ts_buyers set otp_code='"+otp+"' where email='"+email+"'";
            connection.query(updateOtp, function (err, updatedotp) {
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
                                req.session.tab='profile';
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
                                    trust_score : result[0].trust_score,
                                    otp_code : result[0].otp_code,
                                    edu_emp : result[0].edu_emp,
                                    tab:req.session.tab,
                                    bankaccount :bankaccount,
                                    cardDetails : cardDetails,
                                    messages : req.flash('info')
                                }); 
                            }
                        });            
                    }
                })            
            }
        });
    }
});
       

});

//Verify Email id 
router.get('/verify/:email',function(req,res){
   var sql="select * from ts_buyers where email='"+req.params.email+"'";
   connection.query(sql, function (err, result) {
        if (err) {
            console.log("Database connection error");
            throw err;
            return false;
        }
        else
        {
            if(result.length>0)
            {
                var trustscore=result[0].trust_score+25;
               var emailVerify="update ts_buyers set email_status='verified',trust_score='"+trustscore+"' where email='"+req.params.email+"'";
                     connection.query(emailVerify, function (err, result1) {
                        if (err) {
                            console.log("Database connection error");
                            throw err;
                            return false;
                        }
                        else
                        {  


                            req.session.stripe_customer_id=result[0].stripe_customer_id;
                            req.session.buyer_id=result[0].buyer_id;
                            req.session.name=result[0].name;
                            req.session.email=result[0].email;            
                            req.session.phone=result[0].phone;
                            res.redirect('/demo6EmailVerified');
                        }
                    });
            }
            else
            {

            }
        }
    });
});

// Demo6   Check Login 
router.post('/demo6checkLogin',function(req,res){
    var email=req.body.emailid;
    var role=req.body.role;
    var algorithm="aes256";
    var key="encrypt";
    var cipher = crypto.createCipher(algorithm, key); 
    var encrypted = cipher.update(req.body.pwd, 'utf8', 'hex') + cipher.final('hex'); 

    var sql="SELECT * FROM ts_buyers WHERE email='"+email+"'AND password='"+encrypted+"'";
    connection.query(sql, function (err, result) {
        if (err) {
            console.log("Database connection error");
            throw err;
            return false;
        }
        if(result.length==0){
            req.flash('info', 'Invalid Email ID or Password!');
            res.redirect('/demo6Login');
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
                                trust_score : result[0].trust_score,
                                otp_code : result[0].otp_code,
                                edu_emp : result[0].edu_emp,
                                tab:req.session.tab,
                                bankaccount : bankaccount,
                                cardDetails : cardDetails,
                                messages : req.flash('info')
                            });
                        }
                    });
                }
            });        
        }
    });    
});

//login with facebook
router.get('/demo6FBLogin/:fb_id',function(req,res){
    var fb_id=req.params.fb_id;
    var sql="SELECT * FROM ts_buyers WHERE fb_id='"+fb_id+"'";
    connection.query(sql, function (err, result) {
        if (err) {
            console.log("Database connection error");
            throw err;
            return false;
        }
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
                                trust_score : result[0].trust_score,
                                otp_code : result[0].otp_code,
                                edu_emp : result[0].edu_emp,
                                tab:req.session.tab,
                                bankaccount : bankaccount,
                                cardDetails : cardDetails,
                                messages : req.flash('info')
                            });
                        }
                    });        
                }
            });        
        }
    });    
});

//demo6 update buyer profile 
router.get('/updateProfile/:id',function(req,res){
    var id=req.params.id;
    var role=req.body.role;
    var sql="SELECT * FROM ts_buyers WHERE buyer_id='"+id+"'";
    connection.query(sql, function (err, result) {
        if (err) {
            console.log("Database connection error");
            throw err;
            return false;
        }
        else{
            req.session.tab='profile';
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
                                trust_score : result[0].trust_score,
                                otp_code : result[0].otp_code,
                                edu_emp : result[0].edu_emp,
                                tab:req.session.tab,
                                bankaccount : bankaccount,
                                cardDetails : cardDetails,
                                messages : req.flash('info')
                            });
                        }
                    });        
                }
            });       
        }
    });    
});

router.post('/update_profile',function(req,res){
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
        if (err) {
            console.log("Database connection error");
            throw err;
            return false;
        }
        else
        {
            req.flash('info', 'Your profile updated successfully!');
            res.redirect('/api/products/updateProfile/'+id);
        }
    });    
});

//verify mobile otp from profile tab
router.post('/verifyOTP',function(req,res){
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
                        console.log("Database connection error");
                        throw err;
                        return false;
                    }
                    else
                    {
                        req.flash('info','Phone Number verified successfully');
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
                                                    trust_score : result[0].trust_score,
                                                    otp_code : result[0].otp_code,
                                                    edu_emp : result[0].edu_emp,
                                                    tab:req.session.tab,
                                                    bankaccount : bankaccount,
                                                    cardDetails  :cardDetails,
                                                    messages : req.flash('info')
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
                                            trust_score : result[0].trust_score,
                                            otp_code : result[0].otp_code,
                                            edu_emp : result[0].edu_emp,
                                            tab:req.session.tab,
                                            bankaccount : bankaccount,
                                            cardDetails : cardDetails,
                                            messages : req.flash('info')
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

//change buyers password
router.post('/demo6changePassword',function(req,res){
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
                                    console.log(cardDetails);
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
                                        trust_score : result[0].trust_score,
                                        otp_code : result[0].otp_code,
                                        edu_emp : result[0].edu_emp,
                                        tab:req.session.tab,
                                        bankaccount : bankaccount,
                                        cardDetails : cardDetails,
                                        messages : req.flash('info')
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

//Demo 6 forgot password
router.post('/demo6ForgotPassword',function(req,res){
    console.log(req.body);
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

//Demo 6 Add bank account
router.post('/demo6AddBankAccount',function(req,res){
    //check bank account already exists or not
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
    //sk_live_yHaX0pipxf1W17dEsb77fRTk
    //sk_test_R1lTgEqRcnMjAUsO0BR9sjBB
    console.log("routing_number : "+req.body.routing_number);
    console.log("accout NUmber : "+req.body.account_number);
    console.log("account_holder_name : "+req.body.account_holder_name);
    console.log("account_holder_type"+req.body.account_holder_type);
    var sql="SELECT * FROM ts_buyers_bank_accounts WHERE account_number='"+req.body.account_number+"' AND buyer_id='"+req.session.buyer_id+"'AND routing_number='"+req.body.routing_number+"'";
    connection.query(sql,function(err,result){
        if(err){
            throw err;
            return false;
        }
        else{
            if(result.length>0){
                req.flash('info',"Bank account already exists");
                req.session.tab='bankaccounts';
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
                                            trust_score : result[0].trust_score,
                                            otp_code : result[0].otp_code,
                                            edu_emp : result[0].edu_emp,
                                            tab:req.session.tab,
                                            bankaccount : bankaccount,
                                            cardDetails : cardDetails,
                                            messages : req.flash('info')
                                        });
                                    }
                                });        
                            }
                        });
                    }
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
                        req.flash('info', 'Stripe - Error! while creating Bank Token.');
                        console.log("err creating  token");return false;
                        res.redirect('/demo6buyerDetails');
                    }
                    else{
                        console.log("token created");
                        var tokenID = token.id; 
                        var stripe_bank_account_id = token.bank_account.id
                        console.log("Stripe bank account id :"+stripe_bank_account_id);
                        stripe.customers.update(req.session.stripe_customer_id, {
                            source:tokenID
                        }, function(err, customer) {
                            if(err){
                              console.log("err Updating  customer");return false;
                              req.flash('info', 'Stripe - Error! while adding bank account.');
                              res.redirect('/demo6buyerDetails');
                              console.log("Customer update failed");
                            }
                            else{
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
                                                                    trust_score : result[0].trust_score,
                                                                    otp_code : result[0].otp_code,
                                                                    edu_emp : result[0].edu_emp,
                                                                    tab:req.session.tab,
                                                                    bankaccount : bankaccount,
                                                                    cardDetails : cardDetails,
                                                                    messages : req.flash('info')
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
        }   
   }); 
});

//Demo6 Bank verify with deposits(Micro transaction).
router.post('/demo6bankVerify',function(req,res){
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
                console.log("error retriving coustomer"+err);
            }
            else{
                console.log("Retrived customer : "+customer);    
            }
        // asynchronously called
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
                                        req.flash('info', 'Bank account verification failed.');
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
                                            trust_score : result[0].trust_score,
                                            otp_code : result[0].otp_code,
                                            edu_emp : result[0].edu_emp,
                                            tab:req.session.tab,
                                            bankaccount : bankaccount,
                                            cardDetails : cardDetails,
                                            messages : req.flash('info')
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
                var getVerifiedAccounts="select * from ts_buyers_bank_accounts where buyer_id='"+req.session.buyer_id+"' AND status='verified'";                
                connection.query(getVerifiedAccounts, function (err, getverifiedAccounts) {
                    if (err) {
                        console.log("Database connection error");
                        throw err;
                        return false;
                    }
                    else
                    {
                        console.log(getverifiedAccounts.length);
                        if(getverifiedAccounts.length==0){

                        }
                        else{

                        }
                        
                    }  
                });     
                var sql="UPDATE ts_buyers_bank_accounts SET status='verified' where stripe_bank_account_id='"+stripe_bank_account_id+"'";
                connection.query(sql, function (err, bank_details) {
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
                                                trust_score : result[0].trust_score,
                                                otp_code : result[0].otp_code,
                                                edu_emp : result[0].edu_emp,
                                                tab:req.session.tab,
                                                bankaccount : bankaccount,
                                                cardDetails : cardDetails,
                                                messages : req.flash('info')
                                            });
                                        }
                                    });        
                                }
                            });        
                        }
                    });
                });
            }
        });//end stripe verify
    });
});

/*router.post('/demo6AddCard',function(req,res){
    console.log(req.body);
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  

    //check card exist or not
    var sql="SELECT * FROM ts_buyers_creditcards WHERE card_number='"+req.body.card_number+"' AND buyer_id='"+req.session.buyer_id+"'";
    connection.query(sql,function(err,result){
            console.log(result);
            if(err){
                throw err;
                return false;
            }
            else{
                if(result.length>0){
                    console.log("card already exist");
                    req.flash('info',"Card already exists");
                    req.session.tab='cards';
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
                                                trust_score : result[0].trust_score,
                                                otp_code : result[0].otp_code,
                                                edu_emp : result[0].edu_emp,
                                                tab:req.session.tab,
                                                bankaccount : bankaccount,
                                                cardDetails : cardDetails,
                                                messages : req.flash('info')
                                            });
                                        }
                                    });        
                                }
                            });
                        }
                    });
                }
                else{
                    //if first card
                   
                    if(cards.length==0){
                         //stripe add card code
                        stripe.tokens.create({
                            card: {
                            "number": req.body.card_number,
                            "exp_month": req.body.expire_month,
                            "exp_year": req.body.expire_year,
                            "cvc": req.body.cvc
                            }
                            }, function(err, token) {
                                if(err){
                                    console.log("err creating  token first time");
                                    req.flash('info', 'Stripe - Error! while creating card Token.');
                                    res.redirect('/demo6buyerDetails');
                                }
                                else{
                                    console.log("card token created for first time card add");
                                    var tokenID = token.id; 
                                    var stripe_card_id = token.card.id
                                    console.log("Stripe card  id :"+stripe_card_id);
                                    stripe.customers.update(req.session.stripe_customer_id, {
                                        source:tokenID
                                    }, function(err, customer) {
                                        if(err){
                                          console.log("Customer update failed for fitst time add");
                                          req.flash('info', 'Stripe - Error! while adding bank account.');
                                          res.redirect('/demo6buyerDetails');
                                          
                                        }
                                        else{
                                            console.log("customer updated 1 time now sql  ");
                                            //end stripe code            
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
                                                                    var trustscore=buyerDetails[0].trust_score+25;
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
                                                                                                                trust_score : result[0].trust_score,
                                                                                                                otp_code : result[0].otp_code,
                                                                                                                edu_emp : result[0].edu_emp,
                                                                                                                tab:req.session.tab,
                                                                                                                bankaccount : bankaccount,
                                                                                                                cardDetails : cardDetails,
                                                                                                                messages : req.flash('info')
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
                                                } 
                                            });       
                                        }//check complete for first card
                                    });
                                } 
                            
                        
                    }
                    else{
                        // if not first card
                            //stripe add card code
                            stripe.tokens.create({
                                card: {
                                "number": req.body.card_number,
                                "exp_month": req.body.expire_month,
                                "exp_year": req.body.expire_year,
                                "cvc": req.body.cvc
                                }
                            }, function(err, token) {
                            if(err){
                                console.log("err creating  token for second time");
                                req.flash('info', 'Stripe - Error! while creating Card Token.');
                                res.redirect('/demo6buyerDetails');
                            }
                            else{
                                console.log("card token created for second time add");
                                var tokenID = token.id; 
                                var stripe_card_id = token.card.id
                                console.log("Stripe card  id :"+stripe_card_id);
                                stripe.customers.update(req.session.stripe_customer_id, {
                                    source:tokenID
                                }, function(err, customer) {
                                    if(err){
                                      console.log("Customer update failed second time");
                                      req.flash('info', 'Stripe - Error! while adding Card.');
                                      res.redirect('/demo6buyerDetails');
                                    }
                                    else{
                                        console.log("customer updated for second time now insert in sql");
                                        //end stripe code            
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
                                                                            trust_score : result[0].trust_score,
                                                                            otp_code : result[0].otp_code,
                                                                            edu_emp : result[0].edu_emp,
                                                                            tab:req.session.tab,
                                                                            bankaccount : bankaccount,
                                                                            cardDetails : cardDetails,
                                                                            messages : req.flash('info')
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
                    }//end check second card 
               }
        }   //end not new card
    });
});*/

//Demo6 Add Card
router.post('/demo6AddCard',function(req,res){
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
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
                console.log("card already exist");
                req.flash('info',"Card already exists");
                req.session.tab='cards';
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
                                            trust_score : result[0].trust_score,
                                            otp_code : result[0].otp_code,
                                            edu_emp : result[0].edu_emp,
                                            tab:req.session.tab,
                                            bankaccount : bankaccount,
                                            cardDetails : cardDetails,
                                            messages : req.flash('info')
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
                                                       var tokenID='';
                                                       var stripe_card_id="";
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
                                                                                            trust_score : result[0].trust_score,
                                                                                            otp_code : result[0].otp_code,
                                                                                            edu_emp : result[0].edu_emp,
                                                                                            tab:req.session.tab,
                                                                                            bankaccount : bankaccount,
                                                                                            cardDetails : cardDetails,
                                                                                            messages : req.flash('info')
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
                            } 
                            //if not first card
                            else{
                                // if not first card
                                var stripe_card_id='';
                                var tokenID='';
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
                                                                    trust_score : result[0].trust_score,
                                                                    otp_code : result[0].otp_code,
                                                                    edu_emp : result[0].edu_emp,
                                                                    tab:req.session.tab,
                                                                    bankaccount : bankaccount,
                                                                    cardDetails : cardDetails,
                                                                    messages : req.flash('info')
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

module.exports = router;