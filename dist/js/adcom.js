/*
 * Several jQuery plugins for help in dealing with objects
 */

+function (factory) {
  if (typeof define === 'function' && define.amd) {
    define('adcom/object', ['jquery'], factory)
  } else {
    factory(window.jQuery)
  }
}(function ($) {
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
   * deparam, from jQuery BBQ
   * http://benalman.com/projects/jquery-bbq-plugin/
   *
   * Copyright (c) 2010 "Cowboy" Ben Alman
   * Dual licensed under the MIT and GPL licenses.
   * http://benalman.com/about/license/
   */
  $.deparam = function( params, coerce ) {
    var obj = {},
      coerce_types = { 'true': !0, 'false': !1, 'null': null }

    // Iterate over all name=value pairs.
    $.each( params.replace( /\+/g, ' ' ).split( '&' ), function(j,v){
      var param = v.split( '=' ),
        key = decodeURIComponent( param[0] ),
        val,
        cur = obj,
        i = 0,

        // If key is more complex than 'foo', like 'a[]' or 'a[b][c]', split it
        // into its component parts.
        keys = key.split( '][' ),
        keys_last = keys.length - 1

      // If the first keys part contains [ and the last ends with ], then []
      // are correctly balanced.
      if ( /\[/.test( keys[0] ) && /\]$/.test( keys[ keys_last ] ) ) {
        // Remove the trailing ] from the last keys part.
        keys[ keys_last ] = keys[ keys_last ].replace( /\]$/, '' )

        // Split first keys part into two parts on the [ and add them back onto
        // the beginning of the keys array.
        keys = keys.shift().split('[').concat( keys )

        keys_last = keys.length - 1
      } else {
        // Basic 'foo' style key.
        keys_last = 0
      }

      // Are we dealing with a name=value pair, or just a name?
      if ( param.length === 2 ) {
        val = decodeURIComponent( param[1] )

        // Coerce values.
        if ( coerce ) {
          val = val && !isNaN(val)            ? +val              // number
            : val === 'undefined'             ? undefined         // undefined
            : coerce_types[val] !== undefined ? coerce_types[val] // true, false, null
            : val                                                 // string
        }

        if ( keys_last ) {
          // Complex key, build deep object structure based on a few rules:
          // * The 'cur' pointer starts at the object top-level.
          // * [] = array push (n is set to array length), [n] = array if n is 
          //   numeric, otherwise object.
          // * If at the last keys part, set the value.
          // * For each keys part, if the current level is undefined create an
          //   object or array based on the type of the next keys part.
          // * Move the 'cur' pointer to the next level.
          // * Rinse & repeat.
          for ( ; i <= keys_last; i++ ) {
            key = keys[i] === '' ? cur.length : keys[i]
            cur = cur[key] = i < keys_last
              ? cur[key] || ( keys[i+1] && isNaN( keys[i+1] ) ? {} : [] )
              : val
          }

        } else {
          // Simple key, even simpler rules, since only scalars and shallow
          // arrays are allowed.
          //
          if ( $.isArray( obj[key] ) ) {
            // val is already an array, so push on the next value.
            obj[key].push( val )

          } else if ( obj[key] !== undefined ) {
            // val isn't an array, but since a second value has been specified,
            // convert val into an array.
            obj[key] = [ obj[key], val ]

          } else {
            // val is a scalar.
            obj[key] = val
          }
        }

      } else if ( key ) {
        // No value was defined, so set something meaningful.
        obj[key] = coerce ? undefined : ''
      }
    })

    return obj
  }

});

+function (factory) {
  if (typeof define === 'function' && define.amd) {
    define('adcom/list', ['jquery', 'adcom/object'], factory)
  } else {
    factory(window.jQuery)
  }
}(function ($) {
  'use strict';

  // LIST CLASS DEFINITION
  // =====================

  var List = function (element, options) {
    this.options  = options
    this.$element = $(element)

    // Immutable options - to change these wholesale, .list('destroy') must
    // first be called, or the CRUD actions should be used.
    this.$states   = this.options.states
    this.$rendered = []
    this.$items    = typeof this.options.items === 'string' ? JSON.parse(this.options.items) : this.options.items

    // Mutable options
    this.template = this.parseTemplate(this.options.template)
    this.filters  = {}
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

  List.TRIGGER_EVENTS  = $.map('click keydown keypress keyup focus blur focusin focusout change select submit'.split(' '), function (e) { return e + ".ac.list.data-api" }).join(' ')

  List.DEFAULTS = {
    // immutable
    show: true,
    selectedClass: '',
    locale: 'en',

    sort: null,
    filters: {},
    states: [],
    items: [],
    currentPage: 1
  }

  List.prototype.updateOptions = function (options) {
    if (options.template)    this.template    = this.parseTemplate(options.template)
    if (options.currentPage) this.currentPage = parseInt(options.currentPage)
    if (options.pageSize)    this.pageSize    = parseInt(options.pageSize)
    if (options.sort)        this.setSort(options.sort)
    if (options.filters)     this.setFilter(options.filters)
    if (options.items) {
      // If we are updating items, then we must destroy the $rendered and
      // $states caches.
      this.$states   = options.states || []
      this.$rendered = []
      this.$items    = typeof options.items === 'string' ? JSON.parse(options.items) : options.items

      // Should we assume that updating items suggests wanting to re-render list immediately?
      this.show();
    }
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

    this.$element.removeClass('loading')
    this.$element.trigger($.Event('shown.ac.list', { items: items }))
  }

  // Actions
  // selector can be a jQuery selector, item index, or an array of item indices

  List.prototype.select = function (selector) {
    var $this = this
    selector = $.map([selector], function(n) {return n})
    $(selector).each(function (idx, el) { $this.changeState(el, true) })
  }

  List.prototype.deselect = function (selector) {
    var $this = this
    selector = $.map([selector], function(n) {return n})
    $(selector).each(function (idx, el) { $this.changeState(el, false) })
  }

  List.prototype.toggle = function (selector) {
    var $this = this
    selector = $.map([selector], function(n) {return n})
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
    this.toggleFilter($('[data-filter][data-target]').filter('.active, :checked'))

    $('[data-sort]').each(function (e) {
      var el = $(this)
      if ($(el.data('target'))[0] != $this.$element[0]) return

      var field = el.data('sort')
      if (el.hasClass('sort-ascending')) $this.setSort(field + '.ascending')
      if (el.hasClass('sort-descending')) $this.setSort(field + '.descending')
    })
  }

  // Templates

  List.prototype.parseTemplate = function (template) {
    if (typeof template === 'function') return template
    if (typeof template === 'string')   return this.compileTemplate(template)
    return this.compileTemplate(unescapeString(this.$element.html()))
  }

  List.prototype.compileTemplate = function (template) {
    if (this.options.templateEngine) return this.options.templateEngine(template)
    return function() { return template }
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

  List.prototype.getSort = function (fields) {
    if (typeof fields === 'function' || fields === null || fields === undefined) return fields

    var normalizedFields = []
    $.each(fields, function (idx, field) {
      var factor = field.match(/\.des(c(end(ing)?)?)?$/) ? -1 : 1
      field = field.replace(/\.((des(c(end(ing)?)?)?)|(asc(end(ing)?)?)?)$/, '')
      normalizedFields.push([field, factor])
    })

    // Create a comparator function that defaults to localCompare, and upgrades
    // to Intl.Collator in browsers that support it.
    var comparator = function(a, b) { return a.localeCompare(b) }
    if (typeof Intl != 'undefined') {
      comparator = Intl.Collator(this.options.locale, {
        sensitivity: 'base',
        numeric: true,
        ignorePunctuation: true
      }).compare
    }

    // default sort function based on one or more attributes and direction
    return function (a, b) {
      for (var index=0; index < normalizedFields.length; index++) {
        var field  = normalizedFields[index][0],
            factor = normalizedFields[index][1]

        var aVal = $.fn.selectn(field, a),
            bVal = $.fn.selectn(field, b)

        // Support sorting by the response of functions
        var left  = String((typeof aVal === 'function' ? aVal() : aVal) || '')
        var right = String((typeof bVal === 'function' ? bVal() : bVal) || '')

        return factor * comparator(left, right)
      }
      return 0
    }
  }

  List.prototype.getFilter = function (key, value) {
    if (typeof value === 'function' || value === undefined) return value

    // Use the built-in filter generator if value is not undefined (delete) or
    // a function itself. Creates a generous OR search among all passed in
    // fields in key.
    var fields = typeof key === 'string' ? key.split(/,\s*/) : [key]
    var regexp = new RegExp(value, 'i')

    return function (item) {
      var matches = false

      $.each(fields, function (idx, field) {
        if (matches) return
        var val = $.fn.selectn(field, item)
        if (typeof val === 'function') val = val()
        if (String(val).match(regexp)) matches = true
      })
      return matches
    }
  }

  List.prototype.setSort = function (fields) {
    if (typeof fields === 'string') fields = fields.split(/,\s*/)

    this.$element.trigger($.Event('sortChange.ac.list', { fields: fields }))
    this.sort = this.getSort(fields)
    this.currentPage = 1
    this.$element.trigger($.Event('sortChanged.ac.list', { fields: fields, function: this.sort }))
  }

  List.prototype.setFilter = function (key, filter) {
    if (typeof key === 'object') {
      return $.each(key, $.proxy(function (key, filter) {
        this.setFilter(key, filter)
      }, this))
    }

    this.$element.trigger($.Event('filterChange.ac.list', { key: key, filter: filter }))

    if (filter === undefined) {
      delete this.filters[key]
    } else this.filters[key] = this.getFilter(key, filter)

    this.currentPage = 1
    this.$element.trigger($.Event('filterChanged.ac.list', { key: key, filter: filter, function: this.filters[key] }))
  }

  List.prototype.setCurrentPage = function (page) {
    page = parseInt(page)
    this.$element.trigger($.Event('pageChange.ac.list', { page: page }))
    this.currentPage = page
    this.$element.trigger($.Event('pageChanged.ac.list', { page: this.currentPage }))
  }

  // Should return the items in a collection which have been filtered, sorted,
  // and paged.
  List.prototype.getCurrentItems = function () {
    var visibleItems = this.$items.slice(0) // dup

    // filter
    if (this.filters && Object.keys(this.filters).length) visibleItems = this.getFilteredItems(visibleItems)

    // sort
    if (this.sort) visibleItems = this.getSortedItems(visibleItems)

    // paginate
    // if (this.pageSize) visibleItems = this.getPaginatedItems(visibleItems)
    visibleItems = this.getPaginatedItems(visibleItems)

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
    var pageSize = this.pageSize || count

    var pages    = Math.ceil(count / pageSize)
    var startIdx = (this.currentPage - 1) * pageSize
    var endIdx   = startIdx + pageSize
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
    var el = renderedChildren[0]
    if (renderedChildren.length > 1) {
      el = $('<div>')
      renderedChildren.forEach(function(child) { el.append(child) })
    }

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
      var state = (($el.attr('class') || '').match(/(?:^|\s)sort-(ascending|descending)/) || [])[1]
      var stateIdx = states.indexOf(state)
      var nextState = states[(stateIdx + 1) % states.length]

      $('[data-sort][data-target="' + $el.data('target') + '"]').removeClass('sort-ascending sort-descending')

      if (nextState === 'off') {
        $this.setSort(null)
      } else {
        $el.addClass('sort-' + nextState)
        $this.setSort(field + '.' + nextState)
      }
    })
  }

  List.prototype.toggleFilter = function (el) {
    var $this = this
    el.each(function () {
      var $el     = $(this)
      var $target = $($el.data('target'))
      if ($target[0] !== $this.$element[0]) return

      var fields  = $el.attr('data-filter')

      // Use first value of `pattern` or .val() of input elements
      // that are not unselected checkboxes.
      var value = $el.attr('data-pattern')
      if ($el.is(':checkbox') && $el.is(':not(:checked)')) {
        value = undefined
      } else if (!value && $el.is(':input') && $el.is(':checkbox:checked, :not(:checkbox)')) {
        value = $el.val()
      }
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
      else if (typeof option == 'object') data.updateOptions(option)
      if (typeof option != 'string' && options.show && !options.remote) data.show()
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

  $(document).on('click.ac.list.data-api', '[data-toggle="select"]', function (e) {
    var $this   = $(this).closest('[data-toggle="select"]')

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

  $(document).on(List.TRIGGER_EVENTS, '[data-filter]', function (e) {
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

});

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

    this.$element.trigger($.Event('shown.ac.form', { serialized: data, relatedTarget: _relatedTarget }))
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

+function (factory) {
  if (typeof define === 'function' && define.amd) {
    define('adcom/session', ['jquery'], factory)
  } else {
    window.Session = factory(window.jQuery)
  }
}(function ($) {
  'use strict';

  // SESSION CLASS DEFINITION
  // ========================
  var Session = function (options) {
    this.options = $.extend({}, Session.DEFAULTS, options)

    this.$key = this.options.key
    if (!this.$key) throw "Session cannot be initialized without a key (options.key)"

    this.$storage = (this.options.persistent === true) ? window.localStorage : window.sessionStorage

    this.data = this.fetchSession()
  }

  Session.VERSION = '0.1.0'

  Session.DEFAULTS = {
    persistent: false,
    namespace: null
  }

  Session.prototype.set = function (key, value) {
    if (this.options.namespace) key = this.options.namespace + '.' + value

    this.data[key] = value
    this.saveSession()
  }

  Session.prototype.get = function (key) {
    if (this.options.namespace) key = this.options.namespace + '.' + value

    return this.data[key]
  }

  Session.prototype.fetchSession = function () {
    return this.$storage ? JSON.parse(this.$storage.getItem(this.$key) || '{}') : {}
  }

  Session.prototype.saveSession = function () {
    if (this.$storage) {
      try {
        this.$storage.setItem(this.$key, JSON.stringify(this.data))
      } catch(e) {
        // unable to set, e.g. safari private mode
        console.log('unable to save session', e)
      }
    }
  }

  Session.prototype.removeSession = function () {
    if (this.$storage) {
      this.$storage.removeItem(this.$key)
    }
  }

  return Session
});

+function (factory) {
  if (typeof define === 'function' && define.amd) {
    define('adcom/persist', ['jquery'], factory)
  } else {
    factory(window.jQuery)
  }
}(function ($) {
  'use strict';

  // PERSIST CLASS DEFINITION
  // ========================
  var Persist = function (element, options) {
    this.options = options
    this.$element = $(element)

    this.$key = this.options.key || this.$element.attr('id')

    this.observations = {}
    this.filters = {}
  }

  Persist.VERSION = '0.1.0'

  // These are meant to mirror MutationObserver options, plus some extras
  Persist.DEFAULTS = {
    key: null
  }

  Persist.prototype.attributes = function (attributes, filter) {
    var $this = this
    attributes = (typeof attributes == 'string') ? attributes.split(/[,\s]+/) : attributes
    filter = (typeof filter == 'string') ? filter.split(/[,\s]+/) : filter

    attributes.forEach(function(attr) {
      var key = { element: $this.$key, type: 'attributes', path: attr }
      $this.filters[key] = filter

      var ev = $.Event('add.ac.persist', { key: key })
      $this.$element.trigger(ev)
      if (ev.isDefaultPrevented()) return

      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          // Extend the mutation object with additional properties
          // Allows user event to change the persisted value if desired

          var value = $this.$element[0].getAttribute(attr)

          // if filters are turned on, filter out any attributes not in the
          // filter list for storage.
          if (filter) {
            value = $.unique($.grep(value.split(/[,\s]+/), function (item) { return filter.indexOf(item) > -1 })).join(' ')
          }

          // Change is persisted by hooking into the mutation event.
          // var ev = $.Event('mutation.ac.persist', $.extend({}, key, { mutation: mutation }))
          var ev = $.Event('mutation.ac.persist', { key: key, mutation: mutation, value: value })
          $this.$element.trigger(ev)
        })
      })

      var ev = $.Event('added.ac.persist', { key: key })
      $this.$element.trigger(ev)

      // Don't add mutation until after added, so we don't count initialization mutation...
      var options = $.extend({}, $this.options, { attributes: true, attributeFilter: [attr] })
      observer.observe($this.$element[0], options)

      // Remove old observer at this key
      if ($this.observations[key]) $this.observations[key].disconnect()
      $this.observations[key] = observer
    })
  }
  Persist.prototype.attribute = Persist.prototype.attributes

  function getPath (parent, child, path) {
    path = path || []
    if (parent.childNodes.length == 0 && parent != child) return false
    if (parent == child) return true

    for (var i = 0; i < parent.childNodes.length; i++) {
      var descendent = parent.childNodes[i]
      if (getPath(descendent, child, path) !== false) {
        path.unshift(i)
        return path
      }
    }
  }

  Persist.prototype.characterData = function () {
    var $this = this
    var key = { element: this.$key, type: 'characterData' }

    var ev = $.Event('add.ac.persist', { key: key })
    this.$element.trigger(ev)
    if (ev.isDefaultPrevented()) return

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        var path = getPath($this.$element[0], mutation.target)

        var value = mutation.target.data

        var ev = $.Event('mutation.ac.persist', {
          mutation: mutation,
          value: value,
          key: $.extend({path: path.join('.')}, key)
        })
        $this.$element.trigger(ev)
      })
    })

    // How to get all separate records underneat this one..
    var ev = $.Event('added.ac.persist', { key: key })
    this.$element.trigger(ev)

    // Don't add mutation until after added, so we don't count initialization mutation...
    var options = $.extend({}, this.options, { characterData: true, subtree: true })
    observer.observe($this.$element[0], options)

    // Remove old observer at this key
    if ($this.observations[key]) $this.observations[key].disconnect()
    $this.observations[key] = observer
  }

  Persist.prototype.update = function (key, value) {
    switch (key.type) {
      case "attributes":
        var filter = this.filters[key]
        if (filter) {
          var currentValues = this.$element[0].getAttribute(key.path).split(/[,\s]+/)
          var storedValues = value.split(/[,\s]+/)

          var newValues = $.grep(currentValues, function (item) { return filter.indexOf(item) < 0 })
          newValues = $.unique($.merge(newValues, storedValues))
          value = newValues.join(' ')
        }
        this.$element.attr(key.path, value)
        break;

      case "characterData":
        var node = this.$element[0]
        key.path.split('.').forEach(function(idx) {
          node = node.childNodes[idx]
        })
        window.node = node
        node.replaceData(0, node.length, value)
        break;

      // case "childList":
      //   break;
    }
  }


  // PERSIST PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
    var args = Array.prototype.slice.call(arguments, Plugin.length)
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('ac.persist')

      // Reset if we call the constructor again with options
      if (typeof option == 'object' && option && data) data = false

      var options = $.extend({}, Persist.DEFAULTS, $this.data(), data && data.options, typeof option == 'object' && option)

      if (!data) $this.data('ac.persist', (data = new Persist(this, options)))
      if (typeof option == 'string') data[option].apply(data, args)
    })
  }

  var old = $.fn.persist

  $.fn.persist             = Plugin
  $.fn.persist.Constructor = Persist

  // PERSIST NO CONFLICT
  // ===================

  $.fn.persist.noConflict = function () {
    $.fn.persist = old
    return this
  }

  return Persist
});

// TODOs:
//  * How to address messages that were created with $(document).message
//    (esp. remove them; maybe $(document).message('hide')?)
//  * Creting a message with just a string should default it to the content
//    field?
+function (factory) {
  if (typeof define === 'function' && define.amd) {
    define('adcom/message', ['jquery'], factory)
  } else {
    factory(window.jQuery)
  }
}(function ($) {
  'use strict';

  // MESSAGE CLASS DEFINITION
  // ========================
  var Message = function (element, options) {
    this.options  = options
    this.$element = $(element)[0] == document ? $('<div class="message fade ' + this.options.class + '">').appendTo('body') : $(element)
    this.$body    = $(document.body)
    this.isShown  = null

    this.$element.on('click.dismiss.ac.message', '[data-dismiss="message"]', $.proxy(this.hide, this))
  }

  Message.VERSION = '0.1.0'

  Message.TRANSITION_DURATION = 300

  Message.DEFAULTS = {
    show: true,
    html: false,
    dismiss: true,
    class: ''
  }

  Message.prototype.show = function (_relatedTarget) {
    var that = this

    var e = $.Event('show.ac.message', { relatedTarget: _relatedTarget })
    this.$element.trigger(e)

    if (this.isShown || e.isDefaultPrevented()) return

    this.$body.trigger('click.dismiss.ac.message')
    var timeoutDuration = this.$element.is(':visible') ? Message.TRANSITION_DURATION : 0
    var transition = $.support.transition && this.$element.hasClass('fade')

    this.isShown = true

    if (!this.$element.parent().length) {
      this.$element.appendTo(this.$body)
    }

    if (this.options.content) {
      this.$element.children().detach().end()[
        this.options.html ? (typeof this.options.content == 'string' ? 'html' : 'append') : 'text'
      ](this.options.content)
    }

    setTimeout(function() {
      that.$element
        .show()
        .scrollTop(0)

      if (transition) {
        that.$element[0].offsetWidth
      }

      that.$element.addClass('in')

      if (that.options.expire && that.options.expire > 0) {
        that.expireTimeout = setTimeout($.proxy(that.hide, that), that.options.expire)
      }

      if (that.options.dismiss) {
        that.$body.one('click.dismiss.ac.message', function (e) { that.hide() })
        that.$element.on('click.ac.message', function (e) { e.stopPropagation() })
      }

      var e = $.Event('shown.ac.message', { relatedTarget: _relatedTarget })
      that.$element.trigger(e)
    }, timeoutDuration)
  }

  Message.prototype.hide = function (e) {
    if (e) e.preventDefault()

    e = $.Event('hide.ac.message')

    this.$element.trigger(e)

    if (!this.isShown || e.isDefaultPrevented()) return
    this.isShown = false

    this.$element
      .addClass('out')
      .removeClass('in')
    this.$body.off('click.dismiss.ac.message')

    if (this.expireTimeout) {
      clearTimeout(this.expireTimeout)
      this.expireTimeout = null
    }

    $.support.transition && this.$element.hasClass('fade') ?
      this.$element
        .one('bsTransitionEnd', $.proxy(this.hideMessage, this))
        .emulateTransitionEnd(Message.TRANSITION_DURATION) :
      this.hideMessage()
  }

  Message.prototype.hideMessage = function () {
    if (!this.isShown) this.$element.hide()
    this.$element
      .removeClass('out')
      .trigger('hidden.ac.message')
  }

  // MESSAGE PLUGIN DEFINITION
  // =========================

  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this = $(this)

      var data  = $this.data('ac.message')

      // Reset if we call the constructor again with options
      if (typeof option == 'object' && option && data) data = false

      var options = $.extend({}, Message.DEFAULTS, $this.data(), data && data.options, typeof option == 'object' && option)

      if (!data) $this.data('ac.message', (data = new Message($this, options)))
      if (typeof option == 'string') data[option](_relatedTarget)
      $.extend(data.options, options)
      if (options.show) data.show(_relatedTarget)
    })
  }

  var old = $.fn.message

  $.fn.message             = Plugin
  $.fn.message.Constructor = Message

  // MESSAGE NO CONFLICT
  // ===================

  $.fn.message.noConflict = function () {
    $.fn.message = old
    return this
  }


  // MESSAGE DATA-API
  // ================

  $(document).on('click.ac.message.data-api', '[data-toggle="message"]', function (e) {
    var $this   = $(this)
    var $target = $($this.attr('data-target') || document)
    var option  = $.extend({}, $target.data(), $this.data())

    if ($this.is('a')) e.preventDefault()

    Plugin.call($target, option, this)
  })

});

+function (factory) {
  if (typeof define === 'function' && define.amd) {
    define('adcom', [
      'adcom/list',
      'adcom/form',
      'adcom/message',
      'adcom/persist',
      'adcom/session'
    ], factory)
  }
}(function ($) {
  'use strict';
});
