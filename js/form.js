+function (factory) {
  if (typeof define === 'function' && define.amd) {
    define('adcom/form', ['jquery', 'adcom/object'], factory)
  } else {
    factory(window.jQuery)
  }
}(function ($) {
  'use strict';

  // FORM CLASS DEFINITION
  // =====================

  var Form = function (element, options) {
    var $this = this
    this.options  = options
    this.$element = $(element)

    // Note the "real" novalidate state of the form
    if (typeof this.$element.attr('data-original-novalidate') === typeof undefined || this.$element.attr('data-original-novalidate') === null) {
      this.$element.attr('data-original-novalidate', typeof this.$element.attr('novalidate') !== typeof undefined && this.$element.attr('novalidate') !== false)
    }
    this.$element.attr('novalidate', '')
    this.$validate = !this.$element.data('original-novalidate')
    this.$nativeValidation = supportsNativeValidation()
    this.muteInvalidInput = false

    // Create submit button for us if the form has none, or if this browser
    // supports native validation.
    this.$displayNativeValidation = $('<input style="display: none;" type="submit" onsubmit="return false;">')
    this.$element.append(this.$displayNativeValidation)
  }

  Form.VERSION = '0.1.0'

  Form.DEFAULTS = {
    show: true,
    action: true
  }

  Form.prototype.show = function (data, meta, _relatedTarget) {
    meta = meta || {}

    var e = $.Event('show.ac.form', { serialized: data, sourceData: this.sourceData, sourceElement: this.sourceElement, relatedTarget: _relatedTarget })
    this.$element.trigger(e)
    if (e.isDefaultPrevented()) return

    // Reset the form, then go through every addressable input and extract it's
    // value from the "data" hash.
    this.$element[0].reset()
    this.$element.find(':input[name]').each(function (idx, input) {
      var name  = input.name || $(input).attr('name')
      var value = $.fn.selectn(name, data)

      if (/^(?:radio|checkbox)$/i.test(input.type)) {
        if (value == input.value) input.checked = true
      } else {
        $(input).val(value)
      }
    })

    this.sourceElement = meta.sourceElement
    this.sourceData    = meta.sourceData
    $(this.$element[0]).one('reset', $.proxy(function () {
      this.sourceElement =
      this.sourceData    = null
    }, this))

    this.$element.trigger($.Event('shown.ac.form', { serialized: data, sourceData: this.sourceData, sourceElement: this.sourceElement, relatedTarget: _relatedTarget }))
  }

  Form.prototype.serialize = function () {
    return {
      array:  this.$element.serializeArray(),
      object: $.deparam(this.$element.serialize())
    }
  }

  // Encapsulates the default browser validate, any custom validation via the
  // validate.ac.form event, and triggers a display of any invalidation
  // messages if necessary.
  Form.prototype.validate = function (submitEvent) {
    var $this = this
    if (!this.$validate) return

    var e = $.Event('validate.ac.form', this.serialize())
    this.$element.trigger(e)
    if (e.isDefaultPrevented()) return

    // A bit of a hack: suppress "invalid" events from firing on input fields
    // to give the form-level "invalid" event the chance to cancel them
    this.muteInvalidInput = true
    var isValid = this.$element[0].checkValidity()
    this.muteInvalidInput= false

    if (!isValid) {
      this.invalid()
      if (submitEvent) {
        submitEvent.preventDefault()
        submitEvent.stopImmediatePropagation()
      }
    }

    setTimeout(function () {
      $this.$element.trigger($.Event('validated.ac.form', {isValid: isValid}))
    })
  }

  // If the form is invalid according to the DOM's native validity checker,
  // trigger the browser's default invalidation display.
  // If overridden (via event) we should find a way to pass the invalid
  // message hash to the event.
  Form.prototype.invalid = function () {
    var $this = this

    var e = $.Event('invalid.ac.form', {nativeValidation: this.$nativeValidation})
    this.$element.trigger(e)

    // Don't display native validation if we've prevented it
    if (e.isDefaultPrevented()) return

    // If the browser doesn't support it, run checkValidity to trigger
    // previously-suppressed invalid events on inputs
    if (!this.$nativeValidation) return this.$element[0].checkValidity()

    // If this browser supports native HTML form validation, temporarily turn
    // it back on and submit the form.
    setTimeout(function () {
      $this.$element.removeAttr('novalidate')
      $this.$displayNativeValidation.click()
      $this.$element.attr('novalidate', '')
    }, 0)
  }

  Form.prototype.addEventAttributes = function (submitEvent) {
    $.extend(submitEvent, this.serialize(), {
      relatedTarget: this.$element,
      sourceElement: this.sourceElement,
      sourceData:    this.sourceData
    })
  }

  Form.prototype.destroy = function (data) {
    this.$element.off('.ac.form').removeData('ac.form')
    this.$validate ? this.$element.removeAttr('novalidate') : this.$element.attr('novalidate', '')
  }


  // FORM PLUGIN DEFINITION
  // ======================

  function Plugin(option) {
    var args = Array.prototype.slice.call(arguments, Plugin.length)
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('ac.form')

      var options = $.extend({}, Form.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('ac.form', (data = new Form(this, options)))
      if (typeof option == 'string') data[option].apply(data, args)
      else if (options.show && options.serialized !== undefined) data.show(options.serialized === 'string' ? JSON.parse(options.serialized) : options.serialized, args[0] || {})
    })
  }

  var old = $.fn.form

  $.fn.form             = Plugin
  $.fn.form.Constructor = Form


  // FORM NO CONFLICT
  // ================

  $.fn.form.noConflict = function () {
    $.fn.form = old
    return this
  }

  // FORM SPECIAL EVENTS
  // ===================

  // Uses jQuery's special events API to wrap any handlers for the `submit`
  // event on Adcom forms.
  $.event.special.submit = {
    add: function (handleObj) {
      var form, oldHandler = handleObj.handler
      handleObj.handler = function (e) {
        // Run validation once per originalEvent, and add attributes for each
        // new jQuery event encountered.
        var originalEvent = e.originalEvent || e
        if (form = $(this).data('ac.form')) {
          if (!originalEvent._validated) form.validate(e)
          if (!e._addedAttributes) form.addEventAttributes(e)
          originalEvent._validated = e._addedAttributes = true
        }

        // Continue to run original event, as long as it hasn't been prevented
        // by the validation process.
        if (!e.isImmediatePropagationStopped()) {
          return oldHandler.apply(this, arguments)
        }
      }
    }
  }
  $.event.special.invalid = {
    add: function (handleObj) {
      var form, oldHandler = handleObj.handler
      handleObj.handler = function (e) {
        if ($(this).is(':input') && (form = $(this).closest('form').data('ac.form'))) {
          if (form.muteInvalidInput) return
          e.nativeValidation = form.$nativeValidation
        }
        return oldHandler.apply(this, arguments)
      }
    }
  }

  // FORM DATA-API
  // =============

  function closestWithData (el, attr) {
    return $.makeArray(el).concat($.makeArray($(el).parents())).reduce(function (previous, current) {
      if (previous) return previous
      if ($(current).data(attr) !== undefined) return $(current)
    }, null)
  }

  $(document).on('click.ac.form.data-api', '[data-toggle="form"]', function (e) {
    var $this      = $($(this).closest('[data-toggle="form"]')[0])
    var $target    = $($($this.data('target'))[0])
    var $sourceKey = $this.data('source') || 'serialized'

    var source = closestWithData($this, $sourceKey)
    if (!source) return

    var serialized = source.data($sourceKey)
    serialized === 'string' ? JSON.parse(serialized) : serialized

    $target.form({show: false})

    Plugin.call($target, 'show', serialized, {sourceElement: source.clone(true, false), sourceData: serialized}, $this[0])
  })

  // This will ensure that all forms initialized by the time any user-specified
  // submit handlers are run.
  $(document).on('submit.ac.form.data-api', 'form', function (e) {
    var $target = $(this)
    var form    = $target.data('ac.form') || Plugin.call($target).data('ac.form')

    if (!form.options.action) e.preventDefault()
  })


  /*
   * https://github.com/Modernizr/Modernizr/blob/924c7611c170ef2dc502582e5079507aff61e388/feature-detects/forms/validation.js
   * Licensed under the MIT license.
   */
  function supportsNativeValidation () {
    var validationSupport = false
    var form = document.createElement('form')

    if (!('checkValidity' in form) || !('addEventListener' in form)) return false
    if ('reportValidity' in form) return true

    form.style.cssText = 'position: absolute; top: -99999em;'
    form.addEventListener('submit', function (e) {
      if (!window.opera) e.preventDefault()
      e.stopPropagation()
    }, false)
    form.innerHTML = '<input name="test" required><button></button>'
    document.body.appendChild(form)
    form.getElementsByTagName('input')[0].addEventListener('invalid', function (e) {validationSupport = true; e.preventDefault(); e.stopPropagation();}, false)
    form.getElementsByTagName('button')[0].click()
    document.body.removeChild(form)
    return validationSupport
  }

});
