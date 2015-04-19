---
layout: default
title: Message.js
---

## What is Message.js?

> Message.js displays simple informational or actionable messages to readers.

You can display messages dynamically over the JavaScript API, or in reponse to clicking on trigger elements.

---

* [Usage]({{ site.baseurl }}#javascript-usage)
* [Examples](#examples)
  * [Static](#static)
  * [Dynamic](#dynamic)
* [Options](#options)
* [API](#api)
* [Events](#events)

---

## Examples

These examples show a subset of the ways you can configure messages; they use example snippets of HTML and JavaScript that **you can edit**, and the rendered result is displayed below.

You can configure all of the Adcom plugins either through JavaScript as in the following examples, or through data-attributes. Read more about your options [here]({{ site.baseurl }}#plugin-initialization).

Based on [Snackbars](http://www.google.com/design/spec/components/snackbars-toasts.html) from Google's [Material Design spec](http://www.google.com/design/spec/material-design/introduction.html), messages are meant to provide brief, optionally actionable, feedback to readers. [A set of styles]({{ site.baseurl }}styles.html#messages) is included with adcom that can display messages in two flavors: unobtrusive messages, and actionable dialogs.

### Static

You can write messages directly onto the page along with the `fade` class to hide them by default. This way, you can style the messages however you like and display them or update their content when necessary.

``` example-html-bs
<div id="1" class="message fade">
  This is a message
  <a href="#">Undo</a>
</div>

<button type="button" data-toggle="message" data-target="#1">
  Open message
</button>

<button type="button" data-toggle="message" data-target="#1" data-expire="2000">
  Open disappearing message
</button>
```

Any elements inside your message with `data-dismiss="message"` will close the message on click.

``` example-html-bs
<div id="2" class="message message-dialog fade">
  <h4>You must be logged in to continue</h4>
  <p>Exporting this article requires that you be logged into the CMS.</p>
  <a href="#" data-dismiss="message">Cancel</a>
</div>

<button type="button" data-toggle="message" data-target="#2">
  Open dialog
</button>
```

### Dynamic

Any element can become a message if it already exists on the page. But you can also create messages dynamically using the JavaScript initializer.

Call `.message()` on `document` to create a new message element, and pass a `content` value for the text that should be displayed inside the message.

``` example-html-bs
<input id="3" type="text" value="A message">
<button id="4">Show message</button>

<script type="text/javascript">
  $('#4').on('click', function() {
    var message = $('#3').val();
    $(document).message({content: message});
  });
</script>
```

The `html` attribute can also be set to `true` to parse the content as HTML.

---

## Options

[A note]({{ site.baseurl }}#plugin-initialization) on using data attributes versus initializer functions.

Data attribute options can be set either on the message element, or on the trigger element. Options on the trigger element will take precedence, just as options passed to the JavaScript initializer will take precedence over data attribute settings on the message element.

| attribute        | type           | default | description |
| ---------------- | -------------- | ------- | ----------- |
| expire | integer | | Number of milliseconds to wait before hiding the message. |
| content | string | | Replace the contents of the message element with the given string. |
| html | boolean | false | If true, will treat `content` as HTML when it is inserted into the message element. |

---

<h2 id="api">API <small>Public methods</small></h2>

| method           | description |
| ---------------- | ----------- |
| `.message({ options })` | Any of the [message options](#options) can be set or updated with this function. |
| `.message('show')` | Display the message with the current options set on the message element. |
| `.message('hide')` | Hide the message. |

---

## Events

All events with a pre and post version (such as `show` and `shown`) can be cancelled by calling `.preventDefault()` on the pre event.

| event | trigger | event properties |
| ----- | ------- | ---------------- |
| show.ac.message | Before a message is displayed to the reader. | `relatedTarget` trigger element if available |
| shown.ac.message | After the messages has been displayed. | `relatedTarget` trigger element if available |
| click.dismiss.ac.message | Fired when an element with `data-dismiss="message"` is clicked inside the message. | |
| hide.ac.message | When a message is about to be hidden, explicitly or after it's `expire` time has elapsed. | |
| hidden.ac.message | After a message has been removed, and after any fade animation has completed. | |
