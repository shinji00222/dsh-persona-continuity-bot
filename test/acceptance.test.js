import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { apply } from '../index.js'

// ============================================================================
// 第一部分：基于当前可运行基线（apply(ctx) + 记录型假模型）的实测验收
// 验证当前已接通路径：普通会话放行、平行人格隔离、重启跨会话召回、决定纠正更新
// ============================================================================

function createBaselineHarness(t, { dshHome, handlerMap = new Map() } = {}) {
  const sessions = new Map()
  const agents = new Map()
  const handlers = new Map()
  const routes = new Map()
  const cleanups = []
  const promptProviders = new Map()
  const llmRequests = []

  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = dshHome

  const ctx = {
    logger: { warn() {} },
    agents: {
      get: id => agents.get(id),
      list: () => [...agents.values()],
    },
    sessions: {
      get: id => sessions.get(id),
    },
    systemPrompt: {
      section: () => () => {},
      context: () => () => {},
    },
    llm: {
      async *stream(req) {
        llmRequests.push(req)
        const payload = JSON.parse(req.messages[1].content[0].text)
        const userText = payload.conversation?.user ?? ''
        const handler = handlerMap.get(req.sessionId)
        const result = handler ? handler(payload, req) : defaultBaselineExtractor(userText)
        yield { type: 'text-delta', text: JSON.stringify(result) }
        yield { type: 'finish', reason: { kind: 'stop' } }
      },
    },
    connection: {
      fetch: {
        register({ path, methods, fetch }) {
          for (const method of methods) routes.set(`${method} ${path}`, fetch)
          return async () => {}
        },
      },
    },
    sessionQuery: {
      async filterSessions() { return [] },
      async readTitleSnapshots() { return [] },
      async filterEvents() { return [] },
      async observeSession() { throw new Error('not found') },
    },
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, [])
      handlers.get(event).push(fn)
    },
    effect(fn) {
      const cleanup = fn()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
    },
  }

  function defaultBaselineExtractor(userText) {
    if (userText.includes('PostgreSQL')) {
      return [{
        kind: 'decision',
        topic: 'nebula-db',
        title: 'Nebula 数据库选型',
        summary: 'Project Nebula 改用 PostgreSQL 以支持多进程写入',
        detail: '由于多进程并发写入需求，将数据库从 SQLite WAL 改为 PostgreSQL。',
        evidence: '改用 PostgreSQL 以支持多进程写入',
      }]
    }
    if (userText.includes('SQLite WAL')) {
      return [{
        kind: 'decision',
        topic: 'nebula-db',
        title: 'Nebula 数据库选型',
        summary: 'Project Nebula 采用 SQLite WAL 模式',
        detail: '单机阶段使用 SQLite WAL 模式以降低部署复杂度。',
        evidence: '采用 SQLite WAL 模式',
      }]
    }
    if (userText.includes('压测指标')) {
      return [{
        kind: 'progress',
        topic: 'nebula-benchmark',
        title: 'Nebula 压测计划',
        summary: '三个月后进行 P99 延迟压测',
        detail: '研究搭档记录：三个月后在 100 并发下验证 P99 < 50ms。',
        evidence: '三个月后验证 P99 < 50ms 压测指标',
      }]
    }
    return []
  }

  apply(ctx)

  t.after(async () => {
    for (const cleanup of cleanups) await cleanup()
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
  })

  function registerSession(id, { cwd = '/workspace/project-nebula', headerExtra = {} } = {}) {
    const session = {
      id,
      header: { id, cwd, createdAt: Date.now(), ...headerExtra },
      snapshotEvents: () => [],
      requestHeader: () => ({ config: { provider: 'mock', model: 'mock-1' } }),
    }
    const providers = { identity: null, context: null, tools: [] }
    promptProviders.set(id, providers)
    const agent = {
      id,
      session,
      options: { provider: 'mock', model: 'mock-1' },
      inbox: { nextTurn: [], nextStep: [] },
      ctx: {
        systemPrompt: {
          section(opts) {
            providers.identity = opts.text
            return () => { providers.identity = null }
          },
          context(opts) {
            providers.context = opts.text
            return () => { providers.context = null }
          },
        },
        tools: {
          register(tool) {
            providers.tools.push(tool.name)
            return () => {
              const idx = providers.tools.indexOf(tool.name)
              if (idx >= 0) providers.tools.splice(idx, 1)
            }
          },
        },
      },
    }
    sessions.set(id, session)
    agents.set(id, agent)
    return { session, agent, providers }
  }

  async function emit(event, ...args) {
    const results = []
    for (const fn of handlers.get(event) ?? []) {
      results.push(await fn(...args))
    }
    return results
  }

  async function callRoute(method, path, body) {
    const fn = routes.get(`${method} /api/persona-continuity${path.split('?')[0]}`)
    assert.ok(fn, `route ${method} ${path} should be registered`)
    const init = { method }
    if (body !== undefined) {
      init.body = JSON.stringify(body)
      init.headers = { 'content-type': 'application/json' }
    }
    const res = await fn(new Request('http://localhost/api/persona-continuity' + path, init))
    return { status: res.status, json: await res.json() }
  }

  async function runTurn(sessionObj, agentObj, turn, userText, assistantText) {
    await emit('session/event', sessionObj, { type: 'turn/start', data: { turn } })
    await emit('agent/pre-step', {
      agent: agentObj,
      messages: [{ source: { kind: 'user' }, content: userText }],
      signal: new AbortController().signal,
    }, () => ({ ok: true }))
    await emit('session/event', sessionObj, {
      type: 'user/message',
      data: { source: { kind: 'user' }, content: userText },
    })
    await emit('session/event', sessionObj, {
      type: 'assistant/message',
      data: { interrupted: false, message: { content: assistantText } },
    })
    await emit('session/event', sessionObj, {
      type: 'turn/end',
      data: { turn, reason: { kind: 'completed' } },
    })
    // 等待微任务与异步队列消费
    await new Promise(resolve => setTimeout(resolve, 40))
  }

  async function teardown() {
    while (cleanups.length) {
      const fn = cleanups.pop()
      await fn()
    }
  }

  return {
    registerSession,
    emit,
    callRoute,
    runTurn,
    teardown,
    promptProviders,
    llmRequests,
  }
}

test('baseline acceptance: plain DSH, sub-session, and incognito chats run untouched', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-accept-plain-'))
  const harness = createBaselineHarness(t, { dshHome: dir })
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const plain = harness.registerSession('session-plain-1')
  const child = harness.registerSession('session-child-1', { headerExtra: { parentSession: 'session-plain-1' } })
  const incognito = harness.registerSession('session-incognito-1')

  // 触发 agent/created
  await harness.emit('agent/created', { agent: plain.agent })
  await harness.emit('agent/created', { agent: child.agent })
  await harness.emit('agent/created', { agent: incognito.agent })

  // 普通会话、子会话、无痕会话均不注入人格/记忆，也不注册 persona_recall
  for (const item of [plain, child, incognito]) {
    assert.equal(item.providers.identity, null)
    assert.equal(item.providers.context, null)
    assert.deepEqual(item.providers.tools, [])
  }

  // 原生历史工具在普通会话中不被拦截
  let nextCalled = false
  const preExecResults = await harness.emit(
    'tools/pre-execute',
    { agent: plain.agent, name: 'session_search' },
    () => { nextCalled = true; return { kind: 'allow' } },
  )
  assert.equal(nextCalled, true)
  assert.deepEqual(preExecResults, [{ kind: 'allow' }])

  // 对话轮次结束后，记录型假模型未收到任何提炼请求
  await harness.runTurn(plain.session, plain.agent, 1, '今天聊聊 Project Nebula 的 SQLite WAL 模式', '好的，这是普通会话。')
  await harness.runTurn(child.session, child.agent, 1, '子会话采用 SQLite WAL 模式', '收到。')
  await harness.runTurn(incognito.session, incognito.agent, 1, '无痕会话采用 SQLite WAL 模式', '收到。')
  assert.equal(harness.llmRequests.length, 0)
})

test('baseline acceptance: two personas isolate memories, recall across restart, and update corrected decisions', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-accept-base-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  // --- 阶段 1：两个平行人格各自讨论并提炼记忆 ---
  const h1 = createBaselineHarness(t, { dshHome: dir })
  const pResearch = (await h1.callRoute('POST', '/persona', {
    id: '', name: '研究搭档', instructions: '关注实验设计与压测指标',
  })).json.id
  const pMentor = (await h1.callRoute('POST', '/persona', {
    id: '', name: '代码导师', instructions: '关注工程架构与数据库选型',
  })).json.id

  const sResearch1 = h1.registerSession('s-research-1')
  const sMentor1 = h1.registerSession('s-mentor-1')
  await h1.callRoute('POST', '/bind', { session: 's-research-1', persona: pResearch })
  await h1.callRoute('POST', '/bind', { session: 's-mentor-1', persona: pMentor })

  await h1.runTurn(
    sResearch1.session,
    sResearch1.agent,
    1,
    'Project Nebula 计划三个月后验证 P99 < 50ms 压测指标',
    '明白，已记录压测指标目标。',
  )
  await h1.runTurn(
    sMentor1.session,
    sMentor1.agent,
    1,
    'Project Nebula 当前采用 SQLite WAL 模式',
    '明白，已确认 SQLite WAL 选型。',
  )

  assert.equal(h1.llmRequests.length, 2)
  assert.equal((await h1.callRoute('GET', `/index?persona=${pResearch}&q=压测`)).json.length, 1)
  assert.equal((await h1.callRoute('GET', `/index?persona=${pMentor}&q=压测`)).json.length, 0)
  assert.equal((await h1.callRoute('GET', `/index?persona=${pMentor}&q=SQLite`)).json.length, 1)
  assert.equal((await h1.callRoute('GET', `/index?persona=${pResearch}&q=SQLite`)).json.length, 0)

  // 关闭当前运行时，模拟 DSH 重启
  await h1.teardown()

  // --- 阶段 2：重启后开新会话跨会话召回，并在代码导师中纠正工程决定 ---
  const h2 = createBaselineHarness(t, { dshHome: dir })
  const sResearch2 = h2.registerSession('s-research-2')
  const sMentor2 = h2.registerSession('s-mentor-2')
  await h2.callRoute('POST', '/bind', { session: 's-research-2', persona: pResearch })
  await h2.callRoute('POST', '/bind', { session: 's-mentor-2', persona: pMentor })

  // 研究搭档新会话首轮触发 pre-step 召回
  await h2.emit('session/event', sResearch2.session, { type: 'turn/start', data: { turn: 1 } })
  await h2.emit('agent/pre-step', {
    agent: sResearch2.agent,
    messages: [{ source: { kind: 'user' }, content: 'Nebula 压测计划 100 并发 P99 50ms 的目标是什么？' }],
    signal: new AbortController().signal,
  }, () => ({ ok: true }))

  const researchContext = sResearch2.providers.context()
  assert.match(researchContext, /P99 < 50ms/)
  assert.doesNotMatch(researchContext, /SQLite WAL/)

  // 代码导师纠正工程决定：从 SQLite WAL 改为 PostgreSQL
  await h2.runTurn(
    sMentor2.session,
    sMentor2.agent,
    1,
    '纠正之前的决定：Nebula 改用 PostgreSQL 以支持多进程写入',
    '收到，已更新为 PostgreSQL。',
  )
  await h2.teardown()

  // --- 阶段 3：再次重启后验证代码导师使用新版本决定 ---
  const h3 = createBaselineHarness(t, { dshHome: dir })
  const sMentor3 = h3.registerSession('s-mentor-3')
  await h3.callRoute('POST', '/bind', { session: 's-mentor-3', persona: pMentor })
  await h3.emit('session/event', sMentor3.session, { type: 'turn/start', data: { turn: 1 } })
  await h3.emit('agent/pre-step', {
    agent: sMentor3.agent,
    messages: [{ source: { kind: 'user' }, content: 'Nebula 数据库选型 PostgreSQL 多进程写入' }],
    signal: new AbortController().signal,
  }, () => ({ ok: true }))

  const mentorContext = sMentor3.providers.context()
  assert.match(mentorContext, /PostgreSQL/)
  assert.doesNotMatch(mentorContext, /采用 SQLite WAL 模式/)
  const mentorEntries = (await h3.callRoute('GET', `/index?persona=${pMentor}&q=Nebula`)).json
  assert.equal(mentorEntries.length, 1)
  assert.match(mentorEntries[0].summary, /PostgreSQL/)
  await h3.teardown()
})

// ============================================================================
// 第二部分：基于项目规划共用接口契约的可控替身验收
// 覆盖尚未合入的 Tobs Bot 归属、本地 Markdown 目录（无 .git）、自主差异化提炼与 autoMemory 开关
// 对应 docs/tobs-integration-plan.md 共用接口约定
// ============================================================================

/**
 * 本地 Markdown 文件库替身：
 * 目录结构：$DSH_HOME/persona-continuity/memories/<personaId>/MEMORY.md + notes/<noteId>.md
 * 约束：无 .git 目录；支持 revision 冲突检测与 operationId 幂等。
 */
class DiskMarkdownMemoryStore {
  constructor(dshHome) {
    this.root = join(dshHome, 'persona-continuity', 'memories')
    mkdirSync(this.root, { recursive: true })
    this.appliedOps = new Map()
  }

  personaDir(personaId) {
    return join(this.root, personaId)
  }

  notesDir(personaId) {
    return join(this.personaDir(personaId), 'notes')
  }

  indexPath(personaId) {
    return join(this.personaDir(personaId), 'MEMORY.md')
  }

  ensurePersonaDir(personaId) {
    mkdirSync(this.notesDir(personaId), { recursive: true })
  }

  parseNoteFile(raw) {
    const match = raw.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/)
    if (!match) return null
    const meta = {}
    for (const line of match[1].split('\n')) {
      const idx = line.indexOf(':')
      if (idx > 0) {
        const key = line.slice(0, idx).trim()
        const val = line.slice(idx + 1).trim()
        meta[key] = val
      }
    }
    return {
      noteId: meta.id,
      title: meta.title,
      summary: meta.summary,
      workspace: meta.workspace,
      session: meta.session,
      turn: Number(meta.turn),
      revision: Number(meta.revision),
      updatedAt: meta.updatedAt,
      detail: match[2].trim(),
    }
  }

  serializeNote(note) {
    return [
      '---',
      `id: ${note.noteId}`,
      `title: ${note.title}`,
      `summary: ${note.summary}`,
      `workspace: ${note.workspace}`,
      `session: ${note.session}`,
      `turn: ${note.turn}`,
      `revision: ${note.revision}`,
      `updatedAt: ${note.updatedAt}`,
      '---',
      '',
      note.detail,
      '',
    ].join('\n')
  }

  rebuildIndex(personaId) {
    this.ensurePersonaDir(personaId)
    const notes = this.listAllNotes(personaId)
    const lines = ['# MEMORY', '']
    for (const n of notes) {
      lines.push(`- [${n.noteId}] ${n.title} | ${n.summary} (ws=${n.workspace}, rev=${n.revision}, src=${n.session}#${n.turn})`)
    }
    const tmp = `${this.indexPath(personaId)}.tmp-${Date.now()}`
    writeFileSync(tmp, lines.join('\n') + '\n', 'utf8')
    renameSync(tmp, this.indexPath(personaId))
  }

  listAllNotes(personaId) {
    const dir = this.notesDir(personaId)
    if (!existsSync(dir)) return []
    const files = readdirSync(dir).filter(f => f.endsWith('.md')).sort()
    return files
      .map(f => this.parseNoteFile(readFileSync(join(dir, f), 'utf8')))
      .filter(Boolean)
  }

  // 共用契约：catalog(scope, query, budget)
  catalog(scope, query = '', budget = 16) {
    if (!scope?.personaId) return []
    const q = query.trim().toLowerCase()
    const terms = q ? (q.match(/[\p{Script=Han}]{2,}|[a-z0-9_]{2,}/gu) ?? [q]) : []
    const notes = this.listAllNotes(scope.personaId)
      .filter(n => !scope.workspaceKey || n.workspace === scope.workspaceKey)
    const matched = terms.length
      ? notes.filter(n => {
          const haystack = `${n.title} ${n.summary} ${n.detail}`.toLowerCase()
          return terms.some(term => haystack.includes(term))
        })
      : notes
    return matched.slice(0, budget).map(({ noteId, title, summary, revision, session, turn }) => ({
      noteId, title, summary, revision, session, turn,
    }))
  }

  // 共用契约：readNote(scope, noteId)
  readNote(scope, noteId) {
    if (!scope?.personaId) return null
    const file = join(this.notesDir(scope.personaId), `${noteId}.md`)
    if (!existsSync(file)) return null
    const note = this.parseNoteFile(readFileSync(file, 'utf8'))
    if (!note) return null
    if (scope.workspaceKey && note.workspace !== scope.workspaceKey) return null
    return note
  }

  // 共用契约：upsertNote(scope, note, { operationId, expectedRevision })
  upsertNote(scope, note, { operationId, expectedRevision } = {}) {
    if (!scope?.personaId) throw new Error('missing scope.personaId')
    const opKey = `${scope.personaId}:${operationId}`
    if (operationId && this.appliedOps.has(opKey)) {
      return { status: 'duplicate', note: this.appliedOps.get(opKey) }
    }
    this.ensurePersonaDir(scope.personaId)
    const existing = this.readNote({ personaId: scope.personaId }, note.noteId)
    if (expectedRevision !== undefined && (existing?.revision ?? 0) !== expectedRevision) {
      return { status: 'conflict', currentRevision: existing?.revision ?? 0 }
    }
    const next = {
      noteId: note.noteId,
      title: note.title,
      summary: note.summary,
      detail: note.detail,
      workspace: scope.workspaceKey ?? '',
      session: note.session,
      turn: note.turn,
      revision: (existing?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    }
    const target = join(this.notesDir(scope.personaId), `${note.noteId}.md`)
    const tmp = `${target}.tmp-${Date.now()}`
    writeFileSync(tmp, this.serializeNote(next), 'utf8')
    renameSync(tmp, target)
    this.rebuildIndex(scope.personaId)
    if (operationId) this.appliedOps.set(opKey, next)
    return { status: 'applied', note: next }
  }
}

/**
 * 模拟 Tobs + 宿主运行时：
 * - 通过 ownershipMap 模拟 resolvePersona(sessionId)
 * - 支持 autoMemory 按人格开关
 * - 记录所有发往假模型的 chat / extract 请求
 */
function createTobsContractHarness({ dshHome, personaConfigs, ownershipMap, extractor }) {
  const memoryStore = new DiskMarkdownMemoryStore(dshHome)
  const recordedRequests = []

  function resolvePersona(sessionId) {
    const entry = ownershipMap.get(sessionId)
    if (!entry) return null
    if (entry.isSubSession || entry.isIncognito || entry.hasOrigin) return null
    return {
      personaId: entry.personaId,
      workspaceKey: entry.workspaceKey,
      role: entry.role,
    }
  }

  function buildSystemPrompt(sessionId, userQuery) {
    const scope = resolvePersona(sessionId)
    if (!scope) {
      return { injected: false, systemPrompt: 'Standard DSH Assistant' }
    }
    const persona = personaConfigs.get(scope.personaId)
    const catalog = memoryStore.catalog(scope, '', 16)
    const relevant = memoryStore.catalog(scope, userQuery, 6)
      .map(item => memoryStore.readNote(scope, item.noteId))
      .filter(Boolean)

    return {
      injected: true,
      systemPrompt: [
        `[Persona:${persona.name}] ${persona.instructions}`,
        `[MEMORY.md Catalog] ${JSON.stringify(catalog)}`,
        `[Relevant Notes] ${JSON.stringify(relevant)}`,
      ].join('\n'),
    }
  }

  function runChatTurn({ sessionId, turn, userText, assistantText }) {
    const { injected, systemPrompt } = buildSystemPrompt(sessionId, userText)
    recordedRequests.push({
      phase: 'chat',
      sessionId,
      systemPrompt,
      injected,
      userText,
    })

    const scope = resolvePersona(sessionId)
    if (!scope) return { extracted: false, reason: 'plain-or-unsupported' }

    const persona = personaConfigs.get(scope.personaId)
    if (!persona.autoMemory) {
      return { extracted: false, reason: 'auto-memory-disabled' }
    }

    const knownNotes = memoryStore.catalog(scope, '', 32)
      .map(item => memoryStore.readNote(scope, item.noteId))
      .filter(Boolean)

    const extractPayload = {
      persona: { id: persona.id, name: persona.name, instructions: persona.instructions },
      scope,
      sourceTurns: [{ session: sessionId, turn, user: userText, assistant: assistantText }],
      knownNotes,
    }
    recordedRequests.push({
      phase: 'extract',
      sessionId,
      personaId: persona.id,
      payload: extractPayload,
    })

    const intents = extractor(extractPayload)
    const applied = []
    for (const intent of intents) {
      const res = memoryStore.upsertNote(
        scope,
        {
          noteId: intent.noteId,
          title: intent.title,
          summary: intent.summary,
          detail: intent.detail,
          session: sessionId,
          turn,
        },
        {
          operationId: `${sessionId}:${turn}:${intent.noteId}`,
          expectedRevision: intent.expectedRevision,
        },
      )
      applied.push(res)
    }
    return { extracted: true, applied }
  }

  return {
    memoryStore,
    recordedRequests,
    resolvePersona,
    runChatTurn,
  }
}

test('contract acceptance: two Bots differentiate memories, recall after restart, isolate, update decisions, respect autoMemory=false, and leave plain DSH untouched', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-accept-contract-'))
  try {
    const personaConfigs = new Map([
      ['research-partner', {
        id: 'research-partner',
        name: '研究搭档',
        instructions: '只提炼实验指标、压测方法与研究结论，跳过代码选型细节与闲聊。',
        autoMemory: true,
      }],
      ['code-mentor', {
        id: 'code-mentor',
        name: '代码导师',
        instructions: '只提炼架构决策、数据库选型与工程规范，跳过压测实验指标与闲聊。',
        autoMemory: true,
      }],
    ])

    const ownershipMap = new Map([
      ['bot-research-s1', { personaId: 'research-partner', workspaceKey: '/workspace/project-nebula', role: 'researcher' }],
      ['bot-mentor-s1', { personaId: 'code-mentor', workspaceKey: '/workspace/project-nebula', role: 'mentor' }],
      ['plain-dsh-s1', null],
      ['sub-dsh-s1', { personaId: 'code-mentor', workspaceKey: '/workspace/project-nebula', role: 'mentor', isSubSession: true }],
    ])

    // 可控自主提炼替身：模拟两个人格面对同一段讨论做出不同选择
    const controlledExtractor = ({ persona, sourceTurns, knownNotes }) => {
      const text = sourceTurns.map(t => `${t.user}\n${t.assistant}`).join('\n')
      if (text.includes('天气真好')) return [] // 跳过无用闲聊

      if (persona.id === 'research-partner') {
        if (text.includes('P99 < 50ms')) {
          return [{
            noteId: 'nebula-p99-target',
            title: 'Nebula 压测指标',
            summary: '三个月后验证 100 并发下 P99 < 50ms',
            detail: '实验目标：三个月后进行压测，要求 100 并发下 P99 < 50ms。',
          }]
        }
        return []
      }

      if (persona.id === 'code-mentor') {
        const existingDb = knownNotes.find(n => n.noteId === 'nebula-db-choice')
        if (text.includes('改用 PostgreSQL')) {
          return [{
            noteId: 'nebula-db-choice',
            title: 'Nebula 数据库选型',
            summary: '改用 PostgreSQL 以支持多进程并发写入',
            detail: '工程决定已纠正：由于多进程并发写入，弃用 SQLite WAL，改用 PostgreSQL。',
            expectedRevision: existingDb?.revision ?? 0,
          }]
        }
        if (text.includes('SQLite WAL')) {
          return [{
            noteId: 'nebula-db-choice',
            title: 'Nebula 数据库选型',
            summary: '初期采用 SQLite WAL 模式',
            detail: '工程决定：单机原型阶段使用 SQLite WAL 模式。',
            expectedRevision: existingDb?.revision ?? 0,
          }]
        }
      }
      return []
    }

    // --- 阶段 1：两个 Bot 参与同一段讨论，各自形成不同记忆；无用信息跳过 ---
    const h1 = createTobsContractHarness({
      dshHome: dir,
      personaConfigs,
      ownershipMap,
      extractor: controlledExtractor,
    })

    const sharedDiscussion = '我们讨论下 Project Nebula：后端先采用 SQLite WAL 模式；同时定一个实验指标，三个月后验证 100 并发下 P99 < 50ms。'
    h1.runChatTurn({ sessionId: 'bot-research-s1', turn: 1, userText: sharedDiscussion, assistantText: '研究搭档已收到。' })
    h1.runChatTurn({ sessionId: 'bot-mentor-s1', turn: 1, userText: sharedDiscussion, assistantText: '代码导师已收到。' })
    h1.runChatTurn({ sessionId: 'bot-mentor-s1', turn: 2, userText: '今天天气真好，出去散步吧。', assistantText: '祝散步愉快！' })

    // 核对本地 Markdown 目录结构与无 .git 要求
    const researchDir = join(dir, 'persona-continuity', 'memories', 'research-partner')
    const mentorDir = join(dir, 'persona-continuity', 'memories', 'code-mentor')
    assert.equal(existsSync(join(researchDir, '.git')), false)
    assert.equal(existsSync(join(mentorDir, '.git')), false)
    assert.equal(existsSync(join(researchDir, 'MEMORY.md')), true)
    assert.equal(existsSync(join(mentorDir, 'MEMORY.md')), true)

    const researchIndex = readFileSync(join(researchDir, 'MEMORY.md'), 'utf8')
    const mentorIndex = readFileSync(join(mentorDir, 'MEMORY.md'), 'utf8')
    assert.match(researchIndex, /Nebula 压测指标/)
    assert.doesNotMatch(researchIndex, /SQLite WAL/)
    assert.match(mentorIndex, /Nebula 数据库选型/)
    assert.doesNotMatch(mentorIndex, /P99 < 50ms/)

    // --- 阶段 2：模拟重启（新建 harness 实例，仅靠磁盘 Markdown 文件） ---
    ownershipMap.set('bot-research-s2', { personaId: 'research-partner', workspaceKey: '/workspace/project-nebula', role: 'researcher' })
    ownershipMap.set('bot-mentor-s2', { personaId: 'code-mentor', workspaceKey: '/workspace/project-nebula', role: 'mentor' })

    const h2 = createTobsContractHarness({
      dshHome: dir,
      personaConfigs,
      ownershipMap,
      extractor: controlledExtractor,
    })

    // 研究搭档新会话召回压测指标，且代码导师读不到研究搭档的条目
    h2.runChatTurn({ sessionId: 'bot-research-s2', turn: 1, userText: '之前定的 P99 压测目标是多少？', assistantText: '是 100 并发下 P99 < 50ms。' })
    const researchChatReq = h2.recordedRequests.find(r => r.phase === 'chat' && r.sessionId === 'bot-research-s2')
    assert.match(researchChatReq.systemPrompt, /P99 < 50ms/)
    assert.match(researchChatReq.systemPrompt, /bot-research-s1/)

    assert.equal(
      h2.memoryStore.readNote(h2.resolvePersona('bot-mentor-s2'), 'nebula-p99-target'),
      null,
      '另一个人格不能读取研究搭档的笔记',
    )

    // --- 阶段 3：工程决定被纠正后更新版本 ---
    h2.runChatTurn({
      sessionId: 'bot-mentor-s2',
      turn: 1,
      userText: '我们纠正之前的决定：改用 PostgreSQL 以支持多进程写入。',
      assistantText: '好的，已切换为 PostgreSQL。',
    })

    // 再次重启，新开代码导师会话核对新版本
    ownershipMap.set('bot-mentor-s3', { personaId: 'code-mentor', workspaceKey: '/workspace/project-nebula', role: 'mentor' })
    const h3 = createTobsContractHarness({
      dshHome: dir,
      personaConfigs,
      ownershipMap,
      extractor: controlledExtractor,
    })
    h3.runChatTurn({ sessionId: 'bot-mentor-s3', turn: 1, userText: '现在 Nebula 用什么数据库？', assistantText: '现在使用 PostgreSQL。' })

    const mentorChatReq = h3.recordedRequests.find(r => r.phase === 'chat' && r.sessionId === 'bot-mentor-s3')
    assert.match(mentorChatReq.systemPrompt, /PostgreSQL/)
    assert.doesNotMatch(mentorChatReq.systemPrompt, /初期采用 SQLite WAL 模式/)

    const updatedNote = h3.memoryStore.readNote(h3.resolvePersona('bot-mentor-s3'), 'nebula-db-choice')
    assert.equal(updatedNote.revision, 2)
    assert.equal(updatedNote.session, 'bot-mentor-s2')

    // --- 阶段 4：关闭某个人格的自动记忆后不再新增，但保留读取 ---
    personaConfigs.get('research-partner').autoMemory = false
    const beforeNotes = readdirSync(join(researchDir, 'notes'))
    const reqCountBefore = h3.recordedRequests.filter(r => r.phase === 'extract').length

    const turnResult = h3.runChatTurn({
      sessionId: 'bot-research-s2',
      turn: 2,
      userText: '再补充一个新实验：增加 P99 < 50ms 的冷启动对比实验。',
      assistantText: '好的。',
    })
    assert.equal(turnResult.extracted, false)
    assert.equal(turnResult.reason, 'auto-memory-disabled')
    assert.equal(h3.recordedRequests.filter(r => r.phase === 'extract').length, reqCountBefore)
    assert.deepEqual(readdirSync(join(researchDir, 'notes')), beforeNotes)

    // --- 阶段 5：普通 DSH 会话和子会话照常运行 ---
    const plainRes = h3.runChatTurn({ sessionId: 'plain-dsh-s1', turn: 1, userText: '普通会话问个问题：SQLite WAL 是什么？', assistantText: 'Write-Ahead Logging。' })
    const subRes = h3.runChatTurn({ sessionId: 'sub-dsh-s1', turn: 1, userText: '子会话执行任务', assistantText: '完成。' })
    assert.equal(plainRes.extracted, false)
    assert.equal(subRes.extracted, false)

    const plainChatReq = h3.recordedRequests.find(r => r.phase === 'chat' && r.sessionId === 'plain-dsh-s1')
    assert.equal(plainChatReq.injected, false)
    assert.equal(plainChatReq.systemPrompt, 'Standard DSH Assistant')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
