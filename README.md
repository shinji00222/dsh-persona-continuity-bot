<div align="center">

# 人格续忆 Bot

**DSH Persona Continuity Bot**

[![License: MIT](https://img.shields.io/badge/license-MIT-71964a?style=flat-square)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/built_for-DeepSeek_Harness-b8702f?style=flat-square)](https://github.com/deepseek-ai/deepseek-harness)
[![version](https://img.shields.io/badge/version-0.2.0--preview.17-3d5afe?style=flat-square)](package.json)

**给 DeepSeek Harness 的每个人格一份独立的跨会话记忆，像和熟悉的同事一样私聊、拉群、一起干活。**

[演示](#demo) · [能用它做什么](#features) · [截图](#screenshots) · [安装](#install) · [使用](#usage) · [数据与隐私](#privacy) · [开发](#dev)

</div>

<a id="demo"></a>

## 演示

<p align="center">
  <img src="docs/demo.gif" width="800" alt="人格续忆 Bot 演示：私聊工作过程时间轴、微信直觉群聊与工作区管理" />
</p>

人格续忆 Bot 作为插件运行在 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness)里。DSH 原生会话彼此独立，关掉就忘；装上它之后，每个人格都拥有自己独立的本地 Markdown 记忆目录（无需 Git），换个新会话照样记得你的偏好、决定和项目进度。搭配合并包使用时，还支持完整的 Bot 模式（私聊、多人格群聊与右侧工作区管理）。

<a id="features"></a>

## 能用它做什么

| 你想要 | 人格续忆 Bot 怎么帮你 |
| --- | --- |
| **每个人格都有独立记忆** | 新建、切换、重命名人格，记忆按稳定 ID 存放在本地 Markdown 目录（无需 Git），随时能翻看、编辑或删除；普通会话、子会话和无痕会话完全隔离。 |
| **不用反复交代背景** | 人格自主决定记什么、更新什么，空闲时自动回顾新对话并合并重复笔记；新会话说一句「继续上次」，就能按句召回记忆并检索同工作区旧对话。 |
| **像微信一样拉群干活** | 群聊默认立即响应并显示已收到人数（`✓2`）；右上角 `···` 展开群聊信息抽屉，成员头像宫格、一键拉人、群设置与解散群聊一目了然。 |
| **一键给全群授权工作区** | 私聊与群聊右侧边栏直达 **工作区** 面板；群聊支持点 **「全体」** 一次选中本地目录并授权给群里所有人格（可选允许写入）。 |
| **看清 Bot 正在干什么** | 私聊共用极简无框折叠时间轴，实时展示工具步骤、耗时、显式摘要与可读报错（如余额/额度不足直接提示），纯文本直回自动省略。 |
| **主人格查普通 DSH 历史** | 唯一主人格（托布）在本地私聊中可只读搜索和读取普通 DSH 对话记录，其他人格与群聊默认隔离。 |
| **按人格控制内置权限** | 右键人格可单独开关浏览器控制与电脑控制（Computer Use）能力，按需授权。 |

<a id="screenshots"></a>

## 截图

<table>
  <tr>
    <td width="50%"><a href="docs/screenshots/group-chat.png"><img src="docs/screenshots/group-chat.png" alt="多人格群聊主界面：极简输入框、已收到人数标记与右上角群聊信息入口" /></a><br /><b>多人格群聊</b>：发送消息后默认立即唤醒并显示已收到人数，右侧直达工作区管理（支持按人格或「全体」一键授权文件夹）。</td>
    <td width="50%"><a href="docs/screenshots/group-drawer.png"><img src="docs/screenshots/group-drawer.png" alt="微信直觉群聊信息抽屉：成员头像宫格、加号拉人与底部解散群聊" /></a><br /><b>群聊信息抽屉</b>：点击右上角 <code>···</code> 展开，头像宫格展示群成员、虚线 <code>+</code> 一键拉人、底部扁平设置与解散群聊。</td>
  </tr>
</table>

_截图来自隔离的本地预览环境，不含真实隐私数据。_

<a id="install"></a>

## 安装

要求 DSH 0.2.x（带 Web 客户端的桌面版或 Web 宿主，Node.js ≥ 22.13，支持 `node:sqlite`）。已在 DSH 0.2.2-rc.3 上验证。

```bash
npm pack
```

把生成的 `.tgz` 通过 DSH 插件管理器装进目标 profile，重启该 profile 即可。

### 带 Tobs Bot 模式的合并包

想要完整的 Bot 模式（侧栏频道、多人格群聊、私聊时间轴），装一个合并包就够了，不用再单独装 `deepseekbot`。先在 Tobs 仓库构建好产物（默认在 `dist/continuity-desktop/`），再在本仓库运行：

```bash
npm run pack:tobs   # 可用 TOBS_DIST=<目录> 指定 Tobs 产物位置
```

生成 `dist/dsh-persona-continuity-<版本>-with-tobs.tgz`（同目录下的 `dist/tobs-<版本>/` 为依赖目录，请保留）。

- 装合并包前，先从 profile 卸掉单独的 `deepseekbot`，避免重复加载。
- 插件 ID 不变，已有人格和记忆照常保留。

<a id="usage"></a>

## 使用

从 DSH 左侧面板打开「人格工作台」，可新建人格、改设定和管理记忆：

1. **选人格**：新会话输入框旁点「普通会话」，选择人格或「＋ 新建人格」（右键可重命名）；已有普通会话也可绑定到某个人格并自动提炼入库。
2. **设定与记忆**：在「设置 → 人格续忆」里编辑人格设定、查看或删除记忆，或按人格单独关闭自动记忆。
3. **从旧对话导入**：选择未绑定或属于当前人格的历史会话导入记忆，后台排队提炼并自动去重。
4. **继续上次**：新会话直接说「继续上次」，或按主题让它翻阅同工作区历史对话。

<a id="privacy"></a>

## 数据与隐私

- 所有记忆存放在本地目录（`$DSH_HOME/persona-continuity/memories/<personaId>/`，无需 Git），不上传、不跨设备同步。
- 提炼与召回仅把必要正文发给当前会话配置的模型，插件本身不额外联网。
- 提炼入参自动过滤常见凭据格式（`sk-…`、`ghp_…`、`Bearer …` 等）后再保存。
- 普通会话、子会话和无痕会话不写入、不注入任何记忆。

## 项目结构

| 路径 | 作用 |
| --- | --- |
| `index.js` | 宿主入口：人格注入、提炼队列、历史检索 |
| `client.js` | Web 客户端：人格菜单、设置页与记忆管理 |
| `lib/store.js` | 人格、会话绑定、提炼队列与凭据过滤 |
| `lib/extract.js` | 模型调用与结构化解析 |
| `lib/history.js` | 旧对话检索与范围隔离 |
| `lib/web.js` | 复用 DSH 鉴权的管理路由 |
| `test/` | `node:test` 单元测试 |
| `scripts/pack-with-tobs.mjs` | 打包人格续忆 + Tobs Bot 模式合并包 |

<a id="dev"></a>

## 开发

```bash
npm run check   # 语法检查
npm test        # 单元测试
```

验收请用隔离的 `DSH_HOME` 启动 profile，覆盖普通会话默认行为、多人格并行、重启后记忆召回与编辑删除。

### 相关文档

- [技术调研](docs/research.md) · [项目规划](docs/project-plan.md)
- [Tobs 接入调研](docs/tobs-integration-research.md) · [Tobs 接入规划](docs/tobs-integration-plan.md)
- [开发记录](docs/development-log.md)

## 许可

[MIT](LICENSE)
