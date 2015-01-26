$(function () {
  'use strict';

  module('form plugin')

  test('should be defined on jquery object', function () {
    ok($(document.body).form, 'form method is defined')
  })

  module('form', {
    setup: function () {
      // Run all tests in noConflict mode -- it's the only way to ensure that the plugin works in noConflict mode
      $.fn.adcomForm = $.fn.form.noConflict()
    },
    teardown: function () {
      $.fn.form = $.fn.adcomForm
      delete $.fn.adcomForm
    }
  })

  test('should provide no conflict', function () {
    strictEqual($.fn.form, undefined, 'form was set back to undefined (orig value)')
  })

  test('should return jquery collection containing the element', function () {
    var $el = $('<div id="modal-test"/>')
    var $form = $el.adcomForm()
    ok($form instanceof $, 'returns jquery collection')
    strictEqual($form[0], $el[0], 'collection contains element')
  })

  test('should expose defaults var for settings', function () {
    ok($.fn.adcomForm.Constructor.DEFAULTS, 'default object exposed')
  })

  // END OF BOILERPLATE

  test('', function () {
    ok(true)
  })

  test('', function () {
    ok(true)
  })

  test('', function () {
    ok(true)
  })

  test('', function () {
    ok(true)
  })

  test('', function () {
    ok(true)
  })

  test('', function () {
    ok(true)
  })

  test('', function () {
    ok(true)
  })

})
