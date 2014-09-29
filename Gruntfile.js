module.exports = function (grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      dist: ['dist/js/adcom*', 'dist/css/adcom*'],
      docs: ['docs/dist/js/adcom*', 'docs/dist/css/adcom*']
    },
    concat: {
      adcom: {
        src: [
          'js/list.js',
          'js/form.js',
          'js/state.js'
        ],
        dest: 'dist/js/<%= pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        preserveComments: 'some'
      },
      core: {
        src: '<%= concat.adcom.dest %>',
        dest: 'dist/js/<%= pkg.name %>.min.js'
      },
      docsJs: {
        // NOTE: This src list is duplicated in footer.html; if making changes here, be sure to update the other copy too.
        src: [
          'docs/assets/js/vendor/holder.js',
          'docs/assets/js/vendor/underscore.min.js',
          'docs/assets/js/vendor/ZeroClipboard.min.js',
          'docs/assets/js/src/application.js'
        ],
        dest: 'docs/assets/js/docs.min.js'
      },
      examplesJs: {
        src: [
          'docs/assets/js/vendor/highlight.js',
          'docs/assets/js/vendor/ast.js',
          'docs/assets/js/vendor/beautify.js',
          'docs/assets/js/vendor/beautify-html.js',
          'docs/assets/js/src/example.js'
        ],
        dest: 'docs/assets/js/example.min.js'
      }
    },
    less: {
      compileCore: {
        options: {
          sourceMap: true,
          outputMapURL: '<%= pkg.name %>.css.map',
          sourceMapFilename: 'dist/css/<%= pkg.name %>.css.map'
        },
        src: 'less/adcom.less',
        dest: 'dist/css/<%= pkg.name %>.css'
      }
    },
    csslint: {
      options: {
        csslintrc: 'less/.csslintrc'
      },
      dist: [
        'dist/css/adcom.css'
      ],
      docs: {
        options: {
          ids: false,
          'overqualified-elements': false
        },
        src: 'docs/assets/css/src/docs.css'
      }
    },
    csscomb: {
      options: {
        config: 'less/.csscomb.json'
      },
      dist: {
        expand: true,
        cwd: 'dist/css/',
        src: ['*.css', '!*.min.css'],
        dest: 'dist/css/'
      },
      docs: {
        src: 'docs/assets/css/src/docs.css',
        dest: 'docs/assets/css/src/docs.css'
      }
    },
    cssmin: {
      options: {
        compatibility: 'ie8',
        keepSpecialComments: '*',
        noAdvanced: true
      },
      minifyCore: {
        src: 'dist/css/<%= pkg.name %>.css',
        dest: 'dist/css/<%= pkg.name %>.min.css'
      },
      docs: {
        src: [
          'docs/assets/css/src/docs.css',
          'docs/assets/css/src/pygments-manni.css'
        ],
        dest: 'docs/assets/css/docs.min.css'
      },
      examples: {
        src: [
          'docs/assets/css/src/default.css',
          'docs/assets/css/src/docco.min.css',
          'docs/assets/css/src/example.css'
        ],
        dest: 'docs/assets/css/example.min.css'
      }
    },
    copy: {
      docs: {
        src: 'dist/*/*',
        dest: 'docs/'
      },
      docs_license: {
        files: [
          { src: 'docs/LICENSE', dest: '_gh_pages/LICENSE-DOCS' },
          { src: 'LICENSE', dest: '_gh_pages/LICENSE' }
        ]
      }
    }
  });

  // These plugins provide necessary tasks.
  require('load-grunt-tasks')(grunt, { scope: 'devDependencies' });

  // JS distribution task.
  grunt.registerTask('dist-js', ['concat', 'uglify:core']);

  // CSS distribution task.
  grunt.registerTask('less-compile', ['less:compileCore']);
  grunt.registerTask('dist-css', ['less-compile', 'csscomb:dist', 'cssmin:minifyCore']);

  // Full distribution task.
  grunt.registerTask('dist', ['clean:dist', 'dist-css', 'dist-js', 'dist-css']);

  // Docs task.
  grunt.registerTask('docs-css', ['csscomb:docs', 'cssmin:docs', 'cssmin:examples']);
  grunt.registerTask('lint-docs-css', ['csslint:docs']);
  grunt.registerTask('docs-js', ['uglify:docsJs', 'uglify:examplesJs']);
  grunt.registerTask('docs', ['docs-css', 'lint-docs-css', 'docs-js', 'clean:docs', 'copy:docs', 'copy:docs_license']);

  // Default task.
  grunt.registerTask('default', ['dist', 'docs']);
}
