import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { apply } from '../index.js'
import { Store } from '../lib/store.js'

function createHarness(t, { sessions, agents, observations = {}, llmResult = '[]' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-binding-test-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = dir

  const handlers = new Map()
  const routes = new Map()
  const cleanups = []

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
      async *stream() {
        yield { type: 'text-delta', text: llmResult }
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
      async filterSessions(filters) {
        const ids = filters.find(item => item.kind === 'id')?.values
        return Object.values(observations)
          .filter(obs => !ids || ids.includes(obs.header?.id))
          .map(obs => ({ header: obs.header }))
      },
      async readTitleSnapshots(ids) {
        return ids.map(id => ({
          status: 'fulfilled',
          value: { session: observations[id]?.header, title: { title: '' } },
        }))
      },
      async filterEvents(id, filters) {
        const needle = filters.find(item => item.kind === 'text')?.text?.toLowerCase() ?? ''
        const obs = observations[id]
        if (!obs) return []
        return obs.events.filter(event => JSON.stringify(event).toLowerCase().includes(needle))
      },
      async observeSession(id) {
        const obs = observations[id]
        if (!obs) throw new Error('not found')
        return { ...obs, [Symbol.dispose]() {} }
      },
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

  apply(ctx)

  t.after(async () => {
    for (const cleanup of cleanups) await cleanup()
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    rmSync(dir, { recursive: true, force: true })
  })

  async function callRoute(method, path, body) {
    const fn = routes.get(`${method} /api/persona-continuity${path.split('?')[0]}`)
    assert.ok(fn, `route ${method} ${path} should be registered`)
    const init = { method }
    if (body !== undefined) {
      init.body = JSON.stringify(body)
      init.headers = { 'content-type': 'application/json' }
    }
    const res = await fn(new Request('http://localhost/api/persona-continuity' + path, init))
    const json = await res.json()
    return { status: res.status, json }
  }

  async function emit(event, ...args) {
    for (const fn of handlers.get(event) ?? []) await fn(...args)
  }

  return { callRoute, emit }
}

const makeSession = (id, events = [], { busy = false, hasConfig = events.length > 0 } = {}) => ({
  id,
  header: { id, cwd: 'ws', createdAt: 100 },
  snapshotEvents: () => busy
    ? [...events, { type: 'turn/start', data: { turn: 99 } }]
    : events,
  requestHeader: () => (busy || hasConfig ? { config: { provider: 'mock', model: 'm1' } } : undefined),
})

const makeAgent = (id, session) => ({
  id,
  session,
  options: { provider: 'mock', model: 'm1' },
  inbox: { nextTurn: [], nextStep: [] },
  ctx: {
    systemPrompt: {
      section: () => () => {},
      context: () => () => {},
    },
  },
})

test('binding rules: draft can rebind freely, started standard chat binds once, generating blocks all', async t => {
  const sDraft = makeSession('draft', [])
  const sHistory = makeSession('history', [
    { type: 'user/message', data: { source: { kind: 'user' }, content: 'hi' } },
  ])
  const sBusy = makeSession('busy', [], { busy: true })

  const sessions = new Map([['draft', sDraft], ['history', sHistory], ['busy', sBusy]])
  const agents = new Map([
    ['draft', makeAgent('draft', sDraft)],
    ['history', makeAgent('history', sHistory)],
    ['busy', makeAgent('busy', sBusy)],
  ])

  const { callRoute } = createHarness(t, { sessions, agents })

  const pA = (await callRoute('POST', '/persona', { id: '', name: 'A', instructions: '' })).json.id
  const pB = (await callRoute('POST', '/persona', { id: '', name: 'B', instructions: '' })).json.id

  // 1) 没有历史：A -> B -> 普通 都成功
  let state = (await callRoute('GET', '/state?session=draft')).json
  assert.equal(state.editable, true)
  assert.equal(state.bindOnce, false)
  assert.equal(state.locked, false)

  assert.equal((await callRoute('POST', '/bind', { session: 'draft', persona: pA })).status, 200)
  assert.equal((await callRoute('POST', '/bind', { session: 'draft', persona: pB })).status, 200)
  state = (await callRoute('POST', '/bind', { session: 'draft', persona: '' })).json
  assert.equal(state.selected, '')

  // 2) 有历史 + 未绑定 -> A 成功，之后锁定
  state = (await callRoute('GET', '/state?session=history')).json
  assert.equal(state.editable, false)
  assert.equal(state.bindOnce, true)
  assert.equal(state.locked, false)

  state = (await callRoute('POST', '/bind', { session: 'history', persona: pA })).json
  assert.equal(state.selected, pA)
  assert.equal(state.bindOnce, false)
  assert.equal(state.locked, true)

  // A -> B 失败, A -> 普通 失败, 创建新人格失败, A -> A 不报错
  assert.equal((await callRoute('POST', '/bind', { session: 'history', persona: pB })).status, 400)
  assert.equal((await callRoute('POST', '/bind', { session: 'history', persona: '' })).status, 400)
  assert.equal((await callRoute('POST', '/create', { session: 'history', name: 'C' })).status, 400)
  assert.equal((await callRoute('POST', '/bind', { session: 'history', persona: pA })).status, 200)

  // 3) 生成中：任何操作都失败
  state = (await callRoute('GET', '/state?session=busy')).json
  assert.equal(state.editable, false)
  assert.equal(state.bindOnce, false)
  assert.equal(state.locked, false)
  assert.equal((await callRoute('POST', '/bind', { session: 'busy', persona: pA })).status, 400)
  assert.equal((await callRoute('POST', '/create', { session: 'busy', name: 'D' })).status, 400)
})

test('importHistory skips sessions bound to another persona or busy without rebinding', async t => {
  const sActive = makeSession('active', [])
  const sOther = makeSession('other', [])
  const sBusy = makeSession('busy-chat', [], { busy: true })
  const sessions = new Map([['active', sActive], ['other', sOther], ['busy-chat', sBusy]])
  const agents = new Map([
    ['active', makeAgent('active', sActive)],
    ['other', makeAgent('other', sOther)],
    ['busy-chat', makeAgent('busy-chat', sBusy)],
  ])
  const observations = {
    other: {
      header: { id: 'other', cwd: 'ws' },
      events: [
        { type: 'user/message', data: { source: { kind: 'user' }, content: '记住这是重要决定' } },
        { type: 'assistant/message', data: { message: { content: '好的。' } } },
      ],
    },
  }
  const { callRoute } = createHarness(t, { sessions, agents, observations })

  const pA = (await callRoute('POST', '/persona', { id: '', name: 'A', instructions: '' })).json.id
  const pB = (await callRoute('POST', '/persona', { id: '', name: 'B', instructions: '' })).json.id
  await callRoute('POST', '/bind', { session: 'other', persona: pB })

  const res = await callRoute('POST', '/history/import', {
    persona: pA,
    sessions: ['other', 'busy-chat'],
    activeSession: 'active',
  })
  assert.equal(res.status, 200)
  assert.equal(res.json.queuedChunks, 0)
  assert.deepEqual(res.json.skipped, [
    { id: 'other', reason: 'bound-to-other' },
    { id: 'busy-chat', reason: 'busy' },
  ])
  assert.equal((await callRoute('GET', '/state?session=other')).json.selected, pB)
})

test('importHistory deduplicates chunks and handles observeSession errors per session', async t => {
  const sActive = makeSession('active', [])
  const sOther = makeSession('other', [])
  const sessions = new Map([['active', sActive], ['other', sOther]])
  const agents = new Map([['active', makeAgent('active', sActive)], ['other', makeAgent('other', sOther)]])
  const observations = {
    good: {
      header: { id: 'good', cwd: 'ws' },
      events: [
        { type: 'user/message', data: { source: { kind: 'user' }, content: '记住我们用 SQLite 存储' } },
        { type: 'assistant/message', data: { message: { content: '好的，已经确认使用 SQLite。' } } },
      ],
    },
    other: {
      header: { id: 'other', cwd: 'ws' },
      events: [
        { type: 'user/message', data: { source: { kind: 'user' }, content: '这是另一个人格的对话内容' } },
        { type: 'assistant/message', data: { message: { content: '收到。' } } },
      ],
    },
  }
  const llmResult = JSON.stringify([{
    kind: 'decision', topic: 'sqlite', title: '存储方案', summary: '使用 SQLite',
    detail: '记住我们用 SQLite 存储', evidence: '记住我们用 SQLite 存储',
  }])
  const { callRoute } = createHarness(t, { sessions, agents, observations, llmResult })

  const pA = (await callRoute('POST', '/persona', { id: '', name: 'A', instructions: '' })).json.id
  const pB = (await callRoute('POST', '/persona', { id: '', name: 'B', instructions: '' })).json.id
  await callRoute('POST', '/bind', { session: 'other', persona: pB })

  const first = await callRoute('POST', '/history/import', {
    persona: pA,
    sessions: ['good', 'other', 'broken'],
    activeSession: 'active',
  })
  assert.equal(first.status, 200)
  assert.equal(first.json.boundSessions, 1)
  assert.equal(first.json.queuedChunks, 1)
  assert.equal(first.json.duplicateChunks, 0)
  assert.deepEqual(first.json.skipped, [
    { id: 'other', reason: 'bound-to-other' },
    { id: 'broken', reason: 'read-failed' },
  ])

  // 等待队列消费完成并写入 imported_chunks
  await new Promise(resolve => setTimeout(resolve, 40))
  const status = (await callRoute('GET', `/history/import/status?persona=${pA}`)).json
  assert.equal(status.pending, 0)

  const second = await callRoute('POST', '/history/import', {
    persona: pA,
    sessions: ['good'],
    activeSession: 'active',
  })
  assert.equal(second.json.queuedChunks, 0)
  assert.equal(second.json.duplicateChunks, 1)

  const memories = (await callRoute('GET', `/index?persona=${pA}&q=SQLite`)).json
  assert.equal(memories.length, 1)
  assert.equal(memories[0].turn, -1)
  assert.equal(memories[0].source, 'import')
})

test('systemPrompt.context reads cached recall per turn instead of querying Store.recall repeatedly', async t => {
  const sChat = makeSession('chat', [])
  let contextProvider
  const agent = {
    ...makeAgent('chat', sChat),
    ctx: {
      systemPrompt: {
        section: () => () => {},
        context: opts => {
          contextProvider = opts.text
          return () => {}
        },
      },
    },
  }
  const sessions = new Map([['chat', sChat]])
  const agents = new Map([['chat', agent]])

  let recallCount = 0
  const originalRecall = Store.prototype.recall
  Store.prototype.recall = function (...args) {
    recallCount++
    return originalRecall.apply(this, args)
  }
  t.after(() => { Store.prototype.recall = originalRecall })

  const { callRoute, emit } = createHarness(t, { sessions, agents })
  const pA = (await callRoute('POST', '/persona', { id: '', name: 'A', instructions: '' })).json.id
  await callRoute('POST', '/bind', { session: 'chat', persona: pA })

  assert.match(contextProvider(), /persona_recall/)
  assert.equal(recallCount, 0)

  await emit('session/event', sChat, { type: 'turn/start', data: { turn: 1 } })
  await emit('agent/pre-step', {
    agent,
    messages: [{ source: { kind: 'user' }, content: '普通问题' }],
    signal: new AbortController().signal,
  }, () => ({ ok: true }))

  assert.equal(recallCount, 1)
  contextProvider()
  contextProvider()
  contextProvider()
  assert.equal(recallCount, 1)
})

test('history lookup turn allows non-history tools, denies native history tools, and still enqueues extraction', async t => {
  const sChat = makeSession('chat', [])
  const agent = makeAgent('chat', sChat)
  const sessions = new Map([['chat', sChat]])
  const agents = new Map([['chat', agent]])
  let llmCalls = 0
  const dir = mkdtempSync(join(tmpdir(), 'dsh-t2-test-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = dir

  const handlers = new Map()
  const routes = new Map()
  const cleanups = []
  const ctx = {
    logger: { warn() {} },
    agents: { get: id => agents.get(id), list: () => [...agents.values()] },
    sessions: { get: id => sessions.get(id) },
    systemPrompt: { section: () => () => {}, context: () => () => {} },
    llm: {
      async *stream() {
        llmCalls++
        yield {
          type: 'text-delta',
          text: JSON.stringify([{
            kind: 'decision', topic: 't2-topic', title: '工具放行', summary: '读文件正常',
            detail: '找之前聊 SQLite 的那段 并继续改代码', evidence: '找之前聊 SQLite 的那段',
          }]),
        }
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
  apply(ctx)
  t.after(async () => {
    for (const cleanup of cleanups) await cleanup()
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    rmSync(dir, { recursive: true, force: true })
  })

  const call = async (method, path, body) => {
    const fn = routes.get(`${method} /api/persona-continuity${path.split('?')[0]}`)
    const res = await fn(new Request('http://localhost/api/persona-continuity' + path, {
      method, body: body ? JSON.stringify(body) : undefined,
      headers: body ? { 'content-type': 'application/json' } : {},
    }))
    return res.json()
  }
  const emit = async (event, ...args) => {
    for (const fn of handlers.get(event) ?? []) await fn(...args)
  }

  const pA = (await call('POST', '/persona', { id: '', name: 'A', instructions: '' })).id
  await call('POST', '/bind', { session: 'chat', persona: pA })

  await emit('session/event', sChat, { type: 'turn/start', data: { turn: 1 } })
  await emit('agent/pre-step', {
    agent,
    messages: [{ source: { kind: 'user' }, content: '找之前聊 SQLite 的那段' }],
    signal: new AbortController().signal,
  }, () => ({ ok: true }))

  // 非历史工具走 next()
  let nextCalled = false
  const allowed = await (async () => {
    for (const fn of handlers.get('tools/pre-execute') ?? []) {
      const result = await fn({ agent, name: 'read_file' }, () => { nextCalled = true; return { kind: 'allow' } })
      if (result) return result
    }
  })()
  assert.equal(nextCalled, true)
  assert.deepEqual(allowed, { kind: 'allow' })

  // nativeHistoryTools 仍被 deny
  const denied = await (async () => {
    for (const fn of handlers.get('tools/pre-execute') ?? []) {
      const result = await fn({ agent, name: 'session_search' }, () => ({ kind: 'allow' }))
      if (result) return result
    }
  })()
  assert.equal(denied.kind, 'deny')

  // turn/end 仍然入队并触发提炼
  await emit('session/event', sChat, { type: 'user/message', data: { source: { kind: 'user' }, content: '找之前聊 SQLite 的那段' } })
  await emit('session/event', sChat, { type: 'assistant/message', data: { message: { content: '好的，继续改代码。' } } })
  await emit('session/event', sChat, { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } })
  await new Promise(resolve => setTimeout(resolve, 30))
  assert.ok(llmCalls >= 1)
  const indexed = await call('GET', `/index?persona=${pA}&q=t2-topic`)
  assert.equal(indexed.length, 1)
})

test('binding a started standard chat automatically queues its existing history for extraction', async t => {
  const sStd = makeSession('std', [
    { type: 'user/message', data: { source: { kind: 'user' }, content: '记住我们项目统一用 SQLite 存本地记忆。' } },
    { type: 'assistant/message', data: { message: { content: '好的，已经记下使用 SQLite。' } } },
  ])
  const sessions = new Map([['std', sStd]])
  const agents = new Map([['std', makeAgent('std', sStd)]])
  const llmResult = JSON.stringify([{
    kind: 'decision',
    topic: 'storage-engine',
    title: '使用 SQLite',
    summary: '项目本地记忆统一用 SQLite 存储',
    detail: '用户明确要求记住项目统一用 SQLite 存本地记忆。',
    evidence: '记住我们项目统一用 SQLite 存本地记忆。',
  }])

  const { callRoute } = createHarness(t, { sessions, agents, llmResult })
  const pA = (await callRoute('POST', '/persona', { id: '', name: 'A', instructions: '' })).json.id
  await callRoute('POST', '/bind', { session: 'std', persona: pA })
  await new Promise(resolve => setTimeout(resolve, 40))

  const list = (await callRoute('GET', `/index?persona=${pA}&q=storage-engine`)).json
  assert.equal(list.length, 1)
  assert.equal(list[0].title, '使用 SQLite')
})

test('importHistory avoids negative turn collision when an earlier import job is still queued', async t => {
  const sessions = new Map([['host', makeSession('host')]])
  const agents = new Map([['host', makeAgent('host', sessions.get('host'))]])
  const observations = {
    s1: {
      header: { id: 's1', cwd: 'ws', createdAt: 10 },
      events: [
        { type: 'user/message', data: { source: { kind: 'user' }, content: '这是第二段全新的对话内容，需要单独入队。' } },
        { type: 'assistant/message', data: { message: { content: '收到，这是第二段的回复。' } } },
      ],
    },
  }
  const { callRoute } = createHarness(t, { sessions, agents, observations })
  const pA = (await callRoute('POST', '/persona', { id: '', name: 'A', instructions: '' })).json.id
  const dbPath = join(process.env.DSH_HOME, 'persona-continuity', 'memory.sqlite')
  const store = new Store(dbPath)
  store.bind('s1', pA)
  // Simulate an earlier queued import job at turn = -1 with a different chunk_hash
  store.enqueue({
    session: 's1', turn: -1, persona: pA, workspace: 'ws', provider: 'mock', model: 'm1',
    input: JSON.stringify({ user: '第一段旧内容', assistant: '旧回复' }), source: 'import', chunk_hash: 'old-hash',
  })
  store.close()

  const first = (await callRoute('POST', '/history/import', { persona: pA, sessions: ['s1'] })).json
  assert.equal(first.queuedChunks, 1)
  assert.equal(first.duplicateChunks, 0)

  // Re-importing the exact same chunk while it is still queued should be deduplicated
  const second = (await callRoute('POST', '/history/import', { persona: pA, sessions: ['s1'] })).json
  assert.equal(second.queuedChunks, 0)
  assert.equal(second.duplicateChunks, 1)
})

test('cold persisted standard session not yet in ctx.sessions supports bindOnce and auto-extraction', async t => {
  const sHost = makeSession('host')
  const sessions = new Map([['host', sHost]])
  const agents = new Map([['host', makeAgent('host', sHost)]])
  const observations = {
    cold: {
      header: { id: 'cold', cwd: 'ws', createdAt: 10 },
      events: [
        { type: 'user/message', data: { source: { kind: 'user' }, content: '记住冷启动的旧普通会话也要能绑定人格。' } },
        { type: 'assistant/message', data: { message: { content: '收到，已经记下冷启动旧会话。' } } },
      ],
    },
  }
  const llmResult = JSON.stringify([{
    kind: 'decision',
    topic: 'cold-bind',
    title: '冷会话绑定',
    summary: '未激活到内存的旧普通会话支持一次绑定并自动提炼',
    detail: '记住冷启动的旧普通会话也要能绑定人格。',
    evidence: '记住冷启动的旧普通会话也要能绑定人格。',
  }])
  const { callRoute } = createHarness(t, { sessions, agents, observations, llmResult })
  const pA = (await callRoute('POST', '/persona', { id: '', name: 'A', instructions: '' })).json.id

  const state = (await callRoute('GET', '/state?session=cold')).json
  assert.equal(state.bindOnce, true)
  assert.equal(state.editable, false)

  await callRoute('POST', '/bind', { session: 'cold', persona: pA })
  await new Promise(resolve => setTimeout(resolve, 40))

  const list = (await callRoute('GET', `/index?persona=${pA}&q=cold-bind`)).json
  assert.equal(list.length, 1)
})

test('cold session bind and importHistory fall back to request/header model when no in-memory model exists', async t => {
  const sessions = new Map()
  const agents = new Map()
  const observations = {
    coldBind: {
      header: { id: 'coldBind', cwd: 'ws', createdAt: 10 },
      events: [
        { type: 'request/header', data: { header: { config: { provider: 'mock-cold', model: 'cold-1' } } } },
        { type: 'user/message', data: { source: { kind: 'user' }, content: '记住冷启动无内存模型时绑定也能提炼。' } },
        { type: 'assistant/message', data: { message: { content: '收到，已经记下冷启动无内存模型的对话。' } } },
      ],
    },
    coldImport: {
      header: { id: 'coldImport', cwd: 'ws', createdAt: 20 },
      events: [
        { type: 'request/header', data: { config: { provider: 'mock-import', model: 'import-1' } } },
        { type: 'user/message', data: { source: { kind: 'user' }, content: '记住冷启动直接导入旧对话也要能从事件提取模型。' } },
        { type: 'assistant/message', data: { message: { content: '收到，已从事件提取模型。' } } },
      ],
    },
    noModel: {
      header: { id: 'noModel', cwd: 'ws', createdAt: 30 },
      events: [
        { type: 'user/message', data: { source: { kind: 'user' }, content: '这段旧对话没有任何模型配置事件。' } },
        { type: 'assistant/message', data: { message: { content: '是的，没有模型配置事件。' } } },
      ],
    },
  }
  const llmResult = JSON.stringify([
    {
      kind: 'decision', topic: 'cold-model-bind', title: '冷绑定模型兜底',
      summary: '无内存模型时从 request/header 兜底',
      detail: '记住冷启动无内存模型时绑定也能提炼。',
      evidence: '记住冷启动无内存模型时绑定也能提炼。',
    },
    {
      kind: 'decision', topic: 'cold-model-import', title: '冷导入模型兜底',
      summary: '直接导入冷会话时从 request/header 兜底',
      detail: '记住冷启动直接导入旧对话也要能从事件提取模型。',
      evidence: '记住冷启动直接导入旧对话也要能从事件提取模型。',
    },
  ])
  const { callRoute } = createHarness(t, { sessions, agents, observations, llmResult })
  const pA = (await callRoute('POST', '/persona', { id: '', name: 'A', instructions: '' })).json.id

  // 先测既无内存模型又无事件模型的旧对话导入：应当报错
  const missing = await callRoute('POST', '/history/import', { persona: pA, sessions: ['noModel'] })
  assert.equal(missing.status, 400)
  assert.match(missing.json.error, /请先打开一个已选好模型的对话/)

  // 再测冷会话直接导入（自身带 request/header）
  const imported = await callRoute('POST', '/history/import', { persona: pA, sessions: ['coldImport'] })
  assert.equal(imported.status, 200)
  assert.equal(imported.json.queuedChunks, 1)

  // 再测冷会话绑定（自身带 request/header）
  await callRoute('POST', '/bind', { session: 'coldBind', persona: pA })
  await new Promise(resolve => setTimeout(resolve, 40))

  const memories = (await callRoute('GET', `/index?persona=${pA}&q=`)).json
  assert.equal(memories.length, 2)
})

test('failed extraction jobs are retained after 3 attempts and can be retried via /jobs/retry', async t => {
  const sessions = new Map([['host', makeSession('host')]])
  const agents = new Map([['host', makeAgent('host', sessions.get('host'))]])
  const observations = {
    s1: {
      header: { id: 's1', cwd: 'ws', createdAt: 10 },
      events: [
        { type: 'user/message', data: { source: { kind: 'user' }, content: '记住失败重试后仍应保存这条决定。' } },
        { type: 'assistant/message', data: { message: { content: '好的，会保留并支持重试。' } } },
      ],
    },
  }
  const { callRoute } = createHarness(t, {
    sessions, agents, observations,
    llmResult: JSON.stringify([{
      kind: 'decision', topic: 'retry-job', title: '失败重试',
      summary: '失败三次后可重试',
      detail: '记住失败重试后仍应保存这条决定。',
      evidence: '记住失败重试后仍应保存这条决定。',
    }]),
  })
  const pA = (await callRoute('POST', '/persona', { id: '', name: 'A', instructions: '' })).json.id
  const dbPath = join(process.env.DSH_HOME, 'persona-continuity', 'memory.sqlite')
  const store = new Store(dbPath)
  store.bind('s1', pA)
  store.enqueue({
    session: 's1', turn: -1, persona: pA, workspace: 'ws', provider: 'mock', model: 'm1',
    input: JSON.stringify({ user: '记住失败重试后仍应保存这条决定。', assistant: '好的，会保留并支持重试。' }),
    source: 'import', chunk_hash: 'h-retry',
  })
  // 模拟连续失败 3 次（attempt 0 -> 1 -> 2 -> 3）
  for (let i = 0; i < 3; i++) {
    const job = store.nextJob()
    assert.ok(job)
    store.fail(job)
    if (i < 2) store.db.prepare('UPDATE jobs SET available = 0 WHERE session = ? AND turn = ?').run(job.session, job.turn)
  }
  assert.equal(store.nextJob(), undefined)
  store.close()

  const statusBefore = (await callRoute('GET', `/history/import/status?persona=${pA}`)).json
  assert.deepEqual(statusBefore, { pending: 0, failed: 1 })

  const retried = (await callRoute('POST', '/jobs/retry', { persona: pA })).json
  assert.equal(retried.retried, 1)
  await new Promise(resolve => setTimeout(resolve, 40))

  const statusAfter = (await callRoute('GET', `/history/import/status?persona=${pA}`)).json
  assert.deepEqual(statusAfter, { pending: 0, failed: 0 })
  const list = (await callRoute('GET', `/index?persona=${pA}&q=`)).json
  assert.equal(list.length, 1)
  assert.equal(list[0].topic, 'retry-job')
})

test('persona_recall tool and memory catalog enforce strict bound-session isolation', async t => {
  const sChat = makeSession('chat', [])
  let registeredTool = null
  let contextProvider = null
  const agent = {
    ...makeAgent('chat', sChat),
    ctx: {
      systemPrompt: {
        section: () => () => {},
        context: opts => {
          contextProvider = opts.text
          return () => {}
        },
      },
      tools: {
        register(tool) {
          registeredTool = tool
          return () => { registeredTool = null }
        },
      },
    },
  }
  const sessions = new Map([['chat', sChat]])
  const agents = new Map([['chat', agent]])
  const observations = {
    boundOld: {
      header: { id: 'boundOld', cwd: 'ws', createdAt: 50 },
      events: [
        { type: 'user/message', seq: 1, data: { source: { kind: 'user' }, content: '看下这个 strcmp 代码' } },
        { type: 'assistant/message', seq: 2, data: { message: { content: '这是 strcmp 的实现对比' } } },
      ],
    },
    unboundNormal: {
      header: { id: 'unboundNormal', cwd: 'ws', createdAt: 60 },
      events: [
        { type: 'user/message', seq: 1, data: { source: { kind: 'user' }, content: '未绑定普通会话里的 strcmp' } },
        { type: 'assistant/message', seq: 2, data: { message: { content: '不应该被读取' } } },
      ],
    },
  }
  const { callRoute } = createHarness(t, { sessions, agents, observations })
  const pA = (await callRoute('POST', '/persona', { id: '', name: 'A', instructions: '' })).json.id
  const pB = (await callRoute('POST', '/persona', { id: '', name: 'B', instructions: '' })).json.id
  await callRoute('POST', '/bind', { session: 'chat', persona: pA })
  assert.ok(registeredTool, 'persona_recall tool should be registered for bound session')
  assert.equal(registeredTool.name, 'persona_recall')

  const dbPath = join(process.env.DSH_HOME, 'persona-continuity', 'memory.sqlite')
  const store = new Store(dbPath)
  store.bind('boundOld', pA)
  store.saveExtractedMemories({
    persona: pA, session: 'boundOld', turn: 1, workspace: 'ws', created: Date.now(),
    items: [{
      kind: 'lesson', topic: 'c-strcmp', title: 'C 语言 strcmp 练习',
      summary: '比较字符串返回值符号', detail: 'strcmp 相等返回 0，小于返回负数',
    }],
  })
  store.saveExtractedMemories({
    persona: pB, session: 'other', turn: 1, workspace: 'ws', created: Date.now(),
    items: [{
      kind: 'lesson', topic: 'b-secret', title: 'B 的记忆',
      summary: '不该被 A 读到', detail: 'B 私有细节',
    }],
  })
  const memA = store.search(pA, 'ws', 'strcmp')[0]
  const memB = store.search(pB, 'ws', 'B')[0]
  store.close()

  // 1. 常驻记忆目录应包含 pA 的记忆标题，且禁止读取 ~/.dsh/sessions
  const promptText = contextProvider()
  assert.match(promptText, /记忆目录：/)
  assert.match(promptText, /C 语言 strcmp 练习/)
  assert.match(promptText, /~\/\.dsh\/sessions\//)

  // 2. 按 memory_id 读取本人的记忆成功，读其他人格记忆被拒绝
  const hitA = await registeredTool.execute({ memory_id: memA.id }, { agent })
  assert.equal(hitA.found, true)
  assert.equal(hitA.memory.detail, 'strcmp 相等返回 0，小于返回负数')
  const missB = await registeredTool.execute({ memory_id: memB.id }, { agent })
  assert.equal(missB.found, false)

  // 3. 按 session_id 读未绑定普通会话应严格返回 not-found（边界 1）
  const deniedUnbound = await registeredTool.execute({ session_id: 'unboundNormal' }, { agent })
  assert.equal(deniedUnbound.status, 'not-found')
  const allowedBound = await registeredTool.execute({ session_id: 'boundOld' }, { agent })
  assert.equal(allowedBound.status, 'found')
  assert.match(allowedBound.excerpts[0].text, /strcmp/)

  // 4. 按 query 搜索应同时命中记忆库与已绑定旧对话，不泄露未绑定普通会话
  const searched = await registeredTool.execute({ query: 'strcmp' }, { agent })
  assert.equal(searched.memories.length, 1)
  assert.equal(searched.memories[0].id, memA.id)
  assert.equal(searched.history.status, 'found')
  assert.equal(searched.history.source.id, 'boundOld')
})

test('history/source returns exact bound turn excerpt and blocks unbound or foreign sessions', async t => {
  const sessions = new Map()
  const agents = new Map()
  const observations = {
    sA: {
      header: { id: 'sA', cwd: 'ws', createdAt: 10 },
      events: [
        { type: 'session/title', data: { title: '数据库选型讨论' } },
        { type: 'turn/start', data: { turn: 1 } },
        { type: 'user/message', data: { source: { kind: 'user' }, content: '第一轮：先用 SQLite。' } },
        { type: 'assistant/message', data: { message: { content: '明白，第一轮记录 SQLite。' } } },
        { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
        { type: 'turn/start', data: { turn: 2 } },
        { type: 'user/message', data: { source: { kind: 'user' }, content: '第二轮：改成 PostgreSQL。' } },
        { type: 'assistant/message', data: { message: { content: '好的，已更新为 PostgreSQL。' } } },
        { type: 'turn/end', data: { turn: 2, reason: { kind: 'completed' } } },
      ],
    },
    sB: {
      header: { id: 'sB', cwd: 'ws', createdAt: 20 },
      events: [
        { type: 'user/message', data: { source: { kind: 'user' }, content: 'B 的私有讨论' } },
        { type: 'assistant/message', data: { message: { content: '收到' } } },
      ],
    },
  }
  const { callRoute } = createHarness(t, { sessions, agents, observations })
  const pA = (await callRoute('POST', '/persona', { id: '', name: 'A', instructions: '' })).json.id
  const pB = (await callRoute('POST', '/persona', { id: '', name: 'B', instructions: '' })).json.id

  const dbPath = join(process.env.DSH_HOME, 'persona-continuity', 'memory.sqlite')
  const store = new Store(dbPath)
  store.bind('sA', pA)
  store.bind('sB', pB)
  store.close()

  const hit = await callRoute('GET', `/history/source?persona=${pA}&session=sA&turn=2`)
  assert.equal(hit.status, 200)
  assert.equal(hit.json.title, '数据库选型讨论')
  assert.match(hit.json.excerpt, /第二轮：改成 PostgreSQL/)
  assert.doesNotMatch(hit.json.excerpt, /第一轮：先用 SQLite/)

  const foreign = await callRoute('GET', `/history/source?persona=${pA}&session=sB&turn=1`)
  assert.equal(foreign.status, 400)
})

test('management index lists more than 8 memories without silently truncating', async t => {
  const { callRoute } = createHarness(t, { sessions: new Map(), agents: new Map() })
  const pA = (await callRoute('POST', '/persona', { id: '', name: 'A', instructions: '' })).json.id
  const dbPath = join(process.env.DSH_HOME, 'persona-continuity', 'memory.sqlite')
  const store = new Store(dbPath)
  const now = Date.now()
  for (let i = 1; i <= 10; i++) {
    store.saveExtractedMemories({
      persona: pA, session: `s-${i}`, turn: 1, workspace: 'ws', created: now + i,
      items: [{
        kind: 'fact', topic: `topic-${i}`, title: `记忆标题 ${i}`,
        summary: `摘要 ${i}`, detail: `详情内容 ${i}`,
      }],
    })
  }
  store.close()

  const list = await callRoute('GET', `/index?persona=${pA}&q=`)
  assert.equal(list.status, 200)
  assert.equal(list.json.length, 10)
})
