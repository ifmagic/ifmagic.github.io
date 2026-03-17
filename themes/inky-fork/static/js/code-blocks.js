document.addEventListener('DOMContentLoaded', function () {
  var tocRoot = document.querySelector('[data-toc]');
  var tocToggle = document.querySelector('[data-toc-toggle]');
  var tocLayout = tocRoot ? tocRoot.closest('.post-layout') : null;
  var tocStorageKey = 'post-toc-collapsed';

  function syncTocToggleState(isCollapsed) {
    if (!tocRoot || !tocToggle) {
      return;
    }

    tocRoot.classList.toggle('is-collapsed', isCollapsed);
    if (tocLayout) {
      tocLayout.classList.toggle('toc-collapsed', isCollapsed);
    }
    tocToggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    tocToggle.textContent = isCollapsed ? '目录 >>' : '目录 <<';
  }

  if (tocRoot && tocToggle) {
    var initialCollapsed = false;
    try {
      initialCollapsed = window.localStorage.getItem(tocStorageKey) === '1';
    } catch (err) {
      initialCollapsed = false;
    }

    syncTocToggleState(initialCollapsed);

    tocToggle.addEventListener('click', function () {
      var nextCollapsed = !tocRoot.classList.contains('is-collapsed');
      syncTocToggleState(nextCollapsed);

      try {
        window.localStorage.setItem(tocStorageKey, nextCollapsed ? '1' : '0');
      } catch (err) {
        // ignore storage failures in private mode
      }
    });
  }

  var blocks = document.querySelectorAll('article pre');
  var syncHandlers = [];

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        var ok = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!ok) {
          reject(new Error('copy failed'));
          return;
        }
        resolve();
      } catch (err) {
        document.body.removeChild(textArea);
        reject(err);
      }
    });
  }

  function countLines(text) {
    var normalized = text.replace(/\r\n/g, '\n');
    if (normalized.endsWith('\n')) {
      normalized = normalized.slice(0, -1);
    }
    if (!normalized) {
      return 1;
    }
    return normalized.split('\n').length;
  }

  function inferLanguage(pre) {
    if (pre.dataset.lang) {
      return;
    }

    var className = pre.className || '';
    var match = className.match(/language-([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      pre.dataset.lang = match[1];
    } else {
      pre.dataset.lang = 'text';
    }
  }

  blocks.forEach(function (pre) {
    if (pre.dataset.enhanced === 'true') {
      return;
    }

    var code = pre.querySelector('code');
    if (!code) {
      return;
    }

    inferLanguage(pre);

    var lineCount = countLines(code.textContent || '');
    var wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrap';

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    var lineNumbers = document.createElement('div');
    lineNumbers.className = 'code-line-numbers';
    lineNumbers.setAttribute('aria-hidden', 'true');

    var nums = [];
    for (var i = 1; i <= lineCount; i += 1) {
      nums.push(String(i));
    }
    lineNumbers.textContent = nums.join('\n');

    pre.insertBefore(lineNumbers, pre.firstChild);
    pre.classList.add('has-line-numbers');

    var copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'code-copy-btn';
    copyButton.textContent = 'Copy';
    copyButton.setAttribute('aria-label', 'Copy code');

    var resetCopyTimer = null;
    copyButton.addEventListener('click', function () {
      var source = code.textContent || '';
      copyToClipboard(source).then(function () {
        copyButton.textContent = 'Copied';
        copyButton.classList.add('is-copied');
        window.clearTimeout(resetCopyTimer);
        resetCopyTimer = window.setTimeout(function () {
          copyButton.textContent = 'Copy';
          copyButton.classList.remove('is-copied');
        }, 1400);
      }).catch(function () {
        copyButton.textContent = 'Copy failed';
        window.clearTimeout(resetCopyTimer);
        resetCopyTimer = window.setTimeout(function () {
          copyButton.textContent = 'Copy';
        }, 1600);
      });
    });

    pre.appendChild(copyButton);

    var syncLayout = function () {
      var styles = window.getComputedStyle(pre);
      var lineHeight = parseFloat(styles.lineHeight) || 24;
      var paddingTop = parseFloat(styles.paddingTop) || 0;
      var paddingBottom = parseFloat(styles.paddingBottom) || 0;

      lineNumbers.style.top = paddingTop + 'px';
      lineNumbers.style.lineHeight = styles.lineHeight;
      lineNumbers.style.fontSize = styles.fontSize;
      pre.style.setProperty('--collapsed-height', (paddingTop + lineHeight + paddingBottom) + 'px');
    };

    syncLayout();
    syncHandlers.push(syncLayout);

    if (lineCount > 5) {
      var overlay = document.createElement('div');
      overlay.className = 'code-collapse-overlay';

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'code-inline-toggle';
      toggle.textContent = 'Expand';
      toggle.setAttribute('aria-expanded', 'false');

      wrapper.classList.add('is-collapsed');

      overlay.appendChild(toggle);
      pre.appendChild(overlay);

      toggle.addEventListener('click', function () {
        var expanded = wrapper.classList.toggle('is-collapsed');
        var isCollapsed = expanded;
        toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        toggle.textContent = isCollapsed ? 'Expand' : 'Collapse';
      });

      var syncOverlayLayout = function () {
        var styles = window.getComputedStyle(pre);
        var lineHeight = parseFloat(styles.lineHeight) || 24;
        var paddingTop = parseFloat(styles.paddingTop) || 0;

        pre.style.setProperty('--code-line-height', lineHeight + 'px');
        pre.style.setProperty('--collapse-overlay-top', (paddingTop + lineHeight * 4) + 'px');
        pre.style.setProperty('--collapsed-height', (paddingTop + lineHeight * 5 + 12) + 'px');
      };

      syncOverlayLayout();
      syncHandlers.push(syncOverlayLayout);
    }

    pre.dataset.enhanced = 'true';
  });

  if (syncHandlers.length > 0) {
    window.addEventListener('resize', function () {
      syncHandlers.forEach(function (handler) {
        handler();
      });
    });
  }
});
