// TODOs:
//  * How to address messages that were created with $(document).message
//    (esp. remove them; maybe $(document).message('hide')?)
//  * Creting a message with just a string should default it to the content
//    field?
+function (factory) {
  if (typeof define === 'function' && define.amd) {
    define('adcom/message', ['jquery'], factory)
  } else {
    factory(window.jQuery)
  }
}(function ($) {
  'use strict';

  // MESSAGE CLASS DEFINITION
  // ========================
  var Message = function (element, options) {
    this.options  = options
    this.$element = $(element)[0] == document ? $('<div class="message fade ' + this.options.class + '">').appendTo('body') : $(element)
    this.$body    = $(document.body)
    this.isShown  = null

    this.$element.on('click.dismiss.ac.message', '[data-dismiss="message"]', $.proxy(this.hide, this))
  }

  Message.VERSION = '0.1.0'

  Message.TRANSITION_DURATION = 300

  Message.DEFAULTS = {
    show: true,
    html: false,
    dismiss: true,
    class: ''
  }

  Message.prototype.show = function (_relatedTarget) {
    var that = this

    var e = $.Event('show.ac.message', { relatedTarget: _relatedTarget })
    this.$element.trigger(e)

    if (this.isShown || e.isDefaultPrevented()) return

    this.$body.trigger('click.dismiss.ac.message')
    var timeoutDuration = this.$element.is(':visible') ? Message.TRANSITION_DURATION : 0
    var transition = $.support.transition && this.$element.hasClass('fade')

    this.isShown = true

    if (!this.$element.parent().length) {
      this.$element.appendTo(this.$body)
    }

    if (this.options.content) {
      this.$element.children().detach().end()[
        this.options.html ? (typeof this.options.content == 'string' ? 'html' : 'append') : 'text'
      ](this.options.content)
    }

    setTimeout(function() {
      that.$element
        .show()
        .scrollTop(0)

      if (transition) {
        that.$element[0].offsetWidth
      }

      that.$element.addClass('in')

      if (that.options.expire && that.options.expire > 0) {
        that.expireTimeout = setTimeout($.proxy(that.hide, that), that.options.expire)
      }

      if (that.options.dismiss) {
        that.$body.one('click.dismiss.ac.message', function (e) { that.hide() })
        that.$element.on('click.ac.message', function (e) { e.stopPropagation() })
      }

      var e = $.Event('shown.ac.message', { relatedTarget: _relatedTarget })
      that.$element.trigger(e)
    }, timeoutDuration)
  }

  Message.prototype.hide = function (e) {
    if (e) e.preventDefault()

    e = $.Event('hide.ac.message')

    this.$element.trigger(e)

    if (!this.isShown || e.isDefaultPrevented()) return
    this.isShown = false

    this.$element
      .addClass('out')
      .removeClass('in')
    this.$body.off('click.dismiss.ac.message')

    if (this.expireTimeout) {
      clearTimeout(this.expireTimeout)
      this.expireTimeout = null
    }

    $.support.transition && this.$element.hasClass('fade') ?
      this.$element
        .one('bsTransitionEnd', $.proxy(this.hideMessage, this))
        .emulateTransitionEnd(Message.TRANSITION_DURATION) :
      this.hideMessage()
  }

  Message.prototype.hideMessage = function () {
    if (!this.isShown) this.$element.hide()
    this.$element
      .removeClass('out')
      .trigger('hidden.ac.message')
  }

  // MESSAGE PLUGIN DEFINITION
  // =========================

  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this = $(this)

      var data  = $this.data('ac.message')

      // Reset if we call the constructor again with options
      if (typeof option == 'object' && option && data) data = false

      var options = $.extend({}, Message.DEFAULTS, $this.data(), data && data.options, typeof option == 'object' && option)

      if (!data) $this.data('ac.message', (data = new Message($this, options)))
      if (typeof option == 'string') data[option](_relatedTarget)
      $.extend(data.options, options)
      if (options.show) data.show(_relatedTarget)
    })
  }

  var old = $.fn.message

  $.fn.message             = Plugin
  $.fn.message.Constructor = Message

  // MESSAGE NO CONFLICT
  // ===================

  $.fn.message.noConflict = function () {
    $.fn.message = old
    return this
  }


  // MESSAGE DATA-API
  // ================

  $(document).on('click.ac.message.data-api', '[data-toggle="message"]', function (e) {
    var $this   = $(this)
    var $target = $($this.attr('data-target') || document)
    var option  = $.extend({}, $target.data(), $this.data())

    if ($this.is('a')) e.preventDefault()

    Plugin.call($target, option, this)
  })

});
