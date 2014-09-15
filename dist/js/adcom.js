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

  Index.VERSION = '0.1.0'

  Index.EVENTS  = $.map('scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave load resize scroll unload error keydown keypress keyup load resize scroll unload error blur focus focusin focusout change select submit'.split(' '), function (e) { return e + ".adcom.index.data-api" }).join(' ')

  Index.DEFAULTS = {
    items: [],
    fields: [],
    states: [],
    selectedClass: 'active',
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
      $($this.$element).append(renderedItem)
    })

    $this.$element.trigger($.Event('shown.adcom.index', { items: items }))
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
    var item = $(el).data('adcom.index.item')

    this.$element.trigger($.Event('toggle.adcom.index', { item: item, target: el, state: state }))

    var idx = $(el).data('adcom.index.idx')
    this.states[idx] = state
    if (state) { $(el).addClass(this.options.selectedClass) } else { $(el).removeClass(this.options.selectedClass) }

    this.$element.trigger($.Event('toggled.adcom.index', { item: item, target: el, state: state }))
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
  }

  // Template

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

    templateString = '<tr>' + templateString + '</tr>'

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

    var dynamicElements = el.data('field') === undefined ? el.find('[data-field]') : el

    dynamicElements.each(function (idx, fieldContainer) {
      var field = $(fieldContainer).attr('data-field')
      var value = typeof $item[field] !== 'function' ? $item[field] : $item[field]()
      $(fieldContainer).html(value)
    })

    el.data('adcom.index.item', $item)
    el.data('adcom.index.idx', $idx)
    el.on('update.adcom.index', function (e) {
      $this.updateAtIndex($idx, e.item)
    })

    $this.rendered[$idx] = el

    return el
  }

  Index.prototype.updateAtIndex = function (idx, item) {
    this.$items[idx] = item
    if (this.rendered[idx]) {
      var original    = this.rendered[idx]
      var replacement = this.renderItem(item)
      original.replaceWith(replacement)
      this.rendered[idx] = replacement
    }
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
    })
  }

  Index.prototype.toggleFilter = function (el) {
    var $this = this
    el.each(function () {
      var $el     = $(this)
      var $target = $($el.data('target'))
      if ($target[0] !== $this.$element[0]) return

      var fields  = $el.data('filter')
      var value   = $el.is(':input') ? $el.val() : $el.data('match')
      if (value == '') value = undefined

      $this.setFilter(fields, value)
    })
  }

  // INDEX PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
    var args = Array.prototype.slice.call(arguments, Plugin.length)
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('adcom.index')

      // Reset the index if we call the constructor again with options
      if (typeof option == 'object' && option && data) data = false

      var options = $.extend({}, Index.DEFAULTS, $this.data(), data && data.options, typeof option == 'object' && option)

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

  $('[data-control="index"]').index()

}(jQuery);

+function ($) {
  'use strict';

  // FORM CLASS DEFINITION
  // =====================

  var Form = function (element, options) {
    this.options  = options
    this.$element = $(element)

    this.show(typeof this.options.serialized === 'string' ? JSON.parse(this.options.serialized) : this.options.serialized)
  }

  Form.VERSION = '0.1.0'

  Form.DEFAULTS = {
    serialized: {}
  }

  Form.prototype.show = function (data) {
    this.$element.trigger($.Event('show.adcom.form', { serialized: data }))

    this.data = data
    this.$element[0].reset()
    this.$element.deserialize(data)

    this.$element.trigger($.Event('shown.adcom.form', { serialized: data }))
  }
  // alias

  Form.prototype.submit = function () {
    var attributes = this.serialize()
    $.extend(attributes, {
      relatedTarget: this.$element,
      sourceElement: this.sourceElement,
      sourceData:    this.sourceData
    })

    this.$element.trigger($.Event('submitted.adcom.form', attributes))
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

  Form.prototype.destroy = function (data) {
    this.$element.off('.adcom.form').removeData('adcom.form')
  }

  // FORM PLUGIN DEFINITION
  // ======================

  function Plugin(option) {
    var args = Array.prototype.slice.call(arguments, Plugin.length)
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('adcom.form')

      // Reset the form if we call the constructor again with options
      if (typeof option == 'object' && option && data) data = false

      var options = $.extend({}, Form.DEFAULTS, $this.data(), data && data.options, typeof option == 'object' && option)

      if (!data) $this.data('adcom.form', (data = new Form(this, options)))
      if (typeof option == 'string') data[option].apply(data, args)
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
      if ($(current).data(attr)) return $(current)
    }, null)
  }

  $(document).on('click', '[data-toggle="form"]', function (e) {
    var $this      = $(this).closest('[data-toggle="form"]')
    var $target    = $($this.data('target'))
    var $sourceKey = $this.data('source') || 'serialized'

    var source     = closestWithData($this, $sourceKey)
    var serialized = source.data($sourceKey)

    $target.data('adcom.form').sourceElement = source.clone(true, false)
    $target.data('adcom.form').sourceData    = serialized

    Plugin.call($target, 'show', serialized)
  })

  $(document).on('submit', 'form[data-control="form"]', function (e) {
    e.preventDefault()
    $(e.target).form('submit')
  })

  /**
   * @author Kyle Florence <kyle[dot]florence[at]gmail[dot]com>
   * @website https://github.com/kflorence/jquery-deserialize/
   * @version 1.2.1
   *
   * Dual licensed under the MIT and GPLv2 licenses.
   */
  +function(i,b){var f=Array.prototype.push,a=/^(?:radio|checkbox)$/i,e=/\+/g,d=/^(?:option|select-one|select-multiple)$/i,g=/^(?:button|color|date|datetime|datetime-local|email|hidden|month|number|password|range|reset|search|submit|tel|text|textarea|time|url|week)$/i;function c(j){return j.map(function(){return this.elements?i.makeArray(this.elements):this}).filter(":input").get()}function h(j){var k,l={};i.each(j,function(n,m){k=l[m.name];l[m.name]=k===b?m:(i.isArray(k)?k.concat(m):[k,m])});return l}i.fn.deserialize=function(A,l){var y,n,q=c(this),t=[];if(!A||!q.length){return this}if(i.isArray(A)){t=A}else{if(i.isPlainObject(A)){var B,w;for(B in A){i.isArray(w=A[B])?f.apply(t,i.map(w,function(j){return{name:B,value:j}})):f.call(t,{name:B,value:w})}}else{if(typeof A==="string"){var v;A=A.split("&");for(y=0,n=A.length;y<n;y++){v=A[y].split("=");f.call(t,{name:decodeURIComponent(v[0]),value:decodeURIComponent(v[1].replace(e,"%20"))})}}}}if(!(n=t.length)){return this}var u,k,x,z,C,o,m,w,p=i.noop,s=i.noop,r={};l=l||{};q=h(q);if(i.isFunction(l)){s=l}else{p=i.isFunction(l.change)?l.change:p;s=i.isFunction(l.complete)?l.complete:s}for(y=0;y<n;y++){u=t[y];C=u.name;w=u.value;if(!(k=q[C])){continue}m=(z=k.length)?k[0]:k;m=(m.type||m.nodeName).toLowerCase();o=null;if(g.test(m)){if(z){x=r[C];k=k[r[C]=(x==b)?0:++x]}p.call(k,(k.value=w))}else{if(a.test(m)){o="checked"}else{if(d.test(m)){o="selected"}}}if(o){if(!z){k=[k];z=1}for(x=0;x<z;x++){u=k[x];if(u.value==w){p.call(u,(u[o]=true)&&w)}}}}s.call(this);return this}}(jQuery)

  $('[data-control="form"]').form()

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
      this.$element.on('updated.adcom.state', $.proxy(this.triggerState, this))

      // Necessary to avoid infinite recursion; peek will use adcom.state in
      // data-api, which normally isn't set until Constructor returns.
      this.$element.data('adcom.state', this)
      this.peek()
    }
  }

  State.VERSION = '0.1.0'

  State.EVENTS  = $.map('scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave load resize scroll unload error keydown keypress keyup load resize scroll unload error blur focus focusin focusout change select submit'.split(' '), function (e) { return e + ".adcom.state.data-api" }).join(' ')

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

    this.$element.trigger($.Event('push.adcom.state', { state: state, options: options }))

    if (serialized !== this.serialize(this.state)) {
      // If this state is new, append it into the history and trigger an update
      this.$history[options.action + "State"](state, document.title, serialized)
      this.update(state, $.Event('push.adcom.state'))
    } else {
      // If this state is the same as the current state, don't append to the
      // history, and only trigger an update if `allowRepeats` is on
      if (options.allowRepeats) this.update(state, $.Event('push.adcom.state'))
    }

    this.$element.trigger($.Event('pushed.adcom.state', { state: state, options: options }))
  }

  State.prototype.pop = function (e) {
    this.$history.back()
  }

  State.prototype.peek = function () {
    this.update(this.state, $.Event('peek.adcom.state'))
  }

  State.prototype.onpopstate = function (e) {
    this.update(e.state, e)
  }

  State.prototype.update = function (state, trigger) {
    this.$element.trigger($.Event('update.adcom.state', { state: state, trigger: trigger }))
    this.state = state
    this.$element.trigger($.Event('updated.adcom.state', { state: state, trigger: trigger }))
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
    if (e.trigger && e.trigger.type !== 'push.adcom.state') setState([], e.state)
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
      var data    = $this.data('adcom.state')
      var options = $.extend({}, State.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('adcom.state', (data = new State(this, options)))

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
