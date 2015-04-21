---
layout: default
title: Home
---

# What is Adcom?

> Adcom is a set of JavaScript plugins and frontend styles <br> that are the foundation for admin sites at The New York Times.

The plugins serve common use cases on the internal sites we create day-to-day: rendering **dynamic lists**, standardizing **form validation**, **maintaining state** across page loads, persisting **settings**, and others.

The styles ([view an example here]({{ site.baseurl }}boilerplate.html)) are a custom flavor of <a href="https://getbootstrap.com">Bootstrap</a>, and establish guidelines for what to include on each page, and where. A consistent visual language helps people feel more comfortable using our tools, and makes them easier for our developers to maintain.

Currently v{{ site.version }}. Last updated {{ site.last_updated }}.

---

* [Why?](#why)
* [Usage](#usage)
* [Take me to the Plugins](#plugins)
* [Take me to the Styles](#styles)
* [Development](#development)

---

<h2 id="why">Why is Adcom?<small>Guidelines</small></h2>

Adcom was built for our specific needs at The New York Times, but is based on a more **general set of issues** we identified as a large programming team.

#### Establishing familiarity

Our internal websites are used by copy editors, reporters, web producers, developers and others, and we feel it's important for them to have a consistent workflow and visual framework. These tools should **feel familiar and predictable**, not dangerous. This is especially important when creating tools by developers using separate frameworks and codebases.

Adcom contains a [boilerplate layout]({{ site.baseurl }}boilerplate.html) for how to structure our sites, with Bootstrap-based components and [best practices]({{ site.baseurl }}styles.html) for when and how to use them.

#### Living with feature creep

Long-lived admins encourage feature creep. They can grow over months or years to cover more needs and options, and development time can be lost reimplementing code to suit them.

We try to smooth out that process by providing foundational plugins that are quick to use for a `1.0`, but flexible enough to **grow with increased complexity**.

For example, [List.js]({{ site.baseurl }}list-js.html) helps you render simple tables for a first draft. When you need a more advanced templating engine, additional filtering or you need to change the data source, each change can happen independently, without having to start over with a new plugin.

#### Isolating code

Making our front-end code easier for newcomers to maintain and understand means keeping our code organized. Moving the JavaScript for common tasks into plugins, and moving the configuration into the HTML, keeps each page's JavaScript focused on it's unique business logic.

Like [Bootstrap](http://getbootstrap.com/javascript/#js-data-attrs), Adcom's plugins encourage use and configuration in the View layer by setting data attributes directly on elements. This reinforces thinking of the **document as driving development**. The API tries to flatten the shared JavaScript and document layers, linking the physical map of a page to its source code and the JavaScript that enhances it:

* Tie interaction settings to the affected elements
* Render JavaScript templates inline inside their containers
* Prefer baking HTML structure into the page over dynamic generation (e.g., rendering a blank form once, and populating it multiple times as needed)

#### A diverse network of admins

We build our sites using different frameworks and languages. To make Adcom usable across it all, we focus on the **document**.

The document layer is the closest blueprint we have to the finished page that users access, making it a useful starting point into understanding and changing a page. It's design also tends to be the most resiliant across frameworks. So **sharing code** incresingly means **sharing documents**.

So we encourage configuring our plugins in the document and writing template partials inline.

---

<h2 id="usage">How is Adcom? <small>Usage</small></h2>

[Download]({{ site.github.repo }}/archive/v{{ site.version }}.zip) the latest version from GitHub.

Adcom is also available over [bower](http://bower.io/").

``` bash
bower install adcom
```

#### What's inside?

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

The `adcom.css` and `adcom.min.css` both include Bootstrap [v{{ site.bootstrap_version }}](https://github.com/twbs/bootstrap/releases/v{{ site.bootstrap_version }}). `adcom.js` and `adcom.min.js` do **not** include the Bootstrap JavaScript plugins; if you require them, they must be included separately.

---

## Plugins

* [List.js]({{ site.baseurl }}list-js.html) renders a list of items using a template
* [Form.js]({{ site.baseurl }}form-js.html) standardizes cross-browser form validation and serialization
* [Session.js]({{ site.baseurl }}session-js.html) stores individual settings in localStorage or sessionStorage
* [Persist.js]({{ site.baseurl }}persist-js.html) creates "sticky" element attributes that can persist across page loads
* [Message.js]({{ site.baseurl }}message-js.html) displays alert and [snackbar](http://www.google.com/design/spec/components/snackbars-toasts.html)-style messages

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

Each assumes [jQuery](https://jquery.com/) is available on the page or through [RequireJS](http://requirejs.org/), and will install List.js to `$.fn.list`.

### Plugin Initialization

Most plugins have a set of primary options that can be specified in two ways:

* Adding data attributes to the plugin's element (initializers are normally called on a single DOM element)
* Passing them as an object to the plugin's initializer function (such as `.list({ "option": true })`)

For example, set the `show` option on a list with a data attribute on the element, or by passing a boolean to the initializer:

* `$(list).list({show: false})`
* `<list data-show="false"> ... </list>`

When a plugin is initialized, all data attributes on the element are converted into options that get passed into the initializer as defaults. You can also mix and match; options specified in the JavaScript initializer take precedence over those as data attributes. Multi-word options are expressed in camel case in JavaScript (`currentPage`), and with hyphens as data attributes (`data-current-page`).

---

## Styles

Adcom includes CSS styles which are a compiled variation of Bootstrap. There are several modifications / additions Adcom makes to the following categories:

* [Navigation]({{ site.baseurl }}styles.html#navigation)
* [Forms]({{ site.baseurl }}styles.html#forms)
* [Lists]({{ site.baseurl }}styles.html#lists)
* [Messages]({{ site.baseurl }}styles.html#messages)
* [Buttons]({{ site.baseurl }}styles.html#buttons)

It also includes a [boilerplate scaffold]({{ site.baseurl }}boilerplate.html) of the overall structure we use for admins at The New York Times.

### Styles usage

``` html
<!-- load adcom.css in your head tag -->
<link rel="stylesheet" href="/assets/adcom.css">
```

---

## Development

To make changes to the plugins or styles, make sure you have [npm](https://www.npmjs.com/) installed on your system. Then, run `npm install` within the project's home directory to install dependencies.

You also need to have `bower` installed to load Bootstrap as a dependency. Run `bower install`.

### Grunt

Several [grunt](http://gruntjs.com/getting-started) tasks are provided to make development easier:

* `grunt` compiles the CSS and JavaScript, and updates the docs with the latest code
* `grunt watch` listens for changes to the source files, recompiling the CSS or JavaScript when necessary
* `grunt jekyll:server` boots up this documentation on [localhost:8000/adcom/](http://localhost:8000/adcom/)

### Contributing

This repo is hosted on [GitHub]({{ site.github.repo }}). Please use the [Issues](https://github.com/newsdev/adcom/issues) page to comment on the project and report any bugs or concerns you have.

To contribute pull requests, please fork the repository and create a pull-request against the `develop` branch.

### License

Adcom is released under the [Apache 2.0 License]({{ site.github.repo }}/blob/master/LICENSE).
