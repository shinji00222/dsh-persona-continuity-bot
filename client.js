window.__ModuleLoader__.load({
  id: 'dsh-persona-continuity',
  factory(require) {
    const React = require('react')
    const { createElement: h, useEffect, useId, useState } = React
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    const { Button, Menu, Modal, Input } = primitives
    const Switch = primitives.Switch ?? (({ checked, label, disabled, onChange }) =>
      h('input', { type: 'checkbox', role: 'switch', checked, disabled, 'aria-label': label,
        onChange: event => onChange(event.target.checked) }))
    const Tag = primitives.Tag ?? 'span'
    const hiddenIcon = () => null
    const {
      IconChevronDownOutline14, IconChevronLeftOutline14, IconPlusOutline16,
      IconSearchOutline16, IconEditOutline16, IconTrashOutline16,
      IconLinkOutline14, IconRefreshOutline16, IconClockOutline16,
      IconCheckOutline16, IconUserOutline16,
    } = Object.fromEntries(Object.entries({
      IconChevronDownOutline14: 'IconChevronDownOutlineRegular',
      IconChevronLeftOutline14: 'IconChevronLeftOutlineRegular',
      IconPlusOutline16: 'IconPlusOutlineRegular',
      IconSearchOutline16: 'IconSearchOutlineRegular',
      IconEditOutline16: 'IconListPenOutlineRegular',
      IconTrashOutline16: 'IconDeleteOutlineRegular',
      IconLinkOutline14: 'IconLinkOutlineRegular',
      IconRefreshOutline16: 'IconRefreshOutlineRegular',
      IconClockOutline16: 'IconClockOutlineRegular',
      IconCheckOutline16: 'IconCheckOutlineRegular',
      IconUserOutline16: 'IconListPenOutlineRegular',
    }).map(([id, legacy]) => [id, primitives[id] ?? primitives[legacy] ?? hiddenIcon]))

    const base = 'api/persona-continuity'
    const changedEvent = 'persona-continuity:changed'
    const normalOption = '__normal__'
    const createOption = '__create__'

    async function call(path, data) {
      const headers = {}
      const options = { headers }
      if (data !== undefined) {
        options.method = 'POST'
        options.body = JSON.stringify(data)
        headers['content-type'] = 'application/json'
      }
      const response = await fetch(base + path, options)
      const result = await response.json().catch(() => null)
      if (!response.ok || result === null) {
        const error = new Error(result?.error || 'Request failed')
        error.status = response.status
        throw error
      }
      return result
    }

    const css = `
.dpm_root{display:grid;gap:16px;width:100%;max-width:680px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
.dpm_workspace{box-sizing:border-box;height:100%;overflow:auto;padding:clamp(16px,4vw,48px);color:var(--dsw-alias-label-primary)}
.dpm_workspaceTitle{margin:0 0 24px;font-size:24px;line-height:1.3;font-weight:600}
.dpm_workspaceGrid{display:grid;grid-template-columns:minmax(150px,220px) minmax(0,680px);gap:clamp(16px,3vw,32px);align-items:start}
.dpm_roster{display:grid;gap:6px;min-width:0}
.dpm_rosterButton{display:flex;align-items:center;gap:8px;min-width:0;text-align:left;padding:9px 12px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer}
.dpm_rosterButton:hover,.dpm_rosterButton[aria-pressed=true]{background:var(--dsw-alias-interactive-bg-hover)}
.dpm_rosterButton span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:680px){.dpm_workspaceGrid{grid-template-columns:minmax(0,1fr)}.dpm_roster{grid-template-columns:repeat(auto-fit,minmax(145px,1fr))}}
.dpm_toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-bottom:14px;border-bottom:0.5px solid var(--dsw-alias-border-l2)}
.dpm_toolbarLeft{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0;flex:1 1 220px}
.dpm_toolbarRight{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dpm_selectorBtn{display:inline-flex;align-items:center;gap:6px;height:36px;max-width:100%;padding:0 14px;border-radius:18px;border:none;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;font-weight:500;cursor:pointer;min-width:0}
.dpm_selectorBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dpm_selectorBtn:disabled{opacity:0.55;cursor:not-allowed}
.dpm_selectorText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.dpm_card{display:grid;gap:14px;padding:16px;border-radius:16px;border:0.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);min-width:0}
.dpm_cardHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;min-width:0}
.dpm_cardTitle{margin:0;font-size:15px;font-weight:500;line-height:22px;color:var(--dsw-alias-label-primary)}
.dpm_field{display:grid;gap:6px;min-width:0}
.dpm_label{font-size:13px;font-weight:500;line-height:20px;color:var(--dsw-alias-label-primary)}
.dpm_hint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);margin:0}
.dpm_textarea{box-sizing:border-box;width:100%;min-height:88px;padding:8px 12px;border-radius:8px;border:0.5px solid var(--dsw-alias-border-l4);background:var(--dsw-specific-input-major, var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:20px;resize:vertical;outline:none}
.dpm_textarea:focus{border-color:var(--dsw-alias-state-business-primary)}
.dpm_textarea:disabled{opacity:0.6;cursor:not-allowed}
.dpm_settingRow{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0 4px;border-top:0.5px solid var(--dsw-alias-border-l2)}
.dpm_settingInfo{display:grid;gap:2px;min-width:0;flex:1}
.dpm_actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dpm_statusText{font-size:12px;line-height:18px;color:var(--dsw-alias-state-success-primary);display:inline-flex;align-items:center;gap:4px}
.dpm_error{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}
.dpm_notice{margin:0;padding:8px 12px;border-radius:10px;font-size:12px;line-height:18px;background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-label-primary)}
.dpm_warnBanner{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 12px;border-radius:10px;background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-label);font-size:12px;line-height:18px}
.dpm_list{display:grid;gap:8px;min-width:0}
.dpm_item{display:grid;gap:6px;width:100%;text-align:left;padding:12px 14px;border-radius:12px;border:0.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-2);color:inherit;font:inherit;cursor:pointer;min-width:0;box-sizing:border-box}
.dpm_item:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l4)}
.dpm_item:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
.dpm_itemTop{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:0}
.dpm_itemTitle{font-size:14px;font-weight:500;line-height:20px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.dpm_itemSummary{font-size:13px;line-height:19px;color:var(--dsw-alias-label-secondary);margin:0;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dpm_meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);min-width:0}
.dpm_mono{font-family:var(--dsw-font-mono, monospace);font-size:11px;overflow-wrap:anywhere}
.dpm_detailBox{display:grid;gap:12px;padding:14px;border-radius:12px;border:0.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-2);min-width:0}
.dpm_detailBody{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:21px;color:var(--dsw-alias-label-primary)}
.dpm_sourceRow{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 12px;border-radius:10px;background:var(--dsw-alias-bg-module-platform);min-width:0}
.dpm_empty{margin:0;padding:20px 12px;text-align:center;font-size:13px;color:var(--dsw-alias-label-tertiary);border-radius:12px;border:0.5px dashed var(--dsw-alias-border-l3)}
.dpm_pickerBtn{max-width:clamp(80px, 16vw, 168px);padding:0 10px;border-radius:18px}
.dpm_select{box-sizing:border-box;height:36px;padding:0 10px;border-radius:8px;border:0.5px solid var(--dsw-alias-border-l4);background:var(--dsw-specific-input-major, var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none}
`
    const styleId = 'dsh-persona-continuity/styles'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(styleId) + ']') === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-persona-continuity'
      tag.dataset.pluginCss = styleId
      tag.textContent = css
      document.head.appendChild(tag)
    }

    const dictionaries = {
      zh: {
        title: '人格续忆',
        workspaceTitle: '人格工作台',
        normal: '普通会话',
        persona: '人格',
        selectPersona: '选择人格',
        new: '新建人格',
        newPersonaTitle: '新建人格',
        name: '名称',
        instructions: '人格设定',
        instructionsPlaceholder: '描述这个人格的身份、关注重点和记忆偏好…',
        close: '关闭',
        cancel: '取消',
        createAndUse: '创建并使用',
        namePlaceholder: '输入人格名称',
        rename: '重命名',
        renamePersona: '重命名人格',
        save: '保存人格',
        saved: '已保存',
        profileSection: '人格设定',
        autoMemory: '自动记忆',
        autoMemoryDesc: '对话结束后由该人格自主提炼或更新长期记忆，关闭后仅保留手动编辑与已有记忆。',
        index: '长期记忆',
        memoryCountSuffix: ' 条',
        search: '搜索记忆标题、摘要或内容…',
        forget: '删除记忆',
        confirmTitle: '删除长期记忆',
        confirm: '确定删除「{title}」？删除后将不再被该人格召回。',
        empty: '暂无匹配的长期记忆',
        emptyHint: '在对话中使用该人格，或从旧对话导入记忆。',
        source: '来源会话',
        turn: '轮次',
        turnNumber: '第 {n} 轮',
        openSource: '查看来源',
        sourceModalTitle: '记忆来源',
        sourceNotConnected: '无法读取该来源会话（可能已被删除或暂不可访问），以下为记录的来源元信息：',
        sourceTurnFallback: '暂未获取到该轮次原文内容。',
        backToList: '返回列表',
        scopeLabel: '项目范围',
        updatedAtLabel: '更新于',
        revisionPrefix: 'v',
        busy: '回复生成期间暂不可切换人格',
        lockedStarted: '对话开始后不能更换人格',
        bindOnceTitle: '确认绑定人格',
        confirmBind: '确认绑定',
        bindOnceConfirm: '绑定后本对话不能再更换人格，之前的对话内容会归入该人格。确定？',
        cannotImportBound: '（不可导入）',
        edit: '编辑',
        saveMemory: '保存记忆',
        memoryTitle: '标题',
        summary: '摘要',
        detail: '详情',
        loading: '加载中…',
        importHistory: '从旧对话导入',
        importHistoryTitle: '选择旧对话加入记忆',
        importAction: '绑定并提炼记忆',
        importing: '提炼中…',
        filterChats: '筛选旧对话标题',
        noChats: '暂无可导入的旧对话',
        unbound: '未绑定',
        instructionsHint: '修改后，已绑定的会话从下一轮起生效',
        queuedPrefix: '已排队 ',
        queuedMid: ' 段，跳过重复 ',
        queuedSuffix: ' 段',
        importDone: '记忆提炼完成',
        currentPersona: '当前人格',
        boundPrefix: '已绑定：',
        importedTurn: '导入',
        failedJobsPrefix: '有 ',
        failedJobsSuffix: ' 条记忆后台提炼失败',
        retryFailed: '重试失败项',
        dismissFailed: '清除失败项',
        dismissedNotice: '已清除失败任务',
        retriedPrefix: '已重新排队 ',
        retriedSuffix: ' 条失败任务',
        addMemory: '添加记忆',
        addMemoryTitle: '手动添加长期记忆',
        memoryKind: '类型',
        kind_preference: '偏好',
        kind_decision: '决定',
        kind_fact: '事实',
        kind_lesson: '经验',
        kind_progress: '进度',
        manualTag: '手动',
        createFirstHint: '先创建一个人格，即可开启跨会话记忆管理。',
        requestError: '无法读取人格记忆',
      },
      en: {
        title: 'Persona Continuity',
        workspaceTitle: 'Persona Workspace',
        normal: 'Standard chat',
        persona: 'Persona',
        selectPersona: 'Select persona',
        new: 'New persona',
        newPersonaTitle: 'New persona',
        name: 'Name',
        instructions: 'Persona instructions',
        instructionsPlaceholder: 'Describe this persona’s role, focus, and what it should remember…',
        close: 'Close',
        cancel: 'Cancel',
        createAndUse: 'Create and use',
        namePlaceholder: 'Enter a persona name',
        rename: 'Rename',
        renamePersona: 'Rename persona',
        save: 'Save persona',
        saved: 'Saved',
        profileSection: 'Persona profile',
        autoMemory: 'Auto memory',
        autoMemoryDesc: 'Automatically extract and update long-term memories after turns. Existing memories remain readable when off.',
        index: 'Long-term memory',
        memoryCountSuffix: '',
        search: 'Search memory title, summary, or content…',
        forget: 'Delete memory',
        confirmTitle: 'Delete memory',
        confirm: 'Delete “{title}”? It will no longer be recalled by this persona.',
        empty: 'No matching memories',
        emptyHint: 'Chat with this persona or import from past chats.',
        source: 'Source chat',
        turn: 'Turn',
        turnNumber: 'Turn {n}',
        openSource: 'View source',
        sourceModalTitle: 'Memory source',
        sourceNotConnected: 'Unable to load the source chat (it may have been deleted or is unavailable). Recorded metadata:',
        sourceTurnFallback: 'Source turn content is not available yet.',
        backToList: 'Back to list',
        scopeLabel: 'Scope',
        updatedAtLabel: 'Updated',
        revisionPrefix: 'v',
        busy: 'Persona cannot be switched while generating',
        lockedStarted: 'Persona can’t be changed after the chat starts',
        bindOnceTitle: 'Confirm persona binding',
        confirmBind: 'Confirm',
        bindOnceConfirm: 'Once bound, you cannot change the persona for this chat, and earlier messages will belong to it. Continue?',
        cannotImportBound: ' (cannot import)',
        edit: 'Edit',
        saveMemory: 'Save memory',
        memoryTitle: 'Title',
        summary: 'Summary',
        detail: 'Details',
        loading: 'Loading…',
        importHistory: 'Import from chats',
        importHistoryTitle: 'Import memories from past chats',
        importAction: 'Bind & extract',
        importing: 'Extracting…',
        filterChats: 'Filter past chats',
        noChats: 'No past chats found',
        unbound: 'Unbound',
        instructionsHint: 'Changes take effect on the next turn for bound chats',
        queuedPrefix: 'Queued ',
        queuedMid: ' chunks, skipped ',
        queuedSuffix: ' duplicates',
        importDone: 'Memory extraction complete',
        currentPersona: 'Current persona',
        boundPrefix: 'Bound to: ',
        importedTurn: 'Imported',
        failedJobsPrefix: '',
        failedJobsSuffix: ' background memory extraction(s) failed',
        retryFailed: 'Retry failed',
        dismissFailed: 'Dismiss',
        dismissedNotice: 'Cleared failed jobs',
        retriedPrefix: 'Re-queued ',
        retriedSuffix: ' failed job(s)',
        addMemory: 'Add memory',
        addMemoryTitle: 'Add long-term memory',
        memoryKind: 'Type',
        kind_preference: 'Preference',
        kind_decision: 'Decision',
        kind_fact: 'Fact',
        kind_lesson: 'Lesson',
        kind_progress: 'Progress',
        manualTag: 'Manual',
        createFirstHint: 'Create a persona to start managing cross-session memories.',
        requestError: 'Unable to load persona memories',
      },
    }

    const pickerStyle = { display: 'inline-flex', alignItems: 'center', minWidth: 0 }
    const labelStyle = { overflow: 'hidden', minWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
    const errorMessage = (error, t) => error ? h('p', { className: 'dpm_error', role: 'alert' }, error || t('requestError')) : null
    const statePath = id => '/state?session=' + encodeURIComponent(id ?? '')
    const queuedText = (t, result) =>
      t('queuedPrefix') + result.queuedChunks + t('queuedMid') + result.duplicateChunks + t('queuedSuffix')
    const formatText = (template, vars) => Object.entries(vars).reduce(
      (acc, [key, value]) => acc.replaceAll('{' + key + '}', String(value ?? '')),
      template,
    )

    function formatTime(value) {
      if (!value) return ''
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
    }

    function formatTurn(row, t) {
      if (row.turn === undefined || row.turn === null) return ''
      return Number(row.turn) < 0 ? t('importedTurn') : formatText(t('turnNumber'), { n: row.turn })
    }

    function shortRevision(revision) {
      const text = String(revision ?? '')
      return text.length > 8 ? text.slice(0, 7) : text
    }

    function useImportPoll(personaId, active, onDone) {
      useEffect(() => {
        if (!active || !personaId) return
        let live = true
        const timer = setInterval(() => {
          call('/history/import/status?persona=' + encodeURIComponent(personaId)).then(
            status => {
              if (live && status.pending === 0) onDone()
            },
            () => {},
          )
        }, 2000)
        return () => { live = false; clearInterval(timer) }
      }, [personaId, active])
    }

    function Picker({ sessionId, t }) {
      const [state, setState] = useState(null)
      const [pending, setPending] = useState(false)
      const [error, setError] = useState('')
      const [mode, setMode] = useState(null)
      const [name, setName] = useState('')
      const [renameId, setRenameId] = useState('')
      const [renamePoint, setRenamePoint] = useState(null)
      const [confirmBind, setConfirmBind] = useState(null)
      const formId = useId()

      useEffect(() => {
        if (!sessionId) return
        let live = true
        const refresh = () => call(statePath(sessionId)).then(
          value => { if (live) setState(value) },
          failure => { if (live) setError(failure.message) },
        )
        void refresh()
        window.addEventListener('focus', refresh)
        window.addEventListener(changedEvent, refresh)
        return () => {
          live = false
          window.removeEventListener('focus', refresh)
          window.removeEventListener(changedEvent, refresh)
        }
      }, [sessionId])

      const locked = Boolean(state?.locked)
      useEffect(() => {
        if (!sessionId || !state || locked) return
        let live = true
        const timers = new Set()
        const refresh = () => {
          if (!live) return
          call(statePath(sessionId)).then(
            value => { if (live) setState(value) },
            () => {},
          )
        }
        const scheduleRefresh = () => {
          for (const delay of [250, 1200]) {
            const id = setTimeout(() => {
              timers.delete(id)
              refresh()
            }, delay)
            timers.add(id)
          }
        }
        const onKeyDown = event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) scheduleRefresh()
        }
        const onClick = event => {
          if (!(event.target instanceof Element)) return
          if (event.target.closest('[data-persona-picker]')) return
          if (event.target.closest('button, [type="submit"]')) scheduleRefresh()
        }
        document.addEventListener('keydown', onKeyDown, true)
        document.addEventListener('click', onClick, true)
        const interval = setInterval(() => {
          if (!document.hidden) refresh()
        }, 3000)
        return () => {
          live = false
          document.removeEventListener('keydown', onKeyDown, true)
          document.removeEventListener('click', onClick, true)
          clearInterval(interval)
          for (const id of timers) clearTimeout(id)
        }
      }, [sessionId, Boolean(state), locked])

      if (!sessionId || !state) return errorMessage(error, t)

      async function select(id) {
        setMode(null)
        if (id === state.selected) return
        setPending(true)
        setError('')
        try {
          setState(await call('/bind', { session: sessionId, persona: id }))
          window.dispatchEvent(new Event(changedEvent))
        } catch (failure) {
          setError(failure.message)
        } finally {
          setPending(false)
        }
      }

      async function saveName(event) {
        event.preventDefault()
        const title = name.trim()
        if (pending || !title) return
        setPending(true)
        setError('')
        try {
          if (mode === 'rename') {
            await call('/persona', { id: renameId, name: title })
            setState(current => ({
              ...current,
              personas: current.personas.map(persona => persona.id === renameId ? { ...persona, name: title } : persona),
            }))
          } else if (state.bindOnce) {
            setPending(false)
            setMode(null)
            setConfirmBind({ kind: 'create', name: title })
            return
          } else {
            setState(await call('/create', { session: sessionId, name: title }))
          }
          setMode(null)
          window.dispatchEvent(new Event(changedEvent))
        } catch (failure) {
          setError(failure.message)
        } finally {
          setPending(false)
        }
      }

      function closeName() {
        if (pending) return
        setMode(null)
        setError('')
      }

      async function runConfirmedBind() {
        if (!confirmBind || pending) return
        const task = confirmBind
        setConfirmBind(null)
        setPending(true)
        setError('')
        try {
          if (task.kind === 'create') {
            setState(await call('/create', { session: sessionId, name: task.name }))
          } else {
            setState(await call('/bind', { session: sessionId, persona: task.id }))
          }
          window.dispatchEvent(new Event(changedEvent))
        } catch (failure) {
          setError(failure.message)
        } finally {
          setPending(false)
        }
      }

      const selected = state.personas.find(persona => persona.id === state.selected)
      const label = selected?.name ?? t('normal')
      const renaming = mode === 'rename'
      const canOpen = Boolean(state.editable || state.bindOnce)
      const tooltip = canOpen ? label : state.locked ? t('lockedStarted') : t('busy')

      function openRenameMenu(event) {
        if (pending || !(event.target instanceof Element)) return
        const row = event.target.closest('[role="menuitem"], [data-persona-picker]')
        const target = row?.querySelector('[data-persona-id]')?.dataset.personaId
        const persona = state.personas.find(item => item.id === target)
        if (!persona) return
        event.preventDefault()
        event.stopPropagation()
        const rect = row.getBoundingClientRect()
        setRenamePoint(event.clientX || event.clientY
          ? { x: event.clientX, y: event.clientY }
          : { x: rect.left, y: rect.bottom })
        setRenameId(persona.id)
        setName(persona.name)
        setError('')
        setMode('context')
      }

      return h('div', {
        style: pickerStyle,
        onContextMenu: openRenameMenu,
        onKeyDownCapture: event => {
          if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) openRenameMenu(event)
        },
      },
        h(Menu, {
          open: mode === 'menu',
          onClose: () => setMode(current => current === 'menu' ? null : current),
          items: [
            ...(!state.bindOnce ? [{ id: normalOption, label: t('normal') }] : []),
            { id: createOption, label: t('new'), icon: h(IconPlusOutline16, { size: 16, 'aria-hidden': true }) },
            ...state.personas.map(persona => ({
              id: persona.id, label: h('span', { 'data-persona-id': persona.id }, persona.name),
            })),
          ],
          selectedId: state.selected || normalOption,
          onSelect: id => {
            if (id !== createOption) {
              const targetId = id === normalOption ? '' : id
              if (state.bindOnce && targetId) {
                setMode(null)
                setConfirmBind({ kind: 'bind', id: targetId })
              } else {
                void select(targetId)
              }
              return
            }
            setName('')
            setError('')
            setMode('create')
          },
          align: 'start', portal: true,
          anchor: h(Button, {
            size: 'sm', variant: 'ghost', type: 'button', className: 'dpm_pickerBtn',
            'aria-label': t('persona') + '：' + label, 'aria-haspopup': 'menu', 'aria-expanded': mode === 'menu',
            title: tooltip,
            disabled: pending,
            'aria-disabled': !canOpen,
            'data-persona-picker': '',
            onPointerEnter: () => {
              if (state.locked || pending) return
              void call(statePath(sessionId)).then(setState, () => {})
            },
            onClick: async () => {
              if (mode === 'menu') {
                setMode(null)
                return
              }
              if (!canOpen || pending) return
              setError('')
              setPending(true)
              try {
                const latest = await call(statePath(sessionId))
                setState(latest)
                if (latest.editable || latest.bindOnce) setMode('menu')
              } catch (failure) {
                setError(failure.message)
              } finally {
                setPending(false)
              }
            },
          },
          h('span', { style: labelStyle, 'data-persona-id': selected?.id }, label),
          h(IconChevronDownOutline14, { size: 14, 'aria-hidden': true })),
        }),
        h(Menu, {
          anchor: null, anchorPoint: renamePoint, contextual: true, portal: true, autoFocus: true,
          open: mode === 'context', items: [{ id: 'rename', label: t('rename') }],
          onClose: () => setMode(current => current === 'context' ? null : current),
          onSelect: () => setMode('rename'),
        }),
        mode !== 'create' && !renaming && errorMessage(error, t),
        h(Modal, {
          title: t(renaming ? 'renamePersona' : 'new'), closeLabel: t('close'),
          open: mode === 'create' || renaming, onClose: closeName,
          footer: h(React.Fragment, null,
            h(Button, { variant: 'outline', disabled: pending, onClick: closeName }, t('cancel')),
            h(Button, { variant: 'primary', type: 'submit', form: formId, disabled: pending || !name.trim() },
              t(renaming ? 'rename' : 'createAndUse'))),
        },
        h('form', { id: formId, onSubmit: saveName, style: { display: 'grid', gap: 8 } },
          h(Input, {
            'aria-label': t('name'), 'data-modal-autofocus': '', placeholder: t('namePlaceholder'),
            value: name, required: true, maxLength: 48, onChange: event => setName(event.target.value),
          }),
          errorMessage(error, t),
        )),
        h(Modal, {
          title: t('bindOnceTitle'), closeLabel: t('close'),
          open: Boolean(confirmBind), onClose: () => { if (!pending) setConfirmBind(null) },
          footer: h(React.Fragment, null,
            h(Button, { variant: 'outline', disabled: pending, onClick: () => setConfirmBind(null) }, t('cancel')),
            h(Button, { variant: 'primary', disabled: pending, onClick: () => { void runConfirmedBind() } }, t('confirmBind'))),
        }, h('p', { style: { margin: 0 } }, t('bindOnceConfirm'))),
      )
    }

    function SourceModal({ open, onClose, row, personaId, t }) {
      const [sourceData, setSourceData] = useState(null)
      const [loading, setLoading] = useState(false)
      const [stubNote, setStubNote] = useState(false)

      useEffect(() => {
        if (!open || !row?.session) return
        let live = true
        setLoading(true)
        setStubNote(false)
        setSourceData(null)
        call('/history/source?persona=' + encodeURIComponent(personaId) +
          '&session=' + encodeURIComponent(row.session) +
          '&turn=' + encodeURIComponent(row.turn ?? ''))
          .then(
            data => { if (live) setSourceData(data) },
            () => { if (live) setStubNote(true) },
          )
          .finally(() => { if (live) setLoading(false) })
        return () => { live = false }
      }, [open, personaId, row?.session, row?.turn])

      return h(Modal, {
        title: t('sourceModalTitle'), closeLabel: t('close'), open, onClose,
        footer: h(Button, { variant: 'primary', onClick: onClose }, t('close')),
      },
      row && h('div', { style: { display: 'grid', gap: 10 } },
        stubNote && h('p', { className: 'dpm_notice' }, t('sourceNotConnected')),
        h('div', { className: 'dpm_sourceRow' },
          h('div', { style: { display: 'grid', gap: 2, minWidth: 0 } },
            h('span', { className: 'dpm_label' }, sourceData?.title || row.sessionTitle || t('source')),
            h('span', { className: 'dpm_mono' }, row.session)),
          row.turn !== undefined && row.turn !== null && h(Tag, null, formatTurn(row, t))),
        loading && h('p', { className: 'dpm_hint' }, t('loading')),
        sourceData?.excerpt
          ? h('p', { className: 'dpm_detailBody' }, sourceData.excerpt)
          : !loading && h('p', { className: 'dpm_hint' }, t('sourceTurnFallback')),
      ))
    }

    function MemoryDetail({ row, personaId, t, onBack, onOpenSource, mutate }) {
      const [editing, setEditing] = useState(false)
      const [edits, setEdits] = useState({ title: row.title, summary: row.summary, detail: row.detail })
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const [confirmDelete, setConfirmDelete] = useState(false)

      useEffect(() => {
        setEdits({ title: row.title, summary: row.summary, detail: row.detail })
        setEditing(false)
        setError('')
      }, [row.id, row.title, row.summary, row.detail, row.revision])

      async function submit(path, value) {
        if (busy) return
        setBusy(true)
        setError('')
        try {
          await mutate(path, {
            id: row.id,
            edits: value,
            revision: row.revision,
          })
          setEditing(false)
          if (path === '/forget') {
            setConfirmDelete(false)
            onBack()
          }
        } catch (failure) {
          setError(failure.message)
        } finally {
          setBusy(false)
        }
      }

      const turnLabel = formatTurn(row, t)
      const updatedLabel = formatTime(row.updated ?? row.updatedAt)
      const workspaceLabel = row.workspace || row.workspaceKey

      return h('div', { className: 'dpm_detailBox' },
        h('div', { className: 'dpm_cardHeader' },
          h(Button, { size: 'sm', variant: 'ghost', type: 'button', disabled: busy, onClick: onBack },
            h(IconChevronLeftOutline14, { size: 14, 'aria-hidden': true }),
            t('backToList')),
          h('div', { className: 'dpm_meta' },
            workspaceLabel && h(Tag, null, workspaceLabel),
          ),
        ),
        editing ? h('form', {
          style: { display: 'grid', gap: 10 },
          onSubmit: event => {
            event.preventDefault()
            void submit('/edit', edits)
          },
        },
        h('label', { className: 'dpm_field' },
          h('span', { className: 'dpm_label' }, t('memoryTitle')),
          h(Input, {
            value: edits.title, required: true, maxLength: 90, disabled: busy,
            onChange: event => setEdits({ ...edits, title: event.target.value }),
          })),
        h('label', { className: 'dpm_field' },
          h('span', { className: 'dpm_label' }, t('summary')),
          h(Input, {
            value: edits.summary, required: true, maxLength: 160, disabled: busy,
            onChange: event => setEdits({ ...edits, summary: event.target.value }),
          })),
        h('label', { className: 'dpm_field' },
          h('span', { className: 'dpm_label' }, t('detail')),
          h('textarea', {
            className: 'dpm_textarea', rows: 6, maxLength: 1800, required: true, disabled: busy,
            value: edits.detail, onChange: event => setEdits({ ...edits, detail: event.target.value }),
          })),
        h('div', { className: 'dpm_actions' },
          h(Button, { size: 'sm', variant: 'primary', type: 'submit', disabled: busy }, t('saveMemory')),
          h(Button, {
            size: 'sm', variant: 'outline', type: 'button', disabled: busy,
            onClick: () => { setEditing(false); setError('') },
          }, t('cancel')),
        ),
        ) : h(React.Fragment, null,
          h('div', { style: { display: 'grid', gap: 4 } },
            h('h4', { className: 'dpm_cardTitle' }, row.title),
            h('p', { className: 'dpm_hint' }, row.summary),
          ),
          h('p', { className: 'dpm_detailBody' }, row.detail),
          h('div', { className: 'dpm_sourceRow' },
            h('div', { style: { display: 'grid', gap: 2, minWidth: 0 } },
              h('span', { className: 'dpm_meta' },
                t('source') + ': ' + (row.sessionTitle || row.session),
                turnLabel ? ' · ' + turnLabel : ''),
              updatedLabel && h('span', { className: 'dpm_meta' },
                h(IconClockOutline16, { size: 12, 'aria-hidden': true }),
                t('updatedAtLabel') + ' ' + updatedLabel),
            ),
            row.session && h(Button, {
              size: 'sm', variant: 'outline', type: 'button',
              onClick: () => onOpenSource(row),
            },
            h(IconLinkOutline14, { size: 14, 'aria-hidden': true }),
            t('openSource')),
          ),
          h('div', { className: 'dpm_actions' },
            h(Button, { size: 'sm', variant: 'outline', type: 'button', disabled: busy, onClick: () => setEditing(true) },
              h(IconEditOutline16, { size: 14, 'aria-hidden': true }),
              t('edit')),
            h(Button, { size: 'sm', variant: 'outline', type: 'button', disabled: busy, onClick: () => setConfirmDelete(true) },
              h(IconTrashOutline16, { size: 14, 'aria-hidden': true }),
              t('forget')),
          ),
        ),
        errorMessage(error, t),
        h(Modal, {
          title: t('confirmTitle'), closeLabel: t('close'),
          open: confirmDelete, onClose: () => { if (!busy) setConfirmDelete(false) },
          footer: h(React.Fragment, null,
            h(Button, { variant: 'outline', disabled: busy, onClick: () => setConfirmDelete(false) }, t('cancel')),
            h(Button, { variant: 'primary', disabled: busy, onClick: () => { void submit('/forget') } }, t('forget'))),
        }, h('p', { style: { margin: 0 } }, formatText(t('confirm'), { title: row.title }))),
      )
    }

    function HistoryImportModal({ id, t, open, onClose, onImported }) {
      const [sessions, setSessions] = useState(null)
      const [selected, setSelected] = useState([])
      const [filter, setFilter] = useState('')
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')

      useEffect(() => {
        if (!open) return
        let live = true
        setSessions(null)
        setSelected([])
        setFilter('')
        setError('')
        call('/history/sessions').then(
          value => { if (live) setSessions(value) },
          failure => { if (live) setError(failure.message) },
        )
        return () => { live = false }
      }, [open, id])

      function toggle(sessionId) {
        setSelected(current => current.includes(sessionId)
          ? current.filter(item => item !== sessionId)
          : [...current, sessionId])
      }

      async function submitImport() {
        if (!selected.length || busy) return
        setBusy(true)
        setError('')
        try {
          const result = await call('/history/import', { persona: id, sessions: selected })
          window.dispatchEvent(new Event(changedEvent))
          onImported(result)
          onClose()
        } catch (failure) {
          setError(failure.message)
        } finally {
          setBusy(false)
        }
      }

      const needle = filter.trim().toLowerCase()
      const visible = (sessions ?? []).filter(item =>
        !needle || item.title.toLowerCase().includes(needle) || item.personaName.toLowerCase().includes(needle))

      return h(Modal, {
        title: t('importHistoryTitle'), closeLabel: t('close'), open,
        onClose: () => { if (!busy) onClose() },
        footer: h(React.Fragment, null,
          h(Button, { variant: 'outline', disabled: busy, onClick: onClose }, t('cancel')),
          h(Button, { variant: 'primary', disabled: busy || !selected.length, onClick: submitImport },
            busy ? t('importing') : t('importAction') + (selected.length ? ' (' + selected.length + ')' : ''))),
      }, h('div', { style: { display: 'grid', gap: 10 } },
        h(Input, {
          type: 'search', placeholder: t('filterChats'), value: filter, maxLength: 100, disabled: busy,
          onChange: event => setFilter(event.target.value),
        }),
        sessions === null ? h('p', { className: 'dpm_hint' }, t('loading'))
          : !visible.length ? h('p', { className: 'dpm_empty' }, t('noChats'))
          : h('div', { style: { display: 'grid', gap: 6, maxHeight: 320, overflowY: 'auto' } },
            visible.map(item => {
              const blocked = Boolean(item.personaId && item.personaId !== id)
              return h('label', {
                key: item.id,
                style: {
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 4px',
                  cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.55 : 1,
                },
              },
              h('input', {
                type: 'checkbox', checked: selected.includes(item.id), disabled: busy || blocked,
                onChange: () => toggle(item.id),
              }),
              h('span', { style: { display: 'grid', gap: 2, minWidth: 0 } },
                h('strong', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 } }, item.title),
                h('span', { className: 'dpm_hint' },
                  new Date(item.createdAt).toLocaleString() + ' · ' +
                  (item.personaId
                    ? (item.personaId === id ? t('currentPersona') : t('boundPrefix') + item.personaName + t('cannotImportBound'))
                    : t('unbound'))),
              ))
            })),
        errorMessage(error, t),
      ))
    }

    function AddMemoryModal({ personaId, open, onClose, onAdded, t }) {
      const [kind, setKind] = useState('preference')
      const [title, setTitle] = useState('')
      const [summary, setSummary] = useState('')
      const [detail, setDetail] = useState('')
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const formId = useId()

      useEffect(() => {
        if (!open) return
        setKind('preference')
        setTitle('')
        setSummary('')
        setDetail('')
        setError('')
      }, [open, personaId])

      async function submit(event) {
        event.preventDefault()
        if (busy) return
        setBusy(true)
        setError('')
        try {
          await call('/memory/add', { persona: personaId, kind, title, summary, detail })
          onAdded()
          onClose()
        } catch (failure) {
          setError(failure.message)
        } finally {
          setBusy(false)
        }
      }

      return h(Modal, {
        title: t('addMemoryTitle'), closeLabel: t('close'), open,
        onClose: () => { if (!busy) onClose() },
        footer: h(React.Fragment, null,
          h(Button, { variant: 'outline', disabled: busy, onClick: onClose }, t('cancel')),
          h(Button, { variant: 'primary', type: 'submit', form: formId, disabled: busy || !title.trim() || !summary.trim() || !detail.trim() }, t('saveMemory'))),
      }, h('form', { id: formId, onSubmit: submit, style: { display: 'grid', gap: 10 } },
        h('label', { className: 'dpm_field' },
          h('span', { className: 'dpm_label' }, t('memoryKind')),
          h('select', { className: 'dpm_select', value: kind, disabled: busy, onChange: event => setKind(event.target.value) },
            ...['preference', 'decision', 'fact', 'lesson', 'progress'].map(item =>
              h('option', { key: item, value: item }, t('kind_' + item))))),
        h('label', { className: 'dpm_field' },
          h('span', { className: 'dpm_label' }, t('memoryTitle')),
          h(Input, { value: title, required: true, maxLength: 90, disabled: busy, onChange: event => setTitle(event.target.value) })),
        h('label', { className: 'dpm_field' },
          h('span', { className: 'dpm_label' }, t('summary')),
          h(Input, { value: summary, required: true, maxLength: 160, disabled: busy, onChange: event => setSummary(event.target.value) })),
        h('label', { className: 'dpm_field' },
          h('span', { className: 'dpm_label' }, t('detail')),
          h('textarea', {
            className: 'dpm_textarea', rows: 5, maxLength: 1800, required: true, disabled: busy,
            value: detail, onChange: event => setDetail(event.target.value),
          })),
        errorMessage(error, t),
      ))
    }

    function MemoryPanel({ id, t }) {
      const [query, setQuery] = useState('')
      const [rows, setRows] = useState(null)
      const [selectedId, setSelectedId] = useState('')
      const [sourceRow, setSourceRow] = useState(null)
      const [revision, setRevision] = useState(0)
      const [error, setError] = useState('')
      const [importOpen, setImportOpen] = useState(false)
      const [addOpen, setAddOpen] = useState(false)
      const [notice, setNotice] = useState('')
      const [polling, setPolling] = useState(false)
      const [failedCount, setFailedCount] = useState(0)
      const [retrying, setRetrying] = useState(false)
      const persona = '?persona=' + encodeURIComponent(id)

      useImportPoll(id, polling, () => {
        setPolling(false)
        setNotice(t('importDone'))
        setRevision(current => current + 1)
        window.dispatchEvent(new Event(changedEvent))
      })

      useEffect(() => {
        let live = true
        call('/history/import/status' + persona).then(
          status => {
            if (!live) return
            setFailedCount(status.failed ?? 0)
            if (status.pending > 0) setPolling(true)
          },
          () => {},
        )
        return () => { live = false }
      }, [persona, revision])

      useEffect(() => {
        let live = true
        const timer = setTimeout(() => {
          call('/index' + persona + '&q=' + encodeURIComponent(query))
            .then(
              value => { if (live) { setError(''); setRows(value) } },
              failure => { if (live) { setRows([]); setError(failure.message) } },
            )
        }, 160)
        return () => { live = false; clearTimeout(timer) }
      }, [persona, query, revision])

      async function mutate(path, { id: entry, ...data }) {
        await call(path, { ...data, persona: id, id: entry })
        setError('')
        setRevision(current => current + 1)
      }

      async function retryFailedJobs() {
        if (retrying) return
        setRetrying(true)
        setError('')
        try {
          const result = await call('/jobs/retry', { persona: id })
          setFailedCount(result.failed ?? 0)
          setNotice(t('retriedPrefix') + (result.retried ?? 0) + t('retriedSuffix'))
          if ((result.retried ?? 0) > 0 || (result.pending ?? 0) > 0) setPolling(true)
          setRevision(current => current + 1)
        } catch (failure) {
          setError(failure.message)
        } finally {
          setRetrying(false)
        }
      }

      async function dismissFailedJobs() {
        if (retrying) return
        setRetrying(true)
        setError('')
        try {
          const result = await call('/jobs/dismiss', { persona: id })
          setFailedCount(result.failed ?? 0)
          setNotice(t('dismissedNotice'))
        } catch (failure) {
          setError(failure.message)
        } finally {
          setRetrying(false)
        }
      }

      const activeRow = rows?.find(row => row.id === selectedId) ?? null

      return h('div', { className: 'dpm_card' },
        h('div', { className: 'dpm_cardHeader' },
          h('div', { className: 'dpm_actions' },
            h('h3', { className: 'dpm_cardTitle' }, t('index')),
            rows !== null && h(Tag, null, String(rows.length) + t('memoryCountSuffix')),
          ),
          h('div', { className: 'dpm_actions' },
            h(Button, { type: 'button', size: 'sm', variant: 'outline', onClick: () => setAddOpen(true) },
              h(IconPlusOutline16, { size: 14, 'aria-hidden': true }),
              t('addMemory')),
            h(Button, { type: 'button', size: 'sm', variant: 'outline', onClick: () => setImportOpen(true) },
              t('importHistory')),
          ),
        ),
        failedCount > 0 && h('div', { className: 'dpm_warnBanner', role: 'status' },
          h('span', null, t('failedJobsPrefix') + failedCount + t('failedJobsSuffix')),
          h('div', { className: 'dpm_actions' },
            h(Button, { type: 'button', size: 'sm', variant: 'outline', disabled: retrying, onClick: retryFailedJobs },
              h(IconRefreshOutline16, { size: 14, 'aria-hidden': true }),
              t('retryFailed')),
            h(Button, { type: 'button', size: 'sm', variant: 'ghost', disabled: retrying, onClick: dismissFailedJobs },
              t('dismissFailed')),
          )),
        notice && h('p', { className: 'dpm_notice', role: 'status' }, notice),
        !activeRow && h(Input, {
          type: 'search', 'aria-label': t('search'), placeholder: t('search'), value: query, maxLength: 300,
          prefix: h(IconSearchOutline16, { size: 16, 'aria-hidden': true }),
          onChange: event => { setRows(null); setQuery(event.target.value) },
        }),
        rows === null ? h('p', { className: 'dpm_hint' }, t('loading'))
          : activeRow ? h(MemoryDetail, {
            row: activeRow, personaId: id, t,
            onBack: () => setSelectedId(''),
            onOpenSource: row => setSourceRow(row),
            mutate,
          })
          : rows.length ? h('div', { className: 'dpm_list' },
            rows.map(row => h('button', {
              key: row.id, type: 'button', className: 'dpm_item',
              onClick: () => setSelectedId(row.id),
            },
            h('div', { className: 'dpm_itemTop' },
              h('span', { className: 'dpm_itemTitle' }, row.title),
              row.revision !== undefined && h(Tag, null, t('revisionPrefix') + shortRevision(row.revision)),
            ),
            row.summary && h('p', { className: 'dpm_itemSummary' }, row.summary),
            h('div', { className: 'dpm_meta' },
              row.kind && h(Tag, null, t('kind_' + row.kind)),
              row.manual && h(Tag, null, t('manualTag')),
              (row.workspace || row.workspaceKey) && h(Tag, null, row.workspace || row.workspaceKey),
              row.session && row.session !== 'manual' && h('span', null, (row.sessionTitle || row.session) +
                (formatTurn(row, t) ? ' · ' + formatTurn(row, t) : '')),
              (row.updated ?? row.updatedAt) && h('span', null, formatTime(row.updated ?? row.updatedAt)),
            ))))
          : h('div', { className: 'dpm_empty' },
            h('p', { style: { margin: '0 0 4px' } }, t('empty')),
            h('p', { className: 'dpm_hint' }, t('emptyHint'))),
        errorMessage(error, t),
        h(AddMemoryModal, {
          personaId: id, open: addOpen, onClose: () => setAddOpen(false), t,
          onAdded: () => {
            setNotice(t('saved'))
            setRevision(current => current + 1)
            window.dispatchEvent(new Event(changedEvent))
          },
        }),
        h(HistoryImportModal, {
          id, t, open: importOpen, onClose: () => setImportOpen(false),
          onImported: result => {
            setNotice(queuedText(t, result))
            if (result.queuedChunks > 0) setPolling(true)
            setRevision(current => current + 1)
          },
        }),
        h(SourceModal, {
          open: Boolean(sourceRow), onClose: () => setSourceRow(null),
          row: sourceRow, personaId: id, t,
        }),
      )
    }

    function Settings({ t, workspace = false }) {
      const [personas, setPersonas] = useState([])
      const [id, setId] = useState('')
      const [name, setName] = useState('')
      const [instructions, setInstructions] = useState('')
      const [autoMemory, setAutoMemory] = useState(true)
      const [menuOpen, setMenuOpen] = useState(false)
      const [savedFlag, setSavedFlag] = useState(false)
      const [error, setError] = useState('')
      const [busy, setBusy] = useState(false)

      function syncSelection(list, targetId) {
        const persona = list.find(item => item.id === targetId)
        setId(persona ? persona.id : '')
        setName(persona?.name ?? '')
        setInstructions(persona?.instructions ?? '')
        setAutoMemory(persona?.autoMemory ?? true)
      }

      useEffect(() => {
        let live = true
        const load = (initial = false) => call('/state').then(value => {
          if (!live) return
          const list = value.personas ?? []
          setPersonas(prev => {
            setId(currentId => {
              if ((initial || !currentId) && list.length) {
                const first = list[0]
                setName(first.name ?? '')
                setInstructions(first.instructions ?? '')
                setAutoMemory(first.autoMemory ?? true)
                return first.id
              }
              const oldItem = prev.find(item => item.id === currentId)
              const newItem = list.find(item => item.id === currentId)
              if (newItem && oldItem && oldItem.name !== newItem.name) {
                setName(currName => currName === oldItem.name ? newItem.name : currName)
              }
              return currentId
            })
            return list
          })
        }, failure => { if (live && initial) setError(failure.message) })
        void load(true)
        const onChanged = () => { void load(false) }
        window.addEventListener(changedEvent, onChanged)
        return () => {
          live = false
          window.removeEventListener(changedEvent, onChanged)
        }
      }, [])

      function choose(nextId) {
        setMenuOpen(false)
        setSavedFlag(false)
        setError('')
        syncSelection(personas, nextId === createOption ? '' : nextId)
      }

      async function save(event) {
        event.preventDefault()
        if (busy) return
        setBusy(true)
        setSavedFlag(false)
        try {
          const saved = await call('/persona', { id, name, instructions })
          const latest = (await call('/state')).personas ?? []
          setPersonas(latest)
          syncSelection(latest, saved.id)
          setSavedFlag(true)
          setError('')
          window.dispatchEvent(new Event(changedEvent))
        } catch (failure) {
          setError(failure.message)
        } finally {
          setBusy(false)
        }
      }

      async function toggleAutoMemory(next) {
        if (!id || busy) return
        const value = typeof next === 'boolean' ? next : !autoMemory
        setAutoMemory(value)
        setBusy(true)
        setError('')
        try {
          await call('/memory/settings', { persona: id, autoMemory: value })
          setPersonas(current => current.map(item => item.id === id ? { ...item, autoMemory: value } : item))
          window.dispatchEvent(new Event(changedEvent))
        } catch (failure) {
          setAutoMemory(!value)
          setError(failure.message)
        } finally {
          setBusy(false)
        }
      }

      const activePersona = personas.find(item => item.id === id)
      const selectorLabel = activePersona?.name ?? t('new')

      const content = h('section', { className: 'dpm_root' },
        !workspace && h('div', { className: 'dpm_toolbar' },
          h('div', { className: 'dpm_toolbarLeft' },
            h(Menu, {
              open: menuOpen,
              onClose: () => setMenuOpen(false),
              selectedId: id || createOption,
              onSelect: choose,
              align: 'start',
              portal: true,
              items: [
                { id: createOption, label: t('new'), icon: h(IconPlusOutline16, { size: 16, 'aria-hidden': true }) },
                ...personas.map(item => ({
                  id: item.id,
                  label: item.name,
                  icon: h(IconUserOutline16, { size: 16, 'aria-hidden': true }),
                })),
              ],
              anchor: h('button', {
                type: 'button',
                className: 'dpm_selectorBtn',
                disabled: busy,
                'aria-label': t('selectPersona'),
                'aria-haspopup': 'menu',
                'aria-expanded': menuOpen,
                onClick: () => setMenuOpen(open => !open),
              },
              h(IconUserOutline16, { size: 16, 'aria-hidden': true }),
              h('span', { className: 'dpm_selectorText' }, selectorLabel),
              h(IconChevronDownOutline14, { size: 14, 'aria-hidden': true })),
            }),
            id && h('span', { className: 'dpm_mono' }, id),
          ),
          h('div', { className: 'dpm_toolbarRight' },
            h(Button, {
              type: 'button', size: 'sm', variant: 'outline', disabled: busy,
              onClick: () => choose(createOption),
            },
            h(IconPlusOutline16, { size: 14, 'aria-hidden': true }),
            t('new')),
          ),
        ),
        !id && !personas.length && h('p', { className: 'dpm_notice' }, t('createFirstHint')),
        h('form', { className: 'dpm_card', onSubmit: save },
          h('div', { className: 'dpm_cardHeader' },
            h('h3', { className: 'dpm_cardTitle' }, id ? t('profileSection') : t('newPersonaTitle')),
            savedFlag && h('span', { className: 'dpm_statusText', role: 'status' },
              h(IconCheckOutline16, { size: 14, 'aria-hidden': true }),
              t('saved')),
          ),
          h('label', { className: 'dpm_field' },
            h('span', { className: 'dpm_label' }, t('name')),
            h(Input, {
              value: name, required: true, maxLength: 48, placeholder: t('namePlaceholder'), disabled: busy,
              onChange: event => { setSavedFlag(false); setName(event.target.value) },
            })),
          h('label', { className: 'dpm_field' },
            h('span', { className: 'dpm_label' }, t('instructions')),
            h('textarea', {
              className: 'dpm_textarea', value: instructions, rows: 4, maxLength: 3500, disabled: busy,
              placeholder: t('instructionsPlaceholder'),
              onChange: event => { setSavedFlag(false); setInstructions(event.target.value) },
            }),
            h('p', { className: 'dpm_hint' }, t('instructionsHint'))),
          id && h('div', { className: 'dpm_settingRow' },
            h('div', { className: 'dpm_settingInfo' },
              h('span', { className: 'dpm_label' }, t('autoMemory')),
              h('p', { className: 'dpm_hint' }, t('autoMemoryDesc')),
            ),
            h(Switch, {
              checked: autoMemory,
              label: t('autoMemory'),
              disabled: busy,
              onChange: toggleAutoMemory,
            }),
          ),
          h('div', { className: 'dpm_actions' },
            h(Button, { variant: 'primary', size: 'sm', type: 'submit', disabled: busy || !name.trim() }, t('save')),
          ),
        ),
        errorMessage(error, t),
        id && h(MemoryPanel, { key: id, id, t }),
      )
      if (!workspace) return content
      const title = t('workspaceTitle')
      return h('div', { className: 'dpm_workspace' },
        h('h1', { className: 'dpm_workspaceTitle' }, title),
        h('div', { className: 'dpm_workspaceGrid' },
          h('nav', { className: 'dpm_roster', 'aria-label': t('selectPersona') },
            ...personas.map(item => h('button', {
              key: item.id, type: 'button', className: 'dpm_rosterButton',
              disabled: busy, 'aria-pressed': id === item.id, onClick: () => choose(item.id),
            }, h(IconUserOutline16, { size: 16, 'aria-hidden': true }), h('span', null, item.name))),
            h('button', { type: 'button', className: 'dpm_rosterButton', disabled: busy,
              onClick: () => choose(createOption) },
            h(IconPlusOutline16, { size: 16, 'aria-hidden': true }), h('span', null, t('new'))),
          ),
          content,
        ),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const ns = 'persona-continuity'
        ctx.effect(() => ctx.locale.register(ns, dictionaries))
        const t = ctx.locale.bind(ns)
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section', id: ns, order: 32, label: () => t('title'), locale: ns,
        }, props => h(Settings, { ...props, t })))
        ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
          name: 'conversation.input.left', id: ns, order: 32, locale: ns,
        }, props => h(Picker, { key: String(props.sessionId ?? ''), ...props, t })))
        const workspace = ns + '-workspace'
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: workspace,
        }, () => h(Settings, { t, workspace: true })))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: workspace, order: 21, label: () => t('workspaceTitle'), locale: ns,
        }, props => h(IconUserOutline16, { ...props, 'aria-hidden': true })))
      },
    }
  },
})
