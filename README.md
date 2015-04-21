# Adcom

[![Bower version](https://badge.fury.io/bo/adcom.svg)](http://badge.fury.io/bo/adcom)

> Adcom is a set of JavaScript plugins and frontend styles <br> that serve as the foundation for admins at The New York Times.

The plugins serve common use cases on the many internal sites we create day to day: rendering **dynamic lists**, standardizing **form validation**, **maintaining state** across page loads, persisting **user settings**, and so on.

The styles are a custom flavor of <a href="https://getbootstrap.com">Bootstrap</a>, and includes a set of guidelines for what to include on each page, and where. Ensuring that admins from all of our teams have a consistent visual language helps users feel more comfortable using the sites, and makes it easier for our developers to maintain.

* [Usage](#usage)
* [Plugins](#plugins)
* [Styles](#styles)
* [Development](#development)

---

## Usage

Adcom is available over bower:

``` bash
bower install adcom
```

The `dist` folder of the source code contains the following files:

``` bash
adcom/
└── dist/
    ├── css/
    │   ├── adcom.css
    │   ├── adcom.css.map
    │   └── adcom.min.css
    └── js/
        ├── adcom.js
        └── adcom.min.js
```

The `adcom.css` and `adcom.min.css` both include Bootstrap. `adcom.js` and `adcom.min.js` do **not** include the Bootstrap JavaScript plugins.

---

## Plugins

* [List.js](http://newsdev.github.io/adcom/list-js.html) takes a list of items and renders them using a template
* [Form.js](http://newsdev.github.io/adcom/form-js.html) standardizes cross-browser form validation and serialization
* [Session.js](http://newsdev.github.io/adcom/session-js.html) stores individual user settings in localStorage or sessionStorage
* [Persist.js](http://newsdev.github.io/adcom/persist-js.html) creates "sticky" element attributes that can persist across page loads
* [Message.js](http://newsdev.github.io/adcom/message-js.html) displays alert and [snackbar](http://www.google.com/design/spec/components/snackbars-toasts.html)-style messages to readers

### JavaScript Usage

You can include all of the plugins or individual ones by loading either the distribution `adcom.js` file or any of the source files.

``` html
<!-- load all of plugins -->
<script src="dist/js/adcom.js"></script>

<!-- load list.js only -->
<script src="js/list.js"></script>
```

#### Require.js / AMD

Plugins are also compatible with the Asynchronous Module Definition API:

``` html
<!-- using require.js -->
<script src="require.js"></script>
<script>
  require.config({
    paths: {
      jquery: 'assets/jquery',
      adcom: 'assets/adcom'
    }
  });
  require(['adcom'], function() {
    // all plugins are defined
  });
</script>
```

Each assumes jQuery is available on the page or through require, and will install List.js to `$.fn.list`.

### Plugin Initialization

Most plugins have a set of primary options can be specified in two ways:

* As an object to the plugin's initializer function (such as `.list({ "option": true })`)
* Adding data-attributes to the plugin's element (initializers are normally called on a single DOM element)

For example, set the `show` option on a list by passing a boolean to the initailizer, or with a data attribute on the element:

* `$(list).list({show: false})`
* `<list data-show="false"> ... </list>`

When a plugin is initialized, all data attributes on the element are converted into options that get passed into the initializer as defaults. You can also mix and match; options specified in the JavaScript initializer take precedence over those as data attributes. Multi-word options are expressed in camel case in JavaScript (`currentPage`), and with hypens as data attributes (`data-current-page`).

---

## Styles

Adcom includes CSS styles which are a compiled variation of Bootstrap. There are several modifications / additions Adcom makes to the following categories:

* [Navigation](http://newsdev.github.io/adcom/styles.html#navigation)
* [Forms](http://newsdev.github.io/adcom/styles.html#forms)
* [Lists](http://newsdev.github.io/adcom/styles.html#lists)
* [Messages](http://newsdev.github.io/adcom/styles.html#messages)
* [Buttons](http://newsdev.github.io/adcom/styles.html#buttons)

It also includes a [boilerplate scaffold](http://newsdev.github.io/adcom/whitelabel.html) of the overall structure we use for admins at The New York Times.

### Styles usage

``` html
<!-- load adcom.css in your head tag -->
<link rel="stylesheet" href="/assets/adcom.css">
```

---

## Development

Make sure you have `npm` installed on your system. Then, run `npm install` within the project's home directory to install dependencies.

You also need to have `bower` installed to load Bootstrap as a dependency. Run `bower install`.

### Grunt

Several [`grunt`](http://gruntjs.com/getting-started) tasks are provided to make development easier.

Run `grunt` to compile the CSS and JavaScript, update the docs, and watch for new changes to the source files to re-run itself.

Run `grunt jekyll:server` to boot up this documentation on `localhost:8000`.

### Contributing

Please use the Issues page to comment on the project and report any bugs or concerns you have.


### License

Adcom is released under the [Apache 2.0 License](https://github.com/newsdev/adcom/blob/master/LICENSE/blob/master/LICENSE).

## Author

Created by [Michael Strickland](https://twitter.com/moriogawa) for the [Interactive News](https://github.com/newsdev) team at The New York Times.
