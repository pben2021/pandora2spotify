
var path = require('path');
var express = require('express');
const {spawn} = require('child_process'); //add
var pandora = require('./pandora');
var bodyParser = require('body-parser')
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var request = require('request');
var cors = require('cors');

var token = '';
var client_id = '73ff1a67197c47e184d35596daf7d444'; // Your client id
var client_secret = '4b3bbb2194744e7b831bb5b112ced4e9'; // Your secret
var redirect_uri = 'https://cryptic-earth-53193.herokuapp.com/#pandora'; // Your redirect uri
var stateKey = 'spotify_auth_state';
var generateRandomString = function(length) {
	var text = '';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
	for (var i = 0; i < length; i++) {
	  text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
  };

var app = express(); 

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());   
app.use(cors());                     

app.get('/station/:stationId/:startIndex', function(req, res) {
	var stationId = req.params.stationId;
	var startIndex = req.params.startIndex;
	pandora.getSongs(stationId, startIndex, function(error, result) {
		if (error)
			res.json({ success: false });
		else
			res.json({ success: true, songs: result.songs, hasMore: result.hasMore });
			//for each station's songs, do python algo
			var python = spawn("python3" ,["pandora.py", JSON.stringify(result.songs), token])
		
		//ERROR TESTING
			// python.stderr.on('data', (data) => {
			// 	console.error(`child stderr:\n${data}`);
			// });
			// python.on('close', (code) => {
			// 	console.log(`child process close all stdio with code ${code}`);
			// });

	});
});

app.get('/username/:username', function(req, res) {
	var username = req.params.username;
	var python = spawn("python3" ,["pandora.py", 'create', token]); //create playlist if it doesn't already exist. prevents multiple playlist creations with each ^^^ req
	pandora.getStations(username, function(error, stations) {
		if (error)
			res.json({ success: false });
		else
			res.json({ success: true, stations: stations });
	});
});

app.get('/login', function(req, res) {
	var state = generateRandomString(16);
	res.cookie(stateKey, state);
  
	// GET spotify authorization
	var scope = 'playlist-modify-public,playlist-modify-private,playlist-read-private';
	res.redirect('https://accounts.spotify.com/authorize?' +
	  querystring.stringify({
		response_type: 'code',
		client_id: client_id,
		scope: scope,
		redirect_uri: redirect_uri,
		state: state
	}));
});

app.get('/token', function(req, res) {
	var auth = req.query.code;
	var code = auth.substring(6, auth.length-23)
	var state = auth.substring(auth.length-16, auth.length)
	var storedState = req.cookies ? req.cookies[stateKey] : null;

//grt access token for user and tore in global variable  
  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  	} else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };
	request.post(authOptions, function(error, response, body) {
		token = body.access_token
		})
	};
	
});

var port = process.env.PORT || 8000;
app.listen(port, function() {
	console.log('Listening on port ' + port);
});
