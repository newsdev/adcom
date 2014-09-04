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

    this.states = []
    this.sort   = null

    this.show()
  }

  Index.VERSION = '0.0.1'

  Index.EVENTS  = $.map('scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave load resize scroll unload error keydown keypress keyup load resize scroll unload error blur focus focusin focusout change select submit'.split(' '), function (e) { return e + ".adcom.index" }).join(' ')

  Index.DEFAULTS = {
    templateEngine: 'string',
    items: [],
    fields: []
  }

  // Orchestration

  Index.prototype.show = function () {
    var visibleItems = this.getCurrentItems()
    this.renderItems(visibleItems)
  }

  Index.prototype.destroy = function () {
    this.$element.off('.adcom.index').removeData('adcom.index')
    this.$element.empty()
  }

  // Actions

  Index.prototype.select = function (selector) {
    var $this = this
    $(selector).each(function (idx, el) { $this.changeState(el, 'select') })
  }

  Index.prototype.deselect = function (selector) {
    var $this = this
    $(selector).each(function (idx, el) { $this.changeState(el, 'deselect') })
  }

  Index.prototype.toggle = function (selector) {
    var $this = this
    $(selector).each(function (idx, el) {
      var idx = $this.$items.indexOf($(el).data('adcom.index.item'))
      var selected = $this.states[idx] == 'selected'
      $this.changeState(el, selected ? 'deselect' : 'select')
    })
  }

  // Helpers

  Index.prototype.changeState = function (el, action) {
    var item = $(el).data('adcom.index.item')

    this.$element.trigger($.Event('toggle.adcom.index', { item: item }))
    this.$element.trigger($.Event(action + '.adcom.index', { item: item }))

    var idx = this.$items.indexOf($(el).data('adcom.index.item'))
    this.states[idx] = action + 'ed'

    this.$element.trigger($.Event(action + 'ed.adcom.index', { item: item }))
    this.$element.trigger($.Event('toggled.adcom.index', { item: item }))
  }

  Index.prototype.getSelected = function () {
    var selected = []
    var $this = this
    $.each(this.$items, function (idx, item) {
      if ($this.states[idx] == 'selected') selected.push(item)
    })
    return selected
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
  }

  Index.prototype.setFilter = function (fields, value) {
    fields = $.isArray(fields) ? fields : [fields]

    this.filter = function (item) {
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
  // collection which have been filtered, sorted[, and paged?].
  Index.prototype.getCurrentItems = function () {
    var $this        = this
    var visibleItems = this.$items.slice(0)

    // filter
    if (this.filter) {
      var filtered = []
      $.each(visibleItems, function (idx, item) {
        if ($this.filter(item)) filtered.push(item)
      })
      visibleItems = filtered
    }

    // sort
    if (this.sort) visibleItems = visibleItems.sort(this.sort)

    // [paginate]
    // tktk

    return visibleItems
  }

  // Rendering

  Index.prototype.renderItems = function (items) {
    var $this = this
    $(this.$element).empty()

    this.$element.trigger($.Event('render.adcom.index', { items: items }))

    $.each(items, function (idx, item) {
      var renderedItem = $this.renderItem(item)
      $($this.$element).append(renderedItem)
    })

    this.$element.trigger($.Event('rendered.adcom.index', { items: items }))
  }

  Index.prototype.renderItem = function (item) {
    var $this    = this
    var compiled = this.template(item)
    var el       = $(compiled)

    el.find('[data-field]').each(function (idx, fieldContainer) {
      var field = $(fieldContainer).attr('data-field')
      var value = typeof item[field] !== 'function' ? item[field] : item[field]()
      $(fieldContainer).html(value)
    })

    el.data('adcom.index.item', item)

    return el
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
    return $.makeArray(el).concat($.makeArray(el.parents())).reduce(function (previous, current) {
      if (previous) return previous
      if ($(current).data(attr)) return $(current)
    }, null)
  }

  $(document).on('click.adcom.index.data-api', '[data-sort]', function (e) {
    var target = $(e.target).data('target')
    var index  = $(target).data('adcom.index')
    var field  = $(e.target).data('sort')
    var states = ($(e.target).data('states') || 'ascending,descending,off').split(/,\s*/)

    // cycle between sorted, reversed, and not sorted
    // clear all other sorts
    var state     = $(e.target).attr('data-state')
    var stateIdx  = states.indexOf(state)
    var nextState = states[(stateIdx + 1) % states.length]
    $('[data-sort][data-target="' + target + '"]').removeAttr('data-state')

    if (nextState !== 'off') $(e.target).attr('data-state', nextState)
    index.setSort(field, {'ascending': false, 'descending': true, 'off': null}[nextState])

    index.show()
  })

  $(document).on(Index.EVENTS, '[data-toggle="select"]', function (e) {
    var target   = $(e.target).closest('[data-toggle]')
    var triggers = (target.attr('data-trigger') || 'click').split(' ')

    if (triggers.indexOf(e.type) == -1) return

    var item  = closestWithData(target, 'adcom.index.item')
    var index = closestWithData(target, 'adcom.index').data('adcom.index')

    index.toggle(item)
  })

  // data-api filters

  $(document).on(Index.EVENTS, '[data-search]', function (e) {
    var target   = $(e.target).closest('[data-search]')
    var triggers = (target.attr('data-trigger') || 'change').split(' ')
    var action   = target.attr('data-trigger')

    if (triggers.indexOf(e.type) == -1) return

    var index  = $($(e.target).data('target')).data('adcom.index')

    var fields = $(e.target).data('search')
    fields = typeof fields !== 'undefined' ? fields.split(/,\s*/) : null
    var value  = $(e.target).val()

    index.setFilter(fields, value)

    index.show()
  })

}(jQuery);
