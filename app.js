var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
var server = require("http").createServer(app);
var io = require('socket.io').listen(server);
var arDrone = require('ar-drone');
var arDroneConstants = require('ar-drone/lib/constants');
var client;
// var online = navigator.onLine;

// var client = arDrone.createClient({ip: "172.24.18.245"});
// var client  = arDrone.createClient({ip: "192.168.1.244"});
// require('ar-drone-png-stream')(client, { port: 8000 });
var image;
var lastImage;
var base64Image;
var _ = require('lodash');
require('./env');

var request = require('request');
var lastImageTime;

// image.on('error', console.log)
// image.on('data', function(pngBuffer) {
//   lastImage = pngBuffer;
//   lastImageTime = new Date().getTime();
//   console.log(lastImageTime);
//   //fire event to create object .trigger event here
//
//   // console.log("new image for last image");
// });

var cmd = require('node-cmd');

function clearLastImageOnTimeout() {
  if ( new Date().getTime() - lastImageTime > 4000 ){
    console.log("TIMED OUT IMAGE!!!!");
    lastImage = undefined;

  }
}

setInterval(clearLastImageOnTimeout, 3000);



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
    error = "Your drone is installing, please wait...";
    socket.emit('errorHandler', { body: error });
    cmd.get(
      'ardrone-wpa2/script/install',
      function(err, data, stderr){
        console.log('installing your drone...\n\n',data, err, stderr);
        socket.emit('triggerConnect');
      }
    );
    console.log('APP Install');
  });
  socket.on('connectDrone', function () {
    setTimeout(function () {
      console.log("connectDrone");
      error = "Your drone is connecting, please wait...";
      socket.emit('errorHandler', { body: error });
      cmd.get(
        'ardrone-wpa2/script/connect "ada-seattle" -p "AdaLovelaceCodesIt" -a 172.24.18.245',
        function(err, data, stderr){
          console.log('connnecting to your drone...\n\n',data, err, stderr);
          error = "Your drone is connected, starting now"
          socket.emit('errorHandler', { body: error });

          console.log("ERROR ++++++++++++++++++++++++");
          console.log(err);
          console.log("________________________");
          socket.emit('triggerStart');
          // console.log("EMITTING PING");
        }
      );
      console.log('APP Connect');
    }, 3000);
  });
  socket.on('startDrone', function () {
    console.log('startDrone app');
    setTimeout(function() {
    client  = arDrone.createClient({ip: "172.24.18.245"});
    require('ar-drone-png-stream')(client, { port: 8000 });
    image = client.getPngStream();
    image.on('error', console.log)
    image.on('data', function(pngBuffer) {
      lastImage = pngBuffer;
      lastImageTime = new Date().getTime();
    // socket.emit('errorHandler', { body: error });
      // console.log(lastImageTime);
      //fire event to create object .trigger event here

      // console.log("new image for last image");
    });
    error = "Your drone is ready!!";
    socket.emit('errorHandler', { body: error });
    socket.emit('clearDiv');
  }, 5000);


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
    client.counterClockwise(0.25);
    console.log('App left');
    client.after(1000, function() {
      this.stop();
    })
  });
  socket.on('turnRight', function () {
    client.clockwise(0.25);
    console.log('App right');
    client.after(1000, function() {
      this.stop();
    })
  });
  socket.on('streamVideo', function () {
    console.log('App video');
  });
  socket.on('forward', function() {
    client.front(0.15);
    client.after(1000, function() {
      this.stop();
    })
  });
  socket.on('back', function() {
    client.back(0.15);
    client.after(1000, function() {
      this.stop();
    })
  });
  socket.on('altUp', function() {
    client.up(0.25);
    client.after(1000, function() {
      this.stop();
    })
  });
  socket.on('altDown', function() {
    client.down(0.25);
    client.after(1000, function() {
      this.stop();
    })
  });



  // client.up(speed) / client.down(speed)
  // socket.on('ping', function() {
  //
  //   console.log("Ping APP");
  //   if (onLine) {
  //     console.log('online');
  //   } else {
  //     console.log('offline');
  //   }
  // });
  // socket.on('calibrate', function () {
  //   client.takeoff();
  //   client.after(2000, function() {
  //     client.calibrate(0);
  //   })
  //   console.log("calibrating");
  //   client.land(console.log("Finished"));
  // });

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
      // console.log("++++++++++++++++++++++++++++++++++++++");
      // console.log("IMAGE NOW!!!");
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
        // console.log(body);
        // console.log("Response ++++++++++++++++++++++++++++++");
        if (body.images) {
          if (body.images[0].transaction.confidence > 0.59) {
            error = "Found " + name.name + " !!";
            // fs.writeFileSync("responseFile", JSON.stringify(response))
            socket.emit('foundPerson', { image: body.uploaded_image_url });
            // socket.emit('foundPerson', { image: base64Image });
            socket.emit('errorHandler', { body: error });
            found = true;
            // image.removeAllListeners('data');
            image.removeListener('data', getNewImage);
          } else {
            error = "NO " + name.name + " yet....  :( ";
            socket.emit('errorHandler', { body: error });
          }
        } else {
          error = body.Errors[0].Message;
          console.log(error);
          socket.emit('errorHandler', { body: error });
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
        socket.emit('analysisData', { body: data });
      } else {
        // console.log("No face found");
        error = body.Errors[0].Message;
        console.log(error);
        socket.emit('errorHandler', { body: error });
        // console.log("+++++++++++++++++++++++++++++");
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
          // console.log(data);
          socket.emit('enrollmentData', { body: data })
        } else {
          error = body.Errors[0].Message;
          console.log(error);
          socket.emit('errorHandler', { body: error });

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

// server.on('connection', function(socket) {
//   console.log("A new connection was made by a client.");
//   socket.setTimeout(30 * 1000);
//   // 30 second timeout. Change this as you see fit.
// })
