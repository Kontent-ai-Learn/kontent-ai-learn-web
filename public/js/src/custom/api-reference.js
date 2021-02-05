(function () {
  /* Helper methods */
  var triggerClick = function (item) {
    setTimeout(function () {
      if (item) {
        item.click();
      }
    }, 0);
  };

  var updateLabel = function (item) {
    if (!item) {
      return;
    }

    var selectorLabel = helper.findAncestor(item, '.language-selector');
    if (selectorLabel) {
      selectorLabel = selectorLabel.querySelector('.language-selector__label');
    }

    if (selectorLabel) {
      selectorLabel.innerHTML = item.innerHTML;
    }
  };

  /* Code blocks inside documentation body */
  var getPrismClassName = function (item) {
    var lang;
    var pairings = {
      rest: 'shell',
      shell: 'shell',
      curl: 'shell',
      _net: 'dotnet',
      c_: 'dotnet',
      javascript: 'js',
      json: 'js',
      typescript: 'ts',
      java: 'java',
      android: 'java',
      javarx: 'java',
      php: 'php',
      swift: 'swift',
      python: 'python',
      ruby: 'ruby'
    };

    if (item) {
      lang = pairings[item];
    }

    if (!lang) {
      lang = 'clike';
    }

    return 'language-' + lang;
  };

  var createHighlightedBlock = function (block) {
    setTimeout(function () {
      var cleanCode = block.querySelector('.clean-code').innerHTML;
      var codeElem = document.createElement('code');
      codeElem.innerHTML = cleanCode;
      codeElem.classList.add(getPrismClassName(block.getAttribute('data-platform-code')));
      block.appendChild(codeElem);
      if (block.parentNode.classList.contains('code-samples')) {
        block.classList.add('hidden');
      } else {
        block.classList.add(getPrismClassName(block.getAttribute('data-platform-code')));
        window.Prism.highlightElement(codeElem);
      }
      block.classList.add('loaded');
    }, 0);
  };

  var initCodeBlocks = function (blocks) {
    for (var i = 0; i < blocks.length; i++) {
      createHighlightedBlock(blocks[i]);
    }
  };

  var codeBlocks = function () {
    var blocks = document.querySelectorAll('[data-platform-code]');

    var interval = setInterval(function () {
      blocks = document.querySelectorAll('[data-platform-code]');
      if (blocks.length) {
        initCodeBlocks(blocks);
        clearInterval(interval);
      }
    }, 100);
  };

  codeBlocks();

  document.addEventListener('click', (e) => {
    if (e.target && e.target.matches('.language-selector__link')) {
      e.preventDefault();

      var platform = e.target.getAttribute('data-platform');
      var links = document.querySelectorAll('.language-selector__link');
      var linkRedoc = document.querySelector('.tab-click_' + platform);
      var blocks = document.querySelectorAll('[data-platform-code]');

      window.helper.setCookie('KCDOCS.preselectedLanguage', platform);

      for (var i = 0; i < links.length; i++) {
        if (links[i].getAttribute('data-platform') === platform) {
          updateLabel(links[i]);
          links[i].classList.add('language-selector__link--active');
        } else {
          links[i].classList.remove('language-selector__link--active');
        }
      }

      for (var j = 0; j < blocks.length; j++) {
        if (blocks[j].parentNode.classList.contains('code-samples')) {
          if (blocks[j].getAttribute('data-platform-code') === platform) {
            blocks[j].classList.remove('hidden');
            window.Prism.highlightElement(blocks[j].querySelector('code'));
          } else {
            blocks[j].classList.add('hidden');
          }
        }
      }

      if (linkRedoc) {
        linkRedoc.click();
      }
    }
  });

  /* Code blocks for requests and responses */
  var initPlatfromFromCookie = function () {
    var clicked = false;

    var cookie = window.helper.getCookie('KCDOCS.preselectedLanguage');

    if (cookie && !clicked) {
      var tabs = document.querySelectorAll('[class="tab-click_' + cookie + '"], [data-platform="' + cookie + '"]');

      if (tabs && tabs.length) {
        for (var i = 0; i < tabs.length; i++) {
          clicked = true;
          triggerClick(tabs[i]);
        }

        setTimeout(function () {
          clicked = false;
        }, 0);
      } else {
        triggerClick(document.querySelector('[data-platform]'));
      }
    } else {
      triggerClick(document.querySelector('[data-platform]'));
    }
  };

  var getPlatformFromClassName = function (className) {
    var classNames = className.split(' ');
    var platform = '';
    for (var i = 0; i < classNames.length; i++) {
      if (classNames[i].indexOf('tab-click_') > -1) {
        platform = classNames[i].replace('tab-click_', '');
      }
    }

    return platform;
  };

  var clickTab = function () {
    var tabs = document.querySelectorAll('[class*="tab-click_"], [data-platform]');
    var body = document.querySelector('body');
    var clicked = false;

    var interval = setInterval(function () {
      tabs = document.querySelectorAll('[class*="tab-click_"], [data-platform]');
      if (tabs.length) {
        initPlatfromFromCookie();
        clearInterval(interval);
      }
    }, 100);

    body.addEventListener('click', function (e) {
      if (e.target && e.target.className && e.target.className.indexOf && e.target.className.indexOf('tab-click_') > -1 && !clicked) {
        var platform = getPlatformFromClassName(e.target.className);
        var className = 'tab-click_' + platform;

        updateLabel(e.target);

        window.helper.setCookie('KCDOCS.preselectedLanguage', platform);

        if (!tabs.length) {
          tabs = document.querySelectorAll('[class*="tab-click_"], [data-platform]');
        }

        for (var i = 0; i < tabs.length; i++) {
          if ((tabs[i].classList.contains(className) || tabs[i].getAttribute('data-platform') === platform) && tabs[i] !== e.target) {
            clicked = true;
            triggerClick(tabs[i]);

            updateLabel(tabs[i]);
          }
        }

        setTimeout(function () {
          clicked = false;
        }, 0);
      }
    });
  };

  clickTab();

  var setButtonPosition = function (button) {
    if (window.pageYOffset < 56) {
      if (!button.classList.contains('nav-trigger-top')) {
        button.classList.add('nav-trigger-top');
      }
    } else {
      button.classList.remove('nav-trigger-top');
    }
  };

  var floatingButtonPosition = function () {
    var button = document.querySelector('[class*="__FloatingButton"]');

    var interval = setInterval(function () {
      button = document.querySelector('[class*="__FloatingButton"]');
      if (button) {
        setButtonPosition(button);
        clearInterval(interval);
      }
    }, 100);
  };

  floatingButtonPosition();
  window.addEventListener('scroll', function () {
    var button = document.querySelector('[class*="__FloatingButton"]');
    if (button) {
      setButtonPosition(button);
    }
  });

  var createAchors = function (headings) {
    for (var i = 0; i < headings.length; i++) {
      var headingId = headings[i].getAttribute('id');
      var headingHTML = headings[i].innerHTML;
      var ancestor = helper.findAncestor(headings[i], '[data-section-id]')
      var section = ancestor ? ancestor.getAttribute('data-section-id') : '';
      var newId = section + '/' + headingId;

      headings[i].setAttribute('id', newId);
      var anchorLink = '<a class="linkify__StyledShareLink" href="#' + newId + '" data-custom-anchor></a>';
      headings[i].innerHTML = anchorLink + headingHTML;
    }
  };

  var addAchorsToHeadings = function () {
    var headings = document.querySelectorAll('h2[id], h3[id], h4[id]');

    var interval = setInterval(function () {
      headings = document.querySelectorAll('h2[id], h3[id], h4[id]');
      if (headings.length) {
        createAchors(headings);
        clearInterval(interval);
      }
    }, 100);
  };

  var getAnchor = function () {
    return (document.URL.split('#').length > 1) ? document.URL.split('#')[1] : null;
  };

  var offset = function (el) {
    var rect = el.getBoundingClientRect();
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return rect.top + scrollTop;
  }

  var scrollToHeading = function () {
    var headings = document.querySelectorAll('h2[id], h3[id]');
    var anchor = getAnchor();

    var interval = setInterval(function () {
      headings = document.querySelectorAll('h2[id], h3[id]');
      if (headings.length && anchor) {
        if (document.body.scrollTop === 0) {
          var heading = document.getElementById(anchor);

          if (heading) {
            window.scrollTo(0, offset(heading));
          }
        }
        clearInterval(interval);
      }
    }, 100);
  };

  var forceCorrectHash = function () {
    var content = document.querySelector('.api-content');

    var interval = setInterval(function () {
      content = document.querySelector('.api-content');
      if (content) {
        content.addEventListener('click', function (e) {
          if (e.target && e.target.matches('[data-custom-anchor]')) {
            setTimeout(function () {
              window.location.hash = e.target.getAttribute('href');
            }, 50);
          }
        });
        clearInterval(interval);
      }
    });
  };

  addAchorsToHeadings();
  scrollToHeading();
  forceCorrectHash();

  var createSelectLanguageSelector = function (sel) {
    setTimeout(function () {
      var lists = document.querySelectorAll(sel);

      for (var i = 0; i < lists.length; i++) {
          var wrap = document.createElement('div');
          wrap.classList.add('language-selector');

          var label = document.createElement('label');
          label.classList.add('language-selector__label');

          lists[i].parentNode.insertBefore(wrap, lists[i]);
          wrap.appendChild(label);
          wrap.appendChild(lists[i]);
      }
    }, 0);
  };

  var interactSelectLanguageSelector = function () {
    document.querySelector('body').addEventListener('click', (e) => {
      if (e.target && e.target.matches('.language-selector__label')) {
        var languageSelector = helper.findAncestor(e.target, '.language-selector');
        if (languageSelector.classList.contains('language-selector--opened')) {
            languageSelector.classList.remove('language-selector--opened');
        } else {
            languageSelector.classList.add('language-selector--opened');
        }
      } else {
        var allLanguageSelectors = document.querySelectorAll('.language-selector');

        for (var i = 0; i < allLanguageSelectors.length; i++) {
          allLanguageSelectors[i].classList.remove('language-selector--opened');
        }
      }
    });
  };

  var removeLinksFromJSON = function () {
    var links = document.querySelectorAll('[class*="JsonViewer"] a');

    for (var i = 0; i < links.length; i++) {
      var wrap = document.createElement('span');
      wrap.classList.add('token', 'custom-link-removal');
      wrap.innerHTML = links[i].innerHTML;

      links[i].parentNode.replaceChild(wrap, links[i]);
    }
  };

  createSelectLanguageSelector('.language-selector__list');
  // createSelectLanguageSelector('.react-tabs__tab-list');
  interactSelectLanguageSelector();
  removeLinksFromJSON();
})();
