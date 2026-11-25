(() => {
  const scenes = {
    picker: {
      windowTitle: '普通 DSH 会话 — 输入框旁直接选人格',
      title: '普通模式选人格',
      desc: '不需要切到 Bot 模式，在原生 DSH 输入框旁点「普通会话」就能直接切换已有人格或新建人格。未绑定的普通会话、子会话和无痕会话默认完全隔离。',
      src: './media/screenshots/standard-persona-picker.png',
      alt: '普通 DSH 会话下展开选择人格菜单',
    },
    workbench: {
      windowTitle: '人格工作台 — 设定、自动记忆与长期笔记',
      title: '人格工作台',
      desc: '左侧切换人格，右侧集中管理人格设定、自动记忆开关、长期记忆搜索与删改，并支持从旧对话一键导入历史记忆。',
      src: './media/screenshots/memory-workbench.png',
      alt: '人格工作台界面：人格设定、自动记忆开关与长期记忆列表',
    },
    timeline: {
      windowTitle: '私聊 — dot 工作过程时间轴',
      title: '私聊工作过程时间轴',
      desc: '唯一主人格（dot）在本地私聊中可只读检索普通 DSH 历史；折叠时间轴实时展示工具步骤、耗时与思考摘要，纯文本直回自动省略。',
      src: './media/screenshots/dm-timeline.png',
      alt: '主人格私聊与展开的工作过程时间轴',
    },
    group: {
      windowTitle: '群聊 — 微信直觉多人格协作',
      title: '微信直觉多人格群聊',
      desc: '群聊默认立即响应，不用等攒条数或倒计时；气泡显示已收到人数，多个人格按各自设定和记忆分工接话。',
      src: './media/screenshots/group-chat.png',
      alt: '微信直觉多人格群聊界面',
    },
    drawer: {
      windowTitle: '群聊信息 — 成员宫格与群管理抽屉',
      title: '群聊信息抽屉',
      desc: '点右上角展开微信风格群聊信息抽屉，成员头像宫格、一键拉人、回复方式设置与解散群聊集中在一个面板里。',
      src: './media/screenshots/group-drawer.png',
      alt: '群聊信息抽屉与成员头像宫格',
    },
  };

  let currentScene = 'picker';
  let showingGif = false;

  const imgEl = document.getElementById('scene-image');
  const winTitleEl = document.getElementById('scene-window-title');
  const titleEl = document.getElementById('scene-title');
  const descEl = document.getElementById('scene-desc');
  const gifBtn = document.getElementById('toggle-gif-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');

  function renderScene(key) {
    const s = scenes[key];
    if (!s || !imgEl) return;
    currentScene = key;
    showingGif = false;
    imgEl.src = s.src;
    imgEl.alt = s.alt;
    winTitleEl.textContent = s.windowTitle;
    titleEl.textContent = s.title;
    descEl.textContent = s.desc;
    if (gifBtn) gifBtn.textContent = '切到动图预览';
    tabBtns.forEach((btn) => {
      const active = btn.dataset.scene === key;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => renderScene(btn.dataset.scene));
  });

  if (gifBtn) {
    gifBtn.addEventListener('click', () => {
      if (showingGif) {
        renderScene(currentScene);
      } else {
        showingGif = true;
        imgEl.src = './media/demo.gif';
        imgEl.alt = '人格续忆 Bot 完整动态演示';
        winTitleEl.textContent = '完整动态演示 — docs/demo.gif';
        gifBtn.textContent = '返回静态截图';
      }
    });
  }

  // Local Markdown Memory Explorer
  const memFiles = {
    index: {
      name: 'MEMORY.md',
      content: `# 长期记忆索引（architect）

- [沟通与协作偏好](notes/preferences.md) — 中文交流，先给结论再补细节
- [本地存储约定](notes/storage-decision.md) — 笔记存为纯 Markdown，不依赖 Git
- 每次新会话按句按工作区召回，普通会话与无痕会话默认隔离`,
    },
    prefs: {
      name: 'notes/preferences.md',
      content: `---
id: preferences
updated: 2026-11-24
source: session-04 / turn-2
---

# 沟通与协作偏好

- 回答先给明确结论，再补必要细节，避免堆砌套话。
- 改动代码后统一运行 npm run check 与 npm test 验证。`,
    },
    arch: {
      name: 'notes/storage-decision.md',
      content: `---
id: storage-decision
updated: 2026-11-24
source: session-07 / turn-4
---

# 本地存储约定

- 每个人格按稳定 ID 存放在 $DSH_HOME/persona-continuity/memories/<personaId>/。
- 长期记忆落盘为纯 Markdown，无需初始化 Git 仓库。
- 入库前自动过滤 sk-、ghp_、Bearer 等常见凭据格式。`,
    },
  };

  const memNameEl = document.getElementById('mem-filename');
  const memContentEl = document.getElementById('mem-content');
  const fileBtns = document.querySelectorAll('.file-btn');

  fileBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = memFiles[btn.dataset.file];
      if (!f) return;
      memNameEl.textContent = f.name;
      memContentEl.textContent = f.content;
      fileBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
    });
  });

  // Install Switcher
  const switchBtns = document.querySelectorAll('.switch-btn');
  const panels = document.querySelectorAll('.install-panel');

  switchBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.install;
      switchBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });
      panels.forEach((p) => {
        p.classList.toggle('is-active', p.dataset.panel === target);
      });
    });
  });

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy || '';
      try {
        await navigator.clipboard.writeText(text);
        const orig = btn.textContent;
        btn.textContent = '已复制';
        setTimeout(() => { btn.textContent = orig; }, 1600);
      } catch {
        btn.textContent = '请手动复制';
      }
    });
  });
})();
