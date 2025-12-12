document.addEventListener('DOMContentLoaded', function() {
    const currentTimeElem = document.getElementById('currentTime');
    const timestampInput = document.getElementById('timestampInput');
    const datetimeInput = document.getElementById('datetimeInput');
    const timestampResult = document.getElementById('timestampResult');
    const datetimeResult = document.getElementById('datetimeResult');

    // 1. 更新当前时间（每秒刷新，仅填充初始默认值）
    function updateCurrentTime() {
        const now = new Date();
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            const second = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
        };
        const currentDatetime = formatDate(now);
        const currentTimestamp = Math.floor(now.getTime() / 1000);
        // 更新当前时间显示（实时）
        currentTimeElem.textContent = `当前时间：${currentDatetime} | 时间戳：${currentTimestamp}`;
        // 仅在弹窗打开时填充输入框默认值（用户输入后不会覆盖）
        if (!timestampInput.value.trim() && !datetimeInput.value.trim()) {
            timestampInput.value = currentTimestamp;
            datetimeInput.value = currentDatetime;
        }
    }
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // 2. 时间戳转日期（格式校验+输入完成后触发）
    function convertTimestamp() {
        const timestamp = timestampInput.value.trim();
        if (!timestamp) {
            timestampResult.className = 'result waiting';
            timestampResult.textContent = '等待输入...';
            return;
        }
        // 校验时间戳格式（10位秒或13位毫秒）
        if (!/^(10|13)$/.test(timestamp.length)) {
            timestampResult.className = 'result error';
            timestampResult.textContent = '错误：时间戳必须是10位（秒）或13位（毫秒）';
            return;
        }
        // 转换为毫秒
        const ms = timestamp.length === 10 ? parseInt(timestamp) * 1000 : parseInt(timestamp);
        const date = new Date(ms);
        if (isNaN(date.getTime())) {
            timestampResult.className = 'result error';
            timestampResult.textContent = '错误：无效的时间戳';
            return;
        }
        // 格式化日期并显示成功结果
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            const second = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
        };
        timestampResult.className = 'result success';
        timestampResult.textContent = `转换结果：${formatDate(date)}`;
    }

    // 3. 日期转时间戳（格式校验+输入完成后触发）
    function convertDatetime() {
        const datetime = datetimeInput.value.trim();
        if (!datetime) {
            datetimeResult.className = 'result waiting';
            datetimeResult.textContent = '等待输入...';
            return;
        }
        // 校验日期格式（YYYY-MM-DD HH:mm:ss）
        const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
        if (!regex.test(datetime)) {
            datetimeResult.className = 'result error';
            datetimeResult.textContent = '错误：格式必须为YYYY-MM-DD HH:mm:ss（如2025-12-12 16:00:00）';
            return;
        }
        // 转换为时间戳（秒级）
        const timestamp = Math.floor(new Date(datetime).getTime() / 1000);
        if (isNaN(timestamp)) {
            datetimeResult.className = 'result error';
            datetimeResult.textContent = '错误：无效的日期';
            return;
        }
        // 显示成功结果
        datetimeResult.className = 'result success';
        datetimeResult.textContent = `转换结果：${timestamp}`;
    }

    // 4. 绑定输入完成事件（失去焦点或回车键）
    // 失去焦点时触发（点击输入框外）
    timestampInput.addEventListener('blur', convertTimestamp);
    datetimeInput.addEventListener('blur', convertDatetime);
    // 回车键触发（输入完成后按回车）
    timestampInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // 阻止默认行为（如表单提交）
            convertTimestamp();
        }
    });
    datetimeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            convertDatetime();
        }
    });
});
