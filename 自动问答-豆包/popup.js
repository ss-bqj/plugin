// 获取DOM元素
const itemListTextarea = document.getElementById('itemList');
const loopCountInput = document.getElementById('loopCount');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');

// 初始化：从storage加载保存的数据
chrome.storage.local.get(['itemList', 'loopCount'], (result) => {
    if (result.itemList) {
        itemListTextarea.value = result.itemList;
    }
    if (result.loopCount) {
        loopCountInput.value = result.loopCount;
    }
});

// 保存数据到storage
function saveSettings() {
    chrome.storage.local.set({
        itemList: itemListTextarea.value,
        loopCount: loopCountInput.value
    });
}

// 更新状态显示
function updateStatus(message) {
    statusDiv.textContent = message;
    statusDiv.style.color = '#2196F3';
}

// 开始执行
startBtn.addEventListener('click', async () => {
    saveSettings();
    
    const items = itemListTextarea.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    if (items.length === 0) {
        alert('请输入至少一个对话内容！');
        return;
    }
    
    const loopCount = parseInt(loopCountInput.value) || 1;
    
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
        alert('请先在浏览器中打开目标页面！');
        return;
    }
    
    updateStatus(`准备执行 ${items.length} 个项目，循环 ${loopCount} 次...`);
    
    // 向content script发送指令
    try {
        await chrome.tabs.sendMessage(tab.id, {
            action: 'startAutomation',
            items: items,
            loopCount: loopCount
        });
        updateStatus('指令已发送，正在执行...');
    } catch (error) {
        updateStatus('错误：' + error.message);
        alert('请在目标页面刷新后重试，或检查页面是否支持！');
    }
});

// 停止执行
stopBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
        chrome.tabs.sendMessage(tab.id, { action: 'stopAutomation' });
        updateStatus('已发送停止指令');
    }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'statusUpdate') {
        updateStatus(message.text);
    } else if (message.type === 'taskComplete') {
        updateStatus('✅ 所有任务已完成！');
    }
});