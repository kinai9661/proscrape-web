/**
 * ProScrape Cloudflare Workers Backend
 * 
 * Routes:
 *   POST /api/clone          - Start a clone task
 *   GET  /api/status/:id     - Poll task status
 *   POST /api/cancel/:id     - Cancel a running task
 *   GET  /api/download/:id   - Download result JSON
 */

export interface Env {
  TASK_KV: KVNamespace
  SCRAPER_ORIGIN: string
  SCRAPER_SECRET?: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    // POST /api/clone
    if (request.method === 'POST' && path === '/api/clone') {
      let config: Record<string, unknown>
      try {
        config = await request.json()
      } catch {
        return json({ error: '無效的 JSON 請求體' }, 400)
      }

      if (!config.url || typeof config.url !== 'string') {
        return json({ error: '缺少必要欄位: url' }, 400)
      }

      const taskId = uuid()
      const taskMeta = {
        id: taskId,
        config,
        status: 'queued',
        progress: 0,
        pages_downloaded: 0,
        assets_downloaded: 0,
        hidden_files_found: 0,
        errors: 0,
        error_messages: [] as string[],
        created_at: new Date().toISOString(),
        result: null,
      }

      await env.TASK_KV.put(`task:${taskId}`, JSON.stringify(taskMeta), {
        expirationTtl: 86400,
      })

      const scraperUrl = `${env.SCRAPER_ORIGIN}/scrape`
      const scraperBody = JSON.stringify({
        task_id: taskId,
        config,
      })

      fetch(scraperUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Scraper-Secret': env.SCRAPER_SECRET || '',
        },
        body: scraperBody,
      }).catch(async (err) => {
        const task = JSON.parse((await env.TASK_KV.get(`task:${taskId}`)) || '{}')
        task.status = 'failed'
        task.error = String(err)
        await env.TASK_KV.put(`task:${taskId}`, JSON.stringify(task), { expirationTtl: 86400 })
      })

      taskMeta.status = 'running'
      await env.TASK_KV.put(`task:${taskId}`, JSON.stringify(taskMeta), { expirationTtl: 86400 })

      return json({ task_id: taskId, status: 'running' })
    }

    // GET /api/status/:id
    const statusMatch = path.match(/^\/api\/status\/([\w-]+)$/)
    if (request.method === 'GET' && statusMatch) {
      const taskId = statusMatch[1]
      const raw = await env.TASK_KV.get(`task:${taskId}`)
      if (!raw) return json({ error: '任務不存在' }, 404)
      return json(JSON.parse(raw))
    }

    // POST /api/cancel/:id
    const cancelMatch = path.match(/^\/api\/cancel\/([\w-]+)$/)
    if (request.method === 'POST' && cancelMatch) {
      const taskId = cancelMatch[1]
      const raw = await env.TASK_KV.get(`task:${taskId}`)
      if (!raw) return json({ error: '任務不存在' }, 404)

      const task = JSON.parse(raw)
      task.status = 'cancelled'
      await env.TASK_KV.put(`task:${taskId}`, JSON.stringify(task), { expirationTtl: 86400 })

      return json({ status: 'cancelled' })
    }

    // GET /api/download/:id
    const downloadMatch = path.match(/^\/api\/download\/([\w-]+)$/)
    if (request.method === 'GET' && downloadMatch) {
      const taskId = downloadMatch[1]
      const raw = await env.TASK_KV.get(`task:${taskId}`)
      if (!raw) return json({ error: '任務不存在' }, 404)

      const task = JSON.parse(raw)
      if (task.status !== 'completed') return json({ error: '任務尚未完成' }, 400)

      return new Response(JSON.stringify(task.result, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="scraping_${taskId}.json"`,
          ...CORS_HEADERS,
        },
      })
    }

    // 404
    return json({ error: 'Not Found' }, 404)
  },
}
