var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
var server = require("http").createServer(app);
var io = require('socket.io').listen(server);
var arDrone = require('ar-drone');
var arDroneConstants = require('ar-drone/lib/constants');

// var client  = arDrone.createClient({ip: "172.24.18.250"});
var client  = arDrone.createClient({ip: "192.168.1.250"});

var image = client.getPngStream();
var _ = require('lodash');
require('ar-drone-png-stream')(client, { port: 8080 });
require('./env');

var request = require('request');




// var options = {
//   url: 'https://api.kairos.com/detect',
//   headers: {
//     'app_id': APP_ID,
//     'app_key': APP_KEY
//   },
//   body: {
//   "image": IMG
//   // "selector": "ROLL"
//   }
// };





// var index = require('./index.ejs');
// counter = 0;

app.get('/', function(req, res){
  res.sendfile('index.html');
});

io.on('connection', function(socket){
  console.log('A user connected');

  socket.on('takeOff', function () {
    client.takeoff();
    console.log('APP Takeoff');
  });
  socket.on('land', function () {
    client.land();
    console.log('App land');
  });
  socket.on('turnLeft', function () {
    client.clockwise(-0.25);
    console.log('App left');
  });
  socket.on('turnRight', function () {
    client.clockwise(-0.25);
    console.log('App right');
  });
  socket.on('streamVideo', function () {
    console.log('App video');
  });
  socket.on('findPerson', function () {
    console.log('getting image');

    image.on('data',  _.throttle(function (theImageData) {
      var base64Image = new Buffer(theImageData).toString('base64');
      // counter++;
      console.log("++++++++++++++++++++++++++++++++++++++");
        // console.log(base64Image);
      console.log("IMAGE NOW!!!");
      // console.log(image);
      request({
        method: "POST",
        uri: 'https://api.kairos.com/verify',
        headers: {
          'content-type': 'application/json',
          'app_id': APP_ID,
          'app_key': APP_KEY
        },
        json: true,
        body: {
          // 'image': "https://scontent-sea1-1.xx.fbcdn.net/v/t1.0-9/19958950_1475352612525972_1716954123383503270_n.jpg?oh=4f273d261456765d32663d3772b53b2e&oe=5A10AA31",
          'image': base64Image,
          "subject_id": "Kelly",
          "gallery_name": "cstest"
        }
      }, function(error, response, body) {
      console.log(response.statusCode)
        // if (body.images) {
          // console.log('body:', body.images[0].transaction.confidence);
        if (body.images) {
          if (body.images[0].transaction.confidence > 0.59) {
            console.log("FOUND KELLY!!");
          } else {
            console.log("NOT Kelly :( ");
          }
        } else {
          console.log("No face found");
        // console.log(response.headers);
        // console.log(response);
        // console.log(response.read());
        // console.log("+++++++++++++++");
        // console.log(response.headers['content-type'])
        }
      }
    )}, 2000));
});
  socket.on('disconnect', function () {
    console.log('A user disconnected');
  });
});

server.listen(3000, function(){
  console.log('listening on *:3000');
});

    // app.set('port', process.env.PORT || 3000);
    // app.set('views', __dirname + '/views');
    // app.set('view engine', 'ejs', { pretty: true });
    // app.get('/', function(req, res){
    //   res.sendfile('index.ejs');
    // });
    //
    // server.listen(3000, function(){
    //   console.log('listening on *:3000');
    // });

    // app.use(express.favicon());
    // app.use(express.logger('dev'));
    // app.use(app.router);
    // app.use(express.static(path.join(__dirname, 'public')));
    // app.use("/components", express.static(path.join(__dirname, 'bower_components')));
    // app.use(require('express-jquery')('/jquery.js'));

    // app.use('/', index);

    // png = client.getPngStream();
    // png.on('data', function(){
    //
    // });


// io.sockets.on('connection', function (socket) {
  // socket.emit('event', { message: 'Welcome to cockpit :-)' });
// });

// server.listen(app.get('port'), function() {
//   console.log('AR. Drone WebFlight is listening on port ' + app.get('port'));
// });
