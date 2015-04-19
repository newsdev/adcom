---
layout: default
title: List.js
---

## What is List.js?

> List.js takes a **list of items** and renders them using a **template**.

You can provide the items in several ways:

* Inline as a JSON-serialized `data-attribute`
* Provided as an array to a JavaScript initializer
* Loaded from a remote url

As well as the template:

* Written as the inner HTML of the container element
* Inline as a `data-attribute`
* As a text or compiled template to a JavaScript initializer

Any way you configure it, the list is rendered using the same jQuery plugin, and has access to the same set of rendering helpers: pagination, sorting and filtering. This lets your list evolve from a simple hard-coded test set to your final database-driven, searchable, sortable table, without swapping in different plugins as your requirements expand.

---

* [Usage]({{ site.baseurl }}#javascript-usage)
* [Examples](#examples)
  * [Templates](#example-templates)
  * [Filtering / Searching](#example-filtering)
  * [Sorting](#example-sorting)
  * [Pagination](#example-pagination)
* [Options](#options)
* [API](#api)
* [Events](#events)

---

## Examples

These examples show a subset of the ways you can configure lists; they use example snippets of HTML and JavaScript that **you can edit**, and the rendered result is displayed below.

You can configure all of the Adcom plugins either through JavaScript as in the following examples, or through data-attributes. Read more about your options [here]({{ site.baseurl }}#plugin-initialization).

<h3 id="example-templates">Templates <small>Render a simple table of data</small></h3>

To render a dynamic table, simply write the HTML necessary to render a single row. Add a unique identifier to the element that will contain all of the items (in this case, the `tbody`). List.js includes a minimal template syntax that lets you insert the value of any element by specifying a JSON path as `data-field`.

Then, initialize your list by calling `.list()` on the `tbody` with any options you need. Here, we specify the template by passing in the HTML contents of the `tbody` explicitly; but this happens by default if you don't specify a template, it is shown here to be explicit. You can also pass in a compiled JavaScript template. Functions will be evaluated by passing the item to the template.

``` example-list
<table>
  <tbody id="1">
    <tr>
      <td data-field="id"></td>
      <td data-field="name"></td>
    </tr>
  </tbody>
</table>

<script type="text/javascript">
  var items = [
    {"id": 1, "name": "one"},
    {"id": 2, "name": "two"},
    // {"id": 3, "name": "three"}
  ];
  $('#1').list({
    items: items,
    template: $('#1')[0].innerHTML
  });
</script>
```

Try adding additional items or more columns to see how it changes the output.

While not possible for all element types, where possible we encourage including the template inline inside the list element (as shown above) as a convention to reduce ambiguity in how a page is constructed.

---

<h3 id="example-filtering">Filtering and Searching <small></small></h3>

You can tie various input "triggers", such as `<input>` tags, to a list by adding `data-target="#id"` to each of them.

The value of each trigger element (either the natural `value` of something like a text input, or a custom value or regular expression specified with `data-pattern`) will be matched against every item in the list. If any of the attributes referenced in the trigger's `data-fields` (specified using a top-level attribute name, or a JSON path) match the value, it will be included.

Items must match every active filter to be included.

``` example-list
<input type="text" data-target="#2" data-filter="name" data-trigger="keyup" placeholder="Search name">
<input type="checkbox" data-target="#2" data-filter="checkbox" data-pattern="true" value="true">
<label for="checkbox">On?</label>
<input type="radio" data-target="#2" data-filter="radio" data-pattern="1" name="radio">
<label>1</label>
<input type="radio" data-target="#2" data-filter="radio" data-pattern="2" name="radio">
<label>2</label>

<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Checkbox</th>
      <th>Radio</th>
    </tr>
  </thead>
  <tbody id="2">
    <tr>
      <td data-field="name"></td>
      <td data-field="checkbox"></td>
      <td data-field="radio"></td>
    </tr>
  </tbody>
</table>

<script type="text/javascript">
  var items = [
    {"name": "Number one!", "checkbox": true, radio: "1"},
    {"name": "Number two :(", "checkbox": false, radio: "2"}
  ];
  $('#2').list({ items: items });
</script>
```

---

<h3 id="example-sorting">Sorting <small></small></h3>

Any field can be sorted by adding a "sort trigger" to an element, which is triggered on click. Just add `data-target` and `data-sort` (where you specify a single field or JSON path) to an element.

On click, the sort cycles through ascending and descending, and is kept track of with the `sort-ascending` and `sort-descending` classes on the trigger. Add one of these at the start to default the sort. (`number` in the example below starts out with `sort-ascending`.)

``` example-list-bs
<table class="table">
  <thead>
    <tr>
      <th class="sort-control sort-ascending" data-target="#3" data-sort="number">Number</th>
      <th class="sort-control" data-target="#3" data-sort="text">Text</th>
    </tr>
  </thead>
  <tbody id="3">
    <tr>
      <td data-field="number"></td>
      <td data-field="text"></td>
    </tr>
  </tbody>
</table>

<script type="text/javascript">
  var items = [
    {"number": 1, "text": "Beta"},
    {"number": 2, "text": "Alpha"}
  ];
  $('#3').list({ items: items });
</script>
```

You can customize the order / availability of the sort states by adding `data-states` to the trigger element, with any of the following comma-separated in the desired cycle order: `ascending`, `descending` or `off` (default is just the first two).

---

<h3 id="example-pagination">Pagination <small></small></h3>

Two configuration options can be set or updated on a list: `pageSize` and `currentPage`. The text inputs below are set to update the list's settings on change; try updating their values.

``` example-list
<input id="4-size" value="5" type="number" min="1">
<input id="4-page" value="1" type="number" min="1">
<div id="4">
  <button disabled data-field="#"></button>
</div>

<script type="text/javascript">
  var items = [ {"#": 1}, {"#": 2}, {"#": 3}, {"#": 4}, {"#": 5}, {"#": 6}, {"#": 7}, {"#": 8}, {"#": 9}, {"#": 10} ];
  $('#4').list({
    items: items,
    pageSize: $('#4-size').val(),
    currentPage: $('#4-page').val(),
  });

  $('#4-size').on('change', function() {
    $('#4').list({pageSize: $(this).val()});
  });
  $('#4-page').on('change', function() {
    $('#4').list({currentPage: $(this).val()});
  });
</script>
```

Similar to the filter and sort triggers above, clicked on an element with `data-target` and `data-page` attributes will change the current page.

Remember, you can specify any of the list-level configuration options as data-attributes on the list element itself. For example, `pageSize` can also be configured by adding a `data-page-size` attribute to the list element.

---

## Options

[A note]({{ site.baseurl }}#plugin-initialization) on using data attributes versus initializer functions.

<h3 id="options-initialization">Initialization <small>List elements</small></h3>

| attribute        | type           | default | description |
| ---------------- | -------------- | ------- | ----------- |
| items | array, serialized array | | The entire set of items to include in the list. |
| template | string, function | List element's `.innerHTML` | Either a compiled template function (which will receieve each item in the list to be rendered), or a string that will be compiled into a template. If a `template-engine` is also passed, that engine will be used to generate the function from the passed-in string. |
| template-engine | function | | Specify a custom templating function, such as `_.template`. Used when a string is passed for the template. |
| page-size | integer | 20 | How many items to display at a time. |
| current-page | integer | 1 | What page to start with. Can also be updated to switch pages. |
| show | boolean | true | Whether to render the list immediately after initialization. |
| remote | string | | A path to an endpoing containing a JSON representation of the items to load into the list. |

### Filter triggers

| attribute        | type           | default | description |
| ---------------- | -------------- | ------- | ----------- |
| target | jQuery selector | | Selector for the list element. |
| filter | CSV | | Comma-separated string of fields to include when searching for `pattern`. |
| pattern | string, regex | | A case-insensitive string or regex that will be compared against the fields from `filter`. |
| trigger | string | click, change | The page event that will trigger the filter updating. Defaults to `click` for static elements, `change` for inputs. |

### Sort triggers

| attribute        | type           | default | description |
| ---------------- | -------------- | ------- | ----------- |
| target | jQuery selector | | Selector for the list element. |
| sort | string | | The field to sort by. |
| states | string | ascending, descending | Comma-separated list of which states to cycle through when toggling the sort. Can specify any combination of `ascending`, `descending`, and / or `off`. The initial state defaults to `off`, but can be set to another one by adding the `sort-ascending` or `sort-descending` class to the trigger. |

### Page triggers

| attribute        | type           | default | description |
| ---------------- | -------------- | ------- | ----------- |
| target | jQuery selector | | Selector for the list element. |
| page | integer | | The list's `currentPage` will be updated to this number when the trigger is clicked. |

---

<h2 id="api">API <small>Public methods</small></h2>

| method           | description |
| ---------------- | ----------- |
| .list({ options }) | Any of the [list options](#options-initialization) can be set or updated with this function. Multi word options should be camelcased (`page-size` = `pageSize`). You can also set the sorting behavior by passing a sort function as `sort`. This will override any default sort that is produced by the sort triggers. Similarly, you can override or add filters by passing a slug and filter function as `filter`, or several of them by passing them as a key/value hash. Filters are addititve; pass `null` as the value for a given slug to delete a filter. |
| .list('show') | Re-render the list with the latest settings. If `data-show` is set to false, then this needs to be called manually. |
| .list('destroy') | Destroy the internal list. |
| .list('add', Object[, index]) | Add an item to the list. You can optionally pass the index at which the item should be rendered, if you are not sorting the list. |
| .list('update', index &#124;&#124; element &#124;&#124; Object, Object) | Update an item in the list. The second argument can be any of the following: 1) the index in the original `items` list of the element, 2) the DOM element currently rendered within the list representing the item, or 3) a reference to the original item object that was passed into `items`. The item is replaced with the new item. |
| .list('delete', index &#124;&#124; element &#124;&#124; Object) | Remove a given item from the list. Same rules for arguments options as above. |

---

## Events

All events with a pre and post version (such as `show` and `shown`) can be cancelled by calling `.preventDefault()` on the pre event.

| event | trigger | event properties |
| ----- | ------- | ---------------- |
| show.ac.list | Before each time the list is rendered. | |
| shown.ac.list | After each time the list is rendered. | |
| loaded.ac.list | When the remote list of items has successfully been fetched. Only if the `remote` option is used | |
| sortChange.ac.list | When the sort function is about to be set or updated | `fields` the fields to sort on |
| sortChanged.ac.list | After the sort function has changed, before the list is rendered | `fields` the fields to sort on <br> `function` resulting sort function |
| filterChange.ac.list | When any filter is about to be set, updated or deleted | `key` slug for the filter <br> `filter` arguments passed to the filter |
| filterChanged.ac.list | After any filter has changed, before the list is rendered | `key` slug for the filter <br> `filter` arguments passed to the filter <br> `function` resulting filter function |
| pageChange.ac.list | When the page is about to be changed | `page` |
| pageChanged.ac.list | After the page has been changed, before the list is rendered | `page` |
| paginated.ac.list | After the list of items has been paginated internall, before the list is rendered. Use to render dynamic pagination triggers. | `page` <br> `pages` number of pages <br> `count` item count <br> `items` items in the current page <br> `start` index <br> `end` index |
