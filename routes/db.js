var mysql = require('mysql');
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'winwin'
});
// let store = require('store2');
// store('connection', connection);
connection.connect(function(err) {
    if (err){
    	 throw err;
 	   console.log("Database Connection error : "+err);
	}
    else{
    	console.log("Database connection successful.");
    }
});

module.exports = connection;