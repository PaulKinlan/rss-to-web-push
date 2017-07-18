// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var pubSubHubbub = require("./private/pubsubhubbub.js"); // the "official api" doesn't really do what I need
var querystring = require("querystring");
var bodyParser = require('body-parser');

const fetch = require('node-fetch');
const URL = require('url').URL;

const callbackPath = 'https://beryl-clover.glitch.me/pubsubhubbub/';
var pubSubSubscriber = pubSubHubbub.createServer({
  callbackUrl: callbackPath
});

var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.all('*', (req, res, next) => {
  // protocol check, if http, redirect to https
  if(req.get('X-Forwarded-Proto').indexOf('https') == 0) {
    return next();
  } else {
    res.redirect('https://' + req.hostname + req.url);
  }
});


app.use(express.static('public'));

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.post("/subscribe", urlencodedParser, function (request, response) {
  
  if(request.body === undefined) {
    response.sendStatus(400);
    return;
  }
  response.sendStatus(200);
  
  const topic = request.body.topic;
  const hub = request.body.hub;
  const endpoint = request.body.endpoint;
  
  const privateSubscriber = pubSubHubbub.createServer({
    callbackUrl: `${callbackPath}${querystring.escape(endpoint)}/`
  });
      
  privateSubscriber.subscribe(topic, hub, function(err){
        if(err){
            console.log(`Failed subscribing: ${topic}, ${hub}`);
        }
    });
});

app.post("/ubsubscribe", function (request, response) {
  response.sendStatus(200);
});

pubSubSubscriber.on('feed', data => data => {
  console.log('feed', data);

  const subscribeCallback = new URL(data.callback);
  const endpointEncoded = subscribeCallback.pathname.replace('/pubsubhubbub/', '').replace(/\/$/,"");
  const endpoint = querystring.unescape(endpointEncoded);

  const payload =  {
    title: `New post on ${data.topic}`,
    body: `There is a new post at ${data.topic} via ${data.hub}`,
    url: `${data.topic}`
  };
  
  fetch(endpoint, {method:'post', headers: {'content-type': 'application/json'}, body: payload})
    .then(response=>console.log)
    .catch(err=>console.error)
});

pubSubSubscriber.on('subscribe', data => {
  console.log('subscribe', data);

  const subscribeCallback = new URL(data.callback);
  const endpointEncoded = subscribeCallback.pathname.replace('/pubsubhubbub/', '').replace(/\/$/,'');
  const endpoint = querystring.unescape(endpointEncoded);

  const payload =  {
    title: `Subscribed to ${data.topic}`,
    body: `Subscribed to ${data.topic} on ${data.hub}`
  };
  
  console.log(endpoint)
  
  fetch(endpoint, {method:'post', headers: {'content-type': 'application/json'}, body: JSON.stringify(payload)})
    .then(response=>console.log)
    .catch(err=>console.error)

});

pubSubSubscriber.on('unsubscribe', data => {
  console.log('unsubscribe', data);

  const subscribeCallback = new URL(data.callback);
  const endpointEncoded = subscribeCallback.pathname.replace('/pubsubhubbub/', '').replace(/\/$/,'');
  const endpoint = querystring.unescape(endpointEncoded);

  const payload =  {
    title: `Unsubscribed from ${data.topic}`,
    body: `Unsubscribed from ${data.topic} on ${data.hub}`
  };
  
  fetch(endpoint, {method:'post', headers: {'content-type': 'application/json'}, body: payload})
    .then(response=>console.log)
    .catch(err=>console.error)
});

pubSubSubscriber.on('error', data => console.log('error', data));

app.get('/pubsubhubbub/:endpoint/', pubSubSubscriber._onGetRequest.bind(pubSubSubscriber));
app.post('/pubsubhubbub/:endpoint/', pubSubSubscriber._onPostRequest.bind(pubSubSubscriber));

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
