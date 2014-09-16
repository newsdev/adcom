+function ($) {
  'use strict';

  $('[data-toggle="popover"]').popover()
  $('.act[title]').tooltip()

  $(document).on('DOMNodeInserted', function(e) {
    var klass = e.target.getAttribute('class')
    if (klass && klass.split(' ').indexOf('action') &&
        e.target.getAttribute('target')) {
      $(e.target).tooltip()
    }
  });
}(jQuery);
