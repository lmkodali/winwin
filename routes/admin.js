// Demo6 Check Login admin exist or not
router.post('/demo6checkLogin',function(req,res){
    console.log("in demo6CheckLogin");
    return false;
    var fullUrl = req.protocol + '://' + req.get('host');
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