// =========================================================
// Remember OS 桌面系统 - 核心辅助脚本 (rememberos-helper.js)
// 功能：窗口管理、最近应用、系统操作、画板/便签等
// =========================================================

(function (window, document) {
  'use strict';

  // 全局配置
  const CONFIG = {
    maxRecentApps: 6,
    fullscreenTransition: 'all 50ms ease-out',
    storageKey: 'rememberOS_note'
  };

  // 应用映射
  const appMap = {
    textApp: { name: '文本工具', icon: '📝' },
    infoApp: { name: '系统信息', icon: '📜' },
    calcApp: { name: '计算器', icon: '🧮' },
    settingApp: { name: '系统设置', icon: '⚙️' },
    noteApp: { name: '记事本', icon: '📒' },
    paintApp: { name: '简易画板', icon: '🎨' },
    clockApp: { name: '全屏时钟', icon: '🕐' },
    stickyApp: { name: '桌面便签', icon: '📌' }
  };

  // 全局状态
  let recentApps = [];
  let dragX, dragY, winX, winY;
  let canvas, ctx, isDrawing = false;

  // =========================================================
  // 1. 系统时间
  // =========================================================
  function initSystemTime() {
    setInterval(() => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      const date = now.toLocaleDateString();
      const week = ['日','一','二','三','四','五','六'][now.getDay()];

      const sysTimeEl = document.getElementById('sysTime');
      const trayTimeEl = document.getElementById('trayTime');
      const bigTimeEl = document.getElementById('bigTime');
      const bigDateEl = document.getElementById('bigDate');

      if (sysTimeEl) sysTimeEl.innerText = `${h}:${m}:${s}`;
      if (trayTimeEl) trayTimeEl.innerText = `${h}:${m}`;
      if (bigTimeEl) bigTimeEl.innerText = `${h}:${m}:${s}`;
      if (bigDateEl) bigDateEl.innerText = `${date} 周${week}`;
    }, 1000);
  }

  // =========================================================
  // 2. 开始菜单
  // =========================================================
  function toggleStartMenu() {
    const menu = document.getElementById('startMenu');
    if (!menu) return;

    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';

    function closeMenu(e) {
      if (!menu.contains(e.target) && !e.target.closest('.taskbar-start')) {
        menu.style.display = 'none';
        document.removeEventListener('click', closeMenu);
      }
    }
    document.addEventListener('click', closeMenu);
  }

  // =========================================================
  // 3. 最近使用应用
  // =========================================================
  function updateRecentApps(appId) {
    recentApps = recentApps.filter(id => id !== appId);
    recentApps.unshift(appId);
    if (recentApps.length > CONFIG.maxRecentApps) recentApps.pop();
    renderRecentApps();
  }

  function renderRecentApps() {
    const list = document.getElementById('recentAppsList');
    if (!list) return;

    if (recentApps.length === 0) {
      list.innerHTML = '<div class="start-menu-app" style="color:#999; cursor:default; background:none;">暂无使用记录</div>';
      return;
    }

    list.innerHTML = '';
    recentApps.forEach(appId => {
      const app = appMap[appId];
      if (!app) return;

      const item = document.createElement('div');
      item.className = 'start-menu-app';
      item.innerHTML = `<i>${app.icon}</i><span>${app.name}</span>`;
      item.onclick = () => {
        openApp(appId);
        const menu = document.getElementById('startMenu');
        if (menu) menu.style.display = 'none';
      };
      list.appendChild(item);
    });
  }

  // =========================================================
  // 4. 系统操作：关机 / 重启 / 退出
  // =========================================================
  function systemShutdown() {
    if (confirm('确定要关机吗？关闭后将退出所有程序！')) {
      alert('系统正在关机...');
      closeAllApps();
      document.body.innerHTML = '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:24px; color:#2c3e50;">系统已关机，感谢使用！</div>';
    }
  }

  function systemRestart() {
    if (confirm('确定要重启系统吗？所有程序将重新加载！')) {
      alert('系统正在重启...');
      closeAllApps();
      recentApps = [];
      renderRecentApps();
      const menu = document.getElementById('startMenu');
      if (menu) menu.style.display = 'none';
      alert('系统重启成功！');
    }
  }

  function systemExit() {
    if (confirm('确定要退出程序吗？')) {
      window.close();
    }
  }

  function closeAllApps() {
    const allApps = document.getElementsByClassName('app-window');
    const allTask = document.getElementsByClassName('taskbar-app');
    for (let i = 0; i < allApps.length; i++) {
      allApps[i].style.display = 'none';
      allTask[i].style.display = 'none';
      allApps[i].classList.remove('fullscreen');
    }
  }

  // =========================================================
  // 5. 窗口管理：打开 / 关闭 / 全屏 / 拖拽
  // =========================================================
  function openApp(appId) {
    const win = document.getElementById(appId);
    if (!win) return;

    if (win.style.display !== 'flex') {
      win.style.display = 'flex';
      const taskId = `task-${appId.replace('App', '')}`;
      const taskEl = document.getElementById(taskId);
      if (taskEl) taskEl.style.display = 'flex';

      updateRecentApps(appId);

      if (appId === 'paintApp') initPaint();
      if (appId === 'noteApp') {
        const noteContent = document.getElementById('noteContent');
        if (noteContent) noteContent.value = localStorage.getItem(CONFIG.storageKey) || '';
      }
    }
  }

  function closeApp(appId) {
    const win = document.getElementById(appId);
    if (!win) return;

    win.style.display = 'none';
    const taskId = `task-${appId.replace('App', '')}`;
    const taskEl = document.getElementById(taskId);
    if (taskEl) taskEl.style.display = 'none';
    if (win.classList.contains('fullscreen')) win.classList.remove('fullscreen');
  }

  function toggleApp(appId) {
    const win = document.getElementById(appId);
    if (!win) return;
    win.style.display === 'flex' ? closeApp(appId) : openApp(appId);
  }

  function toggleFullscreen(appId) {
    const win = document.getElementById(appId);
    if (!win) return;

    win.classList.toggle('fullscreen');
    const titleBar = win.querySelector('.app-title');
    if (titleBar) {
      titleBar.onmousedown = win.classList.contains('fullscreen')
        ? null
        : (e) => startDrag(e, appId);
    }
  }

  function startDrag(e, appId) {
    const win = document.getElementById(appId);
    if (!win) return;

    dragX = e.clientX;
    dragY = e.clientY;
    winX = win.offsetLeft;
    winY = win.offsetTop;

    document.onmousemove = (ev) => dragWin(ev, win);
    document.onmouseup = () => document.onmousemove = null;
  }

  function dragWin(e, win) {
    const dx = e.clientX - dragX;
    const dy = e.clientY - dragY;
    win.style.left = `${winX + dx}px`;
    win.style.top = `${winY + dy}px`;
    win.style.transform = 'none';
  }

  // =========================================================
  // 6. 文本工具
  // =========================================================
  function showMyText() {
    const input = document.getElementById('osInput');
    if (!input) return;
    const inputValue = input.value.trim();
    inputValue ? alert(`Remember OS ↓\n你输入的内容是：${inputValue}`) : alert("Remember OS提示：请先输入文本哦！");
  }

  function clearInput() {
    const input = document.getElementById('osInput');
    if (input) input.value = "";
    alert("Remember OS：文本框已清空！");
  }

  // =========================================================
  // 7. 计算器
  // =========================================================
  function addCalc(val) {
    const calcInput = document.getElementById('calcInput');
    if (calcInput) calcInput.value += val;
  }

  function calcResult() {
    const calcInput = document.getElementById('calcInput');
    if (!calcInput) return;
    try {
      const res = eval(calcInput.value.replace('×', '*'));
      calcInput.value = isFinite(res) ? res : '计算错误';
    } catch (e) {
      alert("计算错误！请输入正确的数学表达式");
    }
  }

  function clearCalc() {
    const calcInput = document.getElementById('calcInput');
    if (calcInput) calcInput.value = "";
  }

  // =========================================================
  // 8. 账户登录 / 退出
  // =========================================================
  function wechatLogin() {
    if (confirm("Remember OS：即将跳转到微信开放平台授权，是否继续？")) {
      const wechatUserInfo = {
        nickname: "微信用户_123456",
        avatar: "https://img.icons8.com/color/96/000000/wechat.png"
      };
      const userAvatar = document.getElementById('userAvatar');
      const userName = document.getElementById('userName');
      const userDesc = document.getElementById('userDesc');

      if (userAvatar) userAvatar.src = wechatUserInfo.avatar;
      if (userName) userName.innerText = wechatUserInfo.nickname;
      if (userDesc) userDesc.innerText = `已登录微信账户 · 同步微信昵称/头像`;

      alert(`🎉 微信授权登录成功！\n欢迎你，${wechatUserInfo.nickname}～`);
    }
  }

  function logoutOS() {
    if (confirm("Remember OS：确定要退出当前微信账户吗？")) {
      const userAvatar = document.getElementById('userAvatar');
      const userName = document.getElementById('userName');
      const userDesc = document.getElementById('userDesc');

      if (userAvatar) userAvatar.src = "https://img.icons8.com/fluency/96/000000/user-male-circle.png";
      if (userName) userName.innerText = "登录/注册";
      if (userDesc) userDesc.innerText = "未登录账户 · 点击下方微信授权登录";

      alert("✅ 已成功退出账户！");
    }
  }

  // =========================================================
  // 9. 系统设置
  // =========================================================
  function restartOS() {
    alert("🔄 Remember OS正在重启...\n重启成功！所有软件已关闭");
    closeAllApps();
  }

  function changeBg() {
    const colors = ['#e6f7ff', '#f0f9ff', '#f5faff', '#e8f4f8', '#f2f9f8', '#f8f9fa'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    document.body.style.backgroundColor = randomColor;
    alert(`🎨 系统背景色切换成功！\n当前配色：${randomColor}`);
  }

  function resetAllWin() {
    const allApps = document.getElementsByClassName('app-window');
    for (const win of allApps) {
      win.style.left = '50%';
      win.style.top = '50%';
      win.style.transform = 'translate(-50%, -50%)';
      win.classList.remove('fullscreen');
    }
    alert("🔧 所有窗口已重置到屏幕中心！");
  }

  // =========================================================
  // 10. 记事本
  // =========================================================
  function saveNote() {
    const noteContent = document.getElementById('noteContent');
    if (!noteContent) return;
    const content = noteContent.value;
    localStorage.setItem(CONFIG.storageKey, content);
    alert("💾 笔记保存成功！关闭软件内容不会丢失");
  }

  function clearNote() {
    if (confirm("确定要清空所有笔记内容吗？")) {
      const noteContent = document.getElementById('noteContent');
      if (noteContent) noteContent.value = "";
      localStorage.removeItem(CONFIG.storageKey);
      alert("🗑 笔记已清空！");
    }
  }

  // =========================================================
  // 11. 简易画板
  // =========================================================
  function initPaint() {
    canvas = document.getElementById('paintCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const paintColor = document.getElementById('paintColor');
    if (paintColor) {
      paintColor.onchange = function() {
        ctx.strokeStyle = this.value;
      };
      ctx.strokeStyle = paintColor.value;
    }

    canvas.onmousedown = startDraw;
    canvas.onmousemove = draw;
    canvas.onmouseup = stopDraw;
    canvas.onmouseleave = stopDraw;

    canvas.ontouchstart = (e) => {
      e.preventDefault();
      startDraw(e.touches[0]);
    };
    canvas.ontouchmove = (e) => {
      e.preventDefault();
      draw(e.touches[0]);
    };
    canvas.ontouchend = stopDraw;
  }

  function startDraw(e) {
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(
      e.offsetX || (e.clientX - canvas.getBoundingClientRect().left),
      e.offsetY || (e.clientY - canvas.getBoundingClientRect().top)
    );
  }

  function draw(e) {
    if (!isDrawing) return;
    ctx.lineTo(
      e.offsetX || (e.clientX - canvas.getBoundingClientRect().left),
      e.offsetY || (e.clientY - canvas.getBoundingClientRect().top)
    );
    ctx.stroke();
  }

  function stopDraw() {
    isDrawing = false;
    ctx.closePath();
  }

  function clearPaint() {
    if (confirm("确定要清空画布吗？")) {
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // =========================================================
  // 12. 桌面便签
  // =========================================================
  function addSticky() {
    const stickyInput = document.getElementById('stickyInput');
    if (!stickyInput) return;
    const content = stickyInput.value.trim();
    if (!content) return alert("请输入便签内容！");

    const noteItem = document.createElement('div');
    noteItem.className = 'note-item';
    noteItem.innerHTML = `<p>${content}</p><button class="btn-danger" onclick="this.parentElement.remove()">删除</button>`;

    const stickyList = document.getElementById('stickyList');
    if (stickyList) stickyList.appendChild(noteItem);
    stickyInput.value = "";
  }

  // =========================================================
  // 导出到全局
  // =========================================================
  window.RememberOS = {
    // 系统
    initSystemTime,
    toggleStartMenu,
    systemShutdown,
    systemRestart,
    systemExit,
    closeAllApps,

    // 窗口
    openApp,
    closeApp,
    toggleApp,
    toggleFullscreen,
    startDrag,
    dragWin,

    // 文本工具
    showMyText,
    clearInput,

    // 计算器
    addCalc,
    calcResult,
    clearCalc,

    // 账户
    wechatLogin,
    logoutOS,

    // 设置
    restartOS,
    changeBg,
    resetAllWin,

    // 记事本
    saveNote,
    clearNote,

    // 画板
    initPaint,
    clearPaint,

    // 便签
    addSticky
  };

  // 初始化
  document.addEventListener('DOMContentLoaded', () => {
    initSystemTime();
    renderRecentApps();
  });

})(window, document);