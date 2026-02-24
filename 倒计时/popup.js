// 农历数据（简化版，实际项目中建议使用专业农历库如 lunar-javascript）
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557
];

// 2024-2030年主要节日数据（公历和农历）
const HOLIDAYS = [
  // 2025年
  { name: "春节", date: "2025-01-29", type: "lunar", icon: "🧧" },
  { name: "元宵节", date: "2025-02-12", type: "lunar", icon: "🏮" },
  { name: "清明节", date: "2025-04-04", type: "lunar", icon: "🌿" },
  { name: "劳动节", date: "2025-05-01", type: "solar", icon: "🛠️" },
  { name: "端午节", date: "2025-05-31", type: "lunar", icon: "🐲" },
  { name: "中秋节", date: "2025-10-06", type: "lunar", icon: "🥮" },
  { name: "国庆节", date: "2025-10-01", type: "solar", icon: "🇨🇳" },
  
  // 2026年
  { name: "春节", date: "2026-02-17", type: "lunar", icon: "🧧" },
  { name: "元宵节", date: "2026-03-03", type: "lunar", icon: "🏮" },
  { name: "清明节", date: "2026-04-05", type: "lunar", icon: "🌿" },
  { name: "劳动节", date: "2026-05-01", type: "solar", icon: "🛠️" },
  { name: "端午节", date: "2026-06-19", type: "lunar", icon: "🐲" },
  { name: "中秋节", date: "2026-09-25", type: "lunar", icon: "🥮" },
  { name: "国庆节", date: "2026-10-01", type: "solar", icon: "🇨🇳" },
  
  // 2027年
  { name: "春节", date: "2027-02-06", type: "lunar", icon: "🧧" },
  { name: "元宵节", date: "2027-02-20", type: "lunar", icon: "🏮" },
  { name: "清明节", date: "2027-04-05", type: "lunar", icon: "🌿" },
  { name: "劳动节", date: "2027-05-01", type: "solar", icon: "🛠️" },
  { name: "端午节", date: "2027-06-09", type: "lunar", icon: "🐲" },
  { name: "中秋节", date: "2027-09-15", type: "lunar", icon: "🥮" },
  { name: "国庆节", date: "2027-10-01", type: "solar", icon: "🇨🇳" },
];

// 星期名称
const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

// 格式化日期
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 格式化时间
function formatTime(date) {
  return date.toLocaleTimeString('zh-CN', { hour12: false });
}

// 获取农历日期（简化版）
function getLunarDate(date) {
  // 这里使用简化算法，实际项目中建议使用 lunar-javascript 库
  const lunarMonths = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                     '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                     '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  
  // 简化的农历计算（仅作演示，实际需用专业库）
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // 返回模拟的农历日期（实际项目中需要准确计算）
  return `农历${year}年${lunarMonths[month]}月${lunarDays[day % 30]}`;
}

// 计算倒计时
function calculateCountdown(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  const diff = target - now;
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isToday: true };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, isToday: false };
}

// 获取即将到来的节日
function getUpcomingHolidays() {
  const today = formatDate(new Date());
  
  return HOLIDAYS.filter(holiday => holiday.date >= today)
                 .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// 更新主倒计时显示
function updateMainCountdown() {
  const upcoming = getUpcomingHolidays();
  
  if (upcoming.length === 0) {
    document.getElementById('next-holiday').textContent = "暂无 upcoming 节日";
    return;
  }
  
  const nextHoliday = upcoming[0];
  const countdown = calculateCountdown(nextHoliday.date);
  
  // 更新节日名称和日期
  document.getElementById('next-holiday').textContent = `${nextHoliday.icon} ${nextHoliday.name}`;
  document.getElementById('holiday-date').textContent = nextHoliday.date;
  
  // 更新倒计时数字
  document.getElementById('days').textContent = String(countdown.days).padStart(2, '0');
  document.getElementById('hours').textContent = String(countdown.hours).padStart(2, '0');
  document.getElementById('minutes').textContent = String(countdown.minutes).padStart(2, '0');
  document.getElementById('seconds').textContent = String(countdown.seconds).padStart(2, '0');
  
  // 如果是当天
  if (countdown.isToday) {
    document.getElementById('days').textContent = "今";
    document.querySelector('#days + .label').textContent = "天";
  }
}

// 更新节日列表
function updateHolidayList() {
  const upcoming = getUpcomingHolidays();
  const listContainer = document.getElementById('holiday-list');
  listContainer.innerHTML = '';
  
  // 显示接下来的4个节日（不包括最近的）
  upcoming.slice(1, 5).forEach(holiday => {
    const today = new Date();
    const target = new Date(holiday.date);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="holiday-info">
        <span class="holiday-name-small">${holiday.icon} ${holiday.name}</span>
        <span class="holiday-date-small">${holiday.date}</span>
      </div>
      <span class="days-left">还有${diffDays}天</span>
    `;
    listContainer.appendChild(li);
  });
  
  // 如果没有更多节日
  if (upcoming.length <= 1) {
    listContainer.innerHTML = '<li style="text-align:center;color:#999;">今年没有更多节日了</li>';
  }
}

// 更新日期和时间显示
function updateDateTime() {
  const now = new Date();
  
  // 公历日期
  const dateStr = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`;
  document.getElementById('today-date').textContent = dateStr;
  
  // 农历日期（简化版）
  document.getElementById('lunar-date').textContent = getLunarDate(now);
  
  // 星期
  document.getElementById('weekday').textContent = WEEKDAYS[now.getDay()];
  
  // 当前时间
  document.getElementById('current-time').textContent = formatTime(now);
}

// 初始化
function init() {
  updateDateTime();
  updateMainCountdown();
  updateHolidayList();
  
  // 每秒更新
  setInterval(() => {
    updateDateTime();
    updateMainCountdown();
  }, 1000);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);