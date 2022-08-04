(function () {
  Prism.plugins.autolinker.processGrammar = function (grammar) {
    // Customized regex - added negative lookbehind to stop on ,.) characters
    var url = /\b(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)[-a-zA-Z0-9+&@#/%?=~_|!:,.;]*[a-zA-Z0-9+&@#/%=~_|]/;
    
    // The rest is the same as the original function

    var email = /\b\S+@[\w.]+[a-z]{2}/;
    var linkMd = /\[([^\]]+)\]\(([^)]+)\)/;

    // Tokens that may contain URLs and emails
    var candidates = ['comment', 'url', 'attr-value', 'string'];

    // Abort if grammar has already been processed
    if (!grammar || grammar['url-link']) {
      return;
    }
    Prism.languages.DFS(grammar, function (key, def, type) {
      if (candidates.indexOf(type) > -1 && !Array.isArray(def)) {
        if (!def.pattern) {
          def = this[key] = {
            pattern: def
          };
        }

        def.inside = def.inside || {};

        if (type == 'comment') {
          def.inside['md-link'] = linkMd;
        }
        if (type == 'attr-value') {
          Prism.languages.insertBefore('inside', 'punctuation', { 'url-link': url }, def);
        } else {
          def.inside['url-link'] = url;
        }

        def.inside['email-link'] = email;
      }
    });
    grammar['url-link'] = url;
    grammar['email-link'] = email;
  }
}());