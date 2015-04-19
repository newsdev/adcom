---
layout: default
title: Styles
body_classes: messages-static
---

## Styles

> A custom flavor of Bootstrap that serves as the scaffolding for admins at The New York Times.

---

* [Usage](#usage)
* [Scaffolding](#scaffolding)
* [Components](#components)
  * [Navigation](#navigation)
  * [Forms](#forms)
  * [Lists](#lists)
  * [Messages](#messages)
  * [Buttons](#buttons)

---

## Usage

Adcom ships with compiled development and minified versions of `adcom.css`, along with a `.map` file, which is ready for inclusion on your webpages. The current version uses Bootstrap [v{{ site.bootstrap_version }}](https://github.com/twbs/bootstrap/releases/v{{ site.bootstrap_version }}).

Our source `.less` files are available in the source code; see [Development](#development) for information about customizing them yourself.

---

## Scaffolding

The best introduction we can give to the Adcom styles is simply to see it in action. View an example [boilerplate index page here]({{ site.baseurl }}boilerplate.html).

Several of the componets, such as the navbars, instructions drawer, and styles for rendering items in a central list, are opinionated in their design, to be consistent, intuitive, and minimalistic in the complexity of actions they encourage.

![Adcom Scaffolding]({{ site.baseurl }}public/images/scaffolding.png)

We encourage pages to include the following:

* Global **About** and **Support** pages that can explain a tool to newcomers, and provide instructions for help when needed
* A set of **page-specific instructions**, preferrably visibile on first load, that helps newcomers and servers as a useful reference
* **Consistent interfaces** for list filters / sorting
* **Consistent visual language** for triggers to add, remove, edit and export resources
* Using **modals for forms** that create or change a resource
* Explicit information for **what will happen when a reader takes any action** (what will happen to the page, how any databases will be affected)

In practice, most of the pages we produce are some sort of index page. Having a general style that highlights primary actions for a reader to take not only save development time, but gives readers a more familiar environment and encourages developers to keep the page's workflow simple and streamlined.

---

## Components

While the scaffolding above helps our admins be consist and clear, the individual components are there mainly to save time.

We've tried to encourage several things in our designs:

* Use Bootstrap (or another framework) wherever possible
* Dynamic state should be reflected with the HTML
* Keep styles portable

---

### Navigation

We use two separate navigation bars: one that is consist across tools, and includes universal features likes links to support and information. Another another that is specific to the tool, and may vary freely by page.

##### Primary navigation

``` example-html-bs
<div class="navbar navbar-default navbar-primary">
  <div class="container">
    <div class="navbar-header">
      <a class="navbar-brand">App Name</a>
    </div>
    <ul class="nav navbar-nav navbar-left">
      <li class="navbar-summary"><span>Description.</span></li>
    </ul>
    <ul class="nav navbar-nav navbar-right navbar-bits">
      <li class="navbar-form" data-toggle="collapse" href="#page-instructions">
        <button type="button" class="btn btn-sm btn-muted" data-toggle="button">
          Instructions
        </button>
      </li>
      <li><a href="#">About</a></li>
      <li><a href="#">Support</a></li>
      <li><a href="#">Log in</a></li>
    </ul>
  </div>
</div>
```

##### Standard navigation

``` example-html-bs
<div class="navbar navbar-default">
  <div class="container">
    <div class='btn btn-sm btn-success navbar-btn navbar-left'>
      Button
    </div>
    <form class='navbar-form navbar-left form-inline'>
      <div class='form-group form-group-sm glyphicon-input'>
        <input class='form-control input-sm' data-filter='headline,author' data-target='#myList' data-trigger='keyup' placeholder='Search' style='min-width: 190px'>
        <i class='glyphicon glyphicon-search'></i>
      </div>
    </form>
    <ul class='nav navbar-nav navbar-right navbar-sort'>
      <li><span>Sort by:</span></li>
      <li>
        <a class='sort-control sort-descending' data-sort='updated_at' data-target='#myList' href='#'>Date Updated</a>
      </li>
      <li>
        <a class='sort-control' data-sort='headline' data-target='#myList' href='#'>Headline</a>
      </li>
    </ul>
  </div>
</div>
```

---

### Forms

In general, forms should be rendered inline in modals on the page with [Form.js]({{ site.baseurl }}form-js.html).

Use modals to:

* Keep the form short, simple and self-explanatory
* Simply navigational sturcture
* Reduce reliance on framework-specific helpers like `form_for` in favor of JSON-based serialization (with `.form('show')`)

Forms should use [native validation]({{ site.baseurl }}form-js.html#validate) where possible to display errors, and use the [HTML5 validations API](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Forms/Data_form_validation) to configure custom error messages.

``` example-html-bs

<form class="form-horizontal">
  <div class="modal-header">
    <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
    <h2 class="modal-title">Create New List</h2>
  </div>

  <div class="modal-body">
    <div class="form-group">
      <label class="control-label">Headline</label>
      <div class="control-input">
        <input class="form-control" placeholder="Headline">
      </div>
    </div>

    <div class="form-group">
      <label class="control-label">Leadin</label>
      <div class="control-input">
        <textarea class="form-control" placeholder="Leadin"></textarea>
      </div>
    </div>

    <div class="form-group">
      <label class="control-label">Tone</label>
      <div class="control-input">
        <select class="form-control">
          <option selected value="default">Default</option>
          <option value="feature">Feature</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="control-label">Creator</label>
      <div class="control-input">
        <input class="form-control" placeholder="Creator">
      </div>
    </div>

  <div class="modal-footer">
    <input type="button" class="btn btn-link btn-lg" value="Cancel">
    <input type="button" class="btn btn-primary btn-lg" value="Create List" data-loading-text="Submitting...">
  </div>
</form>
```

The primary submit button on a form should use the `btn-primary` class; other buttons should tend to use `btn-link` for de-emphasis.

Use the default validation states provided by [Bootstrap](http://getbootstrap.com/css/#forms-control-validation).

---

### Lists

We use a consistent layout for general index pages, and divide the rows for individual resources into three sections:

1. **Labels** short status or alert messages that are likely to vary from item to item
2. **Primary content** a multi-row section for the name / description of an item, with any necessary metadata at the bottom
3. **Actions** where buttons go to edit / delete / view more about an item

``` example-html-bs
<div class="list list-bordered">
  <div class="list-item">
    <div class='content-labels'>
      <span class="btn btn-sm btn-block btn-muted disabled">Label</span>
    </div>
    <div class='content-primary'>
      <h4>Title</h4>
      <p>Description</p>
      <p class="content-metadata">
        Updated <span>TKTK</span>
        by <span>TKTK</span>
      </p>
    </div>
    <div class='content-actions text-right'>
      <button class="btn btn-sm btn-primary">Button</button>
    </div>
  </div>
  <div class="list-item">
    <div class='content-labels'>
      <span class="btn btn-sm btn-block btn-muted disabled">Label</span>
    </div>
    <div class='content-primary'>
      <h4>Title</h4>
      <p>Description</p>
      <p class="content-metadata">
        Updated <span>TKTK</span>
        by <span>TKTK</span>
      </p>
    </div>
    <div class='content-actions text-right'>
      <button class="btn btn-sm btn-primary">Button</button>
    </div>
  </div>
</div>
```

List elements should have at most one **primary** button. Elements that link to a detail view should have that link be the primary link, right-most inside the element, in addition to the primary heading tag of the item being a link to it as well. Avoid turning the entire item into a link.

#### Sort / Search triggers

Adcom includes some built-in classes for styling sort triggers and search fields.

Filtering should happen client-side wherever possible.

``` example-html-bs
<div class="navbar navbar-default">
  <div class="container">
    <ul class='nav navbar-nav navbar-sort navbar-left'>
      <li><span>Sort by:</span></li>
      <li>
        <a class='sort-control sort-descending' data-sort='updated_at' data-target='#myList' href='#'>Date Updated</a>
      </li>
      <li>
        <a class='sort-control' data-sort='headline' data-target='#myList' href='#'>Headline</a>
      </li>
      <li>
        <a class='sort-control' data-sort='author' data-target='#myList' href='#'>Creator</a>
      </li>
    </ul>
  </div>
</div>

<div class="navbar navbar-default">
  <div class="container">
    <ul class="nav navbar-nav navbar-left">
      <li class="navbar-form">
        <form class="form-inline">
          <div class="form-group form-group-sm glyphicon-input">
            <input class="form-control input-sm" placeholder="Placeholder">
            <i class="glyphicon glyphicon-search"></i>
          </div>
        </form>
      </li>
    </ul>
  </div>
</div>
```

#### Pagination

Adcom doesn't define custom styles for pagination, and in practice we avoid using it in admins. Instead, infinite scroll and additional filters as needed are preferable.

#### Loading animation

A default `loading` state is included with Adcom that can be applied to lists with the `loading` class. This is useful for lists whose items are ajaxed in, or for inline lists that may take a split second to initialize. The `loading` class is removed when the list is finally rendered. The value of the list's `data-loading-text` will be used as a loading message.

``` example-list-bs
<div class="list loading" data-loading-text="Loading items"></div>
```

---

### Messages

Based on [Snackbars](http://www.google.com/design/spec/components/snackbars-toasts.html) from Google's [Material Design spec](http://www.google.com/design/spec/material-design/introduction.html), messages are meant to provide brief, optionally actionable, feedback to readers. Google's usage guidelines are the foundation of our usage rules. They can be made interactive using [Message.js]({{ site.baseurl }}message-js.html).

For destructive actions, messages should include an **undo** command. Messages should **not stack**, and Message.js allows only one to be present at a time; new messages forcibly replace older messages.

``` example-html-bs
<div class="message fade in">
  Message sent
  <a href="#">Undo</a>
</div>
```

Dialogs are constructed identically to messages, but with an extra `message-dialog` class. They differ from Messages in that they are meant to stop the reader's action, and require some sort of interaction. They are more loosely based on Google's [Dialogs](http://www.google.com/design/spec/components/dialogs.html). **Cancel** should always be an explicit option.

``` example-html-bs
<div class="message message-dialog fade in">
  <h4>You must be logged in to continue</h4>
  <p>Exporting this article requires that you be logged into the CMS.</p>
  <a href="#" data-dismiss="message">Cancel</a>
  <a href="#">Login</a>
</div>
```

For dialogs that demand an external action by the user (such as logging in), a **retry** option should be provided if possible to avoid repetition of the workflow.

Both Messages and Dialogs can be modified with the `message-sm` and `message-lg` classes to change their widths. Include the `fade` class to animate the show / hide transition.

### Buttons

Buttons work the same way as they do in Bootstrap, but Adcom has modified some of the colors and added an additional class, `btn-muted`.

``` example-html-bs
<p>
  <button type="button" class="btn btn-default">Default</button>
  <button type="button" class="btn btn-muted">Muted</button>
  <button type="button" class="btn btn-primary">Primary</button>
  <button type="button" class="btn btn-success">Success</button>
  <button type="button" class="btn btn-info">Info</button>
  <button type="button" class="btn btn-warning">Warning</button>
  <button type="button" class="btn btn-danger">Danger</button>
  <button type="button" class="btn btn-link">Link</button>
</p>
<p><button type="button" class="btn btn-default btn-lg">Large button</button></p>
<p><button type="button" class="btn btn-default">Default button</button></p>
<p><button type="button" class="btn btn-default btn-sm">Small button</button></p>
<p><button type="button" class="btn btn-default btn-xs">Extra small button</button></p>
```
