chrome.action.onClicked.addListener(function (tab) {
  if (tab.url.indexOf('chrome://') === 0) return;
  chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' }, function (response) {
    if (chrome.runtime.lastError) {
      // Content script not yet loaded, inject it
      chrome.scripting.insertCSS(
        { target: { tabId: tab.id }, files: ['content.css'] },
        function () {
          chrome.scripting.executeScript(
            { target: { tabId: tab.id }, files: ['content.js'] }
          );
        }
      );
    }
  });
});
