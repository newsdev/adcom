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
    this.$element.trigger($.Event('show.adcom.form', { serialized: data }))

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

    this.$element.trigger($.Event('shown.adcom.form', { serialized: data }))
  }

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

  Form.prototype.validate = function () {
    this.$element.trigger($.Event('validate.adcom.form'))

    if (!this.$element[0].checkValidity()) {
      var existing_submit = this.$element[0].find('input[type="submit"]')
      if (!existing_submit[0]) this.$element.append(new_submit = $('<input style="display: none;" type="submit">'))
      $(existing_submit[0] || new_submit[0]).trigger('click');
      this.$element.trigger($.Event('validate.adcom.form', {isValid: false}))
    }
    this.$element.trigger($.Event('validate.adcom.form', {isValid: true}))
  }

  Form.prototype.reset = function () {
    this.$element[0].reset();
  }

  Form.prototype.destroy = function (data) {
    this.$element.off('.adcom.form').removeData('adcom.form')
  }

  // Data accessor

  Form.data = function (name) {
    var attr = "adcom.form"
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
      var data  = $this.data('adcom.form')

      // Reset the form if we call the constructor again with options
      if (typeof option == 'object' && option && data) data = false

      var options = $.extend({}, Form.DEFAULTS, $this.data(), data && data.options, typeof option == 'object' && option)

      if (!data) $this.data('adcom.form', (data = new Form(this, options)))
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

  $(document).on('submit', 'form[data-control="form"]', function (e) {
    e.preventDefault()
    $(e.target).form('submit')
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
