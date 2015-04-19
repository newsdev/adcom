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
