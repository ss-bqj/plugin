// 自动化状态管理
let isRunning = false;
let currentItemIndex = 0;
let currentLoop = 0;
let items = [];
let loopCount = 1;
let allConversations = []; // 新增：存储所有对话数据

// 辅助函数：等待元素出现
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`等待元素超时: ${selector}`));
        }, timeout);
    });
}

// 辅助函数：等待指定时间
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 辅助函数：发送状态更新
function updateStatus(text) {
    console.log('[AutoClick]', text);
    chrome.runtime.sendMessage({
        type: 'statusUpdate',
        text: text
    });
}

// 新增函数：等待并获取AI回复
async function waitForResponse(inputText, timeout = 30000) {
    const responseSelector = 'div[data-testid="message_text_content"]';
    updateStatus('等待AI回复...');
    
    try {
        // 等待回复出现，先等待1秒确保消息发送完成
        await sleep(1000);
        
        // 等待至少2条消息（用户消息和AI回复）
        let messages = [];
        let attempts = 0;
        const maxAttempts = timeout / 1000;
        
        while (messages.length < 2 && attempts < maxAttempts) {
            messages = document.querySelectorAll(responseSelector);
            if (messages.length >= 2) {
                // 获取最后一条消息作为AI回复
                const lastMessage = messages[messages.length - 1];
                return lastMessage.textContent.trim();
            }
            await sleep(1000);
            attempts++;
        }
        
        // 如果超时，尝试获取最后一条
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            return lastMessage.textContent.trim();
        }
        
        return '[等待回复超时]';
    } catch (error) {
        return `[获取回复出错: ${error.message}]`;
    }
}

// 主执行流程
async function executeAutomation() {
    if (!isRunning) return;
    
    try {
        // 循环处理每个项目
        for (let loop = 0; loop < loopCount; loop++) {
            currentLoop = loop + 1;
            updateStatus(`开始第 ${currentLoop}/${loopCount} 轮循环`);
            
            for (let i = 0; i < items.length; i++) {
                if (!isRunning) break;
                
                currentItemIndex = i;
                const item = items[i];
                updateStatus(`正在处理: ${item.substring(0, 20)}... (${i + 1}/${items.length})`);
                
                // 步骤1: 点击"开启新对话"
                await clickNewChatButton();
                await sleep(1000);
                
                // 步骤2: 输入内容
                await inputText(item);
                await sleep(500);
                
                // 步骤3: 点击发送
                await clickSendButton();
                
                // 步骤4: 等待AI回复
                const responseText = await waitForResponse(item);
                updateStatus(`✓ 收到回复: ${responseText.substring(0, 30)}...`);
                
                // 步骤5: 保存对话数据
                const conversation = {
                    input: item,
                    output: responseText,
                    loop: currentLoop,
                    itemIndex: i + 1,
                    timestamp: new Date().toLocaleString('zh-CN'),
                    totalLoops: loopCount,
                    totalItems: items.length
                };
                allConversations.push(conversation);
                
                // 步骤6: 等待一段时间再继续
                await sleep(3000);
            }
            
            if (!isRunning) break;
        }
        
        isRunning = false;
        updateStatus('✅ 所有任务已完成！');
        chrome.runtime.sendMessage({ 
            type: 'taskComplete',
            conversations: allConversations  // 发送所有对话数据
        });
        
    } catch (error) {
        console.error('执行出错:', error);
        updateStatus(`❌ 错误: ${error.message}`);
        isRunning = false;
    }
}

// 步骤1: 点击"开启新对话"
async function clickNewChatButton() {
    const selector = ".section-item-title-K023pw"; 
    updateStatus('正在查找"开启新对话"按钮...');
    
    const button = await waitForElement(selector);
    
    // 确保按钮在可视区域
    button.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);
    
    // 模拟点击
    button.click();
    updateStatus('✓ 已点击"开启新对话"');
}

// 步骤2: 输入文本内容
async function inputText(text) {
    const selector = 'textarea[data-testid="chat_input_input"]';
    updateStatus('正在查找输入框...');
    
    const textarea = await waitForElement(selector);
    
    // 确保输入框可用
    textarea.focus();
    await sleep(200);
    
    // 清空现有内容
    textarea.value = '';
    
    // 模拟输入（逐个字符输入更真实）
    for (let char of text) {
        textarea.value += char;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(Math.random() * 50 + 20); // 随机间隔
    }
    
    // 触发change事件
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    updateStatus('✓ 文本输入完成');
}

// 步骤3: 点击发送按钮
async function clickSendButton() {
    const selector = 'button[data-testid="chat_input_send_button"]';
    updateStatus('正在查找发送按钮...');
    
    const button = await waitForElement(selector, 5000);
    
    // 等待按钮变为可用状态
    let attempts = 0;
    while (button.disabled && attempts < 20) {
        await sleep(200);
        attempts++;
    }
    
    if (button.disabled) {
        throw new Error('发送按钮长时间不可用');
    }
    
    // 滚动到可视区域
    button.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);
    
    // 模拟点击
    button.click();
    updateStatus('✓ 已点击发送');
    
    // 额外等待确认发送
    await sleep(35*1000);
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startAutomation') {
        if (isRunning) {
            updateStatus('⚠️ 任务已在运行中...');
            return;
        }
        
        // 重置数据
        isRunning = true;
        items = message.items;
        loopCount = message.loopCount || 1;
        currentItemIndex = 0;
        currentLoop = 0;
        allConversations = []; // 清空历史数据
        
        updateStatus(`收到任务，共 ${items.length} 个项目`);
        executeAutomation();
        
    } else if (message.action === 'stopAutomation') {
        isRunning = false;
        updateStatus('⏹️ 任务已停止');
    } else if (message.action === 'getConversations') {
        // 新增：返回对话数据
        sendResponse({ conversations: allConversations });
    }
    
    return true; // 保持消息通道开放
});