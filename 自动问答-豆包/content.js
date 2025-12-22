// 自动化状态管理
let isRunning = false;
let currentItemIndex = 0;
let currentLoop = 0;
let items = [];
let loopCount = 1;
let allConversations = [];

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

// 终极稳定版：等待AI回复（双重验证机制）
async function waitForResponse(inputText, timeout = 60000) {
    const responseSelector = 'div[data-testid="message_text_content"]';
    updateStatus('等待AI回复...');
    
    try {
        await sleep(1500); // 确保消息发送完成
        
        const stableWindow = 5000;      // 5秒基本稳定窗口
        const observationPeriod = 3000; // 观察到稳定后，再观察3秒（关键！）
        const checkInterval = 500;
        const maxAttempts = timeout / checkInterval;
        let attempts = 0;
        
        let lastLength = 0;
        let windowStartTime = Date.now();
        let observationStartTime = null;
        let currentContent = '';
        let lastMessageElement = null;
        
        while (attempts < maxAttempts) {
            const messages = document.querySelectorAll(responseSelector);
            
            if (messages.length >= 2) {
                const lastMessage = messages[messages.length - 1];
                
                // **关键改进1**：检测元素是否被替换（防止DOM刷新误判）
                if (!lastMessageElement) {
                    lastMessageElement = lastMessage;
                } else if (lastMessage !== lastMessageElement) {
                    updateStatus('检测到DOM更新，重置检测窗口');
                    lastMessageElement = lastMessage;
                    windowStartTime = Date.now();
                    observationStartTime = null;
                    lastLength = 0; // 重置长度记录
                }
                
                currentContent = lastMessage.textContent.trim();
                const currentLength = currentContent.length;
                
                // **关键改进2**：只要有明显增长就重置窗口
                if (currentLength > lastLength + 5) { // +5误差容忍
                    lastLength = currentLength;
                    windowStartTime = Date.now();
                    observationStartTime = null;
                    updateStatus(`正在接收回复... (${currentLength} 字符)`);
                } else {
                    const elapsed = Date.now() - windowStartTime;
                    
                    if (elapsed >= stableWindow) {
                        // 进入观察期
                        if (!observationStartTime) {
                            observationStartTime = Date.now();
                            updateStatus(`内容稳定，进入3秒观察期... (${currentLength} 字符)`);
                        }
                        
                        // **关键改进3**：观察期结束后才真正完成
                        const observationElapsed = Date.now() - observationStartTime;
                        if (observationElapsed >= observationPeriod) {
                            updateStatus(`✓ 双重验证完成，AI回复完整接收 (${currentLength} 字符)`);
                            return currentContent;
                        }
                    }
                }
            }
            
            await sleep(checkInterval);
            attempts++;
        }
        
        if (currentContent.length > 0) {
            updateStatus(`⚠️ 等待超时，返回已接收内容 (${currentContent.length} 字符)`);
            return currentContent;
        }
        
        return '[等待回复超时]';
        
    } catch (error) {
        return `[获取回复出错: ${error.message}]`;
    }
}

// ==================== 新增功能：获取参考资料 ====================
// 获取参考资料信息（在AI回复完成后调用）
async function getReferenceSources() {
    const sources = [];
    
    try {
        // 1. 等待参考资料按钮出现
        updateStatus('正在查找参考资料按钮...');
        const refButton = await waitForElement('span.entry-btn-title-a8ozJq.entry-btn-title', 8000);
        
        if (!refButton) {
            updateStatus('⚠️ 未找到参考资料按钮，跳过');
            return [];
        }
        
        // 2. 点击按钮打开资料面板
        refButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);
        refButton.click();
        updateStatus('✓ 已打开参考资料面板');
        
        // 3. 等待面板完全渲染
        await sleep(3000);
        
        // 4. 直接查找所有资料链接（你给的精确class！）
        const linkElements = document.querySelectorAll('a.search-lIUYwC[href^="http"]');
        
        if (linkElements.length === 0) {
            updateStatus('⚠️ 未找到任何资料链接');
            return [];
        }
        
        updateStatus(`✓ 找到 ${linkElements.length} 篇参考资料，开始提取...`);
        
        // 5. 遍历每个链接，在链接内部提取标题、摘要、来源
        for (let index = 0; index < linkElements.length; index++) {
            try {
                const linkEl = linkElements[index];
                
                // 在链接内部查找（相对路径，不会错位）
                const titleEl = linkEl.querySelector('.search-item-title-fLDLZw');
                const summaryEl = linkEl.querySelector('.search-item-summary-uNyUB_');
                const sourceNameEl = linkEl.querySelector('.footer-title-M1Yzgt');
                
                // 必须包含标题
                if (titleEl) {
                    const sourceInfo = {
                        cite_num: String(index + 1),
                        source_name: sourceNameEl ? sourceNameEl.textContent.trim() : '未知来源',
                        pulish_time: '', // 你要求为空
                        link_url: linkEl.href,
                        title: titleEl.textContent.trim(),
                        summary: summaryEl ? summaryEl.textContent.trim() : '无摘要'
                    };
                    sources.push(sourceInfo);
                    console.log(`[Source ${index + 1}/${linkElements.length}] ✅ 提取: ${sourceInfo.title.substring(0, 50)}...`);
                } else {
                    console.warn(`[Source ${index + 1}] ❌ 未找到标题，跳过`);
                }
            } catch (itemError) {
                console.warn(`提取第 ${index + 1} 个资料项失败:`, itemError);
            }
        }
        
        // 6. 关闭资料面板
        await sleep(300);
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        
        updateStatus(`✓ 参考资料提取完成，成功 ${sources.length} 条`);
        return sources;
        
    } catch (error) {
        updateStatus(`⚠️ 获取参考资料失败: ${error.message}`);
        console.error('获取参考资料出错:', error);
        return [];
    }
}
// ==================== 新增功能结束 ====================

// 主执行流程
async function executeAutomation() {
    if (!isRunning) return;
    
    try {
        for (let loop = 0; loop < loopCount; loop++) {
            currentLoop = loop + 1;
            updateStatus(`开始第 ${currentLoop}/${loopCount} 轮循环`);
            
            for (let i = 0; i < items.length; i++) {
                if (!isRunning) break;
                
                currentItemIndex = i;
                const item = items[i];
                updateStatus(`正在处理: ${item.substring(0, 20)}... (${i + 1}/${items.length})`);
                
                await clickNewChatButton();
                await sleep(1000);
                
                await inputText(item);
                await sleep(500);
                
                await clickSendButton();
                
                const responseText = await waitForResponse(item);
                updateStatus(`✓ 收到回复: ${responseText.substring(0, 30)}...`);
                
                // ==================== 关键修改点 ====================
                // 在AI回复完成后，获取参考资料
                const sourceEntities = await getReferenceSources();
                // ===================================================
                
                const conversation = {
                    input: item,
                    output: responseText,
                    loop: currentLoop,
                    itemIndex: i + 1,
                    timestamp: new Date().toLocaleString('zh-CN'),
                    totalLoops: loopCount,
                    totalItems: items.length,
                    source_entity: sourceEntities // 新增字段
                };
                allConversations.push(conversation);
                
                await sleep(3000);
            }
            
            if (!isRunning) break;
        }
        
        isRunning = false;
        updateStatus('✅ 所有任务已完成！');
        chrome.runtime.sendMessage({ 
            type: 'taskComplete',
            conversations: allConversations
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
    
    button.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);
    
    button.click();
    updateStatus('✓ 已点击"开启新对话"');
}

// 步骤2: 输入文本内容
async function inputText(text) {
    const selector = 'textarea[data-testid="chat_input_input"]';
    updateStatus('正在查找输入框...');
    
    const textarea = await waitForElement(selector);
    
    textarea.focus();
    await sleep(200);
    
    textarea.value = '';
    
    for (let char of text) {
        textarea.value += char;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(Math.random() * 50 + 20);
    }
    
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    updateStatus('✓ 文本输入完成');
}

// 步骤3: 点击发送按钮
async function clickSendButton() {
    const selector = 'button[data-testid="chat_input_send_button"]';
    updateStatus('正在查找发送按钮...');
    
    const button = await waitForElement(selector, 5000);
    
    let attempts = 0;
    while (button.disabled && attempts < 20) {
        await sleep(200);
        attempts++;
    }
    
    if (button.disabled) {
        throw new Error('发送按钮长时间不可用');
    }
    
    button.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);
    
    button.click();
    updateStatus('✓ 已点击发送');
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startAutomation') {
        if (isRunning) {
            updateStatus('⚠️ 任务已在运行中...');
            return;
        }
        
        isRunning = true;
        items = message.items;
        loopCount = message.loopCount || 1;
        currentItemIndex = 0;
        currentLoop = 0;
        allConversations = [];
        
        updateStatus(`收到任务，共 ${items.length} 个项目`);
        executeAutomation();
        
    } else if (message.action === 'stopAutomation') {
        isRunning = false;
        updateStatus('⏹️ 任务已停止');
    } else if (message.action === 'getConversations') {
        sendResponse({ conversations: allConversations });
    }
    
    return true;
});