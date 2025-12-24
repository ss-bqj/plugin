// DeepSeek自动问答 - 最终版（直接内联通知）
console.log('[DeepSeek插件] 最终版加载');

let isRunning = false;
let items = [];
let loopCount = 1;
let allConversations = [];

// ==================== 基础工具（保持不变） ====================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function updateStatus(text) {
    console.log('[状态]', text);
    try {
        chrome.runtime.sendMessage({ type: 'statusUpdate', text }).catch(() => {});
    } catch {}
}

// ==================== 核心逻辑（已验证有效） ====================
async function waitForResponse() {
    console.log('[waitForResponse] 开始');
    
    await sleep(6000); // 等待AI开始
    
    let lastLength = 0;
    let noChangeCount = 0;
    
    // 最多等5分钟
    for (let i = 0; i < 150; i++) { // 150 * 2秒 = 5分钟
        const messages = document.querySelectorAll('div.ds-message._63c77b1');
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            const contentDiv = lastMsg.querySelector('div.ds-markdown');
            if (contentDiv) {
                const currentLength = contentDiv.textContent.trim().length;
                
                if (currentLength > lastLength) {
                    console.log(`[增长] ${lastLength} → ${currentLength}`);
                    updateStatus(`AI回复中... (${currentLength} 字符)`);
                    lastLength = currentLength;
                    noChangeCount = 0;
                } else if (currentLength > 0) {
                    noChangeCount++;
                    if (noChangeCount >= 3) { // 6秒无增长
                        console.log(`[完成] ${currentLength} 字符`);
                        updateStatus(`✅ 回复完成 (${currentLength} 字符)`);
                        return contentDiv.textContent.trim();
                    }
                }
            }
        }
        await sleep(2000);
    }
    
    return '[等待回复超时]';
}

// ==================== 参考资料提取（保持不变） ====================
async function getReferenceSources() {
    try {
        await sleep(2000);
        
        const refButton = document.querySelector('div.ffdab56b.ddbfd84f');
        if (!refButton) return [];
        
        refButton.click();
        await sleep(3000);
        
        const links = document.querySelectorAll('div.dc433409 a');
        const sources = [];
        
        links.forEach((link, index) => {
            const title = link.querySelector('div.f664d0b2')?.textContent || '';
            if (title) {
                sources.push({
                    cite_num: String(index + 1),
                    source_name: link.querySelector('span.d2eca804')?.textContent || '未知来源',
                    pulish_time: link.querySelector('span.caa1ee14')?.textContent || '',
                    link_url: link.href || '',
                    title: title.trim(),
                    summary: link.querySelector('div.c56273f9')?.textContent || '无摘要'
                });
            }
        });
        
        document.body.click();
        return sources;
    } catch (e) {
        console.error('参考资料提取失败:', e);
        return [];
    }
}

// ==================== 主流程（修复通知） ====================
async function executeAutomation() {
    if (!isRunning) return;
    
    try {
        for (let loop = 0; loop < loopCount; loop++) {
            currentLoop = loop + 1;
            updateStatus(`\n【第 ${currentLoop}/${loopCount} 轮循环开始】`);
            
            for (let i = 0; i < items.length; i++) {
                if (!isRunning) break;
                
                const item = items[i];
                updateStatus(`\n项目 ${i+1}/${items.length}`);
                
                // 1. 新对话
                document.querySelector('div._5a8ac7a')?.click();
                await sleep(2000);
                
                // 2. 输入
                const textarea = document.querySelector('textarea._27c9245.ds-scroll-area.d96f2d2a');
                textarea.value = item;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                await sleep(500);
                
                // 3. 发送
                textarea.dispatchEvent(new KeyboardEvent('keydown', { 
                    key: 'Enter', 
                    code: 'Enter', 
                    bubbles: true 
                }));
                
                // 4. 等待回复
                updateStatus('⏳ 等待AI回复...');
                const responseText = await waitForResponse();
                updateStatus(`✅ 回复完成 (${responseText.length} 字符)`);
                
                // 5. 提取参考资料
                const sourceEntities = await getReferenceSources();
                
                allConversations.push({
                    input: item,
                    output: responseText,
                    loop: currentLoop,
                    itemIndex: i + 1,
                    timestamp: new Date().toLocaleString('zh-CN'),
                    totalLoops: loopCount,
                    totalItems: items.length,
                    source_entity: sourceEntities
                });
                
                updateStatus('✅ 项目完成\n');
                await sleep(2000);
            }
        }
        
        isRunning = false;
        
        // **修复**: 直接内联发送完成通知，不再依赖外部函数
        updateStatus('🎉 所有循环完成！');
        try {
            chrome.runtime.sendMessage({ 
                type: 'taskComplete',
                conversations: allConversations
            }).catch(() => {}); // 忽略所有错误
        } catch {}
        
    } catch (error) {
        console.error('❌ 致命错误:', error);
        updateStatus(`❌ 错误: ${error.message}`);
        isRunning = false;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startAutomation' && !isRunning) {
        sendResponse({ status: 'started' });
        
        (async () => {
            isRunning = true;
            items = message.items;
            loopCount = message.loopCount || 1;
            allConversations = [];
            
            updateStatus(`收到任务: ${items.length} 个问题`);
            await executeAutomation();
        })();
        
    } else if (message.action === 'stopAutomation') {
        isRunning = false;
        sendResponse({ status: 'stopped' });
    } else if (message.action === 'getConversations') {
        sendResponse({ conversations: allConversations });
    }
    
    return false;
});

console.log('[DeepSeek插件] 加载完成');