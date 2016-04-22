var validate = require('@smallwins/validate')
var express = require('express')
var bodyParser = require('body-parser')
var LEX = require('letsencrypt-express')
var Timeline = require('pebble-api').Timeline

function valid (event, callback) {
  var schema = {
    'query': { required: true, type: Object },
    'query.token': { required: true, type: String },
    'body': { required: true, type: Object },
    'body.data': { required: true, type: Object },
    'body.data.amount': { required: true, type: Number },
    'body.data.created': { required: true, type: String },
    'body.data.currency': { required: true, type: String },
    'body.data.description': { required: true, type: String },
    'body.data.id': { required: true, type: String },
    'body.data.notes': { required: true, type: String }
  }
  validate(event, schema, callback)
}

var backgroundColorMap = {
  'transport': 'islamicgreen',
  'groceries': 'yellow',
  'eating_out': 'red',
  'cash': 'mintgreen',
  'bills': 'pictonblue',
  'entertainment': 'chromeyellow',
  'shopping': 'melon',
  'holiday': 'vividviolet',
  'general': 'lightgray',
  'expenses': 'brass'
}

function fn (event, callback) {
  var timeline = new Timeline()
  var pin = new Timeline.Pin({
    id: event.body.data.id,
    time: new Date(event.body.data.created),
    layout: {
      type: Timeline.Pin.LayoutType.GENERIC_PIN,
      tinyIcon: Timeline.Pin.Icon.NOTIFICATION_FLAG,
      backgroundColor: backgroundColorMap[event.body.data.category || 'general'],
      title: event.body.data.description,
      subtitle: event.body.data.currency + ' ' + (-event.body.data.amount / 100).toFixed(2),
      body: event.body.data.notes || '<no notes>'
    }
  })
  timeline.sendUserPin(event.query.token, pin, function (err) {
    callback(err, event)
  })
}

var app = express()

app.use(bodyParser.json())

app.use('/', function (req, res, next) {
  valid(req, function (err) {
    console.log('valid', err)
    if (err) {
      res.sendStatus(400)
    } else {
      next()
    }
  })
})

app.post('/', function (req, res) {
  fn(req, function (err) {
    console.log('fn', err)
    if (err) {
      res.sendStatus(500)
    } else {
      res.sendStatus(200)
    }
  })
})

var lex = LEX.create({
 approveRegistration: function (hostname, cb) {
    console.log('approveRegistration', hostname)
    cb(
      process.uptime() > 60 || !hostname.match(/\.chrisprice\.io$/),
      {
        domains: [hostname],
        email: 'price.c@gmail.com',
        agreeTos: true
      }
    )
  }
})

lex.onRequest = app

lex.listen([80], [443])
