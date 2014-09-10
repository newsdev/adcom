/*

  Action API:
    toggle      (el...)
    select      (el...)
    deselect    (el...)

    sort (attr / function, direction)

    insertAt  (index, item)
    removeAt  (index)

  Helper API:
    getSelected ()
    setItems (items...)

    show ()
    destroy ()

  Philosophies:
    Create an little markup for you as possible. You should be in control of
    how your page looks.

 */
+function ($) {
  'use strict';

  // INDEX CLASS DEFINITION
  // ======================

  var Index = function (element, options) {
    var $this = this
    this.options  = options
    this.$element = $(element)

    this.$items   = typeof this.options.items    === 'string' ? JSON.parse(this.options.items)              : this.options.items
    this.template = typeof this.options.template === 'string' ? this.compileTemplate(this.options.template) : (this.options.template || this.defaultTemplate())

    this.states   = this.options.states === 'string' ? this.options.states.split(/,\s*/) : this.options.states || []
    this.rendered = []

    this.sort        = null
    this.filters     = {}
    this.currentPage = parseInt(this.options.currentPage || 1)
    this.pageSize    = parseInt(this.options.pageSize || 1)

    this.setInitialState()

    this.show()
  }

  Index.VERSION = '0.0.1'

  Index.EVENTS  = $.map('scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave load resize scroll unload error keydown keypress keyup load resize scroll unload error blur focus focusin focusout change select submit'.split(' '), function (e) { return e + ".adcom.index.data-api" }).join(' ')

  Index.DEFAULTS = {
    templateEngine: 'string',
    items: [],
    fields: [],
    states: [],
    selectedClass: 'active',
    pagination: 'off',
    currentPage: 1,
    pageSize: 20
  }

  // Orchestration

  Index.prototype.show = function () {
    var $this = this
    var items = $this.getCurrentItems()

    $($this.$element).empty()
    $this.rendered = []

    $this.$element.trigger($.Event('render.adcom.index', { items: items }))

    $.each(items, function (idx, item) {
      var renderedItem = $this.renderItem(item)
      $($this.$element).append(renderedItem)
    })

    $this.$element.trigger($.Event('rendered.adcom.index', { items: items }))
  }

  Index.prototype.destroy = function () {
    this.$element.off('.adcom.index').removeData('adcom.index')
    this.$element.empty()
    this.states = []
  }

  // Actions

  Index.prototype.select = function (selector) {
    var $this = this
    $(selector).each(function (idx, el) { $this.changeState(el, true) })
  }

  Index.prototype.deselect = function (selector) {
    var $this = this
    $(selector).each(function (idx, el) { $this.changeState(el, false) })
  }

  Index.prototype.toggle = function (selector) {
    var $this = this
    $(selector).each(function (idx, el) {
      var idx = $(el).data('adcom.index.idx')
      $this.changeState(el, $this.states[idx] ? false : true)
    })
  }

  // Helpers

  Index.prototype.changeState = function (el, state) {
    var item   = $(el).data('adcom.index.item')
    var action = state ? 'select' : 'unselect'

    this.$element.trigger($.Event('toggle.adcom.index', { item: item, el: el, state: state }))
    this.$element.trigger($.Event(action + '.adcom.index', { item: item, el: el }))

    // var idx = this.$items.indexOf($(el).data('adcom.index.item'))
    var idx = $(el).data('adcom.index.idx')
    this.states[idx] = state
    if (state) { $(el).addClass(this.options.selectedClass) } else { $(el).removeClass(this.options.selectedClass) }

    this.$element.trigger($.Event(action + 'ed.adcom.index', { item: item, el: el }))
    this.$element.trigger($.Event('toggled.adcom.index', { item: item, el: el, state: state }))
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
    this.toggleFilter($('.active[data-filter][data-target]'))
    this.toggleSort($('.active[data-sort][data-target]'))
    this.toggleSearch($('[data-search][data-target][value]'))
  }

  // Template

  Index.prototype.compileTemplate = function (template) {
    switch (this.options.templateEngine) {
      case 'string':
        return function () { return template }
      case 'underscore':
        return _.template(template)
      default:
        throw "Unkown templateEngine for Index: " + this.options.templateEngine
    }
  }

  Index.prototype.defaultTemplate = function () {
    var fields = typeof this.options.fields === 'string' ? this.options.fields.split(/,\s*/) : this.options.fields
    var templateString = ''

    $.each(fields, function (idx, field) {
      templateString += '<td data-field="' + field + '"></td>'
    })

    templateString = '<tr data-toggle="select">' + templateString + '</tr>'

    return this.compileTemplate(templateString)
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

  Index.prototype.setSort = function (field, reverse) {
    if (field === null || field === undefined) return this.sort = null

    var factor = reverse ? -1 : 1

    // set a custom sort function
    if (typeof field === 'function') {
      return this.sort = function (a, b) { return field(a, b) * factor }
    }

    // default sort function based on single attribute and direction
    this.sort = function (a, b) {
      var left  = (typeof a[field] === 'function' ? a[field]() : a[field]) || ''
      var right = (typeof b[field] === 'function' ? b[field]() : b[field]) || ''

      if (left < right) return factor * -1
      if (left > right) return factor * 1
      return 0
    }
    this.currentPage = 1
  }

  Index.prototype.setFilter = function (fields, value) {
    fields = typeof fields === 'string' ? fields.split(/,\s*/) : fields
    fields = $.isArray(fields) ? fields : [fields]

    this.currentPage = 1

    // If value is undefined, remove this filter
    if (value === undefined) return delete this.filters[fields]
    if (typeof value === 'function') return this.filters[fields] = value

    this.filters[fields] = function (item) {
      var matches = false
      var match_all_fields = fields === null

      $.each(item, function (field, fieldValue) {
        if (!matches && (match_all_fields || fields.indexOf(field) > -1)) {
          var itemValue = typeof item[field] === 'function' ? item[field]() : item[field]
          if (String(itemValue).toLowerCase().indexOf(value) > -1) matches = true
        }
      })
      return matches
    }
  }

  // Modeled after PourOver's .getCurrentItems. Should return the items in a
  // collection which have been filtered, sorted, and paged.
  Index.prototype.getCurrentItems = function () {
    var $this        = this
    var visibleItems = this.$items.slice(0) // dup

    // filter
    if (!$.isEmptyObject(this.filters)) {
      var filtered = []
      $.each(visibleItems, function (idx, item) {
        var matches = true
        $.each($this.filters, function (fields, filter) {
          if (!matches || !filter(item)) matches = false
        })
        if (matches) filtered.push(item)
      })
      visibleItems = filtered
    }

    // sort
    if (this.sort) visibleItems = visibleItems.sort(this.sort)

    // paginate
    if (this.options.pagination == 'on') {
      visibleItems = this.getCurrentPage(visibleItems)
    }

    return visibleItems
  }

  Index.prototype.getCurrentPage = function (items) {
    var count    = items.length
    var pages    = Math.ceil(count / this.pageSize)
    var startIdx = (this.currentPage - 1) * this.pageSize
    var endIdx   = startIdx + this.pageSize
    var start    = Math.min(startIdx + 1, count)
    var end      = Math.min(endIdx, count)

    this.$element.trigger($.Event('paginate.adcom.index', { page: this.currentPage, pages: pages, count: count, items: items, start: start, end: end }))

    items = items.slice(startIdx, endIdx)

    this.$element.trigger($.Event('paginated.adcom.index', { page: this.currentPage, pages: pages, count: count, items: items, start: start, end: end }))
    return items
  }

  Index.prototype.page = function (page) {
    this.currentPage = parseInt(page)
    this.show()
  }

  // Rendering

  Index.prototype.renderItem = function (item) {
    var $this    = this
    var $item    = item
    var $idx     = this.$items.indexOf(item)
    var compiled = this.template($item)
    var el       = $(compiled)

    if (this.states[$idx]) el.addClass(this.options.selectedClass)

    el.find('[data-field]').each(function (idx, fieldContainer) {
      var field = $(fieldContainer).attr('data-field')
      var value = typeof $item[field] !== 'function' ? $item[field] : $item[field]()
      $(fieldContainer).html(value)
    })

    el.data('adcom.index.item', $item)
    el.data('adcom.index.idx', $idx)
    el.on('update.adcom.index', function (e) {
      $.extend($item, e.item)
      $this.updateAtIndex($idx, $item)
    })

    $this.rendered[$idx] = el

    return el
  }

  Index.prototype.updateAtIndex = function (idx, item) {
    this.$items[idx] = item

    if (this.rendered[idx]) this.rendered[idx].replaceWith(this.renderItem(item))
  }

  // Trigger definitions

  Index.prototype.toggleSort = function (el) {
    var $this = this
    el.each(function () {
      var $el     = $(this)
      var $target = $($el.data('target'))
      if ($target[0] !== $this.$element[0]) return

      var field   = $el.data('sort')
      var states  = ($el.data('states') || 'ascending,descending,off').split(/,\s*/)

      // cycle between sorted, reversed, and not sorted
      // clear all other sorts
      var state     = $el.attr('data-state')
      var stateIdx  = states.indexOf(state)
      var nextState = states[(stateIdx + 1) % states.length]
      $('[data-sort][data-target="' + $target.selector + '"]').removeAttr('data-state')

      if (nextState !== 'off') $el.attr('data-state', nextState)

      $this.setSort(field, {'ascending': false, 'descending': true, 'off': null}[nextState])
      // $this.show()
    })
  }

  Index.prototype.toggleSearch = function (el) {
    var $this = this
    el.each(function () {
      var $el     = $(this)
      var $target = $($el.data('target'))
      if ($target[0] !== $this.$element[0]) return

      var fields  = $el.data('search')
      var value   = $el.val() == '' ? undefined : $el.val()

      $this.setFilter(fields, value)
      // $this.show()
    })
  }

  Index.prototype.toggleFilter = function (el) {
    var $this = this
    el.each(function () {
      var $el     = $(this)
      var $target = $($el.data('target'))
      if ($target[0] !== $this.$element[0]) return

      var fields  = $el.data('filter')
      var value   = $el.data('match')

      $this.setFilter(fields, value)
      // $this.show()
    })
  }

  // INDEX PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
    var args = Array.prototype.slice.call(arguments, Plugin.length)
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('adcom.index')

      // Reset the index if we call the constructor again with options
      if (typeof option == 'object' && option && data) data.destroy(), data = false

      var options = $.extend({}, Index.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('adcom.index', (data = new Index(this, options)))
      if (typeof option == 'string') data[option].apply(data, args)

      return data
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
      if ($(current).data(attr)) return $(current)
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

  $(document).on(Index.EVENTS, '[data-search]', function (e) {
    var $this    = $(this).closest('[data-search]')
    var $target  = $($this.data('target'))
    var triggers = ($this.attr('data-trigger') || 'change').split(' ')

    if (triggers.indexOf(e.type) == -1) return

    Plugin.call($target, 'toggleSearch', $this)
    Plugin.call($target, 'show')
  })

  $(document).on(Index.EVENTS, '[data-filter]', function (e) {
    var $this    = $(this).closest('[data-filter]')
    var $target  = $($this.data('target'))
    var triggers = ($this.attr('data-trigger') || 'click').split(' ')

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

}(jQuery);
