/* ProScrape Web UI - Frontend Logic */

const API_BASE = '/api'
let currentTaskId = null
let pollTimer = null

// ─── State & Navigation ───────────────────────────────────────────────────────
function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'))
  document.getElementById(id).classList.add('active')

  const stepMap = { configPanel: 0, progressPanel: 1, resultPanel: 2 }
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.toggle('active', i === (stepMap[id] ?? -1))
  })
}

// ─── Slider Sync ──────────────────────────────────────────────────────────────
function bindSlider(id, labelId) {
  const slider = document.getElementById(id)
  const label  = document.getElementById(labelId)
  slider.addEventListener('input', () => (label.textContent = Number(slider.value).toLocaleString()))
}

bindSlider('depth',    'depthVal')
bindSlider('maxPages', 'maxPagesVal')
bindSlider('concurrent', 'concurrentVal')
bindSlider('timeout',  'timeoutVal')

// ─── Mode Selector ────────────────────────────────────────────────────────────
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'))
    btn.classList.add('selected')
    const mode = btn.dataset.mode
    if (mode === 'full') {
      setSlider('depth', 15); setSlider('maxPages', 10000); setSlider('concurrent', 25)
    } else if (mode === 'quick') {
      setSlider('depth', 5);  setSlider('maxPages', 200);   setSlider('concurrent', 30)
      document.getElementById('downloadMedia').checked = false
      document.getElementById('downloadFonts').checked = false
    }
  })
})

function setSlider(id, val) {
  const el = document.getElementById(id)
  el.value = val
  el.dispatchEvent(new Event('input'))
}

// ─── Form Submit ──────────────────────────────────────────────────────────────
document.getElementById('cloneForm').addEventListener('submit', async e => {
  e.preventDefault()

  const url = document.getElementById('url').value.trim()
  if (!url) return

  const config = {
    url,
    max_depth:           +document.getElementById('depth').value,
    max_pages:           +document.getElementById('maxPages').value,
    concurrent_requests: +document.getElementById('concurrent').value,
    timeout:             +document.getElementById('timeout').value,
    download_media:    document.getElementById('downloadMedia').checked,
    download_fonts:    document.getElementById('downloadFonts').checked,
    download_documents:document.getElementById('downloadDocs').checked,
    rewrite_links:     document.getElementById('rewriteLinks').checked,
    capture_api:       document.getElementById('captureApi').checked,
    clone_hidden:      document.getElementById('cloneHidden').checked,
    download_source:   document.getElementById('downloadSource').checked,
    aggressive_scan:   document.getElementById('aggressiveScan').checked,
  }

  try {
    document.querySelector('.submit-btn').disabled = true
    const res  = await fetch(`${API_BASE}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '請求失敗')

    currentTaskId = data.task_id
    resetProgress()
    showPanel('progressPanel')
    startPolling()
  } catch (err) {
    alert('❌ 錯誤：' + err.message)
  } finally {
    document.querySelector('.submit-btn').disabled = false
  }
})

// ─── Progress Polling ─────────────────────────────────────────────────────────
function startPolling() {
  pollTimer = setInterval(fetchStatus, 1200)
}

async function fetchStatus() {
  if (!currentTaskId) return
  try {
    const res  = await fetch(`${API_BASE}/status/${currentTaskId}`)
    const data = await res.json()
    updateProgress(data)

    if (data.status === 'completed') {
      clearInterval(pollTimer)
      renderResult(data.result)
      saveHistory(data.result)
      showPanel('resultPanel')
    } else if (data.status === 'failed') {
      clearInterval(pollTimer)
      alert('克隆失敗：' + (data.error || '未知錯誤'))
      showPanel('configPanel')
    }
  } catch (err) {
    console.error('狀態查詢失敗', err)
  }
}

function resetProgress() {
  document.getElementById('progressFill').style.width = '0%'
  document.getElementById('progressPct').textContent  = '0%'
  document.getElementById('progressStatus').textContent = '初始化中...'
  document.getElementById('statPages').textContent   = '0'
  document.getElementById('statAssets').textContent  = '0'
  document.getElementById('statHidden').textContent  = '0'
  document.getElementById('statErrors').textContent  = '0'
  document.getElementById('errorBox').style.display  = 'none'
}

function updateProgress(data) {
  const pct = Math.min(100, Math.round((data.progress || 0) * 100))
  document.getElementById('progressFill').style.width = pct + '%'
  document.getElementById('progressPct').textContent  = pct + '%'
  document.getElementById('progressStatus').textContent =
    data.status_message || `已下載 ${data.pages_downloaded || 0} 頁...`

  document.getElementById('statPages').textContent   = (data.pages_downloaded  || 0).toLocaleString()
  document.getElementById('statAssets').textContent  = (data.assets_downloaded || 0).toLocaleString()
  document.getElementById('statHidden').textContent  = (data.hidden_files_found|| 0).toLocaleString()
  document.getElementById('statErrors').textContent  = (data.errors            || 0).toLocaleString()

  if (data.errors > 0 && data.error_messages?.length) {
    const box  = document.getElementById('errorBox')
    box.style.display = 'block'
    document.getElementById('errorList').innerHTML =
      data.error_messages.slice(-5).map(m => `${escHtml(m)}`).join('')
  }
}

// ─── Cancel ───────────────────────────────────────────────────────────────────
document.getElementById('cancelBtn').addEventListener('click', async () => {
  clearInterval(pollTimer)
  if (currentTaskId) {
    try { await fetch(`${API_BASE}/cancel/${currentTaskId}`, { method: 'POST' }) } catch {}
  }
  showPanel('configPanel')
})

// ─── Result Rendering ─────────────────────────────────────────────────────────
function renderResult(result) {
  const r = result || {}
  document.getElementById('resTime').textContent =
    '完成於 ' + new Date().toLocaleString('zh-TW')
  document.getElementById('resPages').textContent    = (r.pages_downloaded   || 0).toLocaleString()
  document.getElementById('resAssets').textContent   = (r.assets_downloaded  || 0).toLocaleString()
  document.getElementById('resHidden').textContent   = (r.hidden_files_found || 0).toLocaleString()
  document.getElementById('resApi').textContent      = (r.api_endpoints_found|| 0).toLocaleString()
  document.getElementById('resForms').textContent    = (r.forms_found        || 0).toLocaleString()
  document.getElementById('resSize').textContent     =
    ((r.total_size_bytes || 0) / 1048576).toFixed(2) + ' MB'
  document.getElementById('resDuration').textContent =
    ((r.duration || 0)).toFixed(1) + ' 秒'

  const dlLink = document.getElementById('downloadLink')
  dlLink.href = `${API_BASE}/download/${currentTaskId}`
  dlLink.style.display = r.pages_downloaded ? 'inline-flex' : 'none'
}

// ─── New Clone Button ─────────────────────────────────────────────────────────
document.getElementById('newCloneBtn').addEventListener('click', () => {
  showPanel('configPanel')
})

// ─── History ──────────────────────────────────────────────────────────────────
document.getElementById('historyBtn').addEventListener('click', () => {
  renderHistory()
  showPanel('historyPanel')
})

document.getElementById('backBtn').addEventListener('click', () => {
  showPanel('configPanel')
})

function saveHistory(result) {
  try {
    const history = JSON.parse(localStorage.getItem('proscrape_history') || '[]')
    history.unshift({
      id: currentTaskId,
      url: result.url || '',
      pages: result.pages_downloaded || 0,
      size_mb: ((result.total_size_bytes || 0) / 1048576).toFixed(2),
      at: new Date().toISOString()
    })
    localStorage.setItem('proscrape_history', JSON.stringify(history.slice(0, 20)))
  } catch {}
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('proscrape_history') || '[]')
  const container = document.getElementById('historyList')

  if (!history.length) {
    container.innerHTML = `📭 尚無克隆記錄`
    return
  }

  container.innerHTML = history.map(h => `
    <div style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
      <div style="font-weight: 600; color: #2d3748;">${escHtml(h.url)}</div>
      <div style="font-size: 12px; color: #718096; margin-top: 4px;">
        ${h.pages} 頁 &bull; ${h.size_mb} MB &bull; ${new Date(h.at).toLocaleString('zh-TW')}
      </div>
    </div>
  `).join('')
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;').replace(/'/g, '&#39;')
}
