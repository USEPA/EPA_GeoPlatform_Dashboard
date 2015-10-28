module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    env: {
      dev: {
        NODE_ENV: 'local'
      },
      test: {
        NODE_ENV: 'test'
      },
      stg: {
        NODE_ENV: 'staging'
      },
      prod: {
        NODE_ENV: 'production'
      }
    },
    nodemon: {
      dev: {
        script: 'bin/www',
        options: {
          ext: '.js',
          watch: ['bin/www', 'app.js', 'config/**/*.js', 'routes/**/*.js', 'shared/**/*.js']
        }
      },
      debug: {
        script: 'bin/www',
        options: {
          nodeArgs: ['--debug'],
          ext: '.js',
          watch: ['bin/www', 'app.js', 'config/**/*.js', 'routes/**/*.js', 'shared/**/*.js']
        }
      }
    },
    jshint: {
      all: {
        src: ['bin/www', 'app.js', 'config/**/*.js', 'routes/**/*.js', 'shared/**/*.js', 'public/**/*.js']
      }
    },
    concurrent: {
      dev: {
        tasks: ['nodemon'],
        options: {
          logConcurrentOutput: true
        }
      },
      inspector: {
        tasks: ['nodemon:debug', 'node-inspector', 'open:debug'],
        options: {
          logConcurrentOutput: true
        }
      },
      reload: {
        tasks: ['watch:reload', 'watch:restart'],
        options: {
          logConcurrentOutput: true
        }
      }
    },
    'node-inspector': {
      debug: {}
    },
    open: {
      dev: {
        url: 'http://localhost:3000',
        app: 'Chrome'
      },
      debug: {
        url: 'http://127.0.0.1:8080/?ws=127.0.0.1:8080&port=5858',
        app: 'Chrome'
      }
    },
    watch: {

      //reload the client html page
      reload: {
        files: ['public/**/*'],
        options: {
          livereload: true
        }
      }
      //Can't get serverreload to work...
      //restart express app
      //      restart: {
      //        files: ['bin/www', 'app.js', 'config/**/*.js', 'routes/**/*.js', 'shared/**/*.js'],
      //        tasks: ['express:all'],
      //        options: {
      //          serverreload: true
      //          nospawn: true, //Without this option specified express won't be reloaded
      //          atBegin: true
      //        }
      //      },
    },
    run: {
      debug: {
        options: {
          wait: true
        },
        //        cmd: "node-debug",args: ['.\bin\www']
        //Not sure why the above will not work and I have to put the command in debug.bat
        cmd: 'debug.bat'
      }
    },
    express: {
      all: {
        options: {
          bases: ['C:\\egam\\public'],
          server: 'C:\\egam\\app.js',
          port: 3000,
          hostname: 'localhost',
          livereload: true,
          //          serverreload: true
          //This works to open everytime grunt is run
          open: 'http://localhost:3000'
        }
      }
    }
    //    ,rerun: {
    //      dev: {
    //        options: {
    //          tasks: ['express']
    //        }
    //      }
    //    }
    //    ,forever: {
    //      egam: {
    //        options: {
    //          index: 'debug.bat'
    //        }
    //      }
    //    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-node-inspector');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks('grunt-run');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-express');
  //  grunt.loadNpmTasks('grunt-rerun');
  //  grunt.loadNpmTasks('grunt-forever');

  // Default task.
  grunt.registerTask('default', ['open:dev', 'nodemon']);
  //Just let default grunt run nodemon for now until we figure out where front end scripts will be away from mini libs
  //  grunt.registerTask('default', ['concurrent:dev']);

  grunt.registerTask('inspector', ['concurrent:inspector']);
  //Note using task name open didn't work
  grunt.registerTask('browse', ['open:dev']);

  grunt.registerTask('debug', ['run:debug']);
  //  grunt.registerTask('debug', ['env:dev','run:debug','watch']);
  //  grunt.registerTask('debug', ['run:debug']);
  //grunt.registerTask('lint', ['jshint']);

  //This does not work
  //  grunt.registerTask('reload', ['express','concurrent:reload']);
  //  grunt.registerTask('reload', ['express','express-keepalive']);
  grunt.registerTask('reload', ['express', 'watch:reload']);

  //to change env before running app: grunt env:stg default
  //to open browser and change env before running app: grunt env:stg browse default
};