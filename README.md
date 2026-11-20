# 人格续忆 · DSH Persona Continuity

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的每个「人格」一份独立的跨会话长期记忆。

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![DSH](https://img.shields.io/badge/DSH-0.2.x-4B6EF5)
![version](https://img.shields.io/badge/version-0.2.0--preview.17-orange)

> Cross-session Markdown memory for each DeepSeek Harness persona.

<!-- 录好 demo 后：把 gif 放到 docs/demo.gif，再去掉下一行注释 -->
<!-- ![演示](docs/demo.gif) -->

## 为什么做这个

DSH 的会话彼此独立：关掉一个会话，里面聊过的偏好、决定和进度就留在了里面。人格续忆让你在开新会话时选回同一个人格，它带着自己的记忆继续干活，不用每次重新交代背景。

每个人格的记忆存放在独立的本地 Markdown 目录，无需 Git。安装带人格续忆接入的 Tobs 后，原人格会出现在左侧「Bot 模式」的频道列表。

## 功能

- **人格管理与隔离**：新建、切换、重命名、编辑人格设定；人格以稳定 ID 持有记忆，改名不丢；普通会话、子会话和无痕会话保持原生行为，不写入、不注入记忆。
- **独立本地 Markdown 记忆目录**：每个人格拥有独立的本地 Markdown 目录（无需 Git），支持查看来源、编辑和删除记忆。
- **人格自主记忆与回顾**：每个人格自己决定记什么、更新什么或跳过什么。空闲时回顾新对话，挑出少量常驻记忆、核对旧决定并合并内容完全重复的笔记。可按人格单独关闭自动记忆。
- **按句召回与查旧对话**：每轮按对话内容召回相关记忆；支持「继续上次」以及受控检索同工作区同人格的历史原文。

## 安装

要求 DSH 0.2.x（带 Web 客户端的桌面版或 Web 宿主，Node 支持 `node:sqlite`），Node.js ≥ 22.13。已在 DSH 0.2.2-rc.3 上验证。

```bash
npm pack
```

把生成的 `.tgz` 通过 DSH 插件管理器装进目标 profile，再重启该 profile。首次建议先建两个不同人格和一个普通会话试一遍。

## 使用

从 DSH 左侧全局面板打开「人格工作台」，可以新建人格、改设定和管理各自的记忆。

1. **选人格**：新会话输入框旁点「普通会话」，在菜单里选人格或「＋ 新建人格」。左键切换，右键人格条目可重命名。开聊后人格固定；普通会话聊过之后可以绑定一次到某个人格，已有对话会自动在后台提炼入库。
2. **设定人格**：「设置 → 人格续忆」里填写人格设定、管理记忆条目，或单独关闭某个人格的自动记忆。修改设定后，已绑定的会话从下一轮起生效。
3. **让它记事**：正常聊天即可；取消或未完整结束的轮次会跳过。
4. **从旧对话导入**：在「设置 → 人格续忆」中选择历史会话导入记忆。只能导入未绑定或已属于当前人格的会话，后台排队提炼并按块去重。
5. **继续上次**：新会话直接说「继续上次」，或按主题/会话 ID 让它去翻旧对话。

## 数据与隐私

- 记忆存在本地目录（`$DSH_HOME/persona-continuity/memories/<personaId>/`，无需 Git；过渡期保留旧版 SQLite 数据库），不上传、不跨设备同步。
- 提炼与召回会把**必要的正文**交给当前会话使用的模型；插件自身不额外联网。
- 普通会话、子会话和无痕插件格式的会话不写入、不注入记忆。
- 提炼入参会过滤常见凭据格式（`sk-…`、`ghp_…`、`Bearer …` 等）后再保存。

## 项目结构

| 路径 | 作用 |
| --- | --- |
| `index.js` | 宿主入口：人格注入、提炼队列、历史检索 |
| `client.js` | Web 客户端：人格菜单、设置页与记忆管理 |
| `lib/store.js` | 人格、会话绑定、提炼队列与凭据过滤（`clean`） |
| `lib/extract.js` | 模型调用与结构化解析 |
| `lib/history.js` | 旧对话检索与范围隔离 |
| `lib/web.js` | 复用 DSH 鉴权的管理路由 |
| `test/` | `node:test` 单元测试 |

## 开发

```bash
npm run check   # 语法检查
npm test        # 单元测试
```

验收请用隔离的 `DSH_HOME` 起一个 profile，覆盖普通会话默认行为、两个并行人格、重启后的记忆召回与编辑删除。

## 文档

- [技术调研](docs/research.md) · [项目规划](docs/project-plan.md)
- [Tobs 接入调研](docs/tobs-integration-research.md) · [Tobs 接入规划](docs/tobs-integration-plan.md)
- [开发记录](docs/development-log.md)

## 许可

[MIT](LICENSE)
