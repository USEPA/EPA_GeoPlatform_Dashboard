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


describe('Anonymous (unauthenticated) Request to API',function(){
  it('should return an error that user must be logged in' ,function(done){
    request(app)
      .get('/gpdashboard/gpousers/list')
      .end(function(err,res){
        if (err) {
          return done(err);
        }
        res.status.should.equal(200);
        //console.log(res.body.errors[0].code);
        res.body.errors[0].code.should.equal('LoginRequired');
        done();
    });
  });
});

describe('Authorization Mechanism Testing Suite', function () {

  it('should create a user session for a valid GPO (non-SSO) user', function (done) {
    request(app)
      .post('/gpdashboard/login')
      .set('Accept','*/*')
      .send({'username': 'Gaines.Brett_EPA', 'token': 'rKvkMypYiQi4K6gN2-MVhzXolK149e_Mne4Fl2QotjKSqDY9UAdVpaPYOoBVKmrxk3KjuBgIvLWlHjAVgFJMllEvQhLfwVkdElKII4C9pXNToDbly0CA87JMKiuOGV8uEnXzTlDwVL2PWdyRqGEOvhjJSt0DqxdbisVLiL44R4LlrvRa_cUqjwZpwRbi7mAf6iDIIzRjXxf4FFW3x6rN0Q..'})
      .expect(200)
      .end(function (err, res) {
        console.log(res);
        res.body.id.should.equal('1');
        res.body.short_name.should.equal('Gaines.Brett_EPA');
        res.body.email.should.equal('gaines.brett@epa.gov');
        // Save the cookie to use it later to retrieve the session
        cookies = res.headers['set-cookie'].pop().split(';')[0];
        done();
      });
  });
  
  it('should get the user session for current user', function (done) {
    var req = request(app).get('/gpdashboard/login');
    // Set cookie to get saved user session
    req.cookies = cookies;
    req.set('Accept','application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        res.body.id.should.equal('1');
        res.body.short_name.should.equal('Gaines.Brett_EPA');
        res.body.email.should.equal('gaines.brett@epa.gov');
        done();
      });
  });
});