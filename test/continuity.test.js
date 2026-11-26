import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { Store, clean } from '../lib/store.js'
import { extract, rememberableInput, textBlocks } from '../lib/extract.js'

const make = (tag, detail = tag + ' 第 29 行') => ({
  kind: 'progress', topic: tag, title: tag + ' 项目', summary: tag + ' 继续学习', detail,
})
const job = (session, persona, turn = 1) => ({
  session, persona, turn, workspace: 'demo', provider: 'mock', model: 'mock-1', input: '{}',
})
const save = (store, source, entry) => {
  store.enqueue(source)
  const claim = store.nextJob()
  assert.ok(claim)
  store.finish(claim, [entry])
}

test('parallel personas keep their own bindings, summary and index after reopen', t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-continuity-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'memory.sqlite')
  let store = new Store(path)
  const a = store.savePersona('', '导师', '讲源码')
  const b = store.savePersona('', '导师', '讲论文')
  store.bind('a1', a)
  store.bind('b1', b)
  save(store, job('a1', a), make('ALPHA-1'))
  save(store, job('b1', b), make('BRAVO-2'))
  store.close()

  store = new Store(path)
  try {
    assert.equal(store.personaFor('a1').id, a)
    assert.equal(store.personaFor('b1').id, b)
    assert.equal(store.personaFor('plain'), undefined)
    assert.equal(store.savePersona(a, '源码导师', '新版设定'), a)
    store.bind('a2', a)
    assert.equal(store.personaFor('a1').instructions, '讲源码')
    assert.equal(store.personaFor('a1').name, '源码导师')
    assert.equal(store.personaFor('a2').instructions, '新版设定')
    assert.equal(store.savePersona(a, 'Soryu'), a)
    assert.equal(store.personas().find(persona => persona.id === a).instructions, '新版设定')
    assert.equal(store.personaFor('a2').name, 'Soryu')
    assert.deepEqual(store.recall(store.personaFor('a2').id, 'other workspace', 'ALPHA-1', 'a2'), [])
    const opening = store.recall(store.personaFor('a2').id, 'demo', 'ALPHA-1', 'a2')
    assert.match(opening[0].summary, /ALPHA-1/)
    assert.equal(store.recall(a, 'demo', '项目 ALPHA-1 目前的进度是什么？', 'a2')[0].id, opening[0].id)
    assert.match(opening[0].detail, /第 29 行/)
    assert.deepEqual(store.search(b, 'demo', 'ALPHA-1'), [])
    assert.deepEqual(store.search(a, 'demo', 'ALPHA-99'), [])
    assert.equal(store.forget(b, opening[0].id), false)
    assert.equal(opening[0].session, 'a1')
    assert.equal(store.forget(a, opening[0].id), true)
    assert.deepEqual(store.recall(a, 'demo', 'ALPHA-1', 'a2'), [])
  } finally {
    store.close()
  }
})

test('queue persists, claims once per host and updates the same topic', t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-continuity-lease-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'memory.sqlite')
  let first = new Store(path)
  const id = first.savePersona('', 'A', 'A')
  first.bind('a', id)
  first.enqueue(job('a', id))
  first.close()
  first = new Store(path)
  const second = new Store(path)
  try {
    const claim = first.nextJob()
    assert.ok(claim)
    assert.equal(second.nextJob(), undefined)
    first.finish({ ...claim, lease: 'wrong' }, [make('alpha', 'do not save')])
    assert.deepEqual(second.search(id, 'demo', 'alpha'), [])
    first.finish(claim, [make('alpha')])
    const original = second.search(id, 'demo', 'alpha')[0].id
    save(second, job('a', id, 2), make('alpha', '更新为第 40 行'))
    const rows = first.search(id, 'demo', 'alpha')
    assert.equal(rows.length, 1)
    assert.equal(rows[0].id, original)
    assert.equal(rows[0].detail, '更新为第 40 行')
  } finally {
    first.close()
    second.close()
  }
})

test('continuation intent excludes this session and other personas', () => {
  const store = new Store(':memory:')
  try {
    const a = store.savePersona('', 'A', '')
    const b = store.savePersona('', 'B', '')
    store.bind('a1', a)
    store.bind('a2', a)
    store.bind('b1', b)
    save(store, job('a1', a), make('cross-session-memory', '上次验证了 SQLite'))
    save(store, job('a2', a), make('本轮任务'))
    save(store, job('b1', b), make('另一个人格'))
    const rows = store.recall(a, 'demo', '上一个 session 最近会话 进展', 'a2')
    assert.deepEqual(rows.map(row => [row.session, row.detail]), [['a1', '上次验证了 SQLite']])
    assert.deepEqual(store.recall(a, 'demo', '明天下雨吗', 'a2'), [])
    assert.deepEqual(store.recall(b, 'demo', '继续上次', 'b1'), [])
  } finally {
    store.close()
  }
})

test('retains useful text and filters credentials before extraction', () => {
  const input = clean('记住我的偏好，api_key=abcdefghijk，ghp_abcDefghijKLMN', 256)
  assert.match(input, /记住我的偏好/)
  assert.doesNotMatch(input, /abcdefghijk|ghp_/)
})

test('textBlocks replaces image blocks with placeholder so image-only turns remain rememberable', () => {
  const userText = textBlocks([{ type: 'image', url: 'data:image/png;base64,xxx' }])
  assert.equal(userText, '[图片附件]')
  const packed = rememberableInput(userText, '截图里显示端口 3000 被占用了。')
  assert.ok(packed)
  assert.deepEqual(JSON.parse(packed), {
    user: '[图片附件]',
    assistant: '截图里显示端口 3000 被占用了。',
  })
})

test('extraction accepts structured replies and rejects partial finishes', async () => {
  const data = { ...job('a', 'persona'), input: JSON.stringify({ user: '确认使用 sqlite', assistant: '测试回复' }) }
  const success = { async *stream(options) {
    assert.equal(options.provider, 'mock')
    assert.equal(options.messages[0].role, 'system')
    assert.equal(options.messages[0].content[0].type, 'text')
    yield { type: 'text-delta', text: JSON.stringify([{ ...make('sqlite'), evidence: '确认使用 sqlite' }, { ...make('unfounded'), evidence: '没有原文支持的事实' }]) }
    yield { type: 'finish', reason: { kind: 'stop' } }
  } }
  const entries = await extract(success, data, [], new AbortController().signal)
  assert.deepEqual(entries.map(item => item.topic), ['sqlite'])
  const failed = { async *stream() {
    yield { type: 'text-delta', text: '[]' }
    yield { type: 'finish', reason: { kind: 'error' } }
  } }
  await assert.rejects(extract(failed, data, [], new AbortController().signal), /did not finish/)
})

test('bindingsMap and saveExtractedMemories record initial binding and imported memories', () => {
  const store = new Store(':memory:')
  try {
    const a = store.savePersona('', '导师', '')
    store.bind('s1', a)
    assert.equal(store.bindingsMap().get('s1')?.persona, a)
    assert.equal(store.bindingsMap().get('s1')?.name, '导师')
    const count = store.saveExtractedMemories({
      persona: a, session: 's1', turn: 1, workspace: 'demo', created: Date.now(),
      items: [make('imported-topic', '来自旧对话的决定')],
    })
    assert.equal(count, 1)
    assert.equal(store.search(a, 'demo', 'imported-topic')[0].detail, '来自旧对话的决定')
  } finally {
    store.close()
  }
})

test('refreshBinding updates bound session instructions and revision only when instructions change', () => {
  const store = new Store(':memory:')
  try {
    const id = store.savePersona('', '导师', '旧设定')
    store.bind('s1', id)
    assert.equal(store.personaFor('s1').instructions, '旧设定')
    assert.equal(store.personaFor('s1').revision, 1)

    // 只改名不改设定：revision 不变
    store.savePersona(id, '新名字')
    store.refreshBinding('s1')
    assert.equal(store.personaFor('s1').name, '新名字')
    assert.equal(store.personaFor('s1').revision, 1)

    // 修改设定：personaFor 仍为旧快照，refreshBinding 后变成新设定且 revision + 1
    store.savePersona(id, '新名字', '新设定')
    assert.equal(store.personaFor('s1').instructions, '旧设定')
    assert.equal(store.personaFor('s1').revision, 1)

    store.refreshBinding('s1')
    assert.equal(store.personaFor('s1').instructions, '新设定')
    assert.equal(store.personaFor('s1').revision, 2)
  } finally {
    store.close()
  }
})

test('migrates v3 database to v4, drops candidates, and prioritizes turn jobs over import jobs', t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v3-to-v4-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'memory.sqlite')

  const legacy = new DatabaseSync(path)
  legacy.exec(`
    CREATE TABLE personas (id TEXT PRIMARY KEY, name TEXT NOT NULL, instructions TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE bindings (session TEXT PRIMARY KEY, persona TEXT NOT NULL REFERENCES personas(id), instructions TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE memories (id TEXT PRIMARY KEY, persona TEXT NOT NULL REFERENCES personas(id),
      topic TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, detail TEXT NOT NULL,
      session TEXT NOT NULL, turn INTEGER NOT NULL, workspace TEXT NOT NULL, updated INTEGER NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
      UNIQUE(persona, kind, topic, workspace));
    CREATE TABLE jobs (session TEXT NOT NULL, turn INTEGER NOT NULL, persona TEXT NOT NULL REFERENCES personas(id),
      workspace TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, input TEXT NOT NULL,
      attempt INTEGER NOT NULL DEFAULT 0, available INTEGER NOT NULL, created INTEGER NOT NULL DEFAULT 0, lease TEXT, PRIMARY KEY(session, turn));
    CREATE TABLE candidates (id TEXT PRIMARY KEY);
    INSERT INTO personas VALUES ('p1', '导师', '讲源码', 1);
    INSERT INTO bindings VALUES ('s1', 'p1', '讲源码', 1);
    INSERT INTO memories VALUES ('m1', 'p1', 't1', 'fact', '标题', '摘要', '详情', 's1', 1, 'demo', 100, 1);
    PRAGMA user_version = 3;
  `)
  legacy.close()

  const store = new Store(path)
  try {
    assert.equal(store.db.prepare('PRAGMA user_version').get().user_version, 4)
    assert.equal(store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='candidates'").get(), undefined)
    assert.equal(store.personaFor('s1').name, '导师')
    assert.equal(store.search('p1', 'demo', '标题').length, 1)

    store.enqueue({
      session: 's1', turn: -1, persona: 'p1', workspace: 'demo',
      provider: 'mock', model: 'm1', input: '{}', source: 'import', chunk_hash: 'h1',
    })
    store.enqueue({
      session: 's1', turn: 2, persona: 'p1', workspace: 'demo',
      provider: 'mock', model: 'm1', input: '{}', source: 'turn',
    })
    const first = store.nextJob()
    assert.equal(first.source, 'turn')
    assert.equal(first.turn, 2)
    const second = store.nextJob()
    assert.equal(second.source, 'import')
    assert.equal(second.turn, -1)
  } finally {
    store.close()
  }
})

test('recall applies soft penalty for missing digits and isolates workspace-scoped memories', () => {
  const store = new Store(':memory:')
  try {
    const p = store.savePersona('', '导师', '')
    store.bind('sA', p)
    store.bind('sB', p)
    store.saveExtractedMemories({
      persona: p, session: 'sA', turn: 1, workspace: 'wsA', created: 100,
      items: [
        { kind: 'progress', topic: 'upgrade-steps', title: '升级步骤', summary: '升级步骤说明', detail: '升级步骤怎么做：先执行备份与迁移' },
        { kind: 'preference', topic: 'lang', title: '语言偏好', summary: '偏好中文回复', detail: '用户偏好中文交流' },
      ],
    })

    // 查询含数字“3”，记忆不含“3”但 token 重叠高 → 软惩罚后仍可召回
    const stepHits = store.recall(p, 'wsA', '升级步骤说明第3步', 'sA')
    assert.equal(stepHits.length, 1)
    assert.equal(stepHits[0].title, '升级步骤')

    // 工作区隔离：wsA 的 progress 不出现在 wsB 的 recall 和“继续上次”里；preference 两边都能召回
    assert.deepEqual(store.recall(p, 'wsB', '升级步骤', 'sB'), [])
    assert.deepEqual(store.recall(p, 'wsB', '继续上次', 'sB').map(r => r.title), ['语言偏好'])
    assert.equal(store.recall(p, 'wsB', '偏好中文', 'sB').length, 1)

    // 不限工作区的 search（设置页 api.list）两边都能看到全部
    assert.equal(store.search(p, '', '').length, 2)
  } finally {
    store.close()
  }
})

test('addManual, dismissFailed, review retry cap, and prose-wrapped JSON extraction work reliably', async () => {
  const store = new Store(':memory:')
  try {
    const p = store.savePersona('', '架构师', '')
    const manualId = store.addManual(p, {
      kind: 'preference',
      title: '简洁输出',
      summary: '先给结论再给细节',
      detail: '所有技术回答先给一句话结论，再补充关键依据。',
    })
    const saved = store.detail(p, manualId)
    assert.equal(saved.manual, true)
    assert.equal(saved.kind, 'preference')
    assert.equal(store.catalog(p, undefined, 16).some(item => item.id === manualId), true)

    // Failed job dismiss & model override retry
    store.bind('s1', p)
    store.enqueue(job('s1', p, 1))
    for (let i = 0; i < 3; i++) {
      store.db.prepare('UPDATE jobs SET available = 0').run()
      store.fail(store.nextJob())
    }
    assert.equal(store.importProgress(p).failed, 1)
    assert.equal(store.retryFailed(p, { provider: 'new-p', model: 'new-m' }), 1)
    const retried = store.nextJob()
    assert.equal(retried.provider, 'new-p')
    assert.equal(retried.model, 'new-m')
    store.fail(retried)
    for (let i = 0; i < 2; i++) {
      store.db.prepare('UPDATE jobs SET available = 0').run()
      store.fail(store.nextJob())
    }
    assert.equal(store.dismissFailed(p), 1)
    assert.equal(store.importProgress(p).failed, 0)

    // Review retry cap evicts chronically failing review sources after 3 failures
    store.enqueue({ ...job('s1', p, 2), input: JSON.stringify({ user: '测试回顾来源文本', assistant: '好的' }) })
    store.finish(store.nextJob(), [])
    const due = Date.now() + 400000
    for (let i = 0; i < 3; i++) {
      const batch = store.nextReview(new Set(), due + i * 200000)
      assert.ok(batch)
      store.failReview(batch)
    }
    assert.equal(store.nextReview(new Set(), due + 900000), undefined)

    // Prose-wrapped JSON output parses cleanly
    const chattyLlm = { async *stream() {
      yield { type: 'text-delta', text: '好的，以下是提炼出的记忆 JSON：\n```json\n[{"kind":"fact","topic":"db","title":"数据库","summary":"使用 SQLite","detail":"本地存储使用 SQLite","evidence":"确认使用 sqlite"}]\n```\n希望对你有帮助！' }
      yield { type: 'finish', reason: { kind: 'stop' } }
    } }
    const parsed = await extract(
      chattyLlm,
      { ...job('s1', p), input: JSON.stringify({ user: '确认使用 sqlite', assistant: '好的' }) },
      [],
      new AbortController().signal,
    )
    assert.equal(parsed.length, 1)
    assert.equal(parsed[0].topic, 'db')
  } finally {
    store.close()
  }
})
