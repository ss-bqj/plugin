function normalizeHeaderName(name) {
    return name.toLowerCase().replace(/(^|-)([a-z])/g, (m, sep, char) => sep + char.toUpperCase());
}

function parseHeaders(text) {
    const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l.length > 0);
    const headers = {};
    
    if (lines.length === 0) return headers;
    
    // 检测是否为 key: value 格式
    let colonLines = 0;
    for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx > 0) {
            const before = line.substring(0, idx).trim();
            if (/^[a-zA-Z0-9\-_]+$/.test(before) && before.length > 0 && before.length < 50) {
                colonLines++;
            }
        }
    }
    const isColonFormat = colonLines > lines.length * 0.5;
    
    if (isColonFormat) {
        for (const line of lines) {
            const idx = line.indexOf(':');
            if (idx > 0) {
                const key = line.substring(0, idx).trim();
                const value = line.substring(idx + 1).trim();
                if (/^[a-zA-Z0-9\-_]+$/.test(key) && key.length < 50) {
                    headers[normalizeHeaderName(key)] = value;
                }
            }
        }
    } else {
        for (let i = 0; i < lines.length; i += 2) {
            const key = lines[i].trim();
            const value = lines[i + 1] !== undefined ? lines[i + 1].trim() : '';
            if (/^[a-zA-Z0-9\-_]+$/.test(key) && key.length > 0 && key.length < 50) {
                headers[normalizeHeaderName(key)] = value;
            }
        }
    }
    
    return headers;
}

function generatePythonDict(headers) {
    let output = 'headers = {\n';
    const entries = Object.entries(headers);
    
    entries.forEach(([key, value], index) => {
        const isLast = index === entries.length - 1;
        let escapedValue = value
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n');
        
        output += `    "${key}": "${escapedValue}"${isLast ? '' : ','}\n`;
    });
    
    output += '}';
    return output;
}

function convert() {
    const input = document.getElementById('input').value;
    if (!input.trim()) {
        showStatus('请输入内容', 'error');
        return;
    }
    
    try {
        const headers = parseHeaders(input);
        
        if (Object.keys(headers).length === 0) {
            showStatus('未解析到有效的 Headers', 'error');
            return;
        }
        
        const output = generatePythonDict(headers);
        document.getElementById('output').textContent = output;
        showStatus(`成功转换 ${Object.keys(headers).length} 个 headers`, 'success');
        
    } catch (e) {
        showStatus('转换失败: ' + e.message, 'error');
    }
}

function clearAll() {
    document.getElementById('input').value = '';
    document.getElementById('output').textContent = '等待转换...';
    showStatus('已清空', 'success');
}

async function copyOutput() {
    const output = document.getElementById('output').textContent;
    if (output === '等待转换...') {
        showStatus('没有可复制的内容', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(output);
        showStatus('已复制到剪贴板', 'success');
    } catch (err) {
        showStatus('复制失败', 'error');
    }
}

function downloadPython() {
    const output = document.getElementById('output').textContent;
    if (output === '等待转换...') {
        showStatus('没有可下载的内容', 'error');
        return;
    }
    
    const blob = new Blob([output + '\n'], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'headers.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus('已下载 headers.py', 'success');
}

function loadExample() {
    const example = `accept
application/json, text/plain, */*
accept-encoding
gzip, deflate, br, zstd
accept-language
zh-CN,zh;q=0.9
cookie
WEIBOCN_FROM=1110006030; SUB=_2AkMeoRbgf8NxqwFRm_0VzWziaolxzAjEieKo_ec7JRM3HRl-yT9yqmEitRB6NSE4D7MXiGQXUVK-SfGdRvN-Yr3pl9vQ; SUBP=0033WrSXqPxfM72-Ws9jqgMF55529P9D9WF5K2N0TYNovUvLzChNzGak; MLOGIN=0; _T_WM=32211669606; gdxidpyhxdE=tOj34l85sQ55308nzRn%2Fmuhhnx6%5CrcPoxWbbIbM1moLLl5aWwlivxQT0wUmNd%2FgYD4BJQcbYZMvDkHXoZARHoRqfA2q6Jg%2BJ2AX0%5CWdc8DT3Dp8MOXG5fjGnXlabzVQ2fU3jVMamS%5CJodj83YtfUDrv0B6%5CsBdlZa2GtTlT8sQLJ%5CJ5k%3A1778228571785; XSRF-TOKEN=3178db; mweibo_short_token=3b420cdd9d; M_WEIBOCN_PARAMS=luicode%3D10000011%26lfid%3D102803%26launchid%3D10000360-page_H5%26fid%3D106003type%253D25%2526t%253D3%2526disable_hot%253D1%2526filter_type%253Drealtimehot%26uicode%3D10000011
mweibo-pwa
1
priority
u=1, i
referer
https://m.weibo.cn/p/index?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot&title=%E5%BE%AE%E5%8D%9A%E7%83%AD%E6%90%9C&show_cache_when_error=1&extparam=seat%3D1%26region_relas_conf%3D0%26lcate%3D1001%26dgr%3D0%26filter_type%3Drealtimehot%26c_type%3D30%26needlocation%3D1%26pos%3D0_0%26mi_cid%3D100103%26cate%3D10103%26display_time%3D1776131895%26pre_seqid%3D177613189501502019478104&luicode=10000011&lfid=102803&launchid=10000360-page_H5 
sec-ch-ua
"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"
sec-ch-ua-mobile
?0
sec-ch-ua-platform
"macOS"
sec-fetch-dest
empty
sec-fetch-mode
cors
sec-fetch-site
same-origin
user-agent
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
x-requested-with
XMLHttpRequest
x-xsrf-token
3178db`;
    
    document.getElementById('input').value = example;
    convert();
    showStatus('已加载示例', 'success');
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status show ${type}`;
    setTimeout(() => {
        status.classList.remove('show');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnConvert').addEventListener('click', convert);
    document.getElementById('btnClear').addEventListener('click', clearAll);
    document.getElementById('btnExample').addEventListener('click', loadExample);
    document.getElementById('btnCopy').addEventListener('click', copyOutput);
    document.getElementById('btnDownload').addEventListener('click', downloadPython);
    
    document.getElementById('input').addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            convert();
        }
    });
    
    let pasteTimeout;
    document.getElementById('input').addEventListener('input', function() {
        clearTimeout(pasteTimeout);
        pasteTimeout = setTimeout(() => {
            if (this.value.trim().length > 0) {
                convert();
            }
        }, 500);
    });
});