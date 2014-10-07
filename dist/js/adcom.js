+function ($) {
  'use strict';

  // LIST CLASS DEFINITION
  // =====================

  var List = function (element, options) {
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
        $this.$element.trigger($.Event('loaded.ac.list', { items: items }))
      })
    }
  }

  List.VERSION = '0.1.0'

  List.EVENTS  = $.map('scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave load resize scroll unload error keydown keypress keyup load resize scroll unload error blur focus focusin focusout change select submit'.split(' '), function (e) { return e + ".ac.list.data-api" }).join(' ')

  List.DEFAULTS = {
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

  List.prototype.show = function () {
    var $this = this

    $this.$element.trigger('show.ac.list')

    var items = $this.getCurrentItems()

    $this.$element.empty()
    $this.rendered = []

    $.each(items, function (idx, item) {
      var renderedItem = $this.renderItem(item)
      $($this.$element).append($this.renderItem(item))
    })

    $this.$element.trigger($.Event('shown.ac.list', { items: items }))
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
      $this.changeState(el, $this.states[index] ? false : true)
    })
  }

  // Helpers

  List.prototype.changeState = function (el, state) {
    if (typeof el === 'number') {
      var item   = this.$items[el]
      var idx    = el
      var target = $(this.rendered[idx])
    } else {
      var target = $(el)
      var item   = target.data('ac.list.item')
      var idx    = target.data('ac.list.index')
    }

    this.$element.trigger($.Event('toggle.ac.list', { item: item, target: target, index: idx, state: state }))

    this.states[idx] = state
    if (target) target[state ? 'addClass' : 'removeClass'](this.options.selectedClass)

    this.$element.trigger($.Event('toggled.ac.list', { item: item, target: target, index: idx, state: state }))
  }

  List.prototype.getSelected = function () {
    var selected = []
    var $this = this
    $.each(this.$items, function (idx, item) {
      if ($this.states[idx]) selected.push(item)
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
    });
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
      var left  = (typeof a[field] === 'function' ? a[field]() : a[field]) || ''
      var right = (typeof b[field] === 'function' ? b[field]() : b[field]) || ''

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

  List.prototype.setSort = function (field, reverse) {
    this.$element.trigger($.Event('sortChange.ac.list', { }))
    this.sort = this.getSort(field, reverse)
    this.currentPage = 1
    this.$element.trigger($.Event('sortChanged.ac.list', { function: this.sort }))
  }

  List.prototype.setFilter = function (key, filter) {
    this.$element.trigger($.Event('filterChange.ac.list', { key: key }))

    if (filter === undefined) {
      delete this.filters[key]
    } else this.filters[key] = this.getFilter(key, filter)

    this.currentPage = 1
    this.$element.trigger($.Event('filterChanged.ac.list', { key: key, function: filter }))
  }

  List.prototype.setCurrentPage = function (page) {
    this.$element.trigger($.Event('pageChange.ac.list', { }))
    this.currentPage = parseInt(page)
    this.$element.trigger($.Event('pageChanged.ac.list', { page: this.currentPage }))
  }

  // Modeled after PourOver's .getCurrentItems. Should return the items in a
  // collection which have been filtered, sorted, and paged.
  List.prototype.getCurrentItems = function () {
    var visibleItems = this.$items.slice(0) // dup

    // filter
    if (this.options.filtering == 'on') visibleItems = this.getFilteredItems(visibleItems)

    // sort
    if (this.options.sorting == 'on') visibleItems = this.getSortedItems(visibleItems)

    // paginate
    if (this.options.pagination == 'on') visibleItems = this.getPaginatedItems(visibleItems)

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

    el.data('ac.list.item', $item)
    el.data('ac.list.index', $idx)
    el.on('update.ac.list', function (e) {
      $this.update(el, e.item)
    })

    $this.rendered[$idx] = el[0]

    return el[0]
  }

  // Updates

  List.prototype.getItemIndex = function (item) {
    if (typeof item == 'number') return item
    if ($(item)[0] instanceof HTMLElement) return $(item).data('ac.list.index')
    return this.$items.indexOf(item)
  }

  List.prototype.add = function (data, opts) {
    opts = opts || {}
    opts.index = opts.index == undefined ? this.$items.length - 1 : opts.index

    this.$items.splice(opts.index, 0, data)
    this.states.splice(opts.index, 0, undefined)
    this.rendered.splice(opts.index, 0, undefined)

    this.show()
  }

  List.prototype.update = function (item, data, opts) {
    var index = this.getItemIndex(item)
    this.$items[index] = data

    if (this.rendered[index]) {
      var original    = $(this.rendered[index])
      var replacement = this.renderItem(data)
      original.replaceWith(replacement)
      this.rendered[index] = replacement[0]
    }

    this.show()
  }

  List.prototype.delete = function (item, opts) {
    var index = this.getItemIndex(item)
    this.$items.splice(index, 1)
    this.states.splice(index, 1)
    this.rendered.splice(index, 1)

    this.show()
  }

  List.prototype.destroy = function () {
    this.$element.off('.ac.list').removeData('ac.list')
    this.$element.empty()
    this.states = []
    this.rendered = []
  }

  // Trigger definitions

  List.prototype.toggleSort = function (el) {
    var $this = this
    el.each(function () {
      var $el = $(this)
      var $target = $($el.data('target'))
      // if ($target[0] !== $this.$element[0]) return

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

  // Data accessor

  List.data = function (name) {
    var attr = "ac.list"
    if (name) attr = attr + "." + name
    var el = closestWithData($(this), attr)
    if (el) return el.data(attr)
  }

  // LIST PLUGIN DEFINITION
  // ======================

  function Plugin(option) {
    var args = Array.prototype.slice.call(arguments, Plugin.length)
    if (option == 'data') return List.data.apply(this, args)
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('ac.list')

      // Reset the list if we call the constructor again with options
      if (typeof option == 'object' && option && data) data = false

      var options = $.extend({}, List.DEFAULTS, $this.data(), data && data.options, typeof option == 'object' && option)

      if (!data) $this.data('ac.list', (data = new List(this, options)))
      if (typeof option == 'string') data[option].apply(data, args)
      else if (options.show && !options.remote) data.show()
    })
  }

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

    var item    = closestWithData($this, 'ac.list.item')
    var $target = closestWithData($this, 'ac.list')

    Plugin.call($target, 'toggle', item)
  })

  $(document).on('click.ac.list.data-api', '[data-sort]', function (e) {
    var $this   = $(this).closest('[data-sort]')
    var $target = $($this.data('target'))

    Plugin.call($target, 'toggleSort', $this)
    Plugin.call($target, 'show')
  })

  $(document).on(List.EVENTS, '[data-filter]', function (e) {
    var $this        = $(this).closest('[data-filter]')
    var $target      = $($this.data('target'))
    var defaultEvent = $this.is(':input') ? 'change' : 'click'
    var triggers     = ($this.attr('data-trigger') || defaultEvent).split(' ')

    if (triggers.indexOf(e.type) == -1) return

    Plugin.call($target, 'toggleFilter', $this)
    Plugin.call($target, 'show')
  })

  $(document).on('click.ac.list.data-api', '[data-page]', function (e) {
    var $this    = $(this).closest('[data-page]')
    var $target  = $($this.data('target'))

    Plugin.call($target, 'page', $this.data('page'))
    Plugin.call($target, 'show')
  })

  $(window).on('load', function () {
    $('[data-control="list"]').each(function () {
      Plugin.call($(this))
    })
  })

}(jQuery);

+function ($) {
  'use strict';

  // FORM CLASS DEFINITION
  // =====================

  var Form = function (element, options) {
    this.options  = options
    this.$element = $(element)
  }

  Form.VERSION = '0.1.0'

  Form.DEFAULTS = {
    show: true,
    serialized: {}
  }

  Form.prototype.show = function (data, meta) {
    this.$element.trigger($.Event('show.ac.form', { serialized: data }))

    this.data = data
    this.$element[0].reset()
    this.$element.deserialize(data)

    meta = meta || {}
    this.sourceElement = meta.sourceElement
    this.sourceData    = meta.sourceData
    $(this.$element[0]).one('reset', $.proxy(function () {
      this.sourceElement =
      this.sourceData    = null
    }, this))

    this.$element.trigger($.Event('shown.ac.form', { serialized: data }))
  }

  Form.prototype.submit = function (opts) {
    var $this = this
    if (opts && opts.validate)
      return this.$element.one('validated.ac.form', function(e) {
        // if (e.isValid) $(e.target).trigger('submit')
        if (e.isValid) $this.submit({validate: false})
      }).form('validate')

    var attributes = this.serialize()
    $.extend(attributes, {
      relatedTarget: this.$element,
      sourceElement: this.sourceElement,
      sourceData:    this.sourceData
    })

    this.$element.trigger($.Event('submitted.ac.form', attributes))
  }

  Form.prototype.serialize = function () {
    var data     = {}
    var disabled = this.$element.find(':disabled').removeAttr('disabled')
    var array    = this.$element.serializeArray()
    disabled.attr('disabled', 'disabled')

    for (var idx in array) {
      if (array[idx].value === '') {
        data[array[idx].name] = null
      } else {
        data[array[idx].name] = array[idx].value
      }
    }

    return { object: data, array: array }
  }

  // Encapsulates the default browser validate, any custom validation via the
  // validate.ac.form event, and triggers a display of any invalidation
  // messages if necessary.
  Form.prototype.validate = function () {
    var e = $.Event('validate.ac.form', this.serialize())
    this.$element.trigger(e)
    if (e.isDefaultPrevented()) return

    this.$element.one('validated.ac.form', $.proxy(this.displayValidity, this))
      .trigger($.Event('validated.ac.form', {isValid: this.$element[0].checkValidity()}))
  }

  // If the form is invalid according to the DOM's native validity checker,
  // trigger the browser's default invalidation display.
  // If overridden (via event) we should find a way to pass the invalid
  // message hash to the event.
  Form.prototype.displayValidity = function () {
    var e = $.Event('displayValidity.ac.form')
    this.$element.trigger(e)
    if (e.isDefaultPrevented()) return

    if (!this.$element[0].checkValidity()) {
      var existing_submit = this.$element.find('input[type="submit"]')
      var new_submit      = null
      if (!existing_submit[0]) this.$element.append(new_submit = $('<input style="display: none;" type="submit">'))
      $(existing_submit[0] || new_submit[0]).trigger('click');
    }
  }

  Form.prototype.reset = function () {
    this.$element[0].reset();
  }

  Form.prototype.destroy = function (data) {
    this.$element.off('.ac.form').removeData('ac.form')
  }

  // Data accessor

  Form.data = function (name) {
    var attr = "ac.form"
    if (name) attr = attr + "." + name
    var el = closestWithData($(this), attr)
    if (el) return el.data(attr)
  }

  // FORM PLUGIN DEFINITION
  // ======================

  function Plugin(option) {
    var args = Array.prototype.slice.call(arguments, Plugin.length)
    if (option == 'data') return Form.data.apply(this, args)
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('ac.form')

      // Reset the form if we call the constructor again with options
      if (typeof option == 'object' && option && data) data = false

      var options = $.extend({}, Form.DEFAULTS, $this.data(), data && data.options, typeof option == 'object' && option)

      if (!data) $this.data('ac.form', (data = new Form(this, options)))
      if (typeof option == 'string') data[option].apply(data, args)
      else if (options.show) data.show(options.serialized === 'string' ? JSON.parse(options.serialized) : options.serialized)
    })
  }

  $.fn.form             = Plugin
  $.fn.form.Constructor = Form


  // FORM NO CONFLICT
  // ================

  $.fn.form.noConflict = function () {
    $.fn.form = old
    return this
  }


  // FORM DATA-API
  // =============

  function closestWithData (el, attr) {
    return $.makeArray(el).concat($.makeArray($(el).parents())).reduce(function (previous, current) {
      if (previous) return previous
      if ($(current).data(attr) !== undefined) return $(current)
    }, null)
  }

  $(document).on('click', '[data-toggle="form"]', function (e) {
    var $this      = $(this).closest('[data-toggle="form"]')
    var $target    = $($this.data('target'))
    var $sourceKey = $this.data('source') || 'serialized'

    var source     = closestWithData($this, $sourceKey)
    var serialized = source.data($sourceKey)

    $target.form({show: false})

    Plugin.call($target, 'show', serialized, {sourceElement: source.clone(true, false), sourceData: serialized})
  })

  $(document).on('click', '[data-toggle="submit"]', function (e) {
    var $this    = $(this).closest('[data-toggle="submit"]')
    var $target  = $($this.data('target') || $this.closest('form'))
    var validate = $target.data('validate') || true

    Plugin.call($target, 'submit', {validate: validate})
  })

  $(document).on('submit', 'form[data-control="form"]', function (e) {
    e.preventDefault()
    var validate = $(e.target).data('validate') || true
    Plugin.call($(e.target), 'submit', {validate: validate})
  })

  $(window).on('load', function () {
    $('[data-control="form"]').each(function () {
      Plugin.call($(this))
    })
  })

  /**
   * @author Kyle Florence <kyle[dot]florence[at]gmail[dot]com>
   * @website https://github.com/kflorence/jquery-deserialize/
   * @version 1.2.1
   *
   * Dual licensed under the MIT and GPLv2 licenses.
   */
  +function(i,b){var f=Array.prototype.push,a=/^(?:radio|checkbox)$/i,e=/\+/g,d=/^(?:option|select-one|select-multiple)$/i,g=/^(?:button|color|date|datetime|datetime-local|email|hidden|month|number|password|range|reset|search|submit|tel|text|textarea|time|url|week)$/i;function c(j){return j.map(function(){return this.elements?i.makeArray(this.elements):this}).filter(":input").get()}function h(j){var k,l={};i.each(j,function(n,m){k=l[m.name];l[m.name]=k===b?m:(i.isArray(k)?k.concat(m):[k,m])});return l}i.fn.deserialize=function(A,l){var y,n,q=c(this),t=[];if(!A||!q.length){return this}if(i.isArray(A)){t=A}else{if(i.isPlainObject(A)){var B,w;for(B in A){i.isArray(w=A[B])?f.apply(t,i.map(w,function(j){return{name:B,value:j}})):f.call(t,{name:B,value:w})}}else{if(typeof A==="string"){var v;A=A.split("&");for(y=0,n=A.length;y<n;y++){v=A[y].split("=");f.call(t,{name:decodeURIComponent(v[0]),value:decodeURIComponent(v[1].replace(e,"%20"))})}}}}if(!(n=t.length)){return this}var u,k,x,z,C,o,m,w,p=i.noop,s=i.noop,r={};l=l||{};q=h(q);if(i.isFunction(l)){s=l}else{p=i.isFunction(l.change)?l.change:p;s=i.isFunction(l.complete)?l.complete:s}for(y=0;y<n;y++){u=t[y];C=u.name;w=u.value;if(!(k=q[C])){continue}m=(z=k.length)?k[0]:k;m=(m.type||m.nodeName).toLowerCase();o=null;if(g.test(m)){if(z){x=r[C];k=k[r[C]=(x==b)?0:++x]}p.call(k,(k.value=w))}else{if(a.test(m)){o="checked"}else{if(d.test(m)){o="selected"}}}if(o){if(!z){k=[k];z=1}for(x=0;x<z;x++){u=k[x];if(u.value==w){p.call(u,(u[o]=true)&&w)}}}}s.call(this);return this}}(jQuery)

}(jQuery);

+function ($) {
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
    format: 'humanize',
    initialState: null,
    allowRepeats: true,
    triggerState: false,
    path: false,
    condense: {
      attr: 'q'
    }
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
    var params     = ''

    if (this.options.path) {
      var serialized = this.options.path.base || ''
      var attr       = this.options.path.attr
      if (state[attr]) {
        serialized += state[attr]
      }
      delete state[attr]
    }

    switch (this.options.format) {
      case 'humanize':
        var params = $.param(state)
        break
      case 'condense':
        if (state && Object.keys(state).length > 0)
          var params = this.options.condense.attr + '=' + btoa(JSON.stringify(state))
        break
    }
    if (params.length > 0) serialized += '?' + params
    if (serialized.length == 0) serialized = '/'

    return serialized
  }

  // url => {}
  State.prototype.deserialize = function (string) {
    var path   = string.split('?')[0]
    var params = State.parseParams(string.split('?')[1])
    var state  = {}

    switch (this.options.format) {
      case 'humanize':
        state = params
        break
      case 'condense':
        if (params[this.options.condense.attr])
          state = JSON.parse(atob(params[this.options.condense.attr]))
        break
    }

    if (this.options.path) {
      var path_value = path.replace(this.options.path.base, '')
      if (path_value) state[this.options.path.attr] = path_value
    }

    return state
  }

  State.prototype.triggerState = function (e) {
    var setState = function (parents, state) {
      var prefix = [].concat(['state'], parents).join('-')
      $.each(state, function (key, value) {
        if (typeof value === "object") {
          setState([].concat(parents, [key]), value)
        } else {
          var matches = $('[data-toggle="state"][' + prefix + '-' + key + '="' + value + '"]')
          matches.each(function (idx, el) {
            $(el).trigger($(el).data('trigger') || 'click')
          })
        }
      })
    }
    if (e.trigger && e.trigger.type !== 'push.ac.state') setState([], e.state)
  }

  // Adapted from https://gist.github.com/kares/956897#comment-1190642
  State.parseParams = function (query) {
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

  $(document).on(State.EVENTS, '[data-toggle="state"]', function (e) {
    var $this    = $(this)
    var triggers = ($this.attr('data-trigger') || 'click').split(' ')
    var merge    = $this.attr('data-merge') == 'false' ? false : true
    var action   = $this.attr('data-action')

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
  $(window).on('load', function () {
    $('[data-control="state"]').each(function() {
      var $state = $(this)
      var data   = $state.data()

      data.path     = data.path     || {}
      data.condense = data.condense || {}

      data.allowRepeats = (data.allowRepeats != false) ? true : false

      if (data.pathAttr)     data.path.attr     = data.pathAttr
      if (data.pathBase)     data.path.base     = data.pathBase
      if (data.condenseattr) data.consense.attr = data.condenseattr

      if ($.isEmptyObject(data.path))     delete data.path
      if ($.isEmptyObject(data.condense)) delete data.condense

      Plugin.call($(window), data)
    })
  })

}(jQuery);
