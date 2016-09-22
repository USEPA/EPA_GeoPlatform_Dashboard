//Script to backup based on env

var spawn = require('child_process').spawn;
var fse = require('fs-extra');
var appRoot = require('app-root-path');
var config = require(appRoot + '/config/env');
var args = ['--host', 'localhost:27017', '--out', config.backupPath];
var mongodump = spawn('mongodump', args);
mongodump.stdout.on('data', function(data) {
  console.log('stdout: ' + data);
});
mongodump.stderr.on('data', function(data) {
  console.log('stderr: ' + data);
});
mongodump.on('exit', function(code) {
  console.log('mongodump exited with code ' + code);
  if (!code) {
    if (config.secondaryBackupPath) {
      console.log('Beginning secondary backup to: ' +
        config.secondaryBackupPath);
      fse.copy(config.backupPath, config.secondaryBackupPath, function(err) {
        if (err) {
          return console.error(err)
        }
        console.log('Secondary backup complete.')
      });
    } else {
      console.log('No secondary backup specified.')
    }
  }
});