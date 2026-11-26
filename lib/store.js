import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { isMemoryId, LocalMemory } from './local-memory.js'

const LIMIT = 5000
const kinds = new Set(['preference', 'decision', 'progress', 'lesson', 'fact'])

function tokens(text) {
  const words = text.normalize('NFKC').toLowerCase().match(/[\p{Script=Han}]+|[\p{L}\p{N}_]+/gu) ?? []
  const result = new Set()
  for (const word of words) {
    if (/\p{Script=Han}/u.test(word)) {
      for (let i = 1; i < word.length; i++) result.add(word.slice(i - 1, i + 1))
      if (word.length === 1) result.add(word)
    } else if (word.length > 1) result.add(word)
  }
  return result
}

export function clean(value, max) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[redacted]')
    .replace(/\b(?:sk-[\w-]{12,}|gh[pousr]_[\w]{12,}|github_pat_[\w]+|AKIA[A-Z0-9]{16})\b/g, '[redacted]')
    .replace(/\b(?:bearer\s+[\w.+/=-]{8,}|(?:api[_-]?key|password|secret|token)\s*[:=]\s*["']?[\w.+/=-]{8,})/gi, '[redacted]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim().slice(0, max)
}

function memoryText(value) {
  const title = clean(value?.title, 90).replace(/\s+/g, ' ')
  const summary = clean(value?.summary, 160).replace(/\s+/g, ' ')
  const detail = clean(value?.detail, 1800)
  if (!title || !summary || !detail) throw new Error('请填写记忆标题、摘要和详情')
  return { title, summary, detail }
}

export class Store {
  constructor(path) {
    const folder = dirname(path)
    const memoryRoot = basename(folder) === 'persona-memory-sim'
      ? join(dirname(folder), 'persona-continuity', 'memories')
      : join(folder, 'memories')
    this.memory = new LocalMemory(path === ':memory:' ? null : memoryRoot, clean)
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    try {
      this.db.exec('PRAGMA busy_timeout = 3000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON')
      this.transaction(() => {
        const version = this.db.prepare('PRAGMA user_version').get().user_version
        if (version > 4) throw new Error('记忆库版本高于当前插件支持的版本')
        this.db.exec(
        'CREATE TABLE IF NOT EXISTS personas (id TEXT PRIMARY KEY, name TEXT NOT NULL, instructions TEXT NOT NULL);' +
        'CREATE TABLE IF NOT EXISTS bindings (session TEXT PRIMARY KEY, persona TEXT NOT NULL REFERENCES personas(id));' +
        'CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, persona TEXT NOT NULL REFERENCES personas(id), ' +
        'topic TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, detail TEXT NOT NULL, ' +
        'session TEXT NOT NULL, turn INTEGER NOT NULL, workspace TEXT NOT NULL, updated INTEGER NOT NULL, ' +
        'UNIQUE(persona, kind, topic, workspace));' +
        'CREATE INDEX IF NOT EXISTS memories_recent ON memories(persona, updated DESC);' +
        'CREATE TABLE IF NOT EXISTS jobs (session TEXT NOT NULL, turn INTEGER NOT NULL, persona TEXT NOT NULL REFERENCES personas(id), ' +
        'workspace TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, input TEXT NOT NULL, ' +
        'attempt INTEGER NOT NULL DEFAULT 0, available INTEGER NOT NULL, PRIMARY KEY(session, turn));',
        )
        if (version < 2) {
          this.db.exec('ALTER TABLE jobs ADD COLUMN created INTEGER NOT NULL DEFAULT 0; ' +
            'ALTER TABLE jobs ADD COLUMN lease TEXT; UPDATE jobs SET created = available;')
        }
        if (version < 3) this.db.exec(`
          ALTER TABLE personas ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
          ALTER TABLE bindings ADD COLUMN instructions TEXT NOT NULL DEFAULT '';
          ALTER TABLE bindings ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
          UPDATE bindings SET instructions = (SELECT instructions FROM personas WHERE id = bindings.persona);
          ALTER TABLE memories ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
          PRAGMA user_version = 3;
        `)
        if (version < 4) this.db.exec(`
          ALTER TABLE jobs ADD COLUMN source TEXT NOT NULL DEFAULT 'turn';
          ALTER TABLE jobs ADD COLUMN chunk_hash TEXT;
          ALTER TABLE memories ADD COLUMN source TEXT NOT NULL DEFAULT 'turn';
          CREATE TABLE imported_chunks (
            persona TEXT NOT NULL REFERENCES personas(id), session TEXT NOT NULL, hash TEXT NOT NULL,
            created INTEGER NOT NULL, PRIMARY KEY(persona, session, hash)
          );
          DROP TABLE IF EXISTS candidates;
          PRAGMA user_version = 4;
        `)
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS persona_memory_settings (
            persona TEXT PRIMARY KEY REFERENCES personas(id), enabled INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS local_memory_migration (id INTEGER PRIMARY KEY CHECK(id = 1));
          CREATE TABLE IF NOT EXISTS memory_job_outputs (
            session TEXT NOT NULL, turn INTEGER NOT NULL, items TEXT NOT NULL, PRIMARY KEY(session, turn),
            FOREIGN KEY(session, turn) REFERENCES jobs(session, turn) ON DELETE CASCADE
          );
          CREATE TABLE IF NOT EXISTS memory_review_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            persona TEXT NOT NULL REFERENCES personas(id), workspace TEXT NOT NULL,
            session TEXT NOT NULL, turn INTEGER NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL,
            createdAt INTEGER NOT NULL, text TEXT NOT NULL, available INTEGER NOT NULL,
            UNIQUE(persona, session, turn)
          );
          CREATE INDEX IF NOT EXISTS memory_review_due ON memory_review_sources(available, persona, workspace);
          CREATE TABLE IF NOT EXISTS memory_core (
            persona TEXT NOT NULL REFERENCES personas(id), workspace TEXT NOT NULL, ids TEXT NOT NULL,
            PRIMARY KEY(persona, workspace)
          );
        `)
        const reviewCols = this.db.prepare('PRAGMA table_info(memory_review_sources)').all()
        if (!reviewCols.some(col => col.name === 'attempt')) {
          this.db.exec('ALTER TABLE memory_review_sources ADD COLUMN attempt INTEGER NOT NULL DEFAULT 0')
        }
        if (!this.db.prepare('SELECT 1 FROM local_memory_migration WHERE id = 1').get()) {
          const touched = new Set()
          for (const row of this.db.prepare('SELECT * FROM memories').iterate()) {
            touched.add(row.persona)
            if (this.memory.exists(row.persona, row.id)) continue
            this.memory.write(row.persona, row)
          }
          for (const persona of touched) this.rebuildMemoryIndex(persona)
          this.db.exec('INSERT INTO local_memory_migration VALUES (1)')
        }
      })
    } catch (error) {
      this.db.close()
      throw error
    }
  }

  close() { this.db.close() }

  transaction(work) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = work()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  personas() {
    return this.db.prepare('SELECT id, name, instructions, COALESCE(enabled, 1) AS autoMemory ' +
      'FROM personas LEFT JOIN persona_memory_settings ON persona = id ORDER BY name, id').all()
      .map(row => ({ ...row, autoMemory: Boolean(row.autoMemory) }))
  }

  persona(id) {
    return this.db.prepare('SELECT id, name, instructions FROM personas WHERE id = ?').get(id)
  }

  autoMemory(persona) {
    return this.db.prepare('SELECT enabled FROM persona_memory_settings WHERE persona = ?').get(persona)?.enabled !== 0
  }

  setAutoMemory(persona, enabled) {
    if (!this.persona(persona) || typeof enabled !== 'boolean') throw new Error('无效的记忆设置')
    this.transaction(() => {
      this.db.prepare('INSERT INTO persona_memory_settings VALUES (?, ?) ON CONFLICT(persona) DO UPDATE SET enabled = excluded.enabled')
        .run(persona, Number(enabled))
      if (!enabled) {
        this.db.prepare('DELETE FROM jobs WHERE persona = ?').run(persona)
        this.db.prepare('DELETE FROM memory_review_sources WHERE persona = ?').run(persona)
      }
    })
  }

  savePersona(id, name, instructions) {
    name = clean(name, 48)
    if (!name) throw new Error('请填写人格名称')
    if (id && instructions === undefined) {
      const result = this.db.prepare('UPDATE personas SET name = ? WHERE id = ?').run(name, id)
      if (!result.changes) throw new Error('人格不存在')
      return id
    }
    instructions = clean(instructions, 3500)
    if (id) {
      const result = this.db.prepare('UPDATE personas SET name = ?, instructions = ?, ' +
        'revision = revision + (instructions <> ?) WHERE id = ?').run(name, instructions, instructions, id)
      if (!result.changes) throw new Error('人格不存在')
      return id
    }
    id = randomUUID()
    this.db.prepare('INSERT INTO personas (id, name, instructions) VALUES (?, ?, ?)').run(id, name, instructions)
    return id
  }

  personaFor(session) {
    return this.db.prepare('SELECT p.id, p.name, b.instructions, b.revision FROM bindings b ' +
      'JOIN personas p ON p.id = b.persona WHERE b.session = ?').get(session)
  }

  boundSessions(persona) {
    return new Set(this.db.prepare('SELECT session FROM bindings WHERE persona = ?').all(persona).map(row => row.session))
  }

  bindingsMap() {
    const rows = this.db.prepare(
      'SELECT b.session, b.persona, p.name FROM bindings b JOIN personas p ON p.id = b.persona',
    ).all()
    return new Map(rows.map(row => [row.session, { persona: row.persona, name: row.name }]))
  }

  bind(session, persona) {
    if (persona === '') {
      this.db.prepare('DELETE FROM bindings WHERE session = ?').run(session)
      return
    }
    const result = this.db.prepare('INSERT INTO bindings (session, persona, instructions, revision) ' +
      'SELECT ?, id, instructions, revision FROM personas WHERE id = ? ON CONFLICT(session) DO UPDATE SET ' +
      'persona = excluded.persona, instructions = excluded.instructions, revision = excluded.revision').run(session, persona)
    if (!result.changes) throw new Error('人格不存在')
  }

  refreshBinding(session) {
    this.db.prepare('UPDATE bindings SET instructions = p.instructions, revision = p.revision ' +
      'FROM personas p WHERE bindings.session = ? AND p.id = bindings.persona AND bindings.revision <> p.revision')
      .run(session)
  }

  enqueue(job) {
    const now = Date.now()
    return this.db.prepare(
      'INSERT OR IGNORE INTO jobs (session, turn, persona, workspace, provider, model, input, available, created, source, chunk_hash) ' +
      'SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS ' +
      '(SELECT 1 FROM persona_memory_settings WHERE persona = ? AND enabled = 0)',
    ).run(job.session, job.turn, job.persona, job.workspace,
      job.provider, job.model, job.input, now, now, job.source ?? 'turn', job.chunk_hash ?? null, job.persona).changes > 0
  }

  isImported(persona, session, hash) {
    return Boolean(
      this.db.prepare(
        'SELECT 1 FROM imported_chunks WHERE persona = ? AND session = ? AND hash = ?',
      ).get(persona, session, hash) ||
      this.db.prepare(
        'SELECT 1 FROM jobs WHERE persona = ? AND session = ? AND chunk_hash = ?',
      ).get(persona, session, hash),
    )
  }

  nextImportTurn(session) {
    const row = this.db.prepare(
      'SELECT COALESCE(MIN(turn), 0) - 1 AS turn FROM jobs WHERE session = ? AND turn < 0',
    ).get(session)
    return row?.turn ?? -1
  }

  markImported(persona, session, hash) {
    this.db.prepare(
      'INSERT OR IGNORE INTO imported_chunks (persona, session, hash, created) VALUES (?, ?, ?, ?)',
    ).run(persona, session, hash, Date.now())
  }

  importProgress(persona) {
    const pendingRow = this.db.prepare(
      "SELECT COUNT(*) AS count FROM jobs WHERE source = 'import' AND persona = ? AND attempt < 3",
    ).get(persona)
    const failedRow = this.db.prepare(
      'SELECT COUNT(*) AS count FROM jobs WHERE persona = ? AND attempt >= 3',
    ).get(persona)
    return { pending: pendingRow?.count ?? 0, failed: failedRow?.count ?? 0 }
  }

  retryFailed(persona = '', fallbackModel = null) {
    const now = Date.now()
    if (fallbackModel?.provider && fallbackModel?.model) {
      if (persona) {
        return this.db.prepare(
          'UPDATE jobs SET attempt = 0, lease = NULL, available = ?, provider = ?, model = ? WHERE persona = ? AND attempt >= 3',
        ).run(now, fallbackModel.provider, fallbackModel.model, persona).changes
      }
      return this.db.prepare(
        'UPDATE jobs SET attempt = 0, lease = NULL, available = ?, provider = ?, model = ? WHERE attempt >= 3',
      ).run(now, fallbackModel.provider, fallbackModel.model).changes
    }
    if (persona) {
      return this.db.prepare(
        'UPDATE jobs SET attempt = 0, lease = NULL, available = ? WHERE persona = ? AND attempt >= 3',
      ).run(now, persona).changes
    }
    return this.db.prepare(
      'UPDATE jobs SET attempt = 0, lease = NULL, available = ? WHERE attempt >= 3',
    ).run(now).changes
  }

  dismissFailed(persona = '') {
    if (persona) {
      return this.db.prepare('DELETE FROM jobs WHERE persona = ? AND attempt >= 3').run(persona).changes
    }
    return this.db.prepare('DELETE FROM jobs WHERE attempt >= 3').run().changes
  }

  nextJob() {
    return this.transaction(() => {
      const now = Date.now()
      const job = this.db.prepare(
        "SELECT * FROM jobs WHERE attempt < 3 AND available <= ? ORDER BY (source = 'turn') DESC, available, session, turn LIMIT 1",
      ).get(now)
      if (!job) return undefined
      const lease = randomUUID()
      this.db.prepare('UPDATE jobs SET lease = ?, available = ? WHERE session = ? AND turn = ?')
        .run(lease, now + 60000, job.session, job.turn)
      return { ...job, lease }
    })
  }

  fail(job) {
    if (job.attempt >= 2) {
      this.db.prepare('UPDATE jobs SET attempt = 3, lease = NULL, available = 0 WHERE session = ? AND turn = ? AND lease = ?')
        .run(job.session, job.turn, job.lease)
      return
    }
    this.db.prepare('UPDATE jobs SET attempt = attempt + 1, lease = NULL, available = ? WHERE session = ? AND turn = ? AND lease = ?')
      .run(Date.now() + (job.attempt + 1) * 15000, job.session, job.turn, job.lease)
  }

  saveExtractedMemories({ persona, session, turn, workspace, created, items, source = 'turn' }) {
    const notes = this.memory.list(persona)
    let saved = 0
    for (const item of items.slice(0, 4)) {
      if (!item || typeof item !== 'object' || !kinds.has(item.kind)) continue
      const topic = clean(item.topic, 100).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ')
      if (!topic) continue
      let text
      try { text = memoryText(item) } catch { continue }
      const scope = item.kind === 'preference' ? '' : workspace
      const key = note => note.topic === topic && note.kind === item.kind && note.workspace === scope
      const previous = notes.find(key)
      const operationId = createHash('sha256').update(JSON.stringify([session, turn, created, source, item.kind, topic, scope])).digest('hex')
      if (previous && (previous.deleted || previous.manual || previous.operationId === operationId || previous.updated > created ||
          (previous.title === text.title && previous.summary === text.summary && previous.detail === text.detail))) continue
      if (item.expectedRevision !== undefined && item.expectedRevision !== (previous?.revision ?? null)) continue
      const id = previous?.id ?? createHash('sha256').update(JSON.stringify([persona, item.kind, topic, scope])).digest('hex')
      if (!previous && this.memory.exists(persona, id)) continue
      const note = { ...text, id, topic, kind: item.kind, session, turn, workspace: scope, updated: created, source,
        operationId, evidence: clean(item.evidence, 300), manual: false }
      this.memory.write(persona, note)
      notes.unshift(note)
      saved++
    }
    this.rebuildMemoryIndex(persona)
    return saved
  }

  preparedItems(job) {
    const row = this.db.prepare('SELECT items FROM memory_job_outputs WHERE session = ? AND turn = ?').get(job.session, job.turn)
    return row ? JSON.parse(row.items) : undefined
  }

  ownsJob(job) {
    return this.db.prepare('SELECT 1 FROM jobs WHERE session = ? AND turn = ? AND lease = ?')
      .get(job.session, job.turn, job.lease)
  }

  finish(job, items) {
    // Save the exact decisions before the first file write so a retry replays them.
    if (!this.ownsJob(job)) return
    this.db.prepare('INSERT OR IGNORE INTO memory_job_outputs (session, turn, items) ' +
      'SELECT session, turn, ? FROM jobs WHERE session = ? AND turn = ? AND lease = ?')
      .run(JSON.stringify(items), job.session, job.turn, job.lease)
    this.transaction(() => {
      if (!this.ownsJob(job)) return
      const source = job.source ?? 'turn'
      if (this.personaFor(job.session)?.id === job.persona && this.autoMemory(job.persona)) {
        this.saveExtractedMemories({
          persona: job.persona, session: job.session, turn: job.turn,
          workspace: job.workspace, created: job.created, items: this.preparedItems(job), source,
        })
        if (source === 'turn') this.recordReviewSource(job)
        if (source === 'import' && job.chunk_hash) this.markImported(job.persona, job.session, job.chunk_hash)
      }
      this.db.prepare('DELETE FROM jobs WHERE session = ? AND turn = ? AND lease = ?').run(job.session, job.turn, job.lease)
    })
  }

  recordReviewSource(job) {
    const user = clean(JSON.parse(job.input).user, 1200)
    if (!user) return
    this.db.prepare('INSERT OR IGNORE INTO memory_review_sources ' +
      '(persona, workspace, session, turn, provider, model, createdAt, text, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(job.persona, job.workspace, job.session, job.turn, job.provider, job.model, job.created, user, Date.now() + 300000)
    this.db.prepare('DELETE FROM memory_review_sources WHERE persona = ? AND workspace = ? AND id IN (' +
      'SELECT id FROM memory_review_sources WHERE persona = ? AND workspace = ? ORDER BY id DESC LIMIT -1 OFFSET 24)')
      .run(job.persona, job.workspace, job.persona, job.workspace)
  }

  nextReview(active, now = Date.now()) {
    return this.transaction(() => {
      this.db.prepare('DELETE FROM memory_review_sources WHERE attempt >= 3').run()
      const candidates = this.db.prepare('SELECT persona, workspace, MIN(available) AS due ' +
        'FROM memory_review_sources WHERE attempt < 3 GROUP BY persona, workspace HAVING due <= ? ORDER BY due').all(now)
      const group = candidates.find(row => !active.has(row.persona))
      if (!group) return undefined
      const sources = this.db.prepare('SELECT * FROM memory_review_sources WHERE persona = ? AND workspace = ? AND attempt < 3 ORDER BY id LIMIT 12')
        .all(group.persona, group.workspace)
      const available = now + 120000
      this.db.prepare('UPDATE memory_review_sources SET available = MAX(available, ?) WHERE persona = ? AND workspace = ?')
        .run(available, group.persona, group.workspace)
      return { ...group, sources, available }
    })
  }

  failReview(batch) {
    return this.transaction(() => {
      const bump = this.db.prepare('UPDATE memory_review_sources SET attempt = attempt + 1 WHERE id = ?')
      for (const source of batch.sources) bump.run(source.id)
      this.db.prepare('DELETE FROM memory_review_sources WHERE attempt >= 3').run()
    })
  }

  finishReview(batch, apply) {
    return this.transaction(() => {
      const read = this.db.prepare('SELECT available FROM memory_review_sources WHERE id = ?')
      const first = batch.sources[0]
      if (!this.autoMemory(batch.persona) || read.get(first.id)?.available !== Math.max(first.available, batch.available)) return
      apply()
      const remove = this.db.prepare('DELETE FROM memory_review_sources WHERE id = ?')
      for (const source of batch.sources) remove.run(source.id)
      this.db.prepare('UPDATE memory_review_sources SET available = MIN(available, ?) WHERE persona = ? AND workspace = ?')
        .run(Date.now() + 300000, batch.persona, batch.workspace)
    })
  }

  coreIds(persona, workspace) {
    if (workspace === undefined) {
      return [...new Set(
        this.db.prepare('SELECT ids FROM memory_core WHERE persona = ? ORDER BY workspace').all(persona)
          .flatMap(row => JSON.parse(row.ids)),
      )]
    }
    const row = this.db.prepare('SELECT ids FROM memory_core WHERE persona = ? AND workspace = ?').get(persona, workspace)
    return row ? JSON.parse(row.ids) : []
  }

  saveCore(persona, workspace, ids) {
    this.db.prepare('INSERT INTO memory_core VALUES (?, ?, ?) ON CONFLICT(persona, workspace) DO UPDATE SET ids = excluded.ids')
      .run(persona, workspace, JSON.stringify(ids.slice(0, 4)))
    this.rebuildMemoryIndex(persona)
  }

  rebuildMemoryIndex(persona) {
    const ids = this.db.prepare('SELECT ids FROM memory_core WHERE persona = ? ORDER BY workspace').all(persona)
      .flatMap(row => JSON.parse(row.ids))
    this.memory.rebuild(persona, ids)
  }

  mergeDuplicate(persona, keep, duplicate) {
    const current = this.detail(persona, keep.id)
    const other = this.detail(persona, duplicate.id)
    if (!current || !other || current.id === other.id || other.manual ||
        current.revision !== keep.revision || other.revision !== duplicate.revision ||
        current.kind !== other.kind || current.workspace !== other.workspace ||
        current.summary !== other.summary || current.detail !== other.detail) return false
    this.memory.write(persona, { ...other, deleted: true, updated: Date.now() })
    return true
  }

  addManual(persona, value) {
    if (!persona || !this.persona(persona)) throw new Error('人格不存在')
    const { title, summary, detail } = memoryText(value)
    const kind = kinds.has(value?.kind) ? value.kind : 'fact'
    const now = Date.now()
    const id = 'manual-' + randomUUID()
    const topic = clean(value?.topic || title, 100).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ') || id
    return this.transaction(() => {
      const note = {
        id,
        kind,
        topic,
        title,
        summary,
        detail,
        session: 'manual',
        turn: 0,
        workspace: '',
        updated: now,
        source: 'manual',
        operationId: randomUUID(),
        evidence: '',
        manual: true,
      }
      this.memory.write(persona, note)
      this.rebuildMemoryIndex(persona)
      return id
    })
  }

  edit(persona, id, value) {
    const { title, summary, detail } = memoryText(value)
    this.transaction(() => {
      const current = this.detail(persona, id)
      if (!current) throw new Error('长期记忆不存在')
      if (value.revision !== undefined && value.revision !== current.revision) throw new Error('记忆已更新，请刷新后重试')
      this.memory.write(persona, { ...current, title, summary, detail, updated: Date.now(), manual: true, evidence: '' })
      this.rebuildMemoryIndex(persona)
    })
  }

  rows(persona, workspace) {
    if (!persona || !this.persona(persona)) return []
    return this.memory.list(persona).filter(row => !row.deleted &&
      (workspace === undefined || row.workspace === workspace || row.workspace === ''))
      .slice(0, LIMIT)
  }

  topics(persona, workspace, limit = 12) {
    return this.rows(persona, workspace).slice(0, limit)
      .map(({ id, kind, topic, title, summary, workspace, revision }) => ({ id, kind, topic, title, summary, workspace, revision }))
  }

  catalog(persona, workspace, limit = 16) {
    const selected = this.coreIds(persona, workspace)
    const rows = this.rows(persona, workspace)
    const core = selected.map(id => rows.find(note => note.id === id)).filter(Boolean)
    const entries = rows.filter(note => !selected.includes(note.id))
    return [...core, ...entries].slice(0, limit).map(({ id, kind, topic, title, summary }) =>
      ({ id, kind, topic, title, ...(selected.includes(id) ? { core: true, summary } : {}) }))
  }

  detail(persona, id, workspace) {
    if (!isMemoryId(persona) || !isMemoryId(id) || !this.persona(persona)) return undefined
    const row = this.memory.read(persona, id)
    if (row && !row.deleted && (workspace === undefined || row.workspace === '' || row.workspace === workspace)) return row
  }

  recall(persona, workspace, query, session, { scoped = true } = {}) {
    const text = clean(query, 300)
    if (!text) return []
    const previous = /(?:继续|接着|接续)(?:聊|做)?(?:上次|上一轮|之前)|上(?:一|个|一个)\s*(?:会话|对话|session)|最近(?:一次|的)?\s*(?:会话|对话|session)|\b(?:previous|last) (?:session|chat|conversation)\b/iu
    if (!previous.test(text)) return this.search(persona, workspace, text, { scoped }).slice(0, 4)
    const rows = this.rows(persona, scoped ? workspace : undefined)
    const last = rows.find(row => row.session !== session)?.session
    return rows.filter(row => row.session === last)
      .sort((a, b) => Number(b.kind === 'progress') - Number(a.kind === 'progress')).slice(0, 4)
  }

  search(persona, workspace, query = '', { scoped = false, limit = 8 } = {}) {
    const needle = clean(query, 300).normalize('NFKC').toLowerCase()
    const terms = tokens(needle)
    const references = needle.match(/[\p{L}\p{N}_]+(?:[-./:#][\p{L}\p{N}_]+)+/gu) ?? []
    const numbers = needle.match(/\d+/g) ?? []
    const rows = this.rows(persona, scoped ? workspace : undefined)
    if (!needle) return rows.sort((a, b) => Number(b.workspace === workspace) - Number(a.workspace === workspace)).slice(0, limit)
    return rows.map(row => {
      const value = [row.topic, row.title, row.summary, row.detail].join(' ').normalize('NFKC').toLowerCase()
      const valueNumbers = new Set(value.match(/\d+/g) ?? [])
      const indexed = tokens(value)
      let overlap = 0
      for (const term of terms) if (indexed.has(term)) overlap++
      const indexedReferences = value.match(/[\p{L}\p{N}_]+(?:[-./:#][\p{L}\p{N}_]+)+/gu) ?? []
      let score = value.includes(needle) ? 4 :
        references.some(reference => indexedReferences.includes(reference)) ? 2 : overlap / Math.max(1, terms.size)
      if (numbers.length > 0) {
        const matched = numbers.filter(number => valueNumbers.has(number)).length
        if (matched === 0) score *= 0.5
        else if (matched === numbers.length) score += 0.2
      }
      return { row, score }
    }).filter(result => result.score >= 0.34)
      .sort((a, b) => b.score - a.score || Number(b.row.workspace === workspace) - Number(a.row.workspace === workspace))
      .slice(0, limit).map(result => result.row)
  }

  forget(persona, id, revision) {
    return this.transaction(() => {
      const current = this.detail(persona, id)
      if (!current) return false
      if (revision !== undefined && revision !== current.revision) throw new Error('记忆已更新，请刷新后重试')
      this.memory.write(persona, { ...current, deleted: true, updated: Date.now() })
      this.rebuildMemoryIndex(persona)
      return true
    })
  }
}
