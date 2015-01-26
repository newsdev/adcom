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

    // Convert data, an object, into formData, a flash hash of key value pairs
    // for use in the .deserialize() method.
    var formData = {}
    this.$element.find(':input[name]').each(function (idx, input) {
      var name = input.name || $(input).attr('name')
      var val = selectn(name, data)
      if (val) formData[name] = val
      if ($(input).attr('type') === 'checkbox') formData[name] = {'on': 'on', true: 'on'}[val] || 'off'
    })
    this.$element[0].reset()
    this.$element.deserialize(formData)

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
      object: deparam(this.$element.serialize())
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


  /**
   * @author Kyle Florence <kyle[dot]florence[at]gmail[dot]com>
   * @website https://github.com/kflorence/jquery-deserialize/
   * @version 1.2.1
   *
   * Dual licensed under the MIT and GPLv2 licenses.
   */
  +function(i,b){var f=Array.prototype.push,a=/^(?:radio|checkbox)$/i,e=/\+/g,d=/^(?:option|select-one|select-multiple)$/i,g=/^(?:button|color|date|datetime|datetime-local|email|hidden|month|number|password|range|reset|search|submit|tel|text|textarea|time|url|week)$/i;function c(j){return j.map(function(){return this.elements?i.makeArray(this.elements):this}).filter(":input").get()}function h(j){var k,l={};i.each(j,function(n,m){k=l[m.name];l[m.name]=k===b?m:(i.isArray(k)?k.concat(m):[k,m])});return l}i.fn.deserialize=function(A,l){var y,n,q=c(this),t=[];if(!A||!q.length){return this}if(i.isArray(A)){t=A}else{if(i.isPlainObject(A)){var B,w;for(B in A){i.isArray(w=A[B])?f.apply(t,i.map(w,function(j){return{name:B,value:j}})):f.call(t,{name:B,value:w})}}else{if(typeof A==="string"){var v;A=A.split("&");for(y=0,n=A.length;y<n;y++){v=A[y].split("=");f.call(t,{name:decodeURIComponent(v[0]),value:decodeURIComponent(v[1].replace(e,"%20"))})}}}}if(!(n=t.length)){return this}var u,k,x,z,C,o,m,w,p=i.noop,s=i.noop,r={};l=l||{};q=h(q);if(i.isFunction(l)){s=l}else{p=i.isFunction(l.change)?l.change:p;s=i.isFunction(l.complete)?l.complete:s}for(y=0;y<n;y++){u=t[y];C=u.name;w=u.value;if(!(k=q[C])){continue}m=(z=k.length)?k[0]:k;m=(m.type||m.nodeName).toLowerCase();o=null;if(g.test(m)){if(z){x=r[C];k=k[r[C]=(x==b)?0:++x]}p.call(k,(k.value=w))}else{if(a.test(m)){o="checked"}else{if(d.test(m)){o="selected"}}}if(o){if(!z){k=[k];z=1}for(x=0;x<z;x++){u=k[x];if(u.value==w){p.call(u,(u[o]=true)&&w)}}}}s.call(this);return this}}(jQuery)

  /*
   * Copyright (c) 2010 "Cowboy" Ben Alman
   * Dual licensed under the MIT and GPL licenses.
   * http://benalman.com/about/license/
   */
  function deparam(L,I){var K={},J={"true":!0,"false":!1,"null":null};$.each(L.replace(/\+/g," ").split("&"),function(O,T){var N=T.split("="),S=decodeURIComponent(N[0]),M,R=K,P=0,U=S.split("]["),Q=U.length-1;if(/\[/.test(U[0])&&/\]$/.test(U[Q])){U[Q]=U[Q].replace(/\]$/,"");U=U.shift().split("[").concat(U);Q=U.length-1}else{Q=0}if(N.length===2){M=decodeURIComponent(N[1]);if(I){M=M&&!isNaN(M)?+M:M==="undefined"?undefined:J[M]!==undefined?J[M]:M}if(Q){for(;P<=Q;P++){S=U[P]===""?R.length:U[P];R=R[S]=P<Q?R[S]||(U[P+1]&&isNaN(U[P+1])?{}:[]):M}}else{if($.isArray(K[S])){K[S].push(M)}else{if(K[S]!==undefined){K[S]=[K[S],M]}else{K[S]=M}}}}else{if(S){K[S]=I?undefined:""}}});return K};

  /*
   * Copyright (c) 2013 Wil Moore III
   * Licensed under the MIT license.
   * https://github.com/wilmoore/selectn
   * Adapted slightly.
   */
  function selectn(a){function c(a){for(var c=a||(1,eval)("this"),d=b.length,e=0;d>e;e+=1)c&&(c=c[b[e]]);return c}var b=a.replace(/\[([-_\w]+)\]/g,".$1").split(".");return arguments.length>1?c(arguments[1]):c}

  /*
   * https://github.com/Modernizr/Modernizr/blob/924c7611c170ef2dc502582e5079507aff61e388/feature-detects/forms/validation.js
   * Licensed under the MIT license.
   */
  function supportsNativeValidation = (function () {
    var validationSupport = false
    var form = document.createElement('form')
    form.innerHTML = '<input name="test" required><button></button>'
    form.addEventListener('submit', function(e) {window.opera ? e.stopPropagation() : e.preventDefault()})
    form.getElementsByTagName('input')[0].addEventListener('invalid', function(e) {validationSupport = true; e.preventDefault(); e.stopPropagation();})
    form.getElementsByTagName('button')[0].click()
    return validationSupport
  })()

}(jQuery);
