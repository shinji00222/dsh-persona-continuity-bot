# 独立验收说明（Tobs + 人格续忆）

本文档对应 `test/acceptance.test.js`，使用纯虚构数据（虚构人格「研究搭档」「代码导师」与虚构项目 `Project Nebula`）验证核心场景，区分「当前已接通的自动化验收」与「待主 Agent 接线后执行的集成/桌面验收」。

## 一、自动化验收矩阵（已运行通过）

执行命令：`node --test test/acceptance.test.js`

| 场景 | 基线实测（`apply(ctx)` + 记录型假模型） | 契约替身验收（Markdown 目录 + 可控替身） |
| --- | --- | --- |
| 普通 DSH 会话 / 子会话 / 无痕会话照常运行 | 已覆盖：零注入、`session_search` 放行、零提炼请求 | 已覆盖：`resolvePersona` 返回空、`injected=false`、无磁盘写入 |
| 两个 Bot / 人格参与同一讨论后各自形成记忆 | 已覆盖：平行会话按 `personaId` 隔离入库 | 已覆盖：同一输入下研究搭档仅记压测指标，代码导师仅记数据库选型，闲聊跳过 |
| 同人格重启后跨会话召回 | 已覆盖：重建 `apply(ctx)` 后首轮 `pre-step` 注入历史记忆 | 已覆盖：重建运行时后从 `MEMORY.md` + `notes/*.md` 恢复并注入带来源的上下文 |
| 另一个人格没有读到该条目 | 已覆盖：`/index` 与 `context()` 相互不可见 | 已覆盖：`readNote` 跨人格返回 `null`，`systemPrompt` 无交叉 |
| 工程决定被纠正后使用新版本 | 已覆盖：同一 `topic` 从 `SQLite WAL` 更新为 `PostgreSQL`，重启后仅注入新版本 | 已覆盖：携带 `expectedRevision` 更新原笔记，`revision` 升为 2 并记录新来源 |
| 关闭自动记忆后不再新增 | **待集成验证**（基线 `Store` 尚无 `autoMemory` 字段） | 已覆盖：`autoMemory=false` 后零提炼请求、`notes/` 文件数不变 |
| 记忆目录无 `.git` 且不走 Git 读写 | **待集成验证**（基线仍写 `memory.sqlite`） | 已覆盖：核对 `$DSH_HOME/persona-continuity/memories/<personaId>/.git` 不存在 |

---

## 二、未接通路径可执行步骤与预期结果（待集成验证）

以下路径依赖主 Agent 完成 Tobs 接入、本地 Markdown 文件库、`autoMemory` 开关与 Web 路由接线后执行。

### 1. Tobs 真实 Bot 归属与无 `.git` 目录验证【待集成验证】

- **前置条件**：主 Agent 已合入 Tobs 接入方案（独立插件或最小补丁）与 `lib/local-memory/`。
- **可执行步骤**：
  1. 设置隔离 `DSH_HOME`（如 `C:\temp\dsh-accept-profile`）并启动已安装插件的 DSH 桌面端/宿主。
  2. 在 Tobs 中新建两个 Bot：**研究搭档**（设定：只关注实验指标与研究结论）和**代码导师**（设定：只关注架构决策与工程规范）。
  3. 检查目录 `$DSH_HOME/persona-continuity/memories/<personaId>/` 与 Tobs 默认 Bot 目录。
- **预期结果**：
  - `resolvePersona(sessionId)` 能从宿主可信 `ownership` 取到对应 Bot 并映射为稳定 `personaId`。
  - 长期记忆目录存在 `MEMORY.md` 与 `notes/`，**不存在 `.git` 目录**，且 Tobs 原有 Git 记忆读写链路已退出。

### 2. 真实模型自主提炼、跨会话召回与决定纠正【待集成验证】

- **前置条件**：隔离 `DSH_HOME` 内已配置目标模型，两个 Bot 就绪。
- **可执行步骤**：
  1. 在两个 Bot 中分别发送同一段虚构讨论：「Project Nebula 后端先用 SQLite WAL，三个月后验证 100 并发下 P99 < 50ms；另外今天天气真好。」
  2. 分别发送一条无关闲聊，等待后台提炼队列完成，查看「设置 → 人格续忆」及磁盘 `notes/*.md`。
  3. 完全重启 DSH，分别在两个 Bot 中新开会话询问「之前定的数据库选型和压测目标是什么？」。
  4. 在**代码导师**新会话中明确纠正：「改为使用 PostgreSQL 以支持多进程写入」，等待后台整理/回顾任务完成。
  5. 再次新开**代码导师**会话询问「Nebula 用什么数据库？」，并同时在**研究搭档**中确认是否串号。
- **预期结果**：
  - 阶段 2：研究搭档保留压测指标、跳过闲聊；代码导师保留 SQLite WAL 决定、跳过闲聊；磁盘出现两份独立笔记。
  - 阶段 3：重启后两个 Bot 各自只召回自己的条目，代码导师回答不包含研究搭档的压测笔记。
  - 阶段 5：代码导师答复采用新版本 `PostgreSQL` 并能给出纠正会话来源；研究搭档无该条目。

### 3. 关闭自动记忆（`autoMemory = false`）与普通 DSH 会话【待集成验证】

- **可执行步骤**：
  1. 打开「设置 → 人格续忆」，关闭**研究搭档**的「自动记忆」开关。
  2. 在**研究搭档**中发送一条新事实：「新增对比基线：测试冷启动延迟」。
  3. 新开一个**普通 DSH 会话**（不选 Bot/人格），发送「记住普通会话偏好：使用深色主题」。
- **预期结果**：
  - **研究搭档**的 `notes/` 目录文件数不变、无新增条目，但已有历史记忆仍可正常召回。
  - **普通 DSH 会话**不注入任何人格或记忆上下文，不拦截原生工具，也不生成任何记忆文件。

### 4. 记录型假模型端到端请求核对（接线后替换替身）【待集成验证】

- **可执行步骤**：
  1. 主 Agent 接线完成后，将 `test/acceptance.test.js` 第二部分的 `DiskMarkdownMemoryStore` 与 `createTobsContractHarness` 替换为真实模块导入（`apply` + `lib/local-memory` + `lib/memory-lifecycle`）。
  2. 重新运行 `node --test test/acceptance.test.js`。
- **预期结果**：
  - 无需修改 6 大场景断言，记录型假模型核对 `systemPrompt` 首轮只注入一次（无重复注入）、`autoMemory=false` 时零提炼请求、所有磁盘文件与索引一致。

---

## 三、需要主 Agent 接手的事项

1. **真实模块接线**：合入任务 B（`lib/local-memory/`）、任务 C（`lib/memory-lifecycle/`）与任务 D（`autoMemory` 开关与管理路由）到 `index.js`、`lib/web.js` 后，将 `test/acceptance.test.js` 第二部分的替身类替换为真实导出。
2. **`autoMemory` 路由与持久化**：确认按人格关闭自动记忆的字段名（如 `autoMemory`）与更新接口后，在 `test/acceptance.test.js` 补充真实 HTTP 路由调用断言。
3. **隔离 Windows 桌面实测**：在隔离 `DSH_HOME` 下使用真实模型执行第二节的第 1–3 步，确认弱/目标模型自主提炼、后台回顾冲突修正与来源展示的实际表现。
