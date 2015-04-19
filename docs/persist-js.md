---
layout: default
title: Persist.js
---

## What is Persist.js?

> Persist.js saves changes to page elements to persist them across page loads.

---

* [Usage]({{ site.baseurl }}#javascript-usage)
* [Examples](#examples)
* [Options](#options)
* [API](#api)
* [Events](#events)

---

Persist.js is a wrapper around the [MutationObserver API](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver), which triggers updates when an element's attributes, text data or subtree changes.

With it, when certain changes happen on the page, those changes can be persisted and reapplied the next time a user visits.

The changes you can save are:

* An element's attribute value (such as it's `class`)
* The value of any text nodes within an element

---

## Examples

Out of the box, Persist.js doesn't actually save your page state anywhere. Instead, it fires two events that you should listen for, and save the data into your own backend of choice. These examples use Session.js, and you can see that particular integration [here](#integrate-with-session.js").

### Attributes

Persist.js was created to persist the state of page elements across page loads for users (e.g., whether or not a navigation bar is expanded). Since state is often controlled by the presence of one or more CSS classes, we decided to persist that directly.

This example tells the plugin to save any changes to the `class` attribute on the button. When it runs, Persist.js will also check whether a saved setting for that attribute exists in storage; if it does, it sets the attribute, "restoring" it to its last known state.

Try **clicking the button** to toggle the `active` class and **refreshing the page** to see it persist.

``` example-html-bs
<button id="1" type="button" data-toggle="button"
  class="btn btn-primary">Button</button>

<script type="text/javascript">
  $('#1').persist('attribute', 'class');
</script>
```

Because the value of the attribute is replaced, you may notice that adding classes to the button's source markup after state has been persisted once will do nothing. The original persisted classes will replace the ones baked into the marked on initialization. That means you can't do something like change the button's color.

So attribute persistence takes an optional third argument, a **filter**, that lets you specify one or more classes to restrict persistence to. Setting the filter to `active` means that `btn` and `btn-primary` will not be saved, and classes other than `active` will not be removed on page load.

You can add / remove button colors at any point in this example:

``` example-html-bs
<button id="2" type="button" data-toggle="button"
  class="btn btn-primary">Button</button>

<script type="text/javascript">
  $('#2').persist('attribute', 'class', 'active');
</script>
```

### Character Data

**This feature isn't officially supported, but is included to explore how the other types of data in MutationObserver could be persisted. The third type, `ChildList` currently isn't supported at all.**

Certain nodes in HTML are "Text Nodes" which contain... text. A `p` tag, for example, could contain multiple text nodes separated with `<br>`s. Each has a `data` attribute containing the text, which MutationObserver described as `characterData`.

While text nodes are not directly addressable via jQuery, you can turn persistence for characterData on for all text nodes within an element.

``` example-html-bs
<p id="3" contentEditable>
  You can edit this text, and it will persist across page loads.
</p>

<script type="text/javascript">
  $('#3').persist('characterData');
</script>
```

This method should be considered very fragile at the moment.

### Wire up to a backend

There are two events to listen for in order to communicate with your backend of choice.

`mutation.ac.persist` fires when MutationObserver has detected a relevant change. The `key` attributes defines a hash that uniquely identifies the target of the change:

* **element** - the `id` of the watched element, or the value of it's `data-key` attribute
* **type** - `attributes` or `characterData`
* **path** - the attribute that has changed, such as `class`

You should serialize this into a unique key, and store the event's `value` there.

`added.ac.persist` fires when Persist.js starts to listen for changes, and is the cue to restore any existing state data.

This event also provides a `key` hash, which you can again use to construct a key for your data store. If an existing value is present, then you should call `.persist("update")` on the element to set the change, also passing it `e.key` and the value retrieved from the storage backend.

View a complete example below, used for integrating with Session.js

### Integration with Session.js

This example integration uses Session.js to save changes tracked by Persist.js.

``` js
var mutationSession = new Session({key: 'adcomDocs'});

// Fired when a change occurs
$(document).on('mutation.ac.persist', function (e) {
  var storageKey = [e.key.element, e.key.type, e.key.path].join('.');

  // e.mutation is a MutationRecord
  mutationSession.set(storageKey, e.value);
});

// Fired on Persist.js initialization
$(document).on('added.ac.persist', function (e) {
  var storageKey = [e.key.element, e.key.type, e.key.path].join('.');
  var value = mutationSession.get(storageKey);

  if (value) $(e.target).persist('update', e.key, value);
});
```

The above example is set up to handle attribute changes; tracking characterData changes requires this code for the `added.ac.persist` event:

``` js
$(document).on('added.ac.persist', function (e) {
  var prefix = [e.key.element, e.key.type, e.key.path].join('.')
  var matches = $.grep(Object.keys(mutationSession.data), function (k) { return k.indexOf(prefix) == 0 })

  // For attribute changes, matches will just be the key for the attribute.
  // For characterData, multiple keys might match.
  matches.forEach(function(match) {
    var key = $.extend({}, e.key)
    // add on the path to individual text nodes for characterData
    key.path = key.path || match.split('.').slice(2).join('.')

    var value = mutationSession.get(match)
    if (value) $(e.target).persist('update', key, value)
  })
});
```

---

## Options

[A note]({{ site.baseurl }}#plugin-initialization) on using data attributes versus initializer functions.

Data attribute options can be set either on the message element, or on the trigger element. Options on the trigger element will take precedence, just as options passed to the JavaScript initializer will take precedence over data attribute settings on the message element.

| attribute        | type           | default | description |
| ---------------- | -------------- | ------- | ----------- |
| key | string | value of element's `id` | Base key used to track any changes on this element. |

---

<h2 id="api">API <small>Public methods</small></h2>

| method           | description |
| ---------------- | ----------- |
| .persist('attributes', String/Array[, String/Array]) | Pass an array or space-delimited list of attributes to detect changes on. Optional third argument is an array or space-delimited filter list. If present, then only those values will be included in the mutation event's `value` attribute. |
| .persist('characterData') | Detect changes on all text nodes underneath the specified parent element. |

--

## Events

All events with a pre and post version (such as `show` and `shown`) can be cancelled by calling `.preventDefault()` on the pre event.

Each event has a `key` attribute available that defines `element`, `type` and `path`, which together identify the change target.

| event | trigger | event properties |
| ----- | ------- | ---------------- |
| add.ac.persist | Immediately when `.persist()` is called on an element. | `key` |
| added.ac.persist | After an element has been configured to watch for changes, and after existing persisted changes have been set on it. | `key` |
| mutation.ac.persist | After a mutation has occurred. | `key` <br> `mutation` MutationRecord <br> `value` value of the changed attribute or new characterData |
