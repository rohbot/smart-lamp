var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt')
var client = mqtt.connect('mqtt://localhost')
var bodyParser = require('body-parser');
var request = require('request');
var led = require('./led.js')
var bcrypt = require('bcrypt');
const asyncRedis = require("async-redis");
const r = asyncRedis.createClient();
const asyncHandler = require('express-async-handler')
const session = require('express-session')
var cookieParser = require('cookie-parser');
//const FileStore = require('session-file-store')(session);
//const uuid = require('uuid/v4')

var morgan = require('morgan');
// set our application port
app.set('port', 3000);

// set morgan to log info about our requests for development use.
app.use(morgan('dev'));

app.use(session({
  key: 'user_sid',
  secret: 'fhsdosdoifohsd',
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: 1000 * 60 * 60 * 24 * 30
  }
}));

app.use(cookieParser());


var cron = require('node-cron');
var state = 0;
var lamp_step = 0;

const lampTopic = 'lamp/switch';

r.on("error", function(err) {
	console.log("Error " + err);
});

var fadeInterval;

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(session({
  key: 'user_sid',
  secret: 'fhsdosdoifohsd',
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: 1000 * 60 * 60 * 24 * 30
  }
}));

const users = [{
  id: '2f24vvg',
  username: 'roh',
  password: 'nolampforyou'
}, {
  id: '2f2ree',
  username: 'hannah',
  password: 'nolampforyou'
}]

function getUser(username) {

  for (var i = 0; i < users.length; i++) {

    if (username == users[i].username) {
      return users[i];
    }
  }
  return null;
}

console.log(getUser('roh'));

// This middleware will check if user's cookie is still saved in browser and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login, your cookie still remains saved in the browser.
app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.user) {
    res.clearCookie('user_sid');
  }
  next();
});


// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) {
    res.redirect('/dashboard');
  } else {
    next();
  }
};


// route for Home-Page
app.get('/', sessionChecker, (req, res) => {
  res.redirect('/login');
});




// route for user Login
app.route('/login')
  .get(sessionChecker, (req, res) => {
    res.sendFile(__dirname + '/login.html');
  })
  .post((req, res) => {
    var username = req.body.username,
      password = req.body.password;

    var user = getUser(username);
    console.log('user found: ', user.username);
    if (!user) {
      res.redirect('/login');
    } else if (user.password == password) {
    	console.log('password match');	
      req.session.user = user.id;
      res.redirect('/dashboard');
    } else {
      res.redirect('/login');
    }

  });


// route for user's dashboard
app.get('/dashboard', (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
    res.sendFile(__dirname + '/dashboard.html');
  } else {
    res.redirect('/login');
  }
});


// route for user logout
app.get('/logout', (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
    res.clearCookie('user_sid');
    res.redirect('/');
  } else {
    res.redirect('/login');
  }
});


// route for handling 404 requests(unavailable routes)
app.use(function(req, res, next) {
  res.status(404).send("Sorry can't find that!")
});




app.get('/test', asyncHandler(async (req, res, next) => {
	/* 
	  if there is an error thrown in getUserFromDb, asyncMiddleware
	  will pass it to next() and express will handle the error;
	*/
	const user = await r.get("test");
	console.log("got ", user)
	if (user == "hello") {
		res.send(user);
	} else {
		res.send("error")
	}

}));

app.get('/led', function(req, res) {
	res.send(state.toString());
});

app.get('/ledon', function(req, res) {
	state = 255
	//getLedStatus();
	publishLamp();
	res.send(state.toString());

});

app.get('/ledoff', function(req, res) {
	state = 0
	//getLedStatus();
	publishLamp();
	res.send(state.toString());

});

app.get('/fadeon', function(req, res) {
	lamp_step = 0;
	fadeInterval = setInterval(fadeOnLamp, 100);
	res.send(state.toString());

});


io.on('connection', function(socket) {
	sid = socket.id;
	console.log(sid, 'a user connected');
	io.emit('led:level', state);

	socket.on('disconnect', function() {

		console.log(sid, 'user disconnected');
	});


	socket.on('led:level', function(msg) {
		console.log(msg);
		state = msg;
		if(msg == 0){
			console.log('recv OFF, clear clearInterval');
			clearInterval(fadeInterval);
		}

		publishLamp();
	});


});

client.on('connect', function() {
	client.subscribe(['outTopic', 'lamp/availability'])
	//client.publish('', 'Hello mqtt')
});

client.on('message', function(topic, message) {
	msg = message.toString();

	//console.log(topic);
	switch (topic) {
		case 'outTopic':
			//msg = message.toString();
			console.log(new Date(), msg);
			if (msg == 'hello world') {
				console.log('Light connected');
				setTimeout(function() {
					publishLamp();

				}, 1000);
			}

			break;
		case 'lamp/availability':
			//msg = message.toString();
			console.log(msg);
			setTimeout(function() {
				publishLamp()
			}, 1000);


			break;

		default:

	}


});


cron.schedule('0 8 * * *', function() {
	lamp_step = 0;
	fadeInterval = setInterval(fadeOnLamp, 120000);
	console.log(new Date(), 'Starting Lamp fade', lamp_step);

});

function publishLamp() {
	console.log(new Date(), 'Sent state:', state, "to mqtt");

	client.publish(lampTopic, state.toString());
	io.emit('led:level', state);
	//--TODO  save state in redis
}

function fadeOnLamp() {
	console.log("fading lamp on", lamp_step, new Date())
	if (lamp_step < led.SLOPE_SIZE - 1) {
		lamp_step++;
		state = led.SLOPE[lamp_step];
		publishLamp();
	} else {
		clearInterval(fadeInterval);
	}

}


http.listen(app.get('port'), function() {
	console.log(new Date(), `listening on *:${app.get('port')}`);
});