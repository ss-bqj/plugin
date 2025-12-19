// 获取DOM元素
const itemListTextarea = document.getElementById('itemList');
const loopCountInput = document.getElementById('loopCount');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusDiv = document.getElementById('status');

// 存储对话数据
let conversationsData = [];

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
    
    // 重置数据
    conversationsData = [];
    downloadBtn.disabled = true;
    
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

// 下载JSON文件
downloadBtn.addEventListener('click', async () => {
    if (conversationsData.length === 0) {
        alert('暂无数据可下载！');
        return;
    }
    
    try {
        // 生成JSON文件
        const jsonData = JSON.stringify(conversationsData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // 创建下载链接
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `对话记录_${timestamp}.json`;
        
        // 使用Chrome下载API
        await chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: true
        });
        
        updateStatus(`✅ JSON文件已准备下载: ${filename}`);
    } catch (error) {
        updateStatus(`❌ 下载失败: ${error.message}`);
        alert('下载失败: ' + error.message);
    }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'statusUpdate') {
        updateStatus(message.text);
    } else if (message.type === 'taskComplete') {
        updateStatus('✅ 所有任务已完成！');
        // 启用下载按钮
        if (message.conversations && message.conversations.length > 0) {
            conversationsData = message.conversations;
            downloadBtn.disabled = false;
            updateStatus(`✅ 任务完成！可下载 ${conversationsData.length} 条对话记录`);
        }
    }
});