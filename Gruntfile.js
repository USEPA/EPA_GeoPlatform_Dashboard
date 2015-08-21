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
          watch: ['app.js',]
        }
      },
      debug: {
        script: 'bin/www',
        options: {
          nodeArgs: ['--debug'],
          ext: '.js',
          watch: ['app.js',]
        }
      }
    },
    jshint: {
      all: {
        src: ['bin/www','app.js','config/**/*.js','routes/**/*.js','utilities/**/*.js']
      }
    },
    concurrent: {
      dev: {
        tasks: ['nodemon','watch'],
        options: {
          logConcurrentOutput: true
        }
      },
      inspector: {
        tasks: ['nodemon:debug', 'node-inspector', 'open:debug'],
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
      js: {
        files: ['bin/www','app.js','config/**/*.js','routes/**/*.js','utilities/**/*.js'],
        tasks: ['lint']
//        tasks: ['forever:egam:restart']
//        cmd: 'node-debug ./bin/www'
      }
    },
    run: {
      debug: {
        options:{wait:true},
//        cmd: 'node-debug ./bin/www'
//Not sure why the above will not work and I have to put the command in debug.bat
        cmd: 'debug.bat'
      }
    }
//    ,express: {
//      dev: {
//        options: {
//          port: 3000,
//          bases: ['/public'],
//          keepalive: true,
//         server: './bin/www'
//        }
//     }
//    }
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
//  grunt.loadNpmTasks('grunt-rerun');
//  grunt.loadNpmTasks('grunt-forever');

  // Default task.
//  grunt.registerTask('default', ['nodemon','open:dev']);
  grunt.registerTask('default', ['concurrent:dev']);
  grunt.registerTask('inspector', ['concurrent:inspector']);
//Note using task name open didn't work
  grunt.registerTask('browse', ['open:dev']);

  grunt.registerTask('debug', ['lint','run:debug']);
//  grunt.registerTask('debug', ['env:dev','run:debug','watch']);
//  grunt.registerTask('debug', ['run:debug']);
  grunt.registerTask('lint', ['jshint']);

//to change env before running app: grunt env:stg default
//to open browser and change env before running app: grunt env:stg browse default
};
