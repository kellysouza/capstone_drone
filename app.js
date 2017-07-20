var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
var server = require("http").createServer(app);
var io = require('socket.io').listen(server);
var arDrone = require('ar-drone');
var arDroneConstants = require('ar-drone/lib/constants');

// var client  = arDrone.createClient({ip: "172.24.18.244"});
var client  = arDrone.createClient({ip: "192.168.1.244"});
require('ar-drone-png-stream')(client, { port: 8000 });
var image = client.getPngStream();
var lastImage;
var base64Image;
var _ = require('lodash');
require('./env');

var request = require('request');

image.on('error', console.log)
     .on('data', function(pngBuffer) {
     lastImage = pngBuffer;
     });

var cmd = require('node-cmd');


app.get('/', function(req, res){
  res.sendfile('index.html');
});

app.get('/css/bootstrap.min.css', function(req, res){
  res.sendfile('css/bootstrap.min.css');
});

app.get('/css/blog-home.css', function(req, res){
  res.sendfile('css/blog-home.css');
});

io.on('connection', function(socket){
  console.log('A user connected');

  socket.on('installDrone', function () {
    cmd.get(
      'ardrone-wpa2/script/install',
      function(err, data, stderr){
        console.log('installing your drone...\n\n',data, err, stderr)
      }
    );
    console.log('APP Install');
  });
  socket.on('connectDrone', function () {
    cmd.get(
      'ardrone-wpa2/script/connect "ada-seattle" -p "AdaLovelaceCodesIt" -a 192.168.1.244',
      function(err, data, stderr){
        console.log('connnecting to your drone...\n\n',data, err, stderr)
        // var client  = arDrone.createClient({ip: IPVARIABLE});
      }
    );
    console.log('APP Connect');
  });
  socket.on('takeOff', function () {
    client.takeoff();
    console.log('APP Takeoff');
  });
  socket.on('land', function () {
    client.land();
    console.log('App land');
  });
  socket.on('turnLeft', function () {
    client.clockwise(0.25);
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
      base64Image = new Buffer(theImageData).toString('base64');
      console.log("++++++++++++++++++++++++++++++++++++++");
      console.log("IMAGE NOW!!!");
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
          'image': base64Image,
          "subject_id": "Kelly",
          "gallery_name": "cstest"
        }
      }, function(error, response, body) {
      console.log(response.statusCode)
        if (body.images) {
          if (body.images[0].transaction.confidence > 0.59) {
            console.log("FOUND KELLY!!");
          } else {
            console.log("NOT Kelly :( ");
          }
        } else {
          console.log("No face found");
        }
      }
    )}, 2000));
  });
  socket.on('analyzePerson', function () {
    console.log('analyzing image');
    // base64Image = lastImage.toString('base64');
    base64Image = IMG;

    socket.emit('analyzeComplete', { image: base64Image });
    console.log("+++++++++++");
    console.log("IMAGE NOW!!!");
    request({
      method: "POST",
      uri: 'https://api.kairos.com/detect',
      headers: {
        'content-type': 'application/json',
        'app_id': APP_ID,
        'app_key': APP_KEY
      },
      json: true,
      body: {
        'image': base64Image,
        "selector": "ROLL"
      }
    }, function(error, response, body) {
    console.log(response.statusCode)
      if (body.images) {
        console.log('body:', body.images[0].faces[0].attributes);
      } else {
        console.log("No face found");
      }
    })
  });

  socket.on('disconnect', function () {
    console.log('A user disconnected');
  });
});

server.listen(3000, function(){
  console.log('listening on *:3000');
});
