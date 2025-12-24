// popup.js - 与豆包版本基本相同，通用
const itemListTextarea = document.getElementById('itemList');
const loopCountInput = document.getElementById('loopCount');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const statusDiv = document.getElementById('status');

let conversationsData = [];

// 从storage加载保存的数据
chrome.storage.local.get(['itemList', 'loopCount'], (result) => {
    if (result.itemList) {
        itemListTextarea.value = result.itemList;
    }
    if (result.loopCount) {
        loopCountInput.value = result.loopCount;
    }
});

// 保存设置
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
    downloadExcelBtn.disabled = true;
    
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url.includes('deepseek.com')) {
        alert('请先在浏览器中打开DeepSeek页面(chrome://extensions/)！');
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
        alert('请在DeepSeek页面刷新后重试，或检查是否已登录！');
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
        const jsonData = JSON.stringify(conversationsData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `deepseek对话记录_${timestamp}.json`;
        
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

// 下载Excel文件
downloadExcelBtn.addEventListener('click', async () => {
    if (conversationsData.length === 0) {
        alert('暂无数据可下载！');
        return;
    }
    
    try {
        updateStatus('正在生成Excel文件...');
        
        // 准备Excel数据
        const excelData = conversationsData.map((conv, index) => {
            const sources = conv.source_entity || [];
            const sourcesText = sources.map(s => 
                `[${s.cite_num}] ${s.title}\n来源: ${s.source_name}\n链接: ${s.link_url}\n摘要: ${s.summary}`
            ).join('\n\n');
            
            return {
                '序号': index + 1,
                '循环次数': `${conv.loop}/${conv.totalLoops}`,
                '项目序号': `${conv.itemIndex}/${conv.totalItems}`,
                '输入内容': conv.input,
                'AI回复': conv.output,
                '参考资料': sourcesText || '无',
                '时间戳': conv.timestamp
            };
        });
        
        // 创建工作簿
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // 设置列宽
        ws['!cols'] = [
            { wch: 6 },   // 序号
            { wch: 10 },  // 循环次数
            { wch: 10 },  // 项目序号
            { wch: 40 },  // 输入内容
            { wch: 60 },  // AI回复
            { wch: 80 },  // 参考资料
            { wch: 20 }   // 时间戳
        ];
        
        // 创建并下载文件
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DeepSeek对话记录");
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `deepseek对话记录_${timestamp}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        
        updateStatus(`✅ Excel文件已下载: ${filename}`);
    } catch (error) {
        updateStatus(`❌ Excel生成失败: ${error.message}`);
        alert('Excel生成失败: ' + error.message);
    }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'statusUpdate') {
        updateStatus(message.text);
    } else if (message.type === 'taskComplete') {
        if (message.conversations && message.conversations.length > 0) {
            conversationsData = message.conversations;
            downloadBtn.disabled = false;
            downloadExcelBtn.disabled = false;
            updateStatus(`✅ 任务完成！可下载 ${conversationsData.length} 条对话记录`);
        }
    }
});