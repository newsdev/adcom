$(document).ready(function() {
  (function one() {
    $.getJSON('http://int-shared-data.nytimes.com/adcom/items.json', function(items) {
      $('#myIndex').index({
        items: items,
        template: $('#myIndex').html()
      });

      $('[title]').tooltip();
    });
  })();
});
