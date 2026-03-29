# ProScrape Web UI

🌐 **進階網站克隆工具** - 現代化 Web 介面 + Cloudflare Pages 部署

## ✨ 功能

- 🎯 **簡潔 UI** - 現代化、響應式設計
- ⚡ **快速克隆** - 支援多種克隆模式 (完整/快速/自訂)
- 📊 **實時進度** - 即時監控克隆進度
- 🔒 **隱藏檔案掃描** - 自動發現 robots.txt、sitemap、設定檔等
- 🔌 **API 偵測** - 自動識別 API 端點
- 📥 **結果下載** - 匯出完整的 JSON 索引
- 💾 **本地儲存** - 克隆歷史記錄

## 🏗️ 架構

```
前端 (Cloudflare Pages)
    ↓
Workers API (Cloudflare Workers + KV)
    ↓
Python 後端 (Render / Railway / VPS)
    ↓
proscrape.py (CLI 工具)
```

## 📁 項目結構

```
proscrape-web/
├── frontend/                    # Cloudflare Pages 靜態站點
│   ├── index.html              # 主頁面
│   ├── style.css               # 樣式表
│   └── app.js                  # 前端邏輯
│
├── workers/                    # Cloudflare Workers 後端
│   ├── src/index.ts            # Worker 邏輯
│   ├── wrangler.toml           # Worker 配置
│   └── package.json
│
├── backend/                    # Python API 伺服器
│   ├── api_server.py           # Flask 應用
│   ├── requirements.txt        # Python 依賴
│   └── render.yaml             # Render 部署配置
│
├── DEPLOYMENT.md               # 完整部署指南
└── README.md                   # 本文件
```

## 🚀 快速開始

### 本地開發

```bash
# 1. 複製倉庫
git clone https://github.com/kinai9661/proscrape-web.git
cd proscrape-web

# 2. 啟動前端
cd frontend
python -m http.server 8000
# 訪問: http://localhost:8000
```

### 部署到 Cloudflare

詳見 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 💰 成本

| 服務 | 免費額度 | 超額成本 |
|------|---------|---------|
| Cloudflare Pages | 無限 | $0 |
| Cloudflare Workers | 100K 請求/天 | $0.50 / 百萬請求 |
| Cloudflare KV | 1GB | $0.50 / GB |
| Render | 750 小時/月 | $7 / 月 |
| **總計** | **完全免費** | **~$7/月** |

## 📝 環境變數

### Cloudflare Workers
```toml
[vars]
SCRAPER_ORIGIN = "https://proscrape-api-xxxxx.onrender.com"

# 密鑰 (via wrangler secret put)
SCRAPER_SECRET = "your-secret-key"
```

## 📚 文檔

- [部署指南](./DEPLOYMENT.md) - 完整的部署步驟

## 📄 授權

MIT License
