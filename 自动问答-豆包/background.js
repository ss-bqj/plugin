// Manifest V3 Service Worker
chrome.runtime.onInstalled.addListener(() => {
    console.log('自动对话助手插件已安装');
});

// 保持Service Worker活跃
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    return true; // 保持消息通道开放
});