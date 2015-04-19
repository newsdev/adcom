---
layout: default
title: Session.js
---

## What is Session.js?

> Session.js is a thin wrapper around localStorage and sessionStorage for saving user settings.

---

* [Usage]({{ site.baseurl }}#javascript-usage)
* [Options](#options)
* [API](#api)
* [Events](#events)

---

## Usage

Initialize a session with one required option, `key` (which maps to the top-level key in localStorage or sessionStorage where the data will be saved). By default, `sessionStorage` will be used; if you pass `persistent: true` as part of the options hash, `localStorage` will be used.

``` js
var session = new Session({ key: 'userSettings' });

var session = new Session({
  key: 'userSettings',
  persistent: true,
  namespace: 'indexPage'
});
```

You can also specify a `namespace` at initialization, which will prefix all of your underlying item keys.

Once initialized, use `session` like a key/value store, with simple `get` and `set` methods. Data passed to `set` will be serialized as JSON before storage, and deserialized when returned through `get`.

``` js
session.set('key', { "user": "data" });

session.get('key');
>>> { "user": "data" }
```

Destroy your session data with `session.removeSession()`.

---

## Options

| attribute        | type           | default | description |
| ---------------- | -------------- | ------- | ----------- |
| key | string | | **Required**. Session data will be stored at this key within either `localStorage` or `sessionStorage`. |
| persistent | boolean | false | `false` sets the storage backend to `sessionStorage`. `true` sets it to `localStorage`. |
| namespace | string | | If specified, keys passed to `.get` and `.set` will be prefixed with this string (+ a `.`) internally. |

---

<h2 id="api">API <small>Public methods</small></h2>

| method           | description |
| ---------------- | ----------- |
| `.set(key, value)` | Set and save a value in the storage backend. Value can be anything that will be serialized by `JSON.stringify`. |
| `.get(key)` | Retrieve a value from the storage backend. Value will be deserialized using `JSON.parse.` |
| `.removeSession()` | Call `.removeItem` on the storage backend with the session's `key`. |
