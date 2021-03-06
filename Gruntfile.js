/* global process */

module.exports = function (grunt) {

  'use strict';

  var buildConfig,
    taskConfig,
    environment,
    appConstants,
    appTranslations,
    privateConfig,
    webDriverPrivateConfig;

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-connect-proxy');
  grunt.loadNpmTasks('grunt-html2js');
  grunt.loadNpmTasks('grunt-ngmin');
  grunt.loadNpmTasks('grunt-ng-constant');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-hub');
  grunt.loadNpmTasks('grunt-run-grunt');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-jasmine-wd');


  buildConfig = require('./build.config.js');

  environment = process.env.NODE_ENV || 'dev';

  appConstants = (function () {
    var baseConfig = buildConfig.config_dir + 'config.json',
      envConfig = buildConfig.config_dir + 'config.' + environment + '.json';

    return grunt.util._.extend(grunt.file.readJSON(baseConfig), grunt.file.readJSON(envConfig));
  })();

  appTranslations = (function () {
    var translations = {};
    grunt.file.recurse('config/translations', function (abspath, rootdir, subdir, filename) {
      if (filename.indexOf('.json') > 0) {
        translations[filename.split('.')[0]] = grunt.file.readJSON(abspath);
      }
    });
    return translations;
  })();

  privateConfig = (function () {
    if (grunt.file.exists('config/private.json')) {
      return grunt.file.readJSON('config/private.json');
    }
    return {};
  })();

  /**
   * This is the configuration object Grunt uses to give each plugin its
   * instructions.
   */
  taskConfig = {

    /**
     * This allows project to have different configuration settings for angular
     * depending on the currently set NODE_ENV. To change NODE_ENV issue this command,
     * $ export NODE_ENV=local
     */
    ngconstant: {
      constants: {
        dest: '<%= build_dir %>/src/app/constant.js',
        name: '<%= ng_appname %>.constant',
        wrap: '<%= __ngModule %>',
        constants: {
          settings: appConstants
        }
      },
      translation: {
        dest: '<%= build_dir %>/src/app/translations.js',
        name: '<%= ng_appname %>.translations',
        wrap: '<%= __ngModule %>',
        constants: {
          translations: appTranslations
        }
      }
    },

    /**
     * We read in our `package.json` file so we can access the package name and
     * version. It's already there, so we don't repeat ourselves here.
     */
    pkg: grunt.file.readJSON('package.json'),

    /**
     * The banner is the comment that is placed at the top of our compiled
     * source files. It is first processed as a Grunt template, where the `<%=`
     * pairs are evaluated based on this very configuration object.
     */
    meta: {
      banner: '/**\n' +
        ' * <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
        ' * <%= pkg.homepage %>\n' +
        ' *\n' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
        ' */\n'
    },

    /**
     * The directories to delete when `grunt clean` is executed.
     */
    clean: [
      '<%= build_dir %>',
      '<%= compile_dir %>'
    ],

    /**
     * The `copy` task just copies files from A to B. We use it here to copy
     * our project assets (images, fonts, etc.) and javascripts into
     * `build_dir`, and then to copy the assets to `compile_dir`.
     */
    copy: {

      // copies all files from /src/assets into /build/assets
      build_app_assets: {
        files: [
          {
            src: [ '**' ],
            dest: '<%= build_dir %>/assets/',
            cwd: 'src/assets',
            expand: true
          }
        ]
      },
      // copies vendor assets defined in build.config.js
      build_vendor_assets: {
        files: [
          {
            src: [ '<%= vendor_files.assets %>'],
            dest: '<%= build_dir %>/assets/',
            cwd: '.',
            expand: true,
            flatten: true
          },
          // copy assets from pep-styleguide and preserve directory structure!
          {
            src: [ './**/*.*' ],
            dest: '<%= build_dir %>/assets/',
            cwd: 'git_modules/pep-styleguide/assets/',
            expand: true,
            flatten: false
          }
        ]
      },
      // copies all application js files to build folder
      build_appjs: {
        files: [
          {
            src: ['<%= app_files.js %>'],
            dest: '<%= build_dir %>/',
            cwd: '.',
            expand: true
          }
        ]
      },
      // copies all vendor js files to build folder
      build_vendorjs: {
        files: [
          {
            src: ['<%= vendor_files.js %>'],
            dest: '<%= build_dir %>/',
            cwd: '.',
            expand: true
          }
        ]
      },
      // copies all vendor css files to build folder
      build_vendorcss: {
        files: [
          {
            src: ['<%= vendor_files.css %>'],
            dest: '<%= build_dir %>',
            cwd: '.',
            expand: true
          }
        ]
      },
      // copies all assets from build dir to comple dir
      compile_assets: {
        files: [
          {
            src: [ '**' ],
            dest: '<%= compile_dir %>/assets',
            cwd: '<%= build_dir %>/assets',
            expand: true
          }
        ]
      }
    },

    /**
     * `grunt concat` concatenates multiple source files into a single file.
     */
    concat: {
      /**
       * The `build_css` target concatenates compiled CSS and vendor CSS
       * together.
       */
      build_css: {
        src: [
          '<%= vendor_files.css %>',
          '<%= less.build.dest %>'
        ],
        dest: '<%= less.build.dest %>'
      },
      /**
       * The `compile_js` target is the concatenation of our application source
       * code and all specified vendor source code into a single file.
       */
      compile_js: {
        options: {
          banner: '<%= meta.banner %>'
        },
        src: [
          '<%= vendor_files.js %>',
          'module.prefix',
          '<%= build_dir %>/src/**/*.js',
          '<%= html2js.app.dest %>',
          'module.suffix'
        ],
        dest: '<%= compile_dir %>/assets/<%= pkg.name %>-<%= pkg.version %>.js'
      }
    },

    /**
     * Increments the version number, etc.
     */
    bump: {
      options: {
        files: [
          'package.json',
          'bower.json'
        ],
        commit: true,
        commitMessage: 'chore(release): v%VERSION%',
        commitFiles: [
          'package.json',
          'bower.json'
        ],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin'
      }
    },
    /**
     * `ng-min` annotates the sources before minifying. That is, it allows us
     * to code without the array syntax.
     */
    ngmin: {
      compile: {
        files: [
          {
            src: [ '<%= app_files.js %>' ],
            cwd: '<%= build_dir %>',
            dest: '<%= build_dir %>',
            expand: true
          }
        ]
      }
    },

    /**
     * `connect` is modular web server that allow us to serve static files (helps with testing/development)
     */

    connect: {
      server: {
        proxies: [
          // {
          //   "context": "/proxy",
          //   "host": "proxy.pspace.se",
          //   "changeOrigin": true,
          //   "rewrite": {
          //       "^/proxy/": "/proxy"
          //   }
          // }
          {
            "context": "/rest",
            "host": "api.arbetsformedlingen.se",
            "changeOrigin": true,
            "rewrite": {
                "^/rest/": "/"
            }
          }
        ],
        options: {
          port: 9000,
          hostname: '0.0.0.0',
          base: '<%= build_dir %>',
          open: false,
          middleware: function (connect, options) {
            var proxy = require('grunt-connect-proxy/lib/utils').proxyRequest;
            return [
              // Include the proxy first
              function(req, res, options) {
                // Override x-subject-of-care here if we need to
                // req.headers['x-subject-of-care'] = '191212121212';
                proxy(req, res, options);
              },
              // Serve static files.
              connect.static(options.base),
              // Make empty directories browsable.
              connect.directory(options.base)
            ];
          }
        }
      }
    },

    /**
     * HTML2JS is a Grunt plugin that takes all of your template files and
     * places them into JavaScript files as strings that are added to
     * AngularJS's template cache. This means that the templates too become
     * part of the initial payload as one JavaScript file. Neat!
     */
    html2js: {
      /**
       * These are the templates from `src/app`.
       */
      app: {
        options: {
          base: 'src/app'
        },
        src: [ '<%= app_files.atpl %>' ],
        dest: '<%= build_dir %>/templates-app.js'
      }
    },

    /**
     * `jshint` defines the rules of our linter as well as which files we
     * should check. This file, all javascript sources, and all our unit tests
     * are linted based on the policies listed in `options`. But we can also
     * specify exclusionary patterns by prefixing them with an exclamation
     * point (!); this is useful when code comes from a third party but is
     * nonetheless inside `src/`.
     */
    jshint: {
      src: [
        '<%= app_files.js %>'
      ],
      gruntfile: [
        'Gruntfile.js'
      ],
      options: {
        'jshintrc': '.jshintrc'
      }
    },


    /**
     * `less` handles our LESS compilation and uglification automatically.
     * Only our `main.less` file is included in compilation; all other files
     * must be imported from this file.
     */
    less: {
      build: {
        src: [
          '<%= vendor_files.less %>',
          '<%= app_files.less %>'
        ],
        dest: '<%= build_dir %>/assets/<%= pkg.name %>-<%= pkg.version %>.css'
      },
      compile: {
        src: [ '<%= less.build.dest %>' ],
        dest: '<%= less.build.dest %>',
        options: {
          cleancss: true
        }
      }
    },

    /**
     * Put any text-replacement hacks here. For example, rewriting links in CSS:
     */
    replace: {
      relative_links: {
        src: ['<%= build_dir %>/assets/<%= pkg.name %>-<%= pkg.version %>.css'],             // source files array (supports minimatch)
        dest: '<%= build_dir %>/assets/<%= pkg.name %>-<%= pkg.version %>.css',             // destination directory or file
        replacements: [
          {
            from: "url('http://chorus.dev/pep-styleguide/assets/",                   // string replacement
            to: "url('"
          }
        ]
      }
    },

    /**
     * The `index` task compiles the `old_index.html` file as a Grunt template. CSS
     * and JS files co-exist here but they get split apart later.
     */
    index: {

      /**
       * During development, we don't want to have wait for compilation,
       * concatenation, minification, etc. So to avoid these steps, we simply
       * add all script files directly to the `<head>` of `old_index.html`. The
       * `src` property contains the list of included files.
       */
      build: {
        dir: '<%= build_dir %>',
        src: [
          '<%= vendor_files.js %>',
          '<%= build_dir %>/src/**/*.js',
          '<%= html2js.app.dest %>',
          '<%= vendor_files.css %>',
          '<%= less.build.dest %>'
        ]
      },

      /**
       * When it is time to have a completely compiled application, we can
       * alter the above to include only a single JavaScript and a single CSS
       * file. Now we're back!
       */
      compile: {
        dir: '<%= compile_dir %>',
        src: [
          '<%= concat.compile_js.dest %>',
          '<%= vendor_files.css %>',
          '<%= less.compile.dest %>'
        ]
      }
    },

    /**
     * And for rapid development, we have a watch set up that checks to see if
     * any of the files listed below change, and then to execute the listed
     * tasks when they do. This just saves us from having to type "grunt" into
     * the command-line every time we want to see what we're working on; we can
     * instead just leave "grunt watch" running in a background terminal. Set it
     * and forget it, as Ron Popeil used to tell us.
     *
     * But we don't need the same thing to happen for all the files.
     */
    delta: {
      /**
       * By default, we want the Live Reload to work for all tasks; this is
       * overridden in some tasks (like this file) where browser resources are
       * unaffected. It runs by default on port 35729, which your browser
       * plugin should auto-detect.
       */
      options: {
        livereload: true
      },

      /**
       * When the Gruntfile changes, we just want to lint it. In fact, when
       * your Gruntfile changes, it will automatically be reloaded!
       */
      gruntfile: {
        files: 'Gruntfile.js',
        tasks: [ 'jshint:gruntfile' ],
        options: {
          livereload: false
        }
      },

      /**
       * When our JavaScript source files change, we want to run lint them and
       * run our unit tests.
       */
      jssrc: {
        files: [
          '<%= app_files.js %>'
        ],
        tasks: [ 'jshint:src', 'copy:build_appjs' ]
      },

      /**
       * When html files changes, we need to recompile it into js files. We do index:build just for good measure (just in case you change it)
       */
      html: {
        files: [
          'src/**/*.html'
        ],
        tasks: [ 'html2js', 'index:build' ]
      },

      /**
       * When our JavaScript JSON config files change, we want to rebuild the angular constants and copy output
       */
      jsonconfig: {
        files: [
          '<%= config_files.json %>'
        ],
        tasks: [ 'ngconstant', 'copy:build_appjs' ]
      },

      /**
       * When assets are changed, copy them. Note that this will *not* copy new
       * files, so this is probably not very useful.
       */
      assets: {
        files: [
          'src/assets/**/*'
        ],
        tasks: [ 'copy:build_app_assets' ]
      },

      /**
       * When the CSS files change, we need to compile and minify them.
       */
      less: {
        files: [ 'src/**/*.less', 'git_modules/**/*.less' ],
        tasks: [ 'less:build', 'replace:relative_links' ]
      },

      /**
       * When the build.config.js change, we need to build from scratch.
       */
      build_config: {
        files: [ './build.config.js' ],
        tasks: [ 'build' ]
      },

      /**
       * When the translation files change, rebuild constants.
       */
      translations: {
        files: [ 'config/translations/*.json' ],
        tasks: [ 'ngconstant', 'copy:build_appjs' ]
      }

    },

    /**
     * Minify the sources!
     */
    uglify: {
      compile: {
        options: {
          banner: '<%= meta.banner %>'
        },
        files: {
          '<%= concat.compile_js.dest %>': '<%= concat.compile_js.dest %>'
        }
      }
    },

    karma: {
      unit: {
        options: {
          configFile: 'test/config/karma.conf.js',
          files: [
            '<%= test_files.js %>',
            '../data/mock.js',
            '../data/mock/*.js',
            '../unit/**/*.js'
          ]
        }
      },
      dev: {
        options: {
          configFile: 'test/config/karma.conf.js',
          files: [
            '<%= test_files.js %>',
            '../data/mock.js',
            '../data/mock/*.js',
            '../unit/**/*.js'
          ],
          reporters: 'dots',
          singleRun: false,
          autoWatch: true
        }
      }
    },

    "jasmine": {
      /* Used with jasmine-webdriver */
      options: {
        specFolders: [ 'test/e2e' ],
        regExpSpec: /spec\.js$/,
        defaultTimeoutInterval: 30000,
        junitreport: {
          report: true,
          savePath : "./build/reports/e2e/",
          useDotNotation: true,
          consolidate: true
        }
      }
    },

    shell: {
      framework: {
        command: ["npm install", "bower install"].join('&&'),
        options: {
          execOptions: {
            cwd: "git_modules/vpv-framework"
          },
          stdout: true
        }
      },
      commons: {
        command: ["npm install", "bower install"].join('&&'),
        options: {
          stdout: true,
          execOptions: {
            cwd: "git_modules/chorus-commons"
          }
        }
      }
    },

    hub: {
      all: {
        options: {
          allowSelf: true
        },
        src: ['Gruntfile.js', 'git_modules/*/Gruntfile.js'],
        tasks: ['watch']
      }
    },

    run_grunt: {
      dependencies: {
        src: 'git_modules/*/Gruntfile.js'
      }
    }

  };

  grunt.initConfig(grunt.util._.extend(taskConfig, buildConfig));


  grunt.registerTask('install', ['shell']);


  /**
   * The default task is to build and compile.
   */
  grunt.registerTask('default', [ 'build', 'compile' ]);

  /**
   * In order to make it safe to just compile or copy *only* what was changed,
   * we need to ensure we are starting from a clean, fresh build. So we rename
   * the `watch` task to `delta` (that's why the configuration var above is
   * `delta`) and then add a new task called `watch` that does a clean build
   * before watching for changes.
   */

  grunt.renameTask('watch', 'delta');
  grunt.registerTask('watch', [
    'configureProxies:server', 'connect', 'build', 'delta'
  ]);

  /**
   * The `build` task gets your app ready to run for development and testing.
   */

  grunt.registerTask('build', [
    'clean', 'run_grunt', 'jshint', 'less:build', 'replace:relative_links', 'html2js', 'ngconstant',
    'concat:build_css', 'copy:build_app_assets', 'copy:build_vendor_assets',
    'copy:build_appjs', 'copy:build_vendorcss', 'copy:build_vendorjs', 'index:build'
  ]);

  /**
   * The `compile` task gets your app ready for deployment by concatenating and
   * minifying your code.
   */
  grunt.registerTask('compile', [
    'less:compile', 'copy:compile_assets', 'ngmin', 'concat:compile_js', 'uglify', 'index:compile'
  ]);

  /**
   * Runs the unit test
   */
  grunt.registerTask('test', [
    'ngconstant', 'karma:unit'
  ]);

  /**
   * A utility function to get all app JavaScript sources.
   */
  function filterForJS(files) {
    return files.filter(function (file) {
      return file.match(/\.js$/);
    });
  }

  /**
   * A utility function to get all app CSS sources.
   */
  function filterForCSS(files) {
    return files.filter(function (file) {
      return file.match(/\.css$/);
    });
  }

  /**
   * The index.html template includes the stylesheet and javascript sources
   * based on dynamic names calculated in this Gruntfile. This task assembles
   * the list into variables for the template to use and then runs the
   * compilation.
   */
  grunt.registerMultiTask('index', 'Process index.html template', function () {
    var dirRE, jsFiles, cssFiles, appjs;

    dirRE = new RegExp('^(' + grunt.config('build_dir') + '|' + grunt.config('compile_dir') + ')\/', 'g');

    jsFiles = filterForJS(this.filesSrc).map(function (file) {
      return file.replace(dirRE, '');
    });

//		appjs = jsFiles.indexOf('src/app/app.js');
//		if (appjs > -1) {
//			jsFiles.splice(appjs, 1);
//		}
//
//		jsFiles.push('src/app/app.js');


    cssFiles = filterForCSS(this.filesSrc).map(function (file) {
      return file.replace(dirRE, '');
    });


    grunt.file.copy('src/index.html', this.data.dir + '/index.html', {
      process: function (contents) {
        return grunt.template.process(contents, {
          data: {
            scripts: jsFiles,
            styles: cssFiles,
            version: grunt.config('pkg.version')
          }
        });
      }
    });
  });

  grunt.registerTask('jasmine-webdriver-with-username-accesskey', 'Pass in password to jasmine-webdriver task', function(username, accessKey) {
    grunt.config("jasmine-webdriver.sauce.options.username", username);
    grunt.config("jasmine-webdriver.sauce.options.accessKey", accessKey);
    grunt.task.run("jasmine-webdriver:sauce");
  });

};
