// Make Persist.js use Session.js as its data store
var mutationSession = new Session({key: 'adcomDocs', persistent: false});
$(document).on('mutation.ac.persist', function (e) {
  var key = [e.key.element, e.key.type, e.key.path].join('.')
  mutationSession.set(key, e.value)

}).on('added.ac.persist', function (e) {
  var prefix = [e.key.element, e.key.type, e.key.path].join('.')
  var matches = $.grep(Object.keys(mutationSession.data), function (k) { return k.indexOf(prefix) == 0 })

  // For attribute changes, matches will just be the key for the attribute.
  // For characterData, multiple keys might match.
  matches.forEach(function(match) {
    var key = $.extend({}, e.key)
    // add on the path to individual text nodes for characterData
    key.path = key.path || match.split('.').slice(2).join('.')

    var value = mutationSession.get(match)
    if (value) $(e.target).persist('update', key, value)
  })
})

function convertTextarea(source) {
  var textarea = $('<div><textarea></textarea></div>');
  textarea.find('textarea').addClass($(source).attr('class'));
  textarea.find('textarea').val(source.innerText.replace(/(^\n)|(\n$)/g, ''));
  $(source).parent().parent().replaceWith(textarea);
  var height = textarea.find('textarea').prop('scrollHeight') - 30;
  // Don't truncate height if we'll have just a bit to scroll
  if (height < 350) height = Math.min(height, 300);
  textarea.find('textarea').height(height);

  return textarea;
}

$('[class^=language-example]').each(function(idx, example) {
  var ex = $(example).closest('.highlight');

  var sourceHtml = sourceJs = nativeContainer = renderedHtml = next = null;

  var cursor = ex;
  while (cursor.find('[class^=language-]').length > 0) {
    var source = cursor.find('[class^=language-]');
    var lang = source.attr('class').replace('language-', '');

    cursor = cursor.next();
    var converted = convertTextarea(source[0]);

    if (lang.match(/^js/)) {
      sourceJs = converted;
    } else if (lang.match(/^(html|example)/)) {
      sourceHtml = converted;
    }
  }

  var tabs = $('<div class="tabs clearfix"></div>');
  var panes = $('<div class="panes clearfix"></div>');
  panes.insertAfter(sourceHtml);
  panes.append(tabs);

  tabs.append($('<label class="tab" data-target="rendered-native">Rendered</label>'));
  tabs.append($('<label class="tab" data-target="rendered-html">Rendered HTML</label>'));
  tabs.append($('<label class="tab" data-target="view-source">Source</label>'));
  var renderedNative = $('<div></div>');
  var renderedHtml = $('<div class="highlight rendered-html pane"><pre><code class="language-markup"></code></pre></div>');

  if (sourceHtml) sourceHtml.addClass('source-html');
  if (sourceJs) sourceJs.addClass('source-js');
  nativeContainer = $('<div class="rendered-native pane"></div>');
  if (sourceHtml.find('textarea').attr('class').match(/bs/)) nativeContainer.addClass('bs');
  nativeContainer.append(renderedNative);

  var viewSource = $('<div class="highlight view-source pane"><pre><code class="language-markup"></code></pre></div>');

  panes.append(nativeContainer);
  panes.append(renderedHtml);
  panes.append(viewSource);

  (function(sourceHtml, sourceJs, renderedNative, renderedHtml, nativeContainer, viewSource, tabs, panes) {
    runExample = function() {
      var html = sourceHtml.find('textarea').val();
      var script = '';
      $(html).find('script').each(function(idx, scr) { script += scr.innerText; });
      if (sourceJs) script += "\n" + sourceJs.find('textarea').val();

      try {
        renderedNative.html(html);
        eval(script);
        tabs.removeClass('error');
        panes.removeClass('error');

      } catch (e) {
        console.log('error', e);
        tabs.addClass('error');
        panes.addClass('error');
        return;
      }

      var source = '';
      source += html;
      if (sourceJs) source += '\n\n<script type="text/javascript">\n' + script + '\n</script>';
      viewSource.find('code').text(html_beautify(source, {indent_size: 2}));
      Prism.highlightElement(viewSource.find('code')[0]);
    }

    updateHTML = function() {
      var newhtml = renderedNative[0].innerHTML;
      var code = renderedHtml.find('code');
      code.text(html_beautify(newhtml, {indent_size: 2}));
      Prism.highlightElement(code[0]);
    }

    var observer = new MutationObserver(updateHTML);
    observer.observe(renderedNative[0], { childList: true, subtree: true });

    if (sourceJs) sourceJs.find('textarea').on('keyup', runExample);
    if (sourceHtml) sourceHtml.find('textarea').on('keyup', runExample);
    tabs.on('click', 'label[data-target]', function() {
      var target = panes.find('.' + $(this).data('target'));
      tabs.find('.tab').removeClass('active');
      panes.find('.pane').removeClass('active');
      target.addClass('active');
      $(this).addClass('active');
    });
    tabs.find('label:first').click();

    updateHTML();
    runExample();
  })(sourceHtml, sourceJs, renderedNative, renderedHtml, nativeContainer, viewSource, tabs, panes);
});
