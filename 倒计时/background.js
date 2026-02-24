// background.js - 后台服务工作者
// 用于设置定时提醒等功能

chrome.runtime.onInstalled.addListener(() => {
  console.log('节日倒计时插件已安装');
  
  // 可以在这里设置定时提醒
  chrome.alarms.create('dailyUpdate', {
    when: Date.now(),
    periodInMinutes: 1440 // 每天更新一次
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyUpdate') {
    // 每天可以在这里做一些数据更新
    console.log('每日更新触发');
  }
});