+function ($) {
  'use strict';

  // FORM CLASS DEFINITION
  // =====================

  var Form = function (element, options) {
    this.options  = options
    this.$element = $(element)

    this.createSubmit()
  }

  Form.VERSION = '0.1.0'

  Form.DEFAULTS = {
    show: true
  }

  Form.prototype.show = function (data, meta, _relatedTarget) {
    var e = $.Event('show.ac.form', { serialized: data, relatedTarget: _relatedTarget })
    this.$element.trigger(e)
    if (e.isDefaultPrevented()) return

    var formData = {}
    var disabled = this.$element.find(':disabled').removeAttr('disabled')
    this.$element.find(':input[name]').each(function (idx, input) {
      var name = input.name || $(input).attr('name')
      var val = selectn(name, data)
      if (val) formData[name] = val
      if ($(input).attr('type') === 'checkbox') formData[name] = {'on': 'on', true: 'on'}[val] || 'off'
    })
    this.$element[0].reset()
    this.$element.deserialize(formData)
    disabled.attr('disabled', 'disabled')

    meta = meta || {}
    this.sourceElement = meta.sourceElement
    this.sourceData    = meta.sourceData
    $(this.$element[0]).one('reset', $.proxy(function () {
      this.sourceElement =
      this.sourceData    = null
    }, this))

    this.$element.trigger($.Event('shown.ac.form', { serialized: data, relatedTarget: _relatedTarget, sourceElement: this.sourceElement, sourceData: this.sourceData}))
  }

  Form.prototype.submit = function (opts) {
    var $this = this
    if (opts && opts.validate)
      return this.$element.one('validated.ac.form', function(e) {
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
    var disabled = this.$element.find(':disabled').removeAttr('disabled')
    var array    = this.$element.serializeArray()
    var data     = deparam(this.$element.serialize())
    disabled.attr('disabled', 'disabled')

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

    if (!this.$element[0].checkValidity())
      this.$element.find('input[type="submit"]').trigger('click')
  }

  Form.prototype.createSubmit = function () {
    var existing_submit = this.$element.find('input[type="submit"]')
    var new_submit      = null
    if (!existing_submit[0]) this.$element.append(new_submit = $('<input style="display: none;" type="submit">'))
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
      else if (options.show && options.serialized !== undefined) data.show(options.serialized === 'string' ? JSON.parse(options.serialized) : options.serialized, args[0] || {})
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
}(jQuery);
