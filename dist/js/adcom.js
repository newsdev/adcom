/*
 * Several jQuery plugins for help in dealing with objects
 */

+function ($) {
  'use strict';

  /*
   * Copyright (c) 2013 Wil Moore III
   * Licensed under the MIT license.
   * https://github.com/wilmoore/selectn
   *
   * Adapted to allow property access.
   */
  $.fn.selectn = function (query, object) {
    var parts

    // normalize query to `.property` access (i.e. `a.b[0]` becomes `a.b.0`)
    // allow access to indices[1] and key[properties]
    query = query.replace(/\[([-_\w]+)\]/g, '.$1')
    parts = query.split('.')

    var ref = object || (1, eval)('this'),
        len = parts.length,
        idx = 0

    // iteratively save each segment's reference
    for (; idx < len; idx += 1) {
      if (ref) ref = ref[parts[idx]]
    }

    return ref
  }


  /*
   * jQuery serializeObject - v0.2 - 1/20/2010
   * http://benalman.com/projects/jquery-misc-plugins/
   *
   * Copyright (c) 2010 "Cowboy" Ben Alman
   * Dual licensed under the MIT and GPL licenses.
   * http://benalman.com/about/license/
   */
  $.fn.serializeObject = function () {
    var obj = {}

    $.each( this.serializeArray(), function(i,o){
      var n = o.name,
        v = o.value

        obj[n] = obj[n] === undefined ? v
          : $.isArray( obj[n] ) ? obj[n].concat( v )
          : [ obj[n], v ]
    })

    return obj
  }

}(jQuery);

+function ($) {
  'use strict';

  // LIST CLASS DEFINITION
  // =====================

  var List = function (element, options) {
    this.options  = options
    this.$element = $(element)

    // Immutable options - to change these wholesale, .list('destroy') must
    // first be called, or the CRUD actions should be used.
    this.$items    = typeof this.options.items === 'string' ? JSON.parse(this.options.items) : this.options.items
    this.$states   = this.options.states
    this.$rendered = []

    // Mutable options
    this.template = this.parseTemplate(this.options.template)
    this.updateOptions({
      currentPage: this.options.currentPage,
      pageSize:    this.options.pageSize,
      sort:        this.options.sort,
      filters:     this.options.filters
    })

    this.setInitialState()

    // Initialization for data-api specific options

    if (this.options.remote) {
      $.getJSON(this.options.remote, $.proxy(function(items) {
        this.$items = items
        if (this.options.show) this.show()
        this.$element.trigger($.Event('loaded.ac.list', { items: items }))
      }, this))
    }
  }

  List.VERSION = '0.1.0'

  List.EVENTS  = $.map('scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave load resize scroll unload error keydown keypress keyup load resize scroll unload error blur focus focusin focusout change select submit'.split(' '), function (e) { return e + ".ac.list.data-api" }).join(' ')

  List.DEFAULTS = {
    // immutable
    show: true,
    selectedClass: '',

    sort: null,
    filters: {},
    states: [],

    // mutable
    currentPage: 1
  }

  List.prototype.updateOptions = function (options) {
    if (options.template)    this.template    = this.parseTemplate(options.template)
    if (options.currentPage) this.currentPage = parseInt(options.currentPage)
    if (options.pageSize)    this.pageSize    = parseInt(options.pageSize)

    if (typeof options.sort == 'string')   this.sort = null // TKTKTKTK TODO TODO
    if (typeof options.sort == 'function') this.sort = options.sort
    // this.sort        = this.options.sort ? this.getSort.apply(this, $.map([this.options.sort], function (n) { return n })) : null

    if (options.filters) this.filters = options.filters
    // TKTKTK TODO TODO
    // should setting a new filter for a key set it immediately, or should it store it for later use when that filter is toggled?
  }

  // Orchestration

  List.prototype.show = function () {
    this.$element.trigger('show.ac.list')

    var items = this.getCurrentItems()

    this.$element.empty()
    this.$rendered = []

    $.each(items, $.proxy(function (idx, item) {
      var renderedItem = this.renderItem(item)
      $(this.$element).append(this.renderItem(item))
    }, this))

    this.$element.trigger($.Event('shown.ac.list', { items: items }))
  }

  // Actions
  // selector can be a jQuery selector, item index, or an array of item indices

  List.prototype.select = function (selector) {
    var $this = this
    selector = $.map([selector], function(n) {return n;})
    $(selector).each(function (idx, el) { $this.changeState(el, true) })
  }

  List.prototype.deselect = function (selector) {
    var $this = this
    selector = $.map([selector], function(n) {return n;})
    $(selector).each(function (idx, el) { $this.changeState(el, false) })
  }

  List.prototype.toggle = function (selector) {
    var $this = this
    selector = $.map([selector], function(n) {return n;})
    $(selector).each(function (idx, el) {
      var index = (typeof el == 'number') ? el : $(el).data('ac.list.index')
      $this.changeState(el, $this.$states[index] ? false : true)
    })
  }

  // Helpers

  List.prototype.changeState = function (el, state) {
    if (typeof el === 'number') {
      var item   = this.$items[el]
      var idx    = el
      var target = $(this.$rendered[idx])
    } else {
      var target = $(el)
      var item   = target.data('ac.list.item')
      var idx    = target.data('ac.list.index')
    }

    this.$element.trigger($.Event('toggle.ac.list', { item: item, target: target, index: idx, state: state }))

    this.$states[idx] = state
    if (target) target[state ? 'addClass' : 'removeClass'](this.options.selectedClass)

    this.$element.trigger($.Event('toggled.ac.list', { item: item, target: target, index: idx, state: state }))
  }

  List.prototype.getSelected = function () {
    var selected = []
    var $this = this
    $.each(this.$items, function (idx, item) {
      if ($this.$states[idx]) selected.push(item)
    })
    return selected
  }

  List.prototype.setInitialState = function () {
    var $this = this
    this.toggleFilter($('.active[data-filter][data-target]'))

    $('[data-sort]').each(function (e) {
      var el = $(this)
      if ($(el.data('target'))[0] != $this.$element[0]) return

      var field = el.data('sort')
      if (el.hasClass('sort-ascending')) $this.setSort(field, false)
      if (el.hasClass('sort-descending')) $this.setSort(field, true)
    })
  }

  // Templates

  List.prototype.parseTemplate = function (template) {
    if (typeof template === 'function') return template
    if (typeof template === 'string')   return this.compileTemplate(template)
    if (this.options.fields) return this.defaultTemplate()
    return this.compileTemplate(unescapeString(this.$element.html()))
  }

  List.prototype.compileTemplate = function (template) {
    if (this.options.templateEngine) return this.options.templateEngine(template)
    return function() { return template }
  }

  List.prototype.defaultTemplate = function () {
    var fields = typeof this.options.fields === 'string' ? this.options.fields.split(/,\s*/) : this.options.fields
    var templateString = ''

    $.each(fields, function (idx, field) {
      templateString += '<td data-field="' + field + '"></td>'
    })

    return this.compileTemplate('<tr>' + templateString + '</tr>')
  }

  // Sort / Scope
  //
  // These functions accept simple inputs (such as an attribute and value)
  // and create a single sort or filter function. This function is then saved
  // into list.sort or list.filter.
  //
  // To create a more complex sorting function, set your own to those variables
  // and it will be used instead from list.getCurrentItems.
  //
  // For even more control, write your own .getCurrentItems function, which is
  // called to retrieve the list of items to render in the current view.

  List.prototype.getSort = function (field, reverse) {
    var factor = reverse ? -1 : 1

    if (field === null || field === undefined) return null
    if (typeof field === 'function') return function (a, b) { return field(a, b) * factor }

    // default sort function based on single attribute and direction
    return function (a, b) {
      var aVal = $.fn.selectn(field, a),
          bVal = $.fn.selectn(field, b)
      var left  = (typeof aVal === 'function' ? aVal() : aVal) || ''
      var right = (typeof bVal === 'function' ? bVal() : bVal) || ''

      if (typeof left == 'string')  left  = left.toLowerCase()
      if (typeof right == 'string') right = right.toLowerCase()

      if (left < right) return factor * -1
      if (left > right) return factor * 1
      return 0
    }
  }

  List.prototype.getFilter = function (key, value) {
    if (typeof value === 'function' || value === undefined) return value

    // Use the built-in filter generator if value is not undefined (delete) or
    // a function itself.
    var fields = typeof key === 'string' ? key.split(/,\s*/) : key
    fields = $.isArray(fields) ? fields : [fields]
    return function (item) {
      var matches = false
      // Must this be done inside this function?
      value = value.toLowerCase().trim()

      $.each(fields, function (idx, field) {
        if (matches) return
        var val = $.fn.selectn(field, item)
        if (typeof val === 'function') val = val()
        if (String(val).toLowerCase().trim().indexOf(value) > -1) matches = true
      })
      return matches
    }
  }

  List.prototype.setSort = function (field, reverse) {
    this.$element.trigger($.Event('sortChange.ac.list', { }))
    this.sort = this.getSort(field, reverse)
    this.currentPage = 1
    this.$element.trigger($.Event('sortChanged.ac.list', { function: this.sort }))
  }

  List.prototype.setFilter = function (key, filter) {
    this.$element.trigger($.Event('filterChange.ac.list', { key: key, filter: filter }))

    if (filter === undefined) {
      delete this.filters[key]
    } else this.filters[key] = this.getFilter(key, filter)

    this.currentPage = 1
    this.$element.trigger($.Event('filterChanged.ac.list', { key: key, filter: filter, function: this.filters[key] }))
  }

  List.prototype.setCurrentPage = function (page) {
    this.$element.trigger($.Event('pageChange.ac.list', { }))
    this.currentPage = parseInt(page)
    this.$element.trigger($.Event('pageChanged.ac.list', { page: this.currentPage }))
  }

  // Should return the items in a collection which have been filtered, sorted,
  // and paged.
  List.prototype.getCurrentItems = function () {
    var visibleItems = this.$items.slice(0) // dup

    // filter
    if (this.options.filtering == 'on') visibleItems = this.getFilteredItems(visibleItems)

    // sort
    if (this.sort)     visibleItems = this.getSortedItems(visibleItems)

    // paginate
    if (this.pageSize) visibleItems = this.getPaginatedItems(visibleItems)

    return visibleItems
  }

  List.prototype.getFilteredItems = function (items) {
    var $this = this
    if (!$.isEmptyObject(this.filters)) {
      var filtered = []
      $.each(items, function (idx, item) {
        var matches = true
        $.each($this.filters, function (fields, filter) {
          if (!matches || !filter(item)) matches = false
        })
        if (matches) filtered.push(item)
      })
      return filtered
    }
    return items
  }

  List.prototype.getSortedItems = function (items) {
    return this.sort ? items.sort(this.sort) : items
  }

  List.prototype.getPaginatedItems = function (items) {
    var count    = items.length
    var pages    = Math.ceil(count / this.pageSize)
    var startIdx = (this.currentPage - 1) * this.pageSize
    var endIdx   = startIdx + this.pageSize
    var start    = Math.min(startIdx + 1, count)
    var end      = Math.min(endIdx, count)

    items = items.slice(startIdx, endIdx)

    this.$element.trigger($.Event('paginated.ac.list', { page: this.currentPage, pages: pages, count: count, items: items, start: start, end: end }))
    return items
  }

  // Rendering

  List.prototype.renderItem = function (item) {
    var $item    = item
    var $idx     = this.$items.indexOf(item)
    var rendered = $(this.template($item))

    // Ensure that el is a single top-level element (since the rendered element
    // is the canonical data source for parts of this item, we need a single
    // element as the container).
    //
    // Ignore nodes that are not ELEMENT_NODE, TEXT_NODE, DOCUMENT_FRAGMENT_NODE,
    // or empty text nodes.
    var renderedChildren = $.grep($.makeArray(rendered), function (val) {
      if ([1,3,11].indexOf(val.nodeType) == -1) return false
      if (val.nodeType == 3 && val.nodeValue.match(/^\s*$/)) return false
      return true
    })
    if (renderedChildren.length > 1)
      console.error("Adcom List templates can have only one top-level element. It currently has " + renderedChildren.length + ".", this.$element[0], renderedChildren)
    var el = renderedChildren[0]

    if (this.$states[$idx]) $(el).addClass(this.options.selectedClass)

    var dynamicElements = $(el).data('field') === undefined ? $(el).find('[data-field]') : $(el)

    dynamicElements.each(function (idx, fieldContainer) {
      var field = $(fieldContainer).attr('data-field')
      var value = typeof $item[field] !== 'function' ? $item[field] : $item[field]()
      $(fieldContainer).html(String(value || ''))
    })

    $(el).data('ac.list.item', $item)
    $(el).data('ac.list.index', $idx)
    $(el).on('update.ac.list', $.proxy(function (e) {
      this.update($(el), e.item)
    }, this))

    this.$rendered[$idx] = el

    return el
  }

  // Updates

  List.prototype.getItemIndex = function (item) {
    if (typeof item == 'number') return item
    if ($(item)[0] instanceof HTMLElement) return $(item).data('ac.list.index')
    return this.$items.indexOf(item)
  }

  List.prototype.add = function (data, index) {
    index = index == undefined ? this.$items.length : index

    this.$items.splice(index, 0, data)
    this.$states.splice(index, 0, undefined)
    this.$rendered.splice(index, 0, undefined)

    this.show()
  }

  List.prototype.update = function (item, data) {
    var index = this.getItemIndex(item)
    if (index == -1) throw "Item not found in List, and could not be updated."

    this.$items[index] = data

    if (this.$rendered[index]) {
      var original    = $(this.$rendered[index])
      var replacement = this.renderItem(data)
      original.replaceWith(replacement)
      this.$rendered[index] = replacement[0]
    }

    this.show()
  }

  List.prototype.delete = function (item) {
    var index = this.getItemIndex(item)
    if (index == -1) throw "Item not found in List, and could not be deleted."

    this.$items.splice(index, 1)
    this.$states.splice(index, 1)
    this.$rendered.splice(index, 1)

    this.show()
  }

  List.prototype.destroy = function () {
    this.$element.off('.ac.list').removeData('ac.list')
    this.$element.empty()
    this.$states = this.$rendered = []
  }

  // Trigger definitions

  List.prototype.toggleSort = function (el) {
    var $this = this
    el.each(function () {
      var $el = $(this)
      var $target = $($el.data('target'))

      var field = $el.data('sort')
      var states = ($el.data('states') || 'ascending,descending').split(/,\s*/)

      // Cycle between sorted, reversed, and not sorted.
      // Clear all other sorts on this list.
      var state = ($el.attr('class').match(/[\^\s]sort-(ascending|descending)/) || [])[1]
      var stateIdx = states.indexOf(state)
      var nextState = states[(stateIdx + 1) % states.length]

      $('[data-sort][data-target="' + $el.data('target') + '"]').removeClass('sort-ascending sort-descending')
      if (nextState !== 'off') $el.addClass('sort-' + nextState)

      $this.setSort(field, {'ascending': false, 'descending': true, 'off': null}[nextState])
    })
  }

  List.prototype.toggleFilter = function (el) {
    var $this = this
    el.each(function () {
      var $el     = $(this)
      var $target = $($el.data('target'))
      if ($target[0] !== $this.$element[0]) return

      var fields  = $el.attr('data-filter')
      var value   = $el.is(':input') ? $el.val() : $el.attr('data-match')
      if (!value) value = undefined

      $this.setFilter(fields, value)
    })
  }


  // LIST PLUGIN DEFINITION
  // ======================

  function Plugin(option) {
    var args = Array.prototype.slice.call(arguments, Plugin.length)
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('ac.list')

      var options = $.extend({}, List.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('ac.list', (data = new List(this, options)))
      if (typeof option == 'string') data[option].apply(data, args)
      else if (options.show && !options.remote) data.show()
      else if (typeof option == 'object') data.update(option)
    })
  }

  var old = $.fn.list

  $.fn.list             = Plugin
  $.fn.list.Constructor = List


  // LIST NO CONFLICT
  // ================

  $.fn.list.noConflict = function () {
    $.fn.list = old
    return this
  }


  // LIST DATA-API
  // =============

  function closestWithData (el, attr) {
    return $.makeArray(el).concat($.makeArray($(el).parents())).reduce(function (previous, current) {
      if (previous) return previous
      if ($(current).data(attr) !== undefined) return $(current)
    }, null)
  }

  $(document).on(List.EVENTS, '[data-toggle="select"]', function (e) {
    var $this    = $(this).closest('[data-toggle="select"]')
    var triggers = ($this.attr('data-trigger') || 'click').split(' ')

    if (triggers.indexOf(e.type) == -1) return
    if ($this.is('a')) e.preventDefault()

    var item    = closestWithData($this, 'ac.list.item')
    var $target = closestWithData($this, 'ac.list')

    Plugin.call($target, 'toggle', item)
  })

  $(document).on('click.ac.list.data-api', '[data-sort]', function (e) {
    var $this   = $(this).closest('[data-sort]')
    var $target = $($this.data('target'))

    if ($this.is('a')) e.preventDefault()

    Plugin.call($target, 'toggleSort', $this)
    Plugin.call($target, 'show')
  })

  $(document).on(List.EVENTS, '[data-filter]', function (e) {
    var $this        = $(this).closest('[data-filter]')
    var $target      = $($this.data('target'))
    var defaultEvent = $this.is(':input') ? 'change' : 'click'
    var triggers     = ($this.attr('data-trigger') || defaultEvent).split(' ')

    if (triggers.indexOf(e.type) == -1) return
    if ($this.is('a') && e.type === 'click') e.preventDefault()

    Plugin.call($target, 'toggleFilter', $this)
    Plugin.call($target, 'show')
  })

  $(document).on('click.ac.list.data-api', '[data-page]', function (e) {
    var $this    = $(this).closest('[data-page]')
    var $target  = $($this.data('target'))

    if ($this.is('a')) e.preventDefault()

    Plugin.call($target, 'setCurrentPage', $this.data('page'))
    Plugin.call($target, 'show')
  })

  // Adapted from Underscore.js 1.7.0
  // http://underscorejs.org
  // (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
  // Underscore may be freely distributed under the MIT license.
  function unescapeString (string) {
    var map = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#x60;': '`'
    }
    var escaper = function (match) { return map[match] }
    var source = '(?:' + Object.getOwnPropertyNames(map).join('|') + ')'
    var testRegexp = RegExp(source)
    var replaceRegexp = RegExp(source, 'g')

    string = string == null ? '' : '' + string
    return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string
  }

}(jQuery);

+function ($) {
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
    var e = $.Event('show.ac.form', { serialized: data, relatedTarget: _relatedTarget })
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

    meta = meta || {}
    this.sourceElement = meta.sourceElement
    this.sourceData    = meta.sourceData
    $(this.$element[0]).one('reset', $.proxy(function () {
      this.sourceElement =
      this.sourceData    = null
    }, this))

    this.$element.trigger($.Event('shown.ac.form', { serialized: data, relatedTarget: _relatedTarget, sourceElement: this.sourceElement, sourceData: this.sourceData}))
  }

  Form.prototype.serialize = function () {
    return {
      array:  this.$element.serializeArray(),
      object: this.$element.serializeObject()
    }
  }

  // Encapsulates the default browser validate, any custom validation via the
  // validate.ac.form event, and triggers a display of any invalidation
  // messages if necessary.
  Form.prototype.validate = function (submitEvent) {
    if (!this.$validate) return

    var e = $.Event('validate.ac.form', this.serialize())
    this.$element.trigger(e)
    if (e.isDefaultPrevented()) return

    var isValid = this.$element[0].checkValidity()

    if (!isValid) {
      this.invalid()
      submitEvent.preventDefault()
      submitEvent.stopImmediatePropagation()
    }

    this.$element.trigger($.Event('validated.ac.form', {isValid: isValid}))
  }

  // If the form is invalid according to the DOM's native validity checker,
  // trigger the browser's default invalidation display.
  // If overridden (via event) we should find a way to pass the invalid
  // message hash to the event.
  Form.prototype.invalid = function () {
    var $this = this

    var e = $.Event('invalid.ac.form')
    this.$element.trigger(e)

    // Don't display native validation if we've prevented it, validation is off,
    // or the browser doesn't support it (or the form would actually submit).
    if (e.isDefaultPrevented() || !this.$validate || !this.$nativeValidation) return

    // If this browser supports native HTML form validation, temporarily turn
    // it back on and submit the form.
    setTimeout(function() {
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
        if (form = $(this).data('ac.form')) {
          if (!e.originalEvent._validated) form.validate(e)
          if (!e._addedAttributes) form.addEventAttributes(e)
          e.originalEvent._validated = e._addedAttributes = true
        }

        // Continue to run original event, as long as it hasn't been prevented
        // by the validation process.
        if (!e.isImmediatePropagationStopped()) {
          return oldHandler.apply(this, arguments)
        }
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

  // This will ensure that forms with data-control="form" are initialied by the
  // time any user-specified submit handlers are run.
  $(document).on('submit.ac.form.data-api', '[data-control="form"]', function (e) {
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
    form.innerHTML = '<input name="test" required><button></button>'
    form.addEventListener('submit', function(e) {window.opera ? e.stopPropagation() : e.preventDefault()})
    form.getElementsByTagName('input')[0].addEventListener('invalid', function(e) {validationSupport = true; e.preventDefault(); e.stopPropagation();})
    form.getElementsByTagName('button')[0].click()
    return validationSupport
  }

}(jQuery);

+function ($) {
  // Warning: data-toggle may be replaced by data-nav to allow use
  // along with other data-api actions, such as data-toggle="modal"

  'use strict';

  // STATE CLASS DEFINITION
  // ======================

  var State = function (element, options) {
    this.options   = options
    this.$element  = $(element) // window
    this.$location = this.$element[0].location
    this.$history  = this.$element[0].history

    this.state        = this.getLocationState()
    this.initialState = this.options.initialState || this.state
    this.isUpdating   = false

    this.$history.replaceState(this.initialState, document.title, this.$location.pathname + this.$location.search)
    this.$element[0].onpopstate = $.proxy(this.onpopstate, this)

    if (this.options.triggerState) {
      this.options.allowRepeats = false
      this.$element.on('updated.ac.state', $.proxy(this.triggerState, this))

      // Necessary to avoid infinite recursion; peek will use ac.state in
      // data-api, which normally isn't set until Constructor returns.
      this.peek()
    }
  }

  State.VERSION = '0.1.0'

  State.EVENTS  = $.map('scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave load resize scroll unload error keydown keypress keyup load resize scroll unload error blur focus focusin focusout change select submit'.split(' '), function (e) { return e + ".ac.state.data-api" }).join(' ')

  State.DEFAULTS = {
    initialState: null,
    allowRepeats: true,
    triggerState: false,
    path: false
  }

  State.prototype.getLocationState = function () {
    return this.deserialize(this.$location.pathname + this.$location.search)
  }

  State.prototype.push = function (state, options) {
    state   = typeof state   !== 'undefined' ? state   : {}
    options = typeof options !== 'undefined' ? options : {}

    options.merge        = typeof options.merge !== 'undefined' ? options.merge : true
    options.allowRepeats = this.options.allowRepeats
    options.action       = options.action || 'push'

    if (options.merge) state = $.extend(true, {}, this.state, state)

    // Update only if this is a new state
    var serialized = this.serialize(state)

    this.$element.trigger($.Event('push.ac.state', { state: state, options: options }))

    if (serialized !== this.serialize(this.state)) {
      // If this state is new, append it into the history and trigger an update
      this.$history[options.action + "State"](state, document.title, serialized)
      this.update(state, $.Event('push.ac.state'))
    } else {
      // If this state is the same as the current state, don't append to the
      // history, and only trigger an update if `allowRepeats` is on
      if (options.allowRepeats) this.update(state, $.Event('push.ac.state'))
    }

    this.$element.trigger($.Event('pushed.ac.state', { state: state, options: options }))
  }

  State.prototype.pop = function (e) {
    this.$history.back()
  }

  State.prototype.peek = function () {
    this.update(this.state, $.Event('peek.ac.state'))
  }

  State.prototype.onpopstate = function (e) {
    this.update(e.state, e)
  }

  State.prototype.update = function (state, trigger) {
    this.$element.trigger($.Event('update.ac.state', { state: state, trigger: trigger }))
    this.state = state // does this need to be cloned?
    this.$element.trigger($.Event('updated.ac.state', { state: state, trigger: trigger }))
  }

  // {} => url
  State.prototype.serialize = function (state) {
    state = $.extend({}, state)

    var serialized = ''

    if (this.options.path) {
      var serialized = this.options.path.base || ''
      var attr       = this.options.path.attr
      if (state[attr]) {
        serialized += state[attr]
      }
      delete state[attr]
    } else {
      serialized = window.location.pathname
    }

    var params = $.param(state)
    if (params.length > 0) serialized += '?' + params
    if (serialized.length == 0) serialized = '/'

    return serialized
  }

  // url => {}
  State.prototype.deserialize = function (string) {
    var path  = string.split('?')[0]
    var state = parseParams(string.split('?')[1])

    if (this.options.path) {
      var path_value = path.replace(this.options.path.base, '')
      if (path_value) state[this.options.path.attr] = path_value
    }

    return state
  }

  State.prototype.triggerState = function (e) {
    var setState = function (parents, state) {
      if (!state) return

      var prefix = [].concat(['state'], parents).join('-')
      $.each(state, function (key, value) {
        if (typeof value === "object") {
          setState([].concat(parents, [key]), value)
        } else {
          // Warning: see note at top re: data-toggle
          var matches = $('[data-toggle="state"][' + prefix + '-' + key + '="' + value + '"], [data-nav="state"][' + prefix + '-' + key + '="' + value + '"]')
          matches.each(function (idx, el) {
            $(el).trigger($(el).data('trigger') || 'click')
          })
        }
      })
    }
    if (e.trigger && e.trigger.type !== 'push.ac.state') setState([], e.state)
  }


  // STATE PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
    var args = Array.prototype.slice.call(arguments, Plugin.length)
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('ac.state')
      var options = $.extend({}, State.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('ac.state', (data = new State(this, options)))

      if (typeof option == 'string') data[option].apply(data, args)
    })
  }

  var old = $.fn.state

  $.fn.state             = Plugin
  $.fn.state.Constructor = State


  // STATE NO CONFLICT
  // =================

  $.fn.state.noConflict = function () {
    $.fn.state = old
    return this
  }

  // STATE DATA-API
  // ==============

  // Warning: see note at top re: data-toggle
  $(document).on(State.EVENTS, '[data-toggle="state"], [data-nav="state"]', function (e) {
    var $this    = $(this).closest('[data-toggle="state"], [data-nav="state"]')
    var triggers = ($this.attr('data-trigger') || 'click').split(' ')
    var merge    = $this.attr('data-merge') == 'false' ? false : true
    var action   = $this.attr('data-action')

    if ($this.is('a')) e.preventDefault()

    if (triggers.indexOf(e.type) == -1) return

    // Construct partial state hash
    var state = JSON.parse($this.attr('state') || '{}')
    if (Object.keys(state).length == 0) {
      $.each($this[0].attributes, function (index, attr) {
        if (!attr.name.match(/^state-.+/)) return

        var cursor     = state
        var components = attr.name.replace(/^state-/, '').split('-')

        $.each(components, function (index, component) {
          if (index < components.length - 2) {
            cursor = cursor[component]
          } else {
            cursor[component] = attr.value
          }
        })
      })
    }

    Plugin.call($(window), 'push', state, {merge: merge, action: action})
  })

  // Init state from data attrs on html
  $(document).on('ready', function () {
    $('[data-control="state"]').each(function() {
      var $state = $(this)
      var data   = $state.data()

      data.path = data.path || {}
      data.allowRepeats = (data.allowRepeats != false) ? true : false

      if (data.pathAttr) data.path.attr = data.pathAttr
      if (data.pathBase) data.path.base = data.pathBase

      if ($.isEmptyObject(data.path)) delete data.path

      Plugin.call($(window), data)
    })
  })

  // Adapted from https://gist.github.com/kares/956897#comment-1190642
  function parseParams (query) {
    var re = /([^&=]+)=?([^&]*)/g
    var decode = function (str) { return decodeURIComponent(str.replace(/\+/g, ' ')) }

    function createElement (params, key, value) {
      key = key + ''
      if (key.indexOf('.') !== -1) {
        var list = key.split('.')
        var new_key = key.split(/\.(.+)?/)[1]
        if (!params[list[0]]) params[list[0]] = {}
        if (new_key !== '') {
          createElement(params[list[0]], new_key, value)
        } else console.warn('parseParams :: empty property in key "' + key + '"')
      } else
      if (key.indexOf('[') !== -1) {
        var list = key.split('[')
        key = list[0]
        var list = list[1].split(']')
        var index = list[0]
        if (index == '') {
          if (!params) params = {}
          if (!params[key] || !$.isArray(params[key])) params[key] = []
          params[key].push(value)
        } else {
          if (!params) params = {}
          if (!params[key] || !$.isArray(params[key])) params[key] = []
          params[key][parseInt(index)] = value
        }
      } else {
        if (!params) params = {}
        params[key] = value
      }
    }
    query = query + ''
    if (query.match(/\?/) === null) query = '?' + query
    var params = {}, e
    if (query) {
      if (query.indexOf('#') !== -1) {
        query = query.substr(0, query.indexOf('#'))
      }

      if (query.indexOf('?') !== -1) {
        query = query.substr(query.indexOf('?') + 1, query.length)
      } else return {}
      if (query == '') return {}
      while (e = re.exec(query)) {
        var key = decode(e[1])
        var value = decode(e[2])
        createElement(params, key, value)
      }
    }
    delete params[undefined]
    return params
  }

}(jQuery);
