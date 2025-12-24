// 保持Service Worker活跃
chrome.runtime.onInstalled.addListener(() => {
    console.log('DeepSeek自动对话助手已安装');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    return true; // 保持消息通道开放
});