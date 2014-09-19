$(document).ready(function() {
  // (function index_pull_quote() {
  //   $.getJSON('http://int-shared-data.nytimes.com/adcom/items.json', function(items) {
  //     $('#index_pull_quote .index').index({
  //       items: items,
  //       pageSize: 3,
  //       pagination: 'on',
  //       template: $('#index_pull_quote .index').html()
  //     });

  //     $('[title]').tooltip();
  //   });
  // })();

  // (function index_search() {
  //   $.getJSON('http://int-shared-data.nytimes.com/adcom/items.json', function(items) {
  //     $('#index_search .index').index({
  //       items: items,
  //       pageSize: 3,
  //       pagination: 'on',
  //       template: $('#index_search .index').html()
  //     });
  //   });
  // })();

  $('body').scrollspy({
    target: '.bs-docs-sidebar',
    offset: 40
  });
});
