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

//Database Connection
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'winwin'
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
    console.log(fname);
    console.log(lname);
    console.log(email);
    console.log(password);
    var sql="SELECT * FROM customers WHERE email='"+email+"'";
    connection.query(sql,function(err,result){
        if(err){
            console.log(err);
            return false;
        }
        else{
            console.log("result length : "+result.length);
            if(result.length==0){
                stripe.customers.create({
                    email:email,
                    description: 'Customer for '+email
                    }, function(err, customer) {
                    if (err){
                        console.log("Customer create Error : "+err);
                        return false;
                    }
                    else{
                        console.log("customerID: "+customer.id);
                        var stripe_cust_id=customer.id;       
                        console.log("stripe_cust_id: "+stripe_cust_id);
                        var sql="INSERT INTO customers (stripe_cust_id,fname,lname,email,password) VALUES('"+stripe_cust_id+"','"+fname+"','"+lname+"','"+email+"','"+password+"')";
                        connection.query(sql, function (err, result) {
                            if (err) {
                                console.log("errr")
                                throw err;
                            }
                            else{
                                console.log("1 record inserted");  
                                res.redirect('/demo5Login?msg=Registration_Successful');
                            }        
                        });    
                    }
                }); 
            } //end result.length         
            else{
                res.redirect('/demo5Register');
            }  
        }
    }); 
    
});

//Check Login
router.post('/checkLogin',function(req,res){
    var email=req.body.emailid;
    var password=md5(req.body.pwd);
    var flash=require('req-flash');
    console.log(email);
    console.log(password);
    var sql="SELECT * FROM customers WHERE email='"+email+"'AND password='"+password+"'";
        connection.query(sql, function (err, result) {
        if (err) {
            throw err;
            return false;
        }
        //to retrive data// console.log(result[0].customer_id);
        if(result==''){
            console.log("No user found");
            res.redirect('/demo5Login?msg=Wrong_email_or_password');
            return false;
        }
        else
        {
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
    var sql="SELECT * FROM bank_details where customer_id='"+req.session.customer_id+"'";
        connection.query(sql, function (err, bank_details) {
            if (err) {
                console.log("errr");
                throw err;
            }
            else{
                res.render('bankAccounts',{
                    bank_details:bank_details,
                    customer_id:req.session.customer_id
                });
            }                                        
    });
})
//Add Bank Account
router.post('/addBankAccount',function(req,res){
    var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");  
    var routing_number=req.body.routing_no;
    var account_number=req.body.acc_number;
    var account_holder_name=req.body.acc_holder_name;
    var account_holder_type=req.body.acc_holder_type;
    var customer_id=req.body.customer_id;
    var sql="SELECT * FROM bank_details WHERE account_number='"+account_number+"' AND customer_id='"+customer_id+"'AND routing_number='"+routing_number+"'";
    connection.query(sql,function(err,result){
        if(err){
            console.log("Select bank account err.");
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
                        console.log('error creating token');
                    }
                    else{
                        var tokenID = result.id; 
                        stripe.customers.update(req.session.stripe_cust_id, {
                            source:tokenID
                        }, function(err, customer) {
                            if(err){
                                console.log("Customer update failed");
                                return false;
                            }
                            else{
                                var sql="INSERT INTO bank_details (customer_id,routing_number,account_number,account_holder_name,account_holder_type) VALUES('"+customer_id+"','"+routing_number+"','"+account_number+"','"+account_holder_name+"','"+account_holder_type+"')";
                                connection.query(sql, function (err, result) {
                                    if (err) {
                                        console.log("errr");
                                        throw err;
                                    }
                                    else{
                                        console.log("1 record inserted");  
                                        var sql="SELECT * FROM bank_details";
                                        connection.query(sql, function (err, result) {
                                            if (err) {
                                                console.log("errr");
                                                throw err;
                                            }
                                            else{
                                                
                                                    res.redirect('bank_details_list');
                                               
                                            }                                        
                                    });}
                                });                
                            }
                        });
                    }
                });
            }
            else{
                res.redirect('/demo5BankAccounts?msg=Bank_account_already_exists');
            }
        }
    });
    
});
router.get('/logout',function(req,res){
    req.session.destroy(function(err) {
     
  });
    res.redirect('/demo5Login');
});
router.post('/bank-verify',function(req,res){
    console.log("verifying the bank");
    var deposit1=req.query.amt1;
    var deposit2=req.query.amt2;
    console.log(deposit1+deposit2);
    return false;
});
// //Customer Verify
    // router.get('/stripe-verify',function(req,res){
    //     var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");
    //     var amount1=req.query.amount1;
    //     var amount2=req.query.amount2;
    //     var customerId=req.query.customerId;
    //     console.log(amount1);
    //     console.log(amount2);
    //     console.log(customerId);
    //     stripe.customers.retrieve(
    //         customerId,
    //         function(err, customer) {
    //         // asynchronously called
    //             console.log("Customer Retrive Error : "+ err);
    //             console.log("Retrived Customer : "+customer);
    //             if(err){
    //                 res.send("\n <a href='/demo5'>Buy Again?</a><br><br>Error Type: "+err.type+"<br>"+err);
    //                 return false;
    //             }
    //             if(customer){   
    //                 stripe.customers.verifySource(
    //                     customer.id,
    //                     customer.default_source,//BankAccount
    //                     {
    //                         amounts: [amount1,amount2]
    //                     },function(err, bankAccount) {
    //                         console.log("Varifying Source Error : "+ err);
    //                         if(err){
    //                             res.redirect('/customerslist.html?msg=Error:_The_amounts_provided_do_not_match_the_amounts_that_were_sent_to_the_bank_account.');
    //                             return false;
    //                         }
    //                         console.log("Bank Account"+bankAccount);
    //                            stripe.charges.create({
    //                                 amount:100,
    //                                 currency: "usd",
    //                                 customer: customer.id // Previously stored, then retrieved       
    //                                 },function(err, stripeChargeRes) {
    //                                     console.log("Charge error : "+err);
    //                                     console.log("chargeRes :  "+ stripeChargeRes);
    //                                     if(err){
    //                                         res.send("\n <a href='/demo5'>Buy Again?</a><br><br>Error Type: "+err.type+"<br>"+err);
    //                                         return false;
    //                                     }
    //                                     else {
    //                                         res.redirect('/demo5?msg=Payment_Successful');
    //                                     }
    //                                 });
    //                         }); 
    //             }
    //     });
    // });


    // //List Stripe Customers
    // router.post('/stripe-list-customers',function(req,res){
    //     var stripe = require("stripe")("sk_test_R1lTgEqRcnMjAUsO0BR9sjBB");
    //         stripe.customers.list(
    //            { limit: 2},
    //             function(err, customers) {
    //                 // asynchronously called
    //                 console.log("Err:"+ err);
    //                 console.log("Customers : "+customers);
    //                 res.json({
    //                     type: 'POST',
    //                     url: 'Customerslist.html', 
    //                     data: {json: JSON.stringify(customers)},
    //                     dataType: 'json'
    //                 });
    //             });         
    //             res.send(customers);
    //             res.redirect('Customerslist.html?Msg=returned');
    //         });

    //STRIPE MICRO TRANSACTION INTEGRATION WITH DESTINATION CHARGE
    // router.get('/stripe-connect-account6', function(req, res) {
    //     let baseUrl = req.protocol + '://' + req.get('host');
    //     let request = require('request');
    //     let myObj = {
    //         client_secret: 'sk_test_0blHDqbeNrogruXPieEXq6Ny', 
    //         code: req.query.code,
    //         grant_type : 'authorization_code'
    //     }
    //     request({
    //         url: "https://connect.stripe.com/oauth/token",
    //         method: "POST",
    //         json: true,   // <--Very important!!!
    //         body: myObj
    //     }, function (error, response, body){
    //         if (error) {
    //             console.log(error);
    //             logger('Error: stripe error:', errors.errorWithMessage(error));
    //             callback(errors.internalServer(false), null);
    //             return;
    //         }
    //         console.log("Error : "+error);
    //         console.log("Response : "+response);
    //         console.log("Body : "+body);
    //         console.log('Stripe User ID : '+body.stripe_user_id);
    //         let store = require('store2');
    //         //Cliend user id 
    //         store('stripe_user_id', body.stripe_user_id)
    //         //Laxmi's Secret Key 
    //         store('api_key',body.access_token);
    //         res.redirect(baseUrl+'/demo6');
    //     });
    // });    

    // router.post('/stripe-charge6', function(req, res) {
    //     let store = require('store2');
    //     //@laxmi
    //     const stripe = require("stripe")('sk_test_R1lTgEqRcnMjAUsO0BR9sjBB');
    //     //@Daniel
    //     // const stripe=require('stripe')('sk_test_0blHDqbeNrogruXPieEXq6Ny');
    //     const path = require('path');
    //     let successUrl = path.dirname(require.main.filename);
    //     let baseUrl = req.protocol + '://' + req.get('host');
    //     let amount = req.body.dAmount;
    //     let platformFees = ((amount * req.body.iPercentageFees) / 100);    
    //     let transferGroupCode = "order"+Math.floor(Math.random() * (9999 - 1111 + 1)) + 1111;
    //     console.log("Creating Token");
    //     stripe.tokens.create({  
    //         'bank_account': {
    //         country: 'us',
    //         currency: 'usd',
    //         routing_number:req.body.routingNumber, 
    //         account_number: req.body.accountNumber,
    //         account_holder_name:req.body.accountHolderName,
    //         account_holder_type:req.body.accountHolderType
    //         }
    //     }).then(function(result) {
    //         console.log("Token Created");
    //         if(result){
    //             // Get the bank token submitted by the form
    //             var tokenID = result.id;
    //             stripe.accounts.retrieve(
    //                 "acct_1Acp5wFfEy4b8J6e",
    //                 function(err, account) {
    //                 // asynchronously called
    //                 console.log("err : "+err);
    //                 console.log("Account : "+account);
    //                 stripe.customers.create({
    //                     source: tokenID,
    //                     description: "Daniel's Micro Transaction Payment"
    //                 }, function(err, customer) {
    //                     //Varify customers bank account
    //                     console.log("customer created");
    //                     var data = {amounts: [32,45]};
    //                     stripe.customers.verifySource(
    //                         customer.id,
    //                         customer.default_source,//BankAccount
    //                         {
    //                             amounts: [32, 45]
    //                         },function(err, bankAccount) {
    //                             console.log("Bank Account : "+bankAccount);
    //                             stripe.charges.create({
    //                                 amount: amount,
    //                                 currency: "usd",
    //                                 customer:customer.id,
    //                                 source:customer.default_source,
    //                                 destination: 'acct_1Acp5wFfEy4b8J6e',
    //                                 transfer_group: transferGroupCode,
    //                             }).then(function(charge) {
    //                                 console.log("Charge on Customer is Created");
    //                                 console.log("Connected User id : "+ store('stripe_user_id'));
    //                                     //Creating Transfer 
    //                                     stripe.transfers.create({
    //                                         amount: platformFees,
    //                                         currency: "usd",
    //                                         destination:'acct_1Acp5wFfEy4b8J6e',
    //                                         transfer_group: transferGroupCode
    //                                     }).then(function(transfer) {
    //                                         console.log(transfer);
    //                                         res.redirect(baseUrl+'/payment-success6.html')
    //                                     });
    //                                 });
    //                             });
    //                         });
    //                     });
                //     }});
                // });      
            
    // //STRIPE PLAID INTEGRATION WITH  DESTINATION CHARGE  
    // router.get('/stripe-connect-account7', function(req, res) {
    //     let baseUrl = req.protocol + '://' + req.get('host');
    //     let request = require('request');
    //     let myObj = {
    //         client_secret: 'sk_test_0blHDqbeNrogruXPieEXq6Ny', 
    //         code: req.query.code,
    //         grant_type : 'authorization_code'
    //     }

    //     request({
    //         url: "https://connect.stripe.com/oauth/token",
    //         method: "POST",
    //         json: true,   // <--Very important!!!
    //         body: myObj
    //     }, function (error, response, body){
    //         if (error) {
    //             console.log(error);
    //             logger('Error: stripe error:', errors.errorWithMessage(error));
    //             callback(errors.internalServer(false), null);
    //             return;
    //         }
    //         console.log('Stripe User ID : '+body.stripe_user_id);
    //         console.log("Access Token : "+body.access_token);
    //         let store = require('store2');
    //         store('stripe_user_id', body.stripe_user_id);
    //         store('access_token',body.accss_token);
    //         store('api_key',body.accrss_token);
    //         console.log("Client Id : "+body.client_id);
    //         res.redirect(baseUrl+'/demo7');
    //         // res.send("\n <a href='/demo7'>Buy Again?</a><br><br>"+err.type+"<br>"+err+"<br>Transfer : "+transfer);
    //     });
    // });

    // router.post('/stripe-charge7', function(req, res) {
    //     let store = require('store2');
    //     const path = require('path');
    //     let successUrl = path.dirname(require.main.filename);
    //     let baseUrl = req.protocol + '://' + req.get('host');
    //     let amount = req.query.amount;
    //     let iPercentageFees=req.query.iPercentageFees;
    //     let platformFees = ((amount * parseInt(req.query.iPercentageFees)) / 100);
    //     let transferGroupCode = "order"+Math.floor(Math.random() * (9999 - 1111 + 1)) + 1111;
    //     console.log("Amount : "+amount);
    //     console.log("iPercentageFees : "+ iPercentageFees);
    //     console.log("Platform Fees : "+platformFees);
    //     console.log("transferGroupCode : "+transferGroupCode);
    //     // Using Plaid's Node.js bindings (https://github.com/plaid/plaid-node)
    //     var plaid = require('plaid');
    //     var plaidClient = new plaid.Client('59bf97694e95b85652804861',
    //                                        '1b83f2284f78b3f5a90ea2a393e7ac',
    //                                        'fbe1cc3bcc84559827cff90979f305',
    //                                        plaid.environments.sandbox);
    //     plaidClient.exchangePublicToken(req.query.public_token, function(err, resExchange) {
    //     var accessToken = resExchange.access_token;
    //     console.log('Access Token : '+accessToken);
    //     // Generate a bank account token
    //     plaidClient.createStripeToken(accessToken, req.query.account_id, function(err, resCreateToken) {
    //     var bankAccountToken = resCreateToken.stripe_bank_account_token;
    //     console.log('Bank Account Token : '+bankAccountToken);
    //     // Get the bank token submitted by the form
    //     var tokenID = bankAccountToken;
    //     const stripe = require("stripe")('sk_test_R1lTgEqRcnMjAUsO0BR9sjBB');
    //     // Create a Customer
    //     // stripe.accounts.create({
    //     //     country: "US",
    //     //     type: "custom",
    //     //     }).then(function(acct) {
    //     //         console.log("Destination : "+acct.id);
    //     //         console.log("Creating Customer");

    //     // Recommended: sending API key with every request
    // stripe.customers.create(
    //   { email: "person@example.edu" },
    //   { api_key: store('api_key') } // account's access token from the Connect flow
    // ),function(err,response){
    //          stripe.customers.create({
    //                 source: tokenID,
    //                 description: "Mark's Payment"
    //             },  function(err, customer) {
    //                 console.log("Customer err: "+err);
    //                 console.log("Customer : "+customer.id );
    //                 stripe.charges.create({
    //                     amount: req.query.amount,
    //                     currency: "usd",
    //                     customer: customer.id,
    //                     source:customer.default_source,
    //                     transfer_group: transferGroupCode,
    //                     }, function(err, chargeRes) {
    //                         console.log("Charge Response err : "+err);
    //                         console.log("Charge Response : "+chargeRes);
    //                         //Create a transfer to connected account
    //                         stripe.transfers.create({
    //                             amount: platformFees,
    //                             currency: "usd",
    //                             transfer_group: transferGroupCode,
    //                             //destination: store('stripe_user_id'),   
    //                             //source:customer.default_source,
    //                             destination:acct.id
    //                             // destination: store('stripe_user_id')   
    //                         }),(function(err,transfer) {
    //                             console.log("Transfer error : "+err);
    //                             console.log("Transfer : "+ transfer);
    //                             res.redirect(baseUrl+'/demo7');
    //                           // res.send("\n <a href='/demo7'>Buy Again?</a><br><br>"+err.type+"<br>"+err+"<br>Transfer : "+transfer);
    //                         });
    //                     });
    //                 });      
    //             }  
    //             });         

    //         });

    //     });
    // // });

    // //STRIPE PLAID INTEGRATION REAL ACCOUNT
    // router.post('/stripe-charge8', function(req, res) {
    //     // Using Plaid's Node.js bindings (https://github.com/plaid/plaid-node)
    //     var plaid = require('plaid');
    //     var plaidClient = new plaid.Client('59bf97694e95b85652804861',
    //                                        '1b83f2284f78b3f5a90ea2a393e7ac',
    //                                        'fbe1cc3bcc84559827cff90979f305',
    //                                        plaid.environments.development);
    //     plaidClient.exchangePublicToken(req.query.public_token, function(err, resExchange) {
    //     var accessToken = resExchange.access_token;
    //     console.log('Access Token : '+accessToken);
    //     // Generate a bank account token
    //     plaidClient.createStripeToken(accessToken, req.query.account_id, function(err, resCreateToken) {
    //     var bankAccountToken = resCreateToken.stripe_bank_account_token;
    //     console.log('Bank Account Token : '+bankAccountToken);
    //     // Get the bank token submitted by the form
    //     var tokenID = bankAccountToken;
    //     // Create a Customer
    //     const stripe = require("stripe")('sk_live_yHaX0pipxf1W17dEsb77fRTk');
    //     stripe.customers.create({
    //         source: tokenID,
    //         description: "Michell's Payment"
    //         },  function(err, customer) {
    //             stripe.charges.create({
    //                 amount: req.query.amount,
    //                 currency: "usd",
    //                 customer: customer.id,
    //                 source:customer.default_source
    //                 }, function(err, chargeRes) {
    //                     res.send(chargeRes);
    //                 });
    //             });
    //         });
    //     });
    // });

    // //STRIPE MICRO TRANSACTION INTEGRATION REAL ACCOUNT
    // router.post('/stripe-charge9', function(req, res) {
    //     let baseUrl = req.protocol + '://' + req.get('host');
    //     let amount = req.body.dAmount;
    //     var stripe = require("stripe")("sk_live_yHaX0pipxf1W17dEsb77fRTk");  
    //     var routing_number=req.body.routingNumber; 
    //     var account_number= req.body.accountNumber;
    //     var account_holder_name=req.body.accountHolderName;
    //     var account_holder_type=req.body.accountHolderType;
    //     console.log("Account Routing Number : "+routing_number);
    //     console.log("Account Number : "+account_number);
    //     console.log("Account Holder Name : "+account_holder_name);
    //     console.log("Account Holder Type : "+account_holder_type);
        
    //     stripe.tokens.create({
    //         'bank_account': {
    //         country: 'us',
    //         currency: 'usd',
    //         routing_number:req.body.routingNumber, 
    //         account_number: req.body.accountNumber,
    //         account_holder_name:req.body.accountHolderName,
    //         account_holder_type:req.body.accountHolderType
    //         }
    //     }, function(err,result) {
    //         // console.log(err);
    //         if(result){
    //             // Get the bank token submitted by the form
    //             var tokenID = result.id;
    //             // Create a Customer
    //             stripe.customers.create({
    //             source: tokenID,
    //             description:account_holder_name+ "'s Micro Transaction Payment"
    //             }, function(err, customer) {
    //                     //Varify customers bank account
    //                     console.log("customer created");
    //                     var data = {amounts: [32,45]};
    //                     stripe.customers.verifySource(
    //                         customer.id,
    //                         customer.default_source,//BankAccount
    //                         {
    //                             amounts: [32, 45]
    //                         },
    //                         function(err, bankAccount) {
    //                             console.log("Customer Verified");
    //                             console.log("Bank Account"+bankAccount);
    //                             stripe.charges.create({
    //                             amount: amount,
    //                             currency: "usd",
    //                             customer: customer.id // Previously stored, then retrieved       
    //                             },
    //                             function(err, stripeChargeRes) {
    //                                 if(err){
    //                                     res.send("Error Type : "+err.type+"\n Title : "+err.stack);
    //                                     res.send("\n <a href='/demo9'>Buy Again?</a>");
    //                                     return false;
    //                                 }
    //                                 else {
    //                                     res.redirect('/demo9')
    //                                 }
    //                             });
    //                         });
    //               });
    //         }
    //         else {
    //             // res.send("Error Type : "+err.type+"\n  "+err);
    //             res.send("\n <a href='/demo9'>Buy Again?</a><br><br>Error Type: "+err.type+"<br>"+err);

    //             return false;

    //         }
    //     });
    // });

module.exports = router;