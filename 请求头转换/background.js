let windowId = null;

chrome.action.onClicked.addListener(async () => {
    if (windowId !== null) {
        try {
            await chrome.windows.update(windowId, { focused: true });
            return;
        } catch (e) {
            windowId = null;
        }
    }
    
    const win = await chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        type: 'popup',
        width: 700,
        height: 480,
        left: 100,
        top: 100
    });
    
    windowId = win.id;
});

chrome.windows.onRemoved.addListener((id) => {
    if (id === windowId) {
        windowId = null;
    }
});