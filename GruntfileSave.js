module.exports = function(grunt) {

// Configure Grunt
  grunt.initConfig({

// Grunt express - our webserver
// https://github.com/blai/grunt-express
    express: {
      all: {
        options: {
          bases: ['C:\\egam\\public'],
          server: 'C:\\egam\\app.js',
          port: 3000,
          livereload: true
        }
      }
    },

// grunt-watch will monitor the projects files
// https://github.com/gruntjs/grunt-contrib-watch
    watch: {
      all: {
        files: 'public/**/*',
        options: {
          livereload: true
        }
      }
    },

// grunt-open will open your browser at the project's URL
// https://www.npmjs.org/package/grunt-open
    open: {
      all: {
        path: 'http://localhost:3000'
      }
    }
  });

  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-express');

// Creates the `server` task
  grunt.registerTask('server', [
    'express',
    'open',
    'watch'
  ]);
};
