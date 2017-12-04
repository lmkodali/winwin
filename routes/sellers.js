'use strict';

let express = require('express');
let path = require('path');
let router = express.Router();

/* GET home page. */
router.get('/login', function(req, res) {
	res.sendFile(path.join(__dirname, "../public/login.html"));
});

module.exports = router;