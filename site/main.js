(() => {
  const i18n = {
    zh: {
      pageTitle: '人格续忆 Bot — DeepSeek Harness 跨会话本地记忆插件',
      brand: '人格续忆 Bot',
      'nav.showcase': '实机界面',
      'nav.memory': '本地记忆',
      'nav.capabilities': '核心能力',
      'nav.install': '快速上手',
      'nav.faq': '常见问题',
      'cta.installNow': '立即安装',
      'hero.title': '给每个人格一份独立的本地 Markdown 记忆',
      'hero.lead': '运行在 DeepSeek Harness 里的开源插件。原生会话关掉就忘；装上它后，每个人格在本地维护自己的 Markdown 笔记，换新会话照样记得你的偏好、决定和项目进度。',
      'hero.primary': '3 分钟上手',
      'hero.secondary': '查看源码',
      'hero.meta': 'MIT 开源，纯本地存储（无需 Git），已在 DSH 0.2.2-rc.3 验证。',
      'hero.windowTitle': 'DeepSeek Harness — 实机演示',
      'showcase.heading': '看看实际跑起来长什么样',
      'showcase.sub': '以下 5 张图均采集自本地隔离运行的 DSH 0.2.2-rc.3 与本插件实机界面。点下方标签直接切换场景。',
      'scene.picker.tab': '普通模式选人格',
      'scene.picker.short': '不进 Bot 模式也能跨会话续忆',
      'scene.workbench.tab': '人格工作台',
      'scene.workbench.short': '管设定、开关自动记忆、导入旧对话',
      'scene.timeline.tab': '私聊工作过程时间轴',
      'scene.timeline.short': 'dot 查普通历史，步骤与耗时透明',
      'scene.group.tab': '微信直觉多人格群聊',
      'scene.group.short': '默认立即响应，多角色分工接话',
      'scene.drawer.tab': '群聊信息抽屉',
      'scene.drawer.short': '头像宫格、一键拉人、群设置与解散',
      'memory.heading': '记忆就躺在本地 Markdown 里，随时翻看、随时改',
      'memory.lead': '没有黑盒向量库，也不要求初始化 Git 仓库。每个人格按稳定 ID 存放在 <code>$DSH_HOME/persona-continuity/memories/&lt;personaId&gt;/</code> 下，用任意文本编辑器都能直接打开、编辑或删掉。',
      'memory.b1': '<strong>自主提炼与去重</strong>：空闲时自动回顾新对话、修订旧结论并合并重复条目，也可按人格单独关闭自动记忆。',
      'memory.b2': '<strong>按句召回与继续上次</strong>：新会话直接说「继续上次」，自动召回相关笔记并检索同工作区旧对话。',
      'memory.b3': '<strong>自动脱敏</strong>：提炼入库前自动过滤 <code>sk-…</code>、<code>ghp_…</code>、<code>Bearer …</code> 等常见凭据格式。',
      'memory.hint': '纯本地文件 · 无需 Git',
      'cap.heading': '两种使用方式，按需选择',
      'cap.sub': '只想要跨会话记忆就装纯插件包；想用多人格群聊和工作区协同，直接打合并包。',
      'cap.p.title': '纯插件模式',
      'cap.p.tag': '轻巧独立',
      'cap.p.summary': '装进任意 DSH 0.2.x profile，直接在原生普通对话里使用。',
      'cap.p.t1': '普通会话直选人格',
      'cap.p.d1': '输入框旁新建、切换、右键重命名人格；已有普通会话也可绑定并自动提炼入库。',
      'cap.p.t2': '人格工作台管理',
      'cap.p.d2': '统一编辑人格设定、开关自动记忆、搜索与删改长期记忆，支持查看来源轮次。',
      'cap.p.t3': '从旧对话一键导入',
      'cap.p.d3': '选中未绑定或当前人格的历史会话导入记忆，后台排队提炼并自动去重。',
      'cap.p.t4': '严格范围隔离',
      'cap.p.d4': '不同人格按工作区隔离记忆；普通会话、子会话和无痕会话不写入、不注入。',
      'cap.b.title': '完整 Bot 合并包',
      'cap.b.tag': '全功能协同',
      'cap.b.summary': '包含纯插件全部能力，额外提供侧栏频道、多人格群聊与工作区协同。',
      'cap.b.t1': '私聊工作过程时间轴',
      'cap.b.d1': 'dot 与其他人格私聊共用无框折叠时间轴，实时展示工具步骤、耗时与显式摘要；额度不足直接给中文提示。',
      'cap.b.t2': '主人格查普通 DSH 历史',
      'cap.b.d2': '唯一主人格（dot）在本地私聊里可只读搜索普通 DSH 对话记录，其他人格与群聊默认隔离。',
      'cap.b.t3': '微信直觉群聊与抽屉',
      'cap.b.d3': '默认立即响应并显示已收到人数；右上角展开群聊抽屉，头像宫格、一键拉人与解散群聊集中管理。',
      'cap.b.t4': '群聊「全体」工作区授权与细粒度权限',
      'cap.b.d4': '右侧工作区点「全体」一键授权给全群人格（可选允许写入）；右键人格单独开关浏览器与电脑控制；内置 6 个纯本地原创人格模板。',
      'inst.heading': '快速上手',
      'inst.sub': '环境要求：DeepSeek Harness 0.2.x（桌面版或 Web 宿主）、Node.js ≥ 22.13（支持 <code>node:sqlite</code>）。',
      'inst.tab1': '方式一：纯插件包',
      'inst.tab2': '方式二：完整 Bot 合并包',
      'inst.p.codeTitle': '克隆仓库并打包纯插件',
      'inst.b.codeTitle': '构建完整 Bot 合并包',
      'inst.copy': '复制命令',
      'inst.copied': '已复制',
      'inst.copyFail': '请手动复制',
      'inst.p.s1': '把生成的 <code>.tgz</code> 通过 DSH 插件管理器安装到目标 profile，重启即可。',
      'inst.p.s2': '在 DSH 左侧面板打开 <strong>「人格工作台」</strong>，或在普通会话输入框旁点「普通会话」新建并切换人格。',
      'inst.p.s3': '新开会话直接说「继续上次」，即可召回该人格的本地 Markdown 记忆。',
      'inst.b.s1': '生成 <code>dist/dsh-persona-continuity-&lt;版本&gt;-with-tobs.tgz</code>，请保留同目录的依赖文件夹。',
      'inst.b.s2': '安装前请先从目标 profile 卸掉旧的同类 Bot 插件，避免重复加载。',
      'inst.b.s3': '插件 ID 不变，从纯插件切换到合并包后，已有人格和本地记忆全部照常保留。',
      'faq.heading': '常见问题',
      'faq.q1': '记忆存在哪里？会上传到外部服务器吗？',
      'faq.a1': '不会上传。所有记忆都以纯 Markdown 存放在本地 <code>$DSH_HOME/persona-continuity/memories/&lt;personaId&gt;/</code>，无需 Git。提炼与召回只把必要正文发给当前会话配置的模型，插件本身不额外联网。',
      'faq.q2': '纯插件包和合并包怎么选？',
      'faq.a2': '平时只用 DSH 原生界面、只需要跨会话人格记忆，选纯插件包最轻巧；想要完整的侧栏频道、私聊时间轴、微信直觉多人格群聊和工作区协同，直接打合并包。',
      'faq.q3': '普通会话、子会话和无痕会话会被记住吗？',
      'faq.a3': '不会。只有主动绑定了人格的会话才会提炼和召回记忆；未绑定的普通会话、子会话和无痕会话默认完全隔离。',
      'faq.q4': '如何本地运行测试与验收？',
      'faq.a4': '运行 <code>npm run check</code> 做语法检查、<code>npm test</code> 跑单元测试；功能验收建议使用隔离的 <code>DSH_HOME</code> 启动 profile，避免影响日常配置。',
      'footer.repo': 'GitHub 仓库',
      'footer.issues': '提交反馈',
      'footer.top': '回到顶部',
      toggleToGif: '切到动图预览',
      toggleToShot: '返回静态截图',
      gifTitle: '完整动态演示 — docs/demo.gif',
      bundleCmd: '# 先构建好 Bot 层桌面产物（默认位于 dist/continuity-desktop/）\nnpm run pack:tobs   # 可用 TOBS_DIST=<目录> 指定桌面产物位置',
    },
    en: {
      pageTitle: 'DSH Persona Continuity Bot — Local Cross-Session Markdown Memory for DeepSeek Harness',
      brand: 'Persona Continuity Bot',
      'nav.showcase': 'Interface',
      'nav.memory': 'Local Memory',
      'nav.capabilities': 'Features',
      'nav.install': 'Quick Start',
      'nav.faq': 'FAQ',
      'cta.installNow': 'Install',
      'hero.title': 'Independent local Markdown memory for every persona',
      'hero.lead': 'An open-source plugin for DeepSeek Harness. Native chats reset when closed; with Persona Continuity, each persona maintains its own local Markdown notes and remembers your preferences, decisions, and project context across sessions.',
      'hero.primary': 'Get Started',
      'hero.secondary': 'View Source',
      'hero.meta': 'MIT licensed, 100% local storage (no Git required), verified on DSH 0.2.2-rc.3.',
      'hero.windowTitle': 'DeepSeek Harness — Live Demo',
      'showcase.heading': 'See how it runs in practice',
      'showcase.sub': 'All 5 screenshots below are captured directly from an isolated DSH 0.2.2-rc.3 instance running this plugin. Click any tab to inspect a scene.',
      'scene.picker.tab': 'Standard Chat Picker',
      'scene.picker.short': 'Use persona memory right inside native chats',
      'scene.workbench.tab': 'Persona Workbench',
      'scene.workbench.short': 'Edit instructions, toggle auto-memory, import history',
      'scene.timeline.tab': 'DM Work Timeline',
      'scene.timeline.short': 'Transparent steps, timings, and history recall for dot',
      'scene.group.tab': 'Multi-Persona Group Chat',
      'scene.group.short': 'Immediate responses with role-based collaboration',
      'scene.drawer.tab': 'Group Info Drawer',
      'scene.drawer.short': 'Member grid, one-click invite, settings & disband',
      'memory.heading': 'Plain local Markdown files you can read and edit anytime',
      'memory.lead': 'No opaque vector database and no Git repo required. Each persona stores its notes by stable ID under <code>$DSH_HOME/persona-continuity/memories/&lt;personaId&gt;/</code> so you can inspect, edit, or delete them in any editor.',
      'memory.b1': '<strong>Autonomous extraction & dedup</strong>: Reviews recent conversations while idle, updates past decisions, and merges duplicates. Auto-memory can be toggled per persona.',
      'memory.b2': '<strong>Sentence-level recall</strong>: Start a new chat and say "continue from last time" to recall relevant notes and search past sessions in the same workspace.',
      'memory.b3': '<strong>Automatic redaction</strong>: Filters common credential patterns (<code>sk-…</code>, <code>ghp_…</code>, <code>Bearer …</code>) before saving.',
      'memory.hint': '100% Local · No Git',
      'cap.heading': 'Two packaging options, pick what fits',
      'cap.sub': 'Install the lightweight standalone plugin for cross-session memory, or build the full bundle for multi-persona channels and group collaboration.',
      'cap.p.title': 'Standalone Plugin',
      'cap.p.tag': 'Lightweight',
      'cap.p.summary': 'Drop into any DSH 0.2.x profile and use directly inside native standard chats.',
      'cap.p.t1': 'Native chat persona selector',
      'cap.p.d1': 'Create, switch, or right-click rename personas next to the input box; bind existing standard chats to queue automatic memory extraction.',
      'cap.p.t2': 'Persona Workbench',
      'cap.p.d2': 'Manage persona instructions, toggle auto-memory, search or edit long-term notes, and inspect original source turns.',
      'cap.p.t3': 'One-click history import',
      'cap.p.d3': 'Import unbound or matching past sessions into memory with background queuing and automatic deduplication.',
      'cap.p.t4': 'Strict scope isolation',
      'cap.p.d4': 'Memories stay isolated by persona and workspace; unbound standard chats, sub-sessions, and incognito sessions remain untouched.',
      'cap.b.title': 'Full Bot Bundle',
      'cap.b.tag': 'All-in-One',
      'cap.b.summary': 'Includes every standalone feature plus sidebar channels, DM timelines, group chats, and workspace permissions.',
      'cap.b.t1': 'Collapsible DM work timeline',
      'cap.b.d1': 'Shows tool steps, durations, and explicit reasoning summaries in real time, omitted on plain replies; surfaces clear quota errors.',
      'cap.b.t2': 'Primary persona (dot) history search',
      'cap.b.d2': 'The primary persona (dot) can read-only search your native DSH chat history in local DMs while other personas and groups stay isolated.',
      'cap.b.t3': 'Intuitive multi-persona group chat',
      'cap.b.d3': 'Responds immediately by default with receipt counts; slide-out group drawer puts member avatars, invites, and controls in one place.',
      'cap.b.t4': 'Group-wide workspace grants & tool controls',
      'cap.b.d4': 'Authorize one local folder for all group personas at once (optional write access), toggle browser/computer tools per persona, and import 6 built-in offline templates.',
      'inst.heading': 'Quick Start',
      'inst.sub': 'Requirements: DeepSeek Harness 0.2.x (Desktop or Web host) and Node.js ≥ 22.13 (with <code>node:sqlite</code>).',
      'inst.tab1': 'Option 1: Standalone Plugin',
      'inst.tab2': 'Option 2: Full Bot Bundle',
      'inst.p.codeTitle': 'Clone and pack standalone plugin',
      'inst.b.codeTitle': 'Build the full Bot bundle',
      'inst.copy': 'Copy',
      'inst.copied': 'Copied',
      'inst.copyFail': 'Copy manually',
      'inst.p.s1': 'Install the generated <code>.tgz</code> via the DSH Plugin Manager into your target profile and restart.',
      'inst.p.s2': 'Open <strong>Persona Workbench</strong> from the left sidebar, or click the persona selector next to the standard chat input.',
      'inst.p.s3': 'In a new session, say "continue from last time" to recall that persona\'s local Markdown memory.',
      'inst.b.s1': 'Produces <code>dist/dsh-persona-continuity-&lt;version&gt;-with-tobs.tgz</code>; keep the sibling runtime folder alongside it.',
      'inst.b.s2': 'Uninstall any older standalone Bot plugin from the target profile first to avoid duplicate loading.',
      'inst.b.s3': 'The plugin ID stays the same, so all existing personas and local Markdown notes carry over seamlessly.',
      'faq.heading': 'FAQ',
      'faq.q1': 'Where are memories stored? Is anything uploaded?',
      'faq.a1': 'Nothing is uploaded. All memories live as plain Markdown files under <code>$DSH_HOME/persona-continuity/memories/&lt;personaId&gt;/</code> with no Git required. Only necessary prompt context goes to your configured chat model.',
      'faq.q2': 'Should I pick the standalone plugin or the full bundle?',
      'faq.a2': 'Pick the standalone plugin if you only use native DSH chats and want lightweight cross-session memory. Build the full bundle if you want channels, DM timelines, multi-persona groups, and workspace collaboration.',
      'faq.q3': 'Are normal, sub-session, or incognito chats remembered?',
      'faq.a3': 'No. Only chats explicitly bound to a persona extract or recall memory; unbound standard chats, sub-sessions, and incognito chats stay completely isolated.',
      'faq.q4': 'How do I run tests and local verification?',
      'faq.a4': 'Run <code>npm run check</code> for syntax validation and <code>npm test</code> for unit tests. Use an isolated <code>DSH_HOME</code> profile for live verification.',
      'footer.repo': 'GitHub Repo',
      'footer.issues': 'Issues',
      'footer.top': 'Back to top',
      toggleToGif: 'Watch GIF',
      toggleToShot: 'Back to Screenshot',
      gifTitle: 'Full Animated Demo — docs/demo.gif',
      bundleCmd: '# Build the Bot desktop bundle first (default: dist/continuity-desktop/)\nnpm run pack:tobs   # Or pass TOBS_DIST=<dir> to override its path',
    },
  };

  const scenesByLang = {
    zh: {
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
    },
    en: {
      picker: {
        windowTitle: 'Native DSH Chat — Switch Persona Next to Input',
        title: 'Standard Chat Persona Picker',
        desc: 'No need to switch into Bot mode. Pick or create a persona directly beside the native DSH chat input, while unbound standard, sub-session, and incognito chats stay isolated.',
        src: './media/screenshots/standard-persona-picker.png',
        alt: 'Persona selector dropdown open inside a standard DSH chat',
      },
      workbench: {
        windowTitle: 'Persona Workbench — Instructions, Auto-Memory & Notes',
        title: 'Persona Workbench',
        desc: 'Switch personas on the left, edit instructions and toggle auto-memory on the right, search or delete Markdown memories, and import past sessions with one click.',
        src: './media/screenshots/memory-workbench.png',
        alt: 'Persona Workbench showing instructions, auto-memory toggle, and memory list',
      },
      timeline: {
        windowTitle: 'Direct Message — Collapsible Work Timeline for dot',
        title: 'DM Work-Process Timeline',
        desc: 'The primary persona (dot) can read-only search native DSH chat history in local DMs. The borderless collapsible timeline displays tool steps, durations, and summaries in real time.',
        src: './media/screenshots/dm-timeline.png',
        alt: 'Direct message with expanded work-process timeline',
      },
      group: {
        windowTitle: 'Group Chat — Multi-Persona Collaboration',
        title: 'Multi-Persona Group Chat',
        desc: 'Group chats respond immediately by default without waiting for batch thresholds. Message bubbles show receipt counts while each persona collaborates using its own memory.',
        src: './media/screenshots/group-chat.png',
        alt: 'Multi-persona group chat conversation',
      },
      drawer: {
        windowTitle: 'Group Info — Member Grid & Controls Drawer',
        title: 'Group Info Drawer',
        desc: 'Open the top-right drawer to view the member avatar grid, invite personas in one click, adjust reply behavior, or disband the group.',
        src: './media/screenshots/group-drawer.png',
        alt: 'Group info slide-out drawer with member grid',
      },
    },
  };

  const memFilesByLang = {
    zh: {
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
    },
    en: {
      index: {
        name: 'MEMORY.md',
        content: `# Long-Term Memory Index (architect)

- [Collaboration Preferences](notes/preferences.md) — Lead with the conclusion, keep details concise
- [Local Storage Convention](notes/storage-decision.md) — Plain Markdown files, no Git dependency
- Recalled per workspace on new sessions; standard and incognito chats stay isolated`,
      },
      prefs: {
        name: 'notes/preferences.md',
        content: `---
id: preferences
updated: 2026-11-24
source: session-04 / turn-2
---

# Collaboration Preferences

- Lead with the result first, then add essential details without fluff.
- Run npm run check and npm test after every code change.`,
      },
      arch: {
        name: 'notes/storage-decision.md',
        content: `---
id: storage-decision
updated: 2026-11-24
source: session-07 / turn-4
---

# Local Storage Convention

- Each persona writes to $DSH_HOME/persona-continuity/memories/<personaId>/.
- Long-term notes are plain Markdown files with no Git repository required.
- Common credentials (sk-, ghp_, Bearer) are redacted before saving.`,
      },
    },
  };

  let currentLang = 'zh';
  let currentScene = 'picker';
  let currentFile = 'index';
  let showingGif = false;

  const imgEl = document.getElementById('scene-image');
  const winTitleEl = document.getElementById('scene-window-title');
  const titleEl = document.getElementById('scene-title');
  const descEl = document.getElementById('scene-desc');
  const gifBtn = document.getElementById('toggle-gif-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const memNameEl = document.getElementById('mem-filename');
  const memContentEl = document.getElementById('mem-content');
  const fileBtns = document.querySelectorAll('.file-btn');
  const langBtns = document.querySelectorAll('.lang-btn');
  const bundleCmdEl = document.getElementById('bundle-cmd');

  function renderScene(key) {
    const s = scenesByLang[currentLang][key];
    if (!s || !imgEl) return;
    currentScene = key;
    showingGif = false;
    imgEl.src = s.src;
    imgEl.alt = s.alt;
    winTitleEl.textContent = s.windowTitle;
    titleEl.textContent = s.title;
    descEl.textContent = s.desc;
    if (gifBtn) gifBtn.textContent = i18n[currentLang].toggleToGif;
    tabBtns.forEach((btn) => {
      const active = btn.dataset.scene === key;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
  }

  function renderMemFile(key) {
    const f = memFilesByLang[currentLang][key];
    if (!f) return;
    currentFile = key;
    memNameEl.textContent = f.name;
    memContentEl.textContent = f.content;
    fileBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.file === key));
  }

  function applyLang(lang) {
    if (!i18n[lang]) return;
    currentLang = lang;
    const dict = i18n[lang];
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = dict.pageTitle;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const val = dict[el.dataset.i18n];
      if (val !== undefined) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const val = dict[el.dataset.i18nHtml];
      if (val !== undefined) el.innerHTML = val;
    });
    if (bundleCmdEl) bundleCmdEl.textContent = dict.bundleCmd;

    langBtns.forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    if (showingGif) {
      winTitleEl.textContent = dict.gifTitle;
      if (gifBtn) gifBtn.textContent = dict.toggleToShot;
      const s = scenesByLang[currentLang][currentScene];
      if (s) {
        titleEl.textContent = s.title;
        descEl.textContent = s.desc;
      }
    } else {
      renderScene(currentScene);
    }
    renderMemFile(currentFile);

    try {
      localStorage.setItem('dsh-site-lang', lang);
    } catch {
      // ignore storage restrictions
    }
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
        imgEl.alt = currentLang === 'zh' ? '人格续忆 Bot 完整动态演示' : 'Persona Continuity Bot animated demo';
        winTitleEl.textContent = i18n[currentLang].gifTitle;
        gifBtn.textContent = i18n[currentLang].toggleToShot;
      }
    });
  }

  fileBtns.forEach((btn) => {
    btn.addEventListener('click', () => renderMemFile(btn.dataset.file));
  });

  langBtns.forEach((btn) => {
    btn.addEventListener('click', () => applyLang(btn.dataset.lang));
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
      const dict = i18n[currentLang];
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = dict['inst.copied'];
        setTimeout(() => { btn.textContent = i18n[currentLang]['inst.copy']; }, 1600);
      } catch {
        btn.textContent = dict['inst.copyFail'];
      }
    });
  });

  // Initial language from ?lang= or localStorage
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  let savedLang = null;
  try {
    savedLang = localStorage.getItem('dsh-site-lang');
  } catch {
    // ignore
  }
  const initLang = urlLang === 'en' || urlLang === 'zh' ? urlLang : (savedLang === 'en' ? 'en' : 'zh');
  applyLang(initLang);
})();
