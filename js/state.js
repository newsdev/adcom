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
  }

  State.VERSION = '0.0.1'

  State.EVENTS  = $.map('scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave load resize scroll unload error keydown keypress keyup load resize scroll unload error blur focus focusin focusout change select submit'.split(' '), function (e) { return e + ".adcom.state" }).join(' ')

  State.DEFAULTS = {
    format: 'humanize',
    initialState: null,
    path: {
      attr: 'path',
      base: window.location.pathname
    },
    // title: {
    //   attr: 'title',
    //   default: document.title
    // },
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
    options.allowRepeats = typeof options.allowRepeats !== 'undefined' ? options.allowRepeats : true
    options.action       = options.action || 'push'

    if (options.merge) state = $.extend(true, {}, this.state, state)

    // Update only if this is a new state
    var serialized = this.serialize(state)
    // if (serialized == this.serialize(this.state)) return

    this.$element.trigger('push.adcom.state')

    if (serialized != this.serialize(this.state)) {
      // If this state is new, append it into the history and trigger an update
      this.$history[options.action + "State"](state, document.title, serialized)
      this.update(state)
    } else {
      // If this state is the same as the current state, don't append to the
      // history, and only trigger an update if `allowRepeats` is on
      if (options.allowRepeats) this.update(state)
    }

    this.$element.trigger('pushed.adcom.state')
  }

  State.prototype.pop = function (e) {
    this.$history.back()
  }

  State.prototype.peek = function () {
    this.update(this.state)
  }

  State.prototype.onpopstate = function (e) {
    this.update(e.state)
  }

  State.prototype.update = function (state) {
    var e = $.Event('update.adcom.state', { state: state })
    this.$element.trigger(e)

    this.state = state
    // document.title = this.getTitle(state)

    var e = $.Event('updated.adcom.state', { state: state })
    this.$element.trigger(e)
  }

  // {} => url
  State.prototype.serialize = function (state) {
    state = $.extend({}, state)

    var serialized = ''
    var params     = ''

    if (this.options.path) {
      var serialized = this.options.path.base
      var attr       = this.options.path.attr
      if (state[attr]) {
        serialized += state[attr]
      }
      delete state[attr]
    }
    // if (this.options.title) delete state[this.options.title.attr]

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

  // State.prototype.getTitle = function (state) {
  //   return state[this.options.title.attr] || this.options.title.default
  // }

  // https://gist.github.com/kares/956897#comment-1190642
  State.parseParams = function (query) {
    var re = /([^&=]+)=?([^&]*)/g;
    var decode = function (str) {
      return decodeURIComponent(str.replace(/\+/g, ' '));
    };

    // recursive function to construct the result object
    function createElement(params, key, value) {
      key = key + '';
      // if the key is a property
      if (key.indexOf('.') !== -1) {
        // extract the first part with the name of the object
        var list = key.split('.');
        // the rest of the key
        var new_key = key.split(/\.(.+)?/)[1];
        // create the object if it doesnt exist
        if (!params[list[0]]) params[list[0]] = {};
        // if the key is not empty, create it in the object
        if (new_key !== '') {
            createElement(params[list[0]], new_key, value);
        } else console.warn('parseParams :: empty property in key "' + key + '"');
      } else
      // if the key is an array
      if (key.indexOf('[') !== -1) {
        // extract the array name
        var list = key.split('[');
        key = list[0];
        // extract the index of the array
        var list = list[1].split(']');
        var index = list[0]
        // if index is empty, just push the value at the end of the array
        if (index == '') {
            if (!params) params = {};
            if (!params[key] || !$.isArray(params[key])) params[key] = [];
            params[key].push(value);
        } else
        // add the value at the index (must be an integer)
        {
            if (!params) params = {};
            if (!params[key] || !$.isArray(params[key])) params[key] = [];
            params[key][parseInt(index)] = value;
        }
      } else
      // just normal key
      {
        if (!params) params = {};
        params[key] = value;
      }
    }
    // be sure the query is a string
    query = query + '';
    // if (query === '') query = window.location + '';
    if (query.match(/\?/) === null) query = '?' + query
    var params = {}, e;
    if (query) {
      // remove # from end of query
      if (query.indexOf('#') !== -1) {
        query = query.substr(0, query.indexOf('#'));
      }

      // remove ? at the begining of the query
      if (query.indexOf('?') !== -1) {
        query = query.substr(query.indexOf('?') + 1, query.length);
      } else return {};
      // empty parameters
      if (query == '') return {};
      // execute a createElement on every key and value
      while (e = re.exec(query)) {
        var key = decode(e[1]);
        var value = decode(e[2]);
        createElement(params, key, value);
      }
    }
    delete params[undefined]
    return params;
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
    var merge    = $this.attr('data-merge') == 'true' ? true : false
    var action   = $this.attr('data-action')

    if (triggers.indexOf(e.type) == -1) return

    // Construct partial state hash
    var state = JSON.parse($this.attr('state') || '{}')
    if (Object.keys(state).length == 0) {
      $.each($this[0].attributes, function (index, attr) {
        if (!attr.name.match(/^state-.+/)) return

        var cursor     = state
        var components = attr.name.replace(/^state-/, '').split('-')

        $.each(components, function(index, component) {
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
    $('[data-state="state"]').each(function() {
      var $state = $(this)
      var data   = $state.data()

      data.path     = data.path     || {}
      // data.title    = data.title    || {}
      data.condense = data.condense || {}

      if (data.pathAttr)     data.path.attr     = data.pathAttr
      if (data.pathBase)     data.path.base     = data.pathBase
      // if (data.titleattr)    data.title.attr    = data.titleattr
      if (data.condenseattr) data.consense.attr = data.condenseattr

      Plugin.call($(window), data)
    })
  })

}(jQuery);
