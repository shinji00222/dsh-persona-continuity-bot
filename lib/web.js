const route = '/api/persona-continuity'
const responseHeaders = { 'cache-control': 'no-store' }

function str(value, max = 200) {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

async function bodyOf(request, limit) {
  const text = await request.text()
  if (Buffer.byteLength(text) > limit) throw new Error('请求过长')
  const value = JSON.parse(text)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('请求格式错误')
  return value
}

export function registerWeb(connection, api) {
  function register(path, method, action, limit = 12000) {
    return connection.fetch.register({
      path: route + path,
      methods: [method],
      requestBody: 'buffered',
      async fetch(request) {
        try {
          const input = method === 'POST' ? await bodyOf(request, limit) : new URL(request.url).searchParams
          return Response.json(await action(input), { headers: responseHeaders })
        } catch (error) {
          const message = error instanceof SyntaxError ? '请求格式错误' : error.message
          return Response.json({ error: message }, { status: 400, headers: responseHeaders })
        }
      },
    })
  }
  const dispose = [
    register('/state', 'GET', query => api.state(str(query.get('session')))),
    register('/index', 'GET', query => api.list(str(query.get('persona')), str(query.get('q'), 300))),
    register('/bind', 'POST', body => api.bind(str(body.session), str(body.persona))),
    register('/create', 'POST', body => api.create(str(body.session), str(body.name))),
    register('/persona', 'POST', body => {
      const id = str(body.id)
      const instructions = id && body.instructions === undefined ? undefined : str(body.instructions, 3500)
      if (body.autoMemory !== undefined && typeof body.autoMemory !== 'boolean') throw new Error('无效的记忆设置')
      return { id: api.save(id, str(body.name), instructions, body.autoMemory) }
    }),
    register('/memory/settings', 'POST', body => {
      api.autoMemory(str(body.persona), body.autoMemory ?? body.enabled)
      return { saved: true }
    }),
    register('/memory/review', 'POST', body => api.review(str(body.persona), str(body.session))),
    register('/edit', 'POST', body => {
      api.edit(str(body.persona), str(body.id), { ...body.edits, revision: body.revision ?? body.edits?.revision })
      return { saved: true }
    }),
    register('/forget', 'POST', body => ({ removed: api.forget(str(body.persona), str(body.id), body.revision) })),
    register('/history/sessions', 'GET', () => api.historySessions()),
    register('/history/source', 'GET', query =>
      api.historySource(str(query.get('persona')), str(query.get('session')), query.get('turn'))),
    register('/history/import', 'POST', body => api.importHistory(body), 25000),
    register('/history/import/status', 'GET', query => api.importStatus(str(query.get('persona')))),
    register('/jobs/retry', 'POST', body => api.retryFailed(str(body.persona))),
  ]
  return () => Promise.all(dispose.map(unregister => unregister()))
}
