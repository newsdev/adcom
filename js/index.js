+function ($) {
  'use strict';

  // INDEX CLASS DEFINITION
  // ======================

  var Index = function (element, options) {
    var $this = this
    this.options  = options
    this.$element = $(element)

    this.$items   = typeof this.options.items === 'string' ? JSON.parse(this.options.items) : this.options.items
    this.template = this.parseTemplate(this.options.template)

    this.states   = this.options.states === 'string' ? this.options.states.split(/,\s*/) : this.options.states || []
    this.rendered = []

    this.sort        = null
    this.filters     = {}
    this.currentPage = parseInt(this.options.currentPage || 1)
    this.pageSize    = parseInt(this.options.pageSize || 1)

    this.setInitialState()

    if (this.options.remote) {
      $.getJSON(this.options.remote, function(items) {
        $this.$items = items
        if ($this.options.show) $this.show()
        $this.$element.trigger($.Event('loaded.adcom.index', { items: items }))
      })
    }
  }

  Index.VERSION = '0.1.0'

  Index.EVENTS  = $.map('scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave load resize scroll unload error keydown keypress keyup load resize scroll unload error blur focus focusin focusout change select submit'.split(' '), function (e) { return e + ".adcom.index.data-api" }).join(' ')

  Index.DEFAULTS = {
    show: true,
    items: [],
    states: [],
    selectedClass: '',
    filtering: 'on',
    sorting: 'on',
    pagination: 'off',
    currentPage: 1,
    pageSize: 20
  }

  // Orchestration

  Index.prototype.show = function () {
    var $this = this

    $this.$element.trigger('show.adcom.index')

    var items = $this.getCurrentItems()

    $($this.$element).empty()
    $this.rendered = []

    $.each(items, function (idx, item) {
      var renderedItem = $this.renderItem(item)
      $($this.$element).append($this.renderItem(item))
    })

    $this.$element.trigger($.Event('shown.adcom.index', { items: items }))
  }

  // Actions
  // selector can be a jQuery selector, item index, or an array of item indices

  Index.prototype.select = function (selector) {
    var $this = this
    selector = $.map([selector], function(n) {return n;})
    $(selector).each(function (idx, el) { $this.changeState(el, true) })
  }

  Index.prototype.deselect = function (selector) {
    var $this = this
    selector = $.map([selector], function(n) {return n;})
    $(selector).each(function (idx, el) { $this.changeState(el, false) })
  }

  Index.prototype.toggle = function (selector) {
    var $this = this
    selector = $.map([selector], function(n) {return n;})
    $(selector).each(function (idx, el) {
      var idx = (typeof el == 'number') ? el : $(el).data('adcom.index.idx')
      $this.changeState(el, $this.states[idx] ? false : true)
    })
  }

  // Helpers

  Index.prototype.changeState = function (el, state) {
    if (typeof el === 'number') {
      var item   = this.$items[el]
      var idx    = el
      var target = this.rendered[idx]
    } else {
      var target = $(el)
      var item   = target.data('adcom.index.item')
      var idx    = target.data('adcom.index.idx')
    }

    this.$element.trigger($.Event('toggle.adcom.index', { item: item, target: target, index: idx, state: state }))

    this.states[idx] = state
    if (state) { target.addClass(this.options.selectedClass) } else { target.removeClass(this.options.selectedClass) }

    this.$element.trigger($.Event('toggled.adcom.index', { item: item, target: target, index: idx, state: state }))
  }

  Index.prototype.getSelected = function () {
    var selected = []
    var $this = this
    $.each(this.$items, function (idx, item) {
      if ($this.states[idx]) selected.push(item)
    })
    return selected
  }

  Index.prototype.setInitialState = function () {
    var $this = this
    this.toggleFilter($('.active[data-filter][data-target]'))

    $('[data-sort]').each(function (e) {
      var el = $(this)
      if ($(el.data('target'))[0] != $this.$element[0]) return

      var field = el.data('sort')
      if (el.hasClass('sort-ascending')) $this.setSort(field, false)
      if (el.hasClass('sort-descending')) $this.setSort(field, true)
    });
  }

  // Templates

  Index.prototype.parseTemplate = function (template) {
    if (typeof template === 'function') return template
    if (typeof template === 'string')   return this.compileTemplate(template)
    if (this.options.fields) return this.defaultTemplate()
    return this.compileTemplate(unescapeString(this.$element.html()))
  }

  Index.prototype.compileTemplate = function (template) {
    if (this.options.templateEngine) return this.options.templateEngine(template)
    return function() { return template }
  }

  Index.prototype.defaultTemplate = function () {
    var fields = typeof this.options.fields === 'string' ? this.options.fields.split(/,\s*/) : this.options.fields
    var templateString = ''

    $.each(fields, function (idx, field) {
      templateString += '<td data-field="' + field + '"></td>'
    })

    return this.compileTemplate('<tr>' + templateString + '</tr')
  }

  function unescapeString (string) {
    // Adapted from Underscore.js 1.7.0
    // http://underscorejs.org
    // (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
    // Underscore may be freely distributed under the MIT license.
    var map = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#x60;': '`'
    };
    var escaper = function (match) { return map[match] }
    var source = '(?:' + Object.getOwnPropertyNames(map).join('|') + ')'
    var testRegexp = RegExp(source)
    var replaceRegexp = RegExp(source, 'g')

    string = string == null ? '' : '' + string
    return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string
  }

  // Sort / Scope
  //
  // These functions accept simple inputs (such as an attribute and value)
  // and create a single sort or filter function. This function is then saved
  // into index.sort or index.filter.
  //
  // To create a more complex sorting function, set your own to those variables
  // and it will be used instead from index.getCurrentItems.
  //
  // For even more control, write your own .getCurrentItems function, which is
  // called to retrieve the list of items to render in the current view.

  Index.prototype.getSort = function (field, reverse) {
    var factor = reverse ? -1 : 1

    if (field === null || field === undefined) return null
    if (typeof field === 'function') return function (a, b) { return field(a, b) * factor }

    // default sort function based on single attribute and direction
    return function (a, b) {
      var left  = (typeof a[field] === 'function' ? a[field]() : a[field]) || ''
      var right = (typeof b[field] === 'function' ? b[field]() : b[field]) || ''

      if (left < right) return factor * -1
      if (left > right) return factor * 1
      return 0
    }
  }

  Index.prototype.getFilter = function (key, value) {
    if (typeof value === 'function' || value === undefined) return value

    // Use the built-in filter generator if value is not undefined (delete) or
    // a function itself.
    var fields = typeof key === 'string' ? key.split(/,\s*/) : key
    fields = $.isArray(fields) ? fields : [fields]
    return function (item) {
      var matches = false
      var match_all_fields = fields === null
      value = value.toLowerCase()

      $.each(item, function (field, fieldValue) {
        if (!matches && (match_all_fields || fields.indexOf(field) > -1)) {
          var itemValue = typeof item[field] === 'function' ? item[field]() : item[field]
          if (String(itemValue).toLowerCase().indexOf(value) > -1) matches = true
        }
      })
      return matches
    }
  }

  Index.prototype.setSort = function (field, reverse) {
    this.$element.trigger($.Event('sortChange.adcom.index', { }))
    this.sort = this.getSort(field, reverse)
    this.currentPage = 1
    this.$element.trigger($.Event('sortChanged.adcom.index', { function: this.sort }))
  }

  Index.prototype.setFilter = function (key, filter) {
    this.$element.trigger($.Event('filterChange.adcom.index', { key: key }))

    if (filter === undefined) {
      delete this.filters[key]
    } else this.filters[key] = this.getFilter(key, filter)

    this.currentPage = 1
    this.$element.trigger($.Event('filterChanged.adcom.index', { key: key, function: filter }))
  }

  Index.prototype.setCurrentPage = function (page) {
    this.$element.trigger($.Event('pageChange.adcom.index', { }))
    this.currentPage = parseInt(page)
    this.$element.trigger($.Event('pageChanged.adcom.index', { page: this.currentPage }))
  }

  Index.prototype.page = function (page) {
    this.setCurrentPage(page)
    this.show()
  }

  // Modeled after PourOver's .getCurrentItems. Should return the items in a
  // collection which have been filtered, sorted, and paged.
  Index.prototype.getCurrentItems = function () {
    var visibleItems = this.$items.slice(0) // dup

    // filter
    if (this.options.filtering == 'on') visibleItems = this.getFilteredItems(visibleItems)

    // sort
    if (this.options.sorting == 'on') visibleItems = this.getSortedItems(visibleItems)

    // paginate
    if (this.options.pagination == 'on') visibleItems = this.getPaginatedItems(visibleItems)

    return visibleItems
  }

  Index.prototype.getFilteredItems = function (items) {
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

  Index.prototype.getSortedItems = function (items) {
    return this.sort ? items.sort(this.sort) : items
  }

  Index.prototype.getPaginatedItems = function (items) {
    var count    = items.length
    var pages    = Math.ceil(count / this.pageSize)
    var startIdx = (this.currentPage - 1) * this.pageSize
    var endIdx   = startIdx + this.pageSize
    var start    = Math.min(startIdx + 1, count)
    var end      = Math.min(endIdx, count)

    items = items.slice(startIdx, endIdx)

    this.$element.trigger($.Event('paginated.adcom.index', { page: this.currentPage, pages: pages, count: count, items: items, start: start, end: end }))
    return items
  }

  // Rendering

  Index.prototype.renderItem = function (item) {
    var $this    = this
    var $item    = item
    var $idx     = this.$items.indexOf(item)
    var compiled = this.template($item)
    var el       = $(compiled)

    if (this.states[$idx]) el.addClass(this.options.selectedClass)

    var dynamicElements = el.data('field') === undefined ? el.find('[data-field]') : el

    dynamicElements.each(function (idx, fieldContainer) {
      var field = $(fieldContainer).attr('data-field')
      var value = typeof $item[field] !== 'function' ? $item[field] : $item[field]()
      $(fieldContainer).html(String(value || ''))
    })

    el.data('adcom.index.item', $item)
    el.data('adcom.index.idx', $idx)
    el.on('update.adcom.index', function (e) {
      $this.updateItemAtIndex($idx, e.item)
    })

    $this.rendered[$idx] = el[0]

    return el[0]
  }

  // Updates

  Index.prototype.add = function (data, opts) {
    opts = opts || {}
    opts.idx = opts.idx == undefined ? this.$items.length - 1 : opts.idx

    this.$items.splice(opts.idx, 0, data)
    this.states.splice(opts.idx, 0, undefined)
    this.rendered.splice(opts.idx, 0, undefined)

    this.show()
  }

  Index.prototype.update = function (item, data, opts) {
    var idx = typeof item == 'number' ? item : $(item).data('adcom.index.idx')
    this.$items[idx] = data

    if (this.rendered[idx]) {
      var original    = $(this.rendered[idx])
      var replacement = this.renderItem(data)
      original.replaceWith(replacement)
      this.rendered[idx] = replacement[0]
    }

    this.show()
  }

  Index.prototype.delete = function (item, opts) {
    var idx = typeof item == 'number' ? item : $(item).data('adcom.index.idx')
    this.$items.splice(idx, 1)
    this.states.splice(idx, 1)
    this.rendered.splice(idx, 1)

    this.show()
  }

  Index.prototype.destroy = function () {
    this.$element.off('.adcom.index').removeData('adcom.index')
    this.$element.empty()
    this.states = []
    this.rendered = []
  }

  // Trigger definitions

  Index.prototype.toggleSort = function (el) {
    var $this = this
    el.each(function () {
      var $el = $(this)
      var $target = $($el.data('target'))
      // if ($target[0] !== $this.$element[0]) return

      var field = $el.data('sort')
      var states = ($el.data('states') || 'ascending,descending').split(/,\s*/)

      // Cycle between sorted, reversed, and not sorted.
      // Clear all other sorts on this index.
      var state = ($el.attr('class').match(/[\^\s]sort-(ascending|descending)/) || [])[1]
      var stateIdx = states.indexOf(state)
      var nextState = states[(stateIdx + 1) % states.length]

      $('[data-sort][data-target="' + $el.data('target') + '"]').removeClass('sort-ascending sort-descending')
      if (nextState !== 'off') $el.addClass('sort-' + nextState)

      $this.setSort(field, {'ascending': false, 'descending': true, 'off': null}[nextState])
    })
  }

  Index.prototype.toggleFilter = function (el) {
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

  // Data accessor

  Index.data = function (name) {
    var attr = "adcom.index"
    if (name) attr = attr + "." + name
    var el = closestWithData($(this), attr)
    if (el) return el.data(attr)
  }

  // INDEX PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
    var args = Array.prototype.slice.call(arguments, Plugin.length)
    if (option == 'data') return Index.data.apply(this, args)
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('adcom.index')

      // Reset the index if we call the constructor again with options
      if (typeof option == 'object' && option && data) data = false

      var options = $.extend({}, Index.DEFAULTS, $this.data(), data && data.options, typeof option == 'object' && option)

      if (!data) $this.data('adcom.index', (data = new Index(this, options)))
      if (typeof option == 'string') data[option].apply(data, args)
      else if (options.show && !options.remote) data.show()
    })
  }

  $.fn.index             = Plugin
  $.fn.index.Constructor = Index


  // INDEX NO CONFLICT
  // =================

  $.fn.index.noConflict = function () {
    $.fn.index = old
    return this
  }


  // INDEX DATA-API
  // ==============

  function closestWithData (el, attr) {
    return $.makeArray(el).concat($.makeArray($(el).parents())).reduce(function (previous, current) {
      if (previous) return previous
      if ($(current).data(attr) !== undefined) return $(current)
    }, null)
  }

  $(document).on(Index.EVENTS, '[data-toggle="select"]', function (e) {
    var $this    = $(this).closest('[data-toggle="select"]')
    var triggers = ($this.attr('data-trigger') || 'click').split(' ')

    if (triggers.indexOf(e.type) == -1) return

    var item    = closestWithData($this, 'adcom.index.item')
    var $target = closestWithData($this, 'adcom.index')

    Plugin.call($target, 'toggle', item)
  })

  $(document).on('click.adcom.index.data-api', '[data-sort]', function (e) {
    var $this   = $(this).closest('[data-sort]')
    var $target = $($this.data('target'))

    Plugin.call($target, 'toggleSort', $this)
    Plugin.call($target, 'show')
  })

  $(document).on(Index.EVENTS, '[data-filter]', function (e) {
    var $this        = $(this).closest('[data-filter]')
    var $target      = $($this.data('target'))
    var defaultEvent = $this.is(':input') ? 'change' : 'click'
    var triggers     = ($this.attr('data-trigger') || defaultEvent).split(' ')

    if (triggers.indexOf(e.type) == -1) return

    Plugin.call($target, 'toggleFilter', $this)
    Plugin.call($target, 'show')
  })

  $(document).on('click.adcom.index.data-api', '[data-page]', function (e) {
    var $this    = $(this).closest('[data-page]')
    var $target  = $($this.data('target'))

    Plugin.call($target, 'page', $this.data('page'))
    Plugin.call($target, 'show')
  })

  $(window).on('load', function () {
    $('[data-control="index"]').each(function () {
      Plugin.call($(this))
    })
  })

}(jQuery);
