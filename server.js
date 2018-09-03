var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt')
var client = mqtt.connect('mqtt://localhost')
var bodyParser = require('body-parser');
var request = require('request');

var cron = require('node-cron');
var state = 0;
var lamp_step = 0;
const SLOPE_SIZE = 32;
const SLOPE = [0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 18, 22, 26, 31, 37, 44, 54, 63, 76, 90, 108, 127, 153, 180, 217, 230, 255];

const lampTopic = 'lamp/switch';

var fadeInterval;

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});



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


function led_toggle() {

  r.get('led:state', function(err, val) {
    if (val == 'ON') {
      r.set('led:state', 'OFF');
      //state = 0;
    } else {
      r.set('led:state', 'ON');
      //state = 255;
    }
    console.log('led_state:', state);
    if (typeof res !== 'undefined' && res) {
      res.send(state.toString());
    }

  });
}

io.on('connection', function(socket) {
  sid = socket.id;
  console.log(sid, 'a user connected');

  socket.on('disconnect', function() {

    console.log(sid, 'user disconnected');
  });


  socket.on('led:level', function(msg) {
    console.log(msg);
    state = msg;
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


cron.schedule('7 0 * * *', function() {
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
  if (lamp_step < SLOPE_SIZE - 1) {
    lamp_step++;
    state = SLOPE[lamp_step];
    publishLamp();
  } else {
    clearInterval(fadeInterval);
  }

}


http.listen(3000, function() {
  console.log(new Date(), 'listening on *:3000');
});

