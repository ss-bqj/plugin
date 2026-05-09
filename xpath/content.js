(function () {
  if (window.__xpathHelperPro) return;
  window.__xpathHelperPro = true;

  var isPicking = false;
  var pickOverlay = null;
  var pickTooltip = null;
  var currentHoverEl = null;
  var currentResults = [];
  var donateVisible = false;
  var donateOverlay = null;
  var panelVisible = false;

  // Get QR URLs
  var qrAlipay = '';
  var qrWechat = '';
  try {
    if (chrome.runtime && chrome.runtime.getURL) {
      qrAlipay = chrome.runtime.getURL('qr_alipay.jpg');
      qrWechat = chrome.runtime.getURL('qr_wechat.jpg');
    }
  } catch (e) {}

  // === CREATE PANEL (hidden by default) ===
  var panel = document.createElement('div');
  panel.id = 'xhp-panel';
  panel.style.display = 'none';

  panel.innerHTML =
    '<div id="xhp-header">' +
      '<div id="xhp-title">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<polyline points="4 7 4 4 20 4 20 7"></polyline>' +
          '<line x1="9" y1="4" x2="9" y2="20"></line>' +
          '<line x1="15" y1="4" x2="15" y2="20"></line>' +
        '</svg>' +
        '<span>XPath Helper Pro</span>' +
      '</div>' +
      '<div id="xhp-header-btns">' +
        '<button id="xhp-minimize">\u2013</button>' +
        '<button id="xhp-close">\u00d7</button>' +
      '</div>' +
    '</div>' +
    '<div id="xhp-body">' +
      '<div id="xhp-input-row">' +
        '<input type="text" id="xhp-input" placeholder="\u8f93\u5165 XPath \u8868\u8fbe\u5f0f\uff0c\u5982 //div[@class=\'test\']" spellcheck="false" autocomplete="off">' +
        '<button id="xhp-clear">\u00d7</button>' +
      '</div>' +
      '<div id="xhp-presets">' +
        '<button data-xpath="//*[@id=\'\']">id</button>' +
        '<button data-xpath="//*[@class=\'\']">class</button>' +
        '<button data-xpath="//a[contains(text(),\'\')]">text</button>' +
        '<button data-xpath="//input[@name=\'\']">name</button>' +
      '</div>' +
      '<div id="xhp-toolbar">' +
        '<button id="xhp-execute">\u6267\u884c</button>' +
        '<button id="xhp-highlight">\u9ad8\u4eae</button>' +
        '<button id="xhp-clear-hl">\u6e05\u9664</button>' +
        '<button id="xhp-pick">\u62fe\u53d6</button>' +
        '<button id="xhp-donate">\u2665 \u6253\u8d4f</button>' +
      '</div>' +
      '<div id="xhp-results">' +
        '<div id="xhp-result-header">' +
          '<span>\u5339\u914d\u7ed3\u679c</span>' +
          '<span id="xhp-count">0</span>' +
        '</div>' +
        '<div id="xhp-list"></div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(panel);

  // Get element refs
  var xpathInput = document.getElementById('xhp-input');
  var matchCount = document.getElementById('xhp-count');
  var resultList = document.getElementById('xhp-list');
  var pickBtn = document.getElementById('xhp-pick');
  var xhpBodyEl = document.getElementById('xhp-body');
  var headerEl = document.getElementById('xhp-header');

  // === DRAG ===
  var dragging = false, dragX = 0, dragY = 0;

  headerEl.addEventListener('mousedown', function (e) {
    if (e.target.closest('#xhp-header-btns')) return;
    dragging = true;
    dragX = e.clientX - panel.offsetLeft;
    dragY = e.clientY - panel.offsetTop;
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    panel.style.left = (e.clientX - dragX) + 'px';
    panel.style.top = (e.clientY - dragY) + 'px';
  });

  document.addEventListener('mouseup', function () { dragging = false; });

  // === TOGGLE PANEL ===
  function togglePanel() {
    panelVisible = !panelVisible;
    panel.style.display = panelVisible ? 'block' : 'none';
    if (panelVisible) xpathInput.focus();
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'togglePanel') {
      togglePanel();
      sendResponse({ status: 'ok' });
    }
  });

  // === HELPERS ===
  function escapeHtml(t) {
    var d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  function getXPathForElement(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '//*[@id="' + el.id + '"]';
    var parts = [];
    var cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement) {
      var idx = 1;
      var sib = cur.previousElementSibling;
      while (sib) { if (sib.tagName === cur.tagName) idx++; sib = sib.previousElementSibling; }
      var tn = cur.tagName.toLowerCase();
      parts.unshift(idx > 1 ? tn + '[' + idx + ']' : tn);
      cur = cur.parentElement;
    }
    if (cur === document.documentElement) parts.unshift('html');
    return '/' + parts.join('/');
  }

  function fixXPath(expr) {
    expr = expr.replace(/\[@class='([^']*)'\]/g, "[contains(@class,'$1')]");
    expr = expr.replace(/\[@class="([^"]*)"\]/g, '[contains(@class,"$1")]');
    return expr;
  }

  function saveHistory(expr) {
    try {
      var h = JSON.parse(localStorage.getItem('xhp_history') || '[]');
      h = h.filter(function (e) { return e !== expr; });
      h.push(expr);
      if (h.length > 20) h = h.slice(-20);
      localStorage.setItem('xhp_history', JSON.stringify(h));
    } catch (e) {}
  }

  // === EXECUTE ===
  function executeXPath() {
    var expr = xpathInput.value.trim();
    if (!expr) {
      matchCount.textContent = '0';
      resultList.innerHTML = '<div class="xhp-empty">\u8f93\u5165 XPath \u540e\u6267\u884c</div>';
      currentResults = [];
      return;
    }
    expr = fixXPath(expr);
    try {
      var result = document.evaluate(expr, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      currentResults = [];
      for (var i = 0; i < result.snapshotLength; i++) {
        var node = result.snapshotItem(i);
        if (node.nodeType === 1) {
          currentResults.push({
            type: 'element',
            tagName: node.tagName.toLowerCase(),
            id: node.id || '',
            text: node.textContent ? node.textContent.substring(0, 50) : ''
          });
        } else if (node.nodeType === 3) {
          var txt = node.textContent.trim();
          if (txt.length > 0) {
            currentResults.push({
              type: 'text',
              tagName: '#text',
              id: '',
              text: txt.substring(0, 50)
            });
          }
        }
      }
      matchCount.textContent = currentResults.length;
      if (currentResults.length === 0) {
        resultList.innerHTML = '<div class="xhp-empty">\u672a\u627e\u5230\u5339\u914d\u7684\u5143\u7d20</div>';
      } else {
        resultList.innerHTML = '';
        currentResults.forEach(function (node, i) {
          var item = document.createElement('div');
          item.className = 'xhp-result-item';
          var idPart = node.id ? ' id="' + node.id + '"' : '';
          var textPart = node.text ? ' ' + escapeHtml(node.text) : '';
          item.innerHTML =
            '<span class="xhp-idx">[' + i + ']</span>' +
            '<span class="xhp-tag">&lt;' + node.tagName + idPart + '&gt;</span>' +
            '<span class="xhp-path">' + textPart + '</span>';
          (function (idx) {
            item.addEventListener('click', function () { scrollToNode(expr, idx); });
          })(i);
          resultList.appendChild(item);
        });
      }
      saveHistory(expr);
    } catch (e) {
      matchCount.textContent = '!';
      matchCount.style.background = '#f38ba8';
      resultList.innerHTML = '<div class="xhp-error">' + escapeHtml(e.message) + '</div>';
      setTimeout(function () { matchCount.style.background = ''; }, 2000);
    }
  }

  function scrollToNode(xpath, index) {
    try {
      var result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      if (index < result.snapshotLength) {
        var node = result.snapshotItem(index);
        if (node.nodeType === 1) {
          document.querySelectorAll('.xhp-target').forEach(function (el) {
            el.style.outline = ''; el.style.outlineOffset = ''; el.classList.remove('xhp-target');
          });
          node.style.outline = '3px solid #f9e2af';
          node.style.outlineOffset = '2px';
          node.classList.add('xhp-target');
          node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } catch (e) {}
  }

  // === HIGHLIGHT ===
  function highlightAll() {
    var expr = xpathInput.value.trim();
    if (!expr) return;
    clearHighlights();
    try {
      var result = document.evaluate(expr, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (var i = 0; i < result.snapshotLength; i++) {
        var node = result.snapshotItem(i);
        if (node.nodeType === 1 && node !== panel && !panel.contains(node)) {
          node.style.background = 'rgba(137, 180, 250, 0.3)';
          node.style.outline = '2px solid #89b4fa';
          node.style.outlineOffset = '1px';
          node.classList.add('xhp-highlight');
        }
      }
    } catch (e) {}
  }

  function clearHighlights() {
    var els = document.querySelectorAll('.xhp-highlight, .xhp-target');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      el.style.background = '';
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.classList.remove('xhp-highlight');
      el.classList.remove('xhp-target');
    }
  }

  // === PICK ===
  function startPickMode() {
    if (isPicking) return;
    isPicking = true;
    pickBtn.textContent = 'Esc \u9000\u51fa';
    pickBtn.classList.add('xhp-picking');

    pickOverlay = document.createElement('div');
    pickOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999999;cursor:crosshair;';
    document.body.appendChild(pickOverlay);

    pickTooltip = document.createElement('div');
    pickTooltip.style.cssText = 'position:fixed;z-index:10000000;background:#1e1e2e;color:#cdd6f4;padding:5px 12px;border-radius:6px;font-size:12px;font-family:monospace;pointer-events:none;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.4);border:1px solid #45475a;white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis;';
    document.body.appendChild(pickTooltip);

    pickOverlay.addEventListener('mousemove', onPickMove);
    pickOverlay.addEventListener('click', onPickClick);
  }

  function stopPickMode() {
    if (!isPicking) return;
    isPicking = false;
    pickBtn.textContent = '\u62fe\u53d6';
    pickBtn.classList.remove('xhp-picking');
    if (pickOverlay) { pickOverlay.remove(); pickOverlay = null; }
    if (pickTooltip) { pickTooltip.remove(); pickTooltip = null; }
    if (currentHoverEl) { currentHoverEl.style.outline = ''; currentHoverEl.style.outlineOffset = ''; currentHoverEl = null; }
  }

  function onPickMove(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === pickOverlay || panel.contains(el)) return;
    if (currentHoverEl !== el) {
      if (currentHoverEl) { currentHoverEl.style.outline = ''; currentHoverEl.style.outlineOffset = ''; }
      currentHoverEl = el;
      el.style.outline = '2px solid #89b4fa';
      el.style.outlineOffset = '1px';
    }
    if (pickTooltip) {
      pickTooltip.textContent = getXPathForElement(el);
      pickTooltip.style.display = 'block';
      pickTooltip.style.left = (e.clientX + 15) + 'px';
      pickTooltip.style.top = (e.clientY - 30) + 'px';
    }
  }

  function onPickClick(e) {
    e.preventDefault();
    e.stopPropagation();
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === pickOverlay || panel.contains(el)) return;
    var xpath = getXPathForElement(el);
    if (pickOverlay) { pickOverlay.remove(); pickOverlay = null; }
    if (pickTooltip) { pickTooltip.remove(); pickTooltip = null; }
    isPicking = false;
    pickBtn.textContent = '\u62fe\u53d6';
    pickBtn.classList.remove('xhp-picking');
    xpathInput.value = xpath;
    executeXPath();
  }

  // === DONATE ===
  function showDonate() {
    if (donateVisible) { hideDonate(); return; }
    donateVisible = true;

    donateOverlay = document.createElement('div');
    donateOverlay.id = 'xhp-donate-overlay';

    var modal = document.createElement('div');
    modal.id = 'xhp-donate-modal';

    var header = document.createElement('div');
    header.id = 'xhp-donate-header';
    var titleSpan = document.createElement('span');
    titleSpan.textContent = '\u2615 \u8bf7\u6211\u559d\u676f\u5496\u5561';
    var closeBtn = document.createElement('button');
    closeBtn.id = 'xhp-donate-close';
    closeBtn.textContent = '\u00d7';
    header.appendChild(titleSpan);
    header.appendChild(closeBtn);

    var qrArea = document.createElement('div');
    qrArea.id = 'xhp-donate-qr';
    if (qrAlipay) {
      var box = document.createElement('div');
      box.className = 'xhp-qr-box';
      var img = document.createElement('img');
      img.src = qrAlipay;
      img.width = 180;
      img.alt = '\u652f\u4ed8\u5b9d';
      img.onerror = function () {
        this.style.display = 'none';
        var ph = document.createElement('div');
        ph.className = 'xhp-qr-placeholder';
        ph.textContent = '\u652f\u4ed8\u5b9d';
        box.appendChild(ph);
      };
      box.appendChild(img);
      var lbl = document.createElement('div');
      lbl.className = 'xhp-qr-label';
      lbl.textContent = '\u652f\u4ed8\u5b9d';
      box.appendChild(lbl);
      qrArea.appendChild(box);
    }
    if (qrWechat) {
      var box = document.createElement('div');
      box.className = 'xhp-qr-box';
      var img = document.createElement('img');
      img.src = qrWechat;
      img.width = 180;
      img.alt = '\u5fae\u4fe1';
      img.onerror = function () {
        this.style.display = 'none';
        var ph = document.createElement('div');
        ph.className = 'xhp-qr-placeholder';
        ph.textContent = '\u5fae\u4fe1';
        box.appendChild(ph);
      };
      box.appendChild(img);
      var lbl = document.createElement('div');
      lbl.className = 'xhp-qr-label';
      lbl.textContent = '\u5fae\u4fe1';
      box.appendChild(lbl);
      qrArea.appendChild(box);
    }

    modal.appendChild(header);
    modal.appendChild(qrArea);
    donateOverlay.appendChild(modal);
    document.body.appendChild(donateOverlay);

    closeBtn.addEventListener('click', hideDonate);
    donateOverlay.addEventListener('click', function (e) {
      if (e.target === donateOverlay) hideDonate();
    });
  }

  function hideDonate() {
    donateVisible = false;
    if (donateOverlay) { donateOverlay.remove(); donateOverlay = null; }
  }

  // === BIND EVENTS ===
  document.getElementById('xhp-close').addEventListener('click', function () {
    panelVisible = false;
    panel.style.display = 'none';
    stopPickMode();
  });

  document.getElementById('xhp-minimize').addEventListener('click', function () {
    xhpBodyEl.style.display = xhpBodyEl.style.display === 'none' ? '' : 'none';
  });

  document.getElementById('xhp-execute').addEventListener('click', executeXPath);
  document.getElementById('xhp-highlight').addEventListener('click', highlightAll);
  document.getElementById('xhp-clear-hl').addEventListener('click', clearHighlights);
  document.getElementById('xhp-pick').addEventListener('click', function () {
    isPicking ? stopPickMode() : startPickMode();
  });
  document.getElementById('xhp-donate').addEventListener('click', showDonate);
  document.getElementById('xhp-clear').addEventListener('click', function () {
    xpathInput.value = '';
    matchCount.textContent = '0';
    resultList.innerHTML = '<div class="xhp-empty">\u8f93\u5165 XPath \u540e\u6267\u884c</div>';
    currentResults = [];
    xpathInput.focus();
  });

  xpathInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') executeXPath();
  });

  document.querySelectorAll('#xhp-presets button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-xpath');
      xpathInput.value = value;
      var pos = value.indexOf("''") + 1;
      xpathInput.focus();
      xpathInput.setSelectionRange(pos, pos);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (isPicking) stopPickMode();
      if (donateVisible) hideDonate();
    }
  }, true);
})();
