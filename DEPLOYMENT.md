# ProScrape Web UI - 部署指南

## 🏗️ 架構

```
Cloudflare Pages (靜態前端)
        ↓
Cloudflare Workers (無伺服器 API)
        ↓
Python 伺服器 (Render / Railway / VPS)
        ↓
proscrape.py (克隆工具)
```

## 📋 前置準備

- ✅ Cloudflare 帳戶 (免費)
- ✅ GitHub 帳戶 (免費)
- ✅ Render / Railway 帳戶 (免費層可用)

## 🚀 部署步驟

### 第 1 步：部署 Python 後端 (Render)

1. 訪問 https://render.com
2. 點擊 "New +" → "Web Service"
3. 連接 GitHub 倉庫
4. 配置：
   - **Name**: `proscrape-api`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python api_server.py`
5. 點擊 "Create Web Service"

記錄 Render 提供的 URL，例如：
```
https://proscrape-api-xxxxx.onrender.com
```

### 第 2 步：部署 Cloudflare Workers

```bash
# 登入 Cloudflare
wrangler login

# 建立 KV 命名空間
wrangler kv:namespace create "TASK_KV"

# 記錄輸出的 ID
```

編輯 `workers/wrangler.toml`：
```toml
[[kv_namespaces]]
binding = "TASK_KV"
id = "YOUR_KV_NAMESPACE_ID"

[vars]
SCRAPER_ORIGIN = "https://proscrape-api-xxxxx.onrender.com"
```

部署：
```bash
cd workers
npm install
wrangler deploy
```

### 第 3 步：部署 Cloudflare Pages

1. 訪問 https://dash.cloudflare.com
2. 選擇你的域名 → "Pages" → "Connect to Git"
3. 授權 GitHub，選擇此倉庫
4. 配置：
   - **Project name**: `proscrape`
   - **Production branch**: `main`
   - **Build command**: (留空)
   - **Build output directory**: `frontend`
5. 點擊 "Save and Deploy"

## 💰 成本

| 服務 | 免費額度 | 超額成本 |
|------|---------|---------|
| Cloudflare Pages | 無限 | $0 |
| Cloudflare Workers | 100K 請求/天 | $0.50 / 百萬請求 |
| Cloudflare KV | 1GB | $0.50 / GB |
| Render | 750 小時/月 | $7 / 月 |
| **總計** | **完全免費** | **~$7/月** |

## 📝 本地開發

```bash
# 啟動前端
cd frontend
python -m http.server 8000
# 訪問: http://localhost:8000
```

## 🔗 API 端點

- `POST /api/clone` - 啟動克隆任務
- `GET /api/status/:id` - 查詢進度
- `POST /api/cancel/:id` - 取消任務
- `GET /api/download/:id` - 下載結果
