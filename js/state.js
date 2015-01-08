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
    var state = State.parseParams(string.split('?')[1])

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
  $(window).on('load', function () {
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

}(jQuery);
