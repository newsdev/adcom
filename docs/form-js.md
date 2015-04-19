---
layout: default
title: Form.js
---

## What is Form.js?

> Form.js extends form elements, adding additional hooks for serialization and deserialization, and standardizes validation behavior across browsers.

Without affecting the native behavior of the form element, Form.js gives you several features out of the box:

* Populating a form from page elements (like items in a [list]({{ site.baseurl }}list-js.html)) using the data-api
* Binding data objects to any updates submitted by a form
* Browser-native validation gets run even when default submit behavior is prevented
* Provides access to form data as an object

Form.js helps us edit records directly in the browser, independent of whatever data backend we're using.

It also helps smooth out inconsistencies with validation in differenet browsers: we encourage using native browser validation by default (patching it to work on ajax requests), but provide hooks for displaying errors manually in browsers like Safari that don't handle errors for you.

---

* [Usage]({{ site.baseurl }}#javascript-usage)
* [Examples](#examples)
  * [Populate](#populate)
  * [Serialize](#serialize)
  * [Validate](#validate)
* [API](#api)
* [Events](#events)

---

## Examples

These examples show a subset of the ways you can configure forms; they use example snippets of HTML and JavaScript that **you can edit**, and the rendered result is displayed below.

You can configure all of the Adcom plugins either through JavaScript as in the following examples, or through data-attributes. Read more about your options [here]({{ site.baseurl }}#plugin-initialization).

### Populate

To populate a form with data, simply call the `show` method with the data object: `.form('show', {...})`.

``` example-html
<form id="1">
  <input name="title">
</form>

<script type="text/javascript">
  $('#1').form('show', {title: "Moby Dick"});
</script>
```

Alternativly, you can use a trigger element that contains three data attributes: `data-serialized` with the data, `data-target` with the form's selector, and `data-toggle="form"`.

``` example-html
<form id="2">
  <input name="title">
</form>

<button type="button" data-toggle="form" data-target="#2" data-serialized='{"title": "Moby Dick"}'>
  Populate with "Moby Dick"
</button>
<button type="button" data-toggle="form" data-target="#2" data-serialized='{"title": "A Tale of Two Cities"}'>
  Populate with "A Tale of Two Cities"
</button>

<script type="text/javascript">
  $('#2').form();
</script>
```

You can customize where Form.js looks for the data on a trigger element by setting `data-source` to something other than `serialized`. List.js stores the data for each item as `ac.list.item`, meaning you can set `data-source="ac.list.item"` on a list element to populate a form with it's contents:

``` example-html
<list id="3">
  <button data-field="title"
    data-toggle="form" data-target="#4" data-source="ac.list.item">
  </button>
</list>

<form id="4">
  <input name="title">
</form>

<script type="text/javascript">
  $('#3').list({items: [{"title": "Moby Dick"}, {"title": "A Tale of Two Cities"}]});
  $('#4').form();
</script>
```

---

### Serialize

If you are handling the form submit yourself, you can hook into the form's `submit` event. Form.js does not automatically prevent native submission, so you must either call `e.preventDefault()` on the submit event, or set `data-action="false"` on the form.

Form.js uses [$.deparam from Ben Alman](http://benalman.com/code/projects/jquery-bbq/examples/deparam/) to provide the form data as an object.

``` example-html
<form id="5" data-action="false">
  <input name="title" value="Moby Dick">
  <input type="submit">
</form>
<p>submit event's "e.object":</p>
<pre><code id="5-output"></code></pre>

<script type="text/javascript">
  $('#5')
    .form()
    .on('submit', function(e) {
      $('#5-output').html(JSON.stringify(e.object, null, 2));
    })
    .submit();
</script>
```

---

### Validate

The less work you have to do around form validation, the better. So Form.js makes as much use of the browser's native [validations API](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Forms/Data_form_validation) as possible. On browsers that support it, using native validation configuration like `required` and `data-pattern` attributes is often all you need to prevent invalid form submission. (Validation messages can be [customized](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Forms/Data_form_validation#Customized_error_messages) if necessary.)

Form validation presents is handled differently based on whether:

* The current browser
* You are using native or AJAX submission
* You need to show form-wide errors
* You've disabled validation with `novalidate`

Form.js saves you from having to change your validation logic if any of the above variables change, and respects existing patterns:

* Validation runs before the `submit` event is fired
* Validation is enabled by default, and can be disabled by adding `novalidate` to the form element

And extends them using similar pattners:

* The browser's validation UI can be disabled / overridden by calling `.preventDefault()` on the `invalid.ac.form` event
* Display form-wide errors using `invalid.ac.form` before the blocking native UI is displayed
* Extends the native `submit` event to include metadata about the submission (form serialized as object, and where the data came from)

``` example-html-bs
<form id="6" data-action="false">
  <div class="form-group">
    <input name="title" required placeholder="Required field" class="form-control">
  </div>

  <div class="form-group">
    <input type="submit" class="btn btn-default">
  </div>
</form>

<style>
  form:before {
    content: attr(data-error);
    color: #a94442;
    display: block;
  }
  form [data-error]:after {
    content: attr(data-error);
    color: #a94442;
  }
</style>

<script type="text/javascript">
  $('#6').form()
    .on('validate.ac.form', function() {
      $(this).find('[data-error]').andSelf().removeAttr('data-error');
      $(this).find('.has-error').removeClass('has-error');
    })
    .on('invalid.ac.form', function(e) {
      $(this).attr('data-error', 'There was a problem with your submission.');
    })
    .find(':input').on('invalid', function(e) {
      $(this).closest('.form-group').addClass('has-error');
      if (e.nativeValidation) return;

      $(this).closest('.form-group').attr('data-error', e.target.validationMessage);
    })
</script>
```

The benefit is that, except where no native method exists (such as for form-wide messages), you are simply learning and using the HTML5 validation API, not an Adcom API, keeping your code more portable and your mind free of domain-specific languages.

The JavaScript included above can also work generically for all adcom forms on your site, and could be included just once. The only customization then necessary would be the validation messages themselves as needed.

---

## Options

[A note]({{ site.baseurl }}#plugin-initialization) on using data attributes versus initializer functions.

| attribute        | type           | default | description |
| ---------------- | -------------- | ------- | ----------- |
| serialized | object, serialized object | | Data to populate the form with on instantiation. |
| show | boolean | true | Whether to populate the form immediately after initialization. Requires the `serialized` option. |

---

<h2 id="api">API <small>Public methods</small></h2>

| method           | description |
| ---------------- | ----------- |
| `.form('show', Object)` | Populates the form with data from the passed-in object. |
| `.form('validate')` | Trigger validation of the form without submitting. Will use the browser's native validation UI if available. |

---

## Events

All events with a pre and post version (such as `show` and `shown`) can be cancelled by calling `.preventDefault()` on the pre event.

| event | trigger | event properties |
| ----- | ------- | ---------------- |
| show.ac.form | Before a data object is deserialized into the form. | `serialized` data for form |
| shown.ac.form | After a form is populated with data. | `serialized` data for form |
| validate.ac.form | Before validation is run on the form. | `object` form data as an object <br> `array` form data as an array of values |
| invalid.ac.form | During validation if any errors were detected. Use to display form-wide error messages. | |
| validated.ac.form | After validation has finished. Native and custom messages will have already been displayed. | `isValid` whether the form passed validation |
| submit.ac.form | Before form submission (this is the existing `submit` event, extended). Use to prevent native submission and / or submit data manually. | `object` form data as an object <br> `array` form data as an array of values <br> `sourceData` data source that populated the form <br> `sourceElement` element where sourceData is kept |

The `invalid` event on individual form inputs has also been extended with an additional attribute, `nativeValidation`, which is `true` if the browser supports native validation feedback.
