var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
var server = require("http").createServer(app);
var io = require('socket.io').listen(server);
var arDrone = require('ar-drone');
var arDroneConstants = require('ar-drone/lib/constants');
var client  = arDrone.createClient();
// var index = require('./index.ejs');


require('ar-drone-png-stream')(client, { port: 8080 });




app.get('/', function(req, res){
  res.sendfile('index.html');
});

//Whenever someone connects this gets executed
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

  //Whenever someone disconnects this piece of code executed
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
