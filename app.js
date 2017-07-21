var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
var server = require("http").createServer(app);
var io = require('socket.io').listen(server);
var arDrone = require('ar-drone');
var arDroneConstants = require('ar-drone/lib/constants');

var client  = arDrone.createClient({ip: "172.24.18.244"});
// var client  = arDrone.createClient({ip: "192.168.1.244"});
require('ar-drone-png-stream')(client, { port: 8000 });
var image = client.getPngStream();
var lastImage;
var base64Image;
var _ = require('lodash');
require('./env');

var request = require('request');
var lastImageTime;

image.on('error', console.log)
.on('data', function(pngBuffer) {
  lastImage = pngBuffer;
  lastImageTime = new Date().getTime();
  console.log(lastImageTime);
  //fire event to create object .trigger event here

  // console.log("new image for last image");
});

var cmd = require('node-cmd');

function imageTimeOut() {
  if ( new Date().getTime() - lastImageTime > 3000 ){
    console.log("TIMED OUT IMAGE!!!!");
    lastImage = undefined;
  }
}

setInterval(imageTimeOut, 2000);



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
  socket.on('findPerson', function (name) {
    var found = false;
    console.log('getting image');
    console.log(name);
    var throttledApi =  _.throttle(internalApiCall, 2000);
    var getNewImage = function (){
      image.on('data', throttledApi);
    }
    getNewImage()
    function internalApiCall(theImageData) {
      if (found) { return; }
      base64Image = new Buffer(theImageData).toString('base64');
      // base64Image = IMG;
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
          "subject_id": name.name,
          "gallery_name": "cstest"
        }
      }, function(error, response, body) {
        console.log(response.statusCode)
        console.log(body);
        console.log("Response ++++++++++++++++++++++++++++++");
        if (body.images) {
          if (body.images[0].transaction.confidence > 0.59) {
            console.log("FOUND" + name.name + "!!");
            // fs.writeFileSync("responseFile", JSON.stringify(response))
            socket.emit('foundPerson', { image: body.uploaded_image_url });
            // socket.emit('foundPerson', { image: base64Image });
            found = true;
            // image.removeAllListeners('data');
            image.removeListener('data', getNewImage);
          } else {
            console.log("NOT Kelly :( ");
          }
        } else {
          console.log("No face found");
        }
      })
    }

    // function apiCall(){
    //   console.log("API CALL");
    //   internalTestApiCall, );
    // }

  });
  socket.on('analyzePerson', function () {
    var data;
    console.log('analyzing image');
    console.log("+++++++++++");
    base64Image = lastImage.toString('base64');
    // base64Image = IMG;

    socket.emit('analyzeComplete', { image: base64Image });
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
        data = body.images[0].faces[0].attributes
        // socket.emit('analysisData', { body: body });
        // console.log('data:', body.images[0].faces[0].attributes);
        // socket.emit('analysisData', { body: data })
        // console.log("HERE!!");;
        // console.log(data);
        socket.emit('analysisData', { body: data })
      } else {
        console.log("No face found");
      }
    })
  });
  socket.on('enrollPerson', function (name) {
    base64Image = lastImage.toString('base64');
    console.log('APP enrolling');
    console.log(name.name);

    request({
      method: "POST",
      uri: 'https://api.kairos.com/enroll',
      headers: {
        'content-type': 'application/json',
        'app_id': APP_ID,
        'app_key': APP_KEY
      },
      json: true,
      body: {
        'image': base64Image,
        "subject_id": name.name,
        "gallery_name":"cstest"
      }
    }, function(error, response, body) {
      // console.log(response.body)
      // console.log(response.body.face_id);
      if (response.body) {
        if (response.body.face_id) {
          data = response.body.uploaded_image_url;
          console.log(data);
          socket.emit('enrollmentData', { body: data })
        } else {
          console.log("No face found");
        }
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
