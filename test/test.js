var request = require('supertest');
var should = require('should');

//setup for later
var routes = require('../routes/index');
var gpoitems = require('../routes/gpoitems');
var gpousers = require('../routes/gpousers');
var redirectRoute = require('../routes/redirect');
var cookies;

var app = require('../app');

describe('Root URL test',function(){
  it('should return a 302 redirect to gpdashboard/',function(done){
    request(app)
      .get('/')
      .end(function(err,res){
        if (err) {
          return done(err);
        }
        res.status.should.equal(302);
        res.headers.location.should.equal('gpdashboard/');
        done();
    });
  });
});
