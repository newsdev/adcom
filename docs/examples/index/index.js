$(document).ready(function() {
  $.getJSON('../../items.json', function(items) {
    $('#myIndex').index({
      items: items,
      template: $('#myIndex').html()
    });

    $('[title]').tooltip();
  });
});
