
var socket;

var slider;

var last_val = 0;

var b1, b2, b3;

var cnv;
function setup() {
  cnv = createCanvas(400, 300);
  socket = io();

  socket.on('led:level', function(msg){
    var val = parseInt(msg);
    //val = map(val, 110, 255, 0, 255);
    val = constrain(val, 0, 255);
    console.log('recv', val);
    slider.value(val);
  }); 
  
  background(51);

  //slider = createSlider(0, 255);
  //slider.position(10, 10);
  //slider.style('width', '80px');
  b1 = createButton("On");
  b1.mousePressed(ledOn);

  b2 = createButton("Dim");
  b2.mousePressed(ledDim);

  b3 = createButton("Off");
  b3.mousePressed(ledOff);

}

function ledOff(){
  sendLed(0);
}

function ledDim(){
  sendLed(30);
}


function ledOn(){
  sendLed(255);
}


function sendLed(val){
  socket.emit('led:level', val);
}


function windowResized() {
  cnv = resizeCanvas(windowWidth, windowHeight);

}

document.ontouchmove = function(event) {
    event.preventDefault();
};

// function touchStarted(){
//   var fs = fullscreen();
//   if (!fs) {
//     fullscreen(true);
//   }
// }

function draw(){
  // if(slider.value() != last_val){
  //   last_val = slider.value();
  //   var new_val = int(last_val);
  //   console.log(last_val, new_val);
  //   socket.emit('led:level',new_val);

  //   background(new_val);
  // }

  // for (var i = 0; i < touches.length; i++) {
  //   var val = map(touches[0].x, 0, width, 0, 255);
  //   socket.emit('led:level', int(val));
  //   background(val);
  //   slider.value(val);
  //   last_val = val;
  //   ellipse(touches[i].x, touches[i].y,
  //     10+sin(i+frameCount*0.1)*5,
  //     10+sin(i+frameCount*0.1)*5);
   
  
  // }

}
