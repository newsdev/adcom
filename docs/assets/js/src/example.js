// Include on example gists for added markup that allows
// developers to "copy from" gist into their own app.

$(document).ready(function() {
  function getPattern(name) {
    return function(node) {
      return node[0] == 'call' &&
             node[1][0] == 'function' &&
             node[1][1] == name
    }
  }
  var pattern = getPattern('one');
  function traverse(node, visit){
    visit(node)
    if (node instanceof Array){
      for (var i = 0, len = node.length; i < len; i++)
        traverse(node[i], visit)
    }
  }
  function findFunctionsByName(src, name) {
    var matches = [];

    function pattern(node) {
      return node[0] == 'call' &&
             node[1][0] == 'function' &&
             node[1][1] == name
    }

    function detectPattern(node) {
      try {
        if (pattern(node)) {
          matches.push(node);
        }
      } catch(e) { }
    }

    traverse(src, detectPattern);
    return matches;
  }

  var sourceHtml = $(new DOMParser().parseFromString(document.documentElement.outerHTML, 'text/html'));

  var deferreds = [];
  var scripts = {};
  $(sourceHtml).find('script[data-example-source]').each(function(idx, source) {
    var src = $(this).attr('src');
    var div = document.createElement('div');
    div.innerHTML = "<a></a>";
    div.firstChild.href = src;
    div.innerHTML = div.innerHTML;

    deferreds.push($.ajax({
      url: div.firstChild.href,
      data: {},
      dataType: 'text',
      success: function (data) {
        scripts[src] = parse(data);
      }
    }));
  });

  $.when.apply($, deferreds).done(function() {;
    $('[data-example]').each(function(idx, el) {
      var exampleSlug = $(this).data('example');
      var ex = $('<div class="adcom-example"></div>');
      $(el).append(ex);

      var control = $('<div class="adcom-control"></div>');
      control.html("<i class='glyphicon glyphicon-cloud-download'></i><p>copy</p>");
      $(el).append(control);

      var modal = $('<div class="modal fade"><div class="modal-dialog modal-lg"><div class="modal-content"><div class="modal-header"><h2><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>Example <code>' + exampleSlug + '</code></h2></div><div class="modal-body"></div></div></div></div>');

      modal.find('.modal-body').append($('<h5>HTML</h5>'));
      modal.find('.modal-body').append($('<pre><code class="html"></code></pre>'));
      var elements = $(sourceHtml).find('[data-example="' + exampleSlug + '"]');
      var html = '';
      elements.each(function(idx, element) {
        html += html_beautify(element.outerHTML, {indent_size: 2}) + "\n";
      });
      modal.find('code.html').text(html);

      modal.find('.modal-body').append($('<h5>JS</h5>'));
      modal.find('.modal-body').append($('<pre><code class="js"></code></pre>'));
      var js = '';
      $.each(scripts, function(name, source) {
        var funcs = findFunctionsByName(source, 'one');
        $.each(funcs, function(idx, func) {
          var code = js_beautify(gen_code(func), {indent_size: 2});
          js += '// ' + name + "\n";
          js += code + "\n";
        });
      });
      modal.find('code.js').text(js);

      $('body').append(modal);

      $(control).on('click', function(e) {
        modal.modal('show');
      });
    });

    hljs.initHighlightingOnLoad();
  });
});
