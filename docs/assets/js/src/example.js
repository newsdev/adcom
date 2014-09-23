// Include on example gists for added markup that allows
// developers to "copy from" gist into their own app.

// TODO:
//   * Don't reload script assets
//   * CSS

// $(document).ready(function() {
+function($) {

  function initializeZeroClipboard() {
    // Config ZeroClipboard
    ZeroClipboard.config({
      moviePath: '/assets/flash/ZeroClipboard.swf',
      hoverClass: 'btn-clipboard-hover'
    })

    // Insert copy to clipboard button before code excerpts
    $('.highlight').each(function () {
      var highlight = $(this)
      var btnHtml = '<div class="zero-clipboard"><span class="btn-clipboard">Copy</span></div>'
      highlight.before(btnHtml)
    });

    var zeroClipboard = new ZeroClipboard($('.btn-clipboard'))
    var htmlBridge = $('#global-zeroclipboard-html-bridge')

    // Handlers for ZeroClipboard
    zeroClipboard.on('load', function () {
      htmlBridge
        .data('placement', 'top')
        .attr('title', 'Copy to clipboard')
        .tooltip()
    })

    // Copy to clipboard
    zeroClipboard.on('dataRequested', function (client) {
      var highlight = $(this).parent().nextAll('.highlight').first()
      client.setText(highlight.text())
    })

    // Notify copy success and reset tooltip title
    zeroClipboard.on('complete', function () {
      htmlBridge
        .attr('title', 'Copied!')
        .tooltip('fixTitle')
        .tooltip('show')
        .attr('title', 'Copy to clipboard')
        .tooltip('fixTitle')
    })

    // Notify copy failure
    zeroClipboard.on('noflash wrongflash', function () {
      htmlBridge
        .attr('title', 'Flash required')
        .tooltip('fixTitle')
        .tooltip('show')
    })
  }

  function traverse(node, visit){
    visit(node)
    if (node instanceof Array){
      for (var i = 0, len = node.length; i < len; i++)
        traverse(node[i], visit)
    }
  }
  function findFunctionsByName(src, name) {
    var matches = [];
    var regex = new RegExp('^' + name.replace(/[-_]/g, '(-|_)') + '$')

    function pattern(node) {
      return (node[0] == 'call' &&
              node[1][0] == 'function' &&
              node[1][1].match(regex)) ||
             (node[0] == 'defun' &&
              node[1].match(regex))
    }

    function detectPattern(node) {
      try {
        if (pattern(node)) {
          matches.push(node);
        }
      } catch(e) {}
    }

    traverse(src, detectPattern);
    return matches;
  }

  var sourceHtml = $(new DOMParser().parseFromString(document.documentElement.outerHTML, 'text/html'));

  var deferreds = [];
  var scripts = {};
  $(sourceHtml).find('script[src]').each(function(idx, source) {
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
        scripts[src] = scripts[src] || [];
        scripts[src].push(parse(data));
      }
    }));
  });
  $(sourceHtml).find('script:not([src])').each(function(idx, source) {
    scripts['inline <script>'] = scripts['inline <script>'] || [];
    scripts['inline <script>'].push(parse($(source).text()));
  });

  $.when.apply($, deferreds).always(function() {;
    $('[data-example]').each(function(idx, el) {
      var exampleSlug = $(this).data('example');
      var ex = $('<div class="adcom-example"></div>');
      $(el).append(ex);

      var control = $('<div class="adcom-control"></div>');
      control.html("<i class='glyphicon glyphicon-cloud-download'></i><p>code</p>");
      $(el).append(control);

      var modal = $('<div class="modal fade"><div class="modal-dialog modal-lg"><div class="modal-content"><div class="modal-header"><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button><h4><code>' + exampleSlug + '</code></h4></div><div class="modal-body"></div></div></div></div>');

      var elements = $(sourceHtml).find('[data-example="' + exampleSlug + '"]');
      var html = '';
      elements.each(function(idx, element) {
        html += html_beautify(element.outerHTML, {indent_size: 2}) + "\n\n";
      });
      if (html.length > 0) {
        modal.find('.modal-body').append($('<h5>HTML</h5>'));
        modal.find('.modal-body').append($('<div class="highlight"><pre class="example-code"><code class="html"></code></pre></div>'));
        modal.find('code.html').text(html);
        hljs.highlightBlock(modal.find('code.html')[0]);
      }

      var js = '';
      $.each(scripts, function(name, script) {
        $.each(script, function(idx, source) {
          var funcs = findFunctionsByName(source, exampleSlug);

          $.each(funcs, function(idx, func) {
            var code = js_beautify(gen_code(func), {indent_size: 2});
            js += '// ' + name + "\n";
            js += code + "\n\n";
          });
        });
      });
      if (js.length > 0) {
        modal.find('.modal-body').append($('<h5>JS</h5>'));
        modal.find('.modal-body').append($('<div class="highlight"><pre class="example-code"><code class="js"></code></pre></div>'));
        modal.find('code.js').text(js);
        hljs.highlightBlock(modal.find('code.js')[0]);
      }

      $('body').append(modal);

      $(control).on('click', function(e) {
        modal.modal('show');
      });
    });

    initializeZeroClipboard();
  });
}(jQuery);
// });
