module.exports = function (grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      js: {
        src: [
          'js/object.js',
          'js/list.js',
          'js/form.js',
          'js/session.js',
          'js/persist.js',
          'js/message.js',
          'js/adcom.js'
        ],
        dest: 'dist/js/<%= pkg.name %>.js'
      }
    },
    uglify: {
      core: {
        src: '<%= concat.js.dest %>',
        dest: 'dist/js/<%= pkg.name %>.min.js'
      }
    },

    less: {
      options: {
        sourceMap: true,
        paths: ['less', 'bower_components']
      },
      compile: {
        options: {
          sourceMapURL: '<%= pkg.name %>.css.map',
          sourceMapFilename: 'dist/css/<%= pkg.name %>.css.map'
        },
        src: 'less/adcom.less',
        dest: 'dist/css/<%= pkg.name %>.css'
      },
      compileDocs: {
        src: 'less/adcom-namespaced.less',
        dest: 'docs/public/css/<%= pkg.name %>-namespaced.css'
      }
    },
    cssmin: {
      minify: {
        src: 'dist/css/<%= pkg.name %>.css',
        dest: 'dist/css/<%= pkg.name %>.css.min'
      }
    },

    copy: {
      docs: {
        src: '*/*',
        expand: true,
        cwd: 'dist/',
        dest: 'docs/public/'
      },
      fonts: {
        src: '*',
        expand: true,
        cwd: 'bower_components/bootstrap/fonts/',
        dest: 'dist/fonts/'
      }
    },
    jekyll: {
      options: {
        src: 'docs',
      },
      server: {
        options: {
          dest: 'docs/_site',
          config: 'docs/_config.yml',
          port: 8000,
          watch: true,
          serve: true
        }
      },
      build: {
        options: {
          dest: 'docs/_site',
          config: 'docs/_config.yml'
        }
      }
    },
    watch: {
      src: {
        files: 'js/*.js',
        tasks: ['dist-js', 'copy:docs', 'jekyll:build']
      },
      less: {
        files: ['less/*.less', 'less/**/*.less'],
        tasks: ['dist-css', 'copy:docs', 'jekyll:build']
      },
      jekyll: {
        files: ['docs/*'],
        tasks: ['jekyll:build'],
      }
    },
    buildcontrol: {
      options: {
        dir: 'docs/_site',
        commit: true,
        push: true,
        message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%'
      },
      pages: {
        options: {
          remote: 'git@github.com:newsdev/adcom.git',
          branch: 'gh-pages'
        }
      }
    }
  });

  require('load-grunt-tasks')(grunt, { scope: 'devDependencies' });

  grunt.registerTask('dist-js', ['concat:js', 'uglify:core']);
  grunt.registerTask('dist-css', ['less:compile', 'less:compileDocs', 'cssmin:minify']);
  grunt.registerTask('default', ['dist-js', 'dist-css', 'copy:docs']);
}
