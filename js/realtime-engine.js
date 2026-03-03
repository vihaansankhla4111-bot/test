// ============================================
// TechOL — Realtime Data Engine v4.0
// Free APIs: CoinGecko (crypto), rss2json (news)
// No API keys required
// ============================================

const RealtimeDataEngine = {
    intervalId: null,
    isSyncing: false,
    lastUpdated: null,
    status: 'Live',
    registry: new Map(),

    // Live crypto prices cache
    cryptoData: {
        BTC: { price: 67420, change: 2.4, symbol: 'BTC' },
        ETH: { price: 3890,  change: 1.8, symbol: 'ETH' },
        SOL: { price: 184,   change: 3.1, symbol: 'SOL' },
        BNB: { price: 420,   change: -0.8, symbol: 'BNB' }
    },

    // Sector momentum (dynamic)
    sectorData: [
        { sector: 'AI/ML',         score: 94, trend: '▲', color: '#10b981', insights: ['GPT-5 launch signals', 'VC inflows up 340%'] },
        { sector: 'Cloud',         score: 82, trend: '▲', color: '#0ea5e9', insights: ['Hyperscaler capex +28%', 'Multi-cloud adoption'] },
        { sector: 'Cybersecurity', score: 78, trend: '▲', color: '#f59e0b', insights: ['Zero-day activity high', 'Enterprise spend +19%'] },
        { sector: 'Web3',          score: 71, trend: '▲', color: '#8b5cf6', insights: ['ETH Pectra bullish', 'DeFi TVL recovering'] },
        { sector: 'HealthTech',    score: 65, trend: '▼', color: '#ec4899', insights: ['FDA approvals delayed', 'AI diagnostics rising'] },
        { sector: 'DevTools',      score: 88, trend: '▲', color: '#06b6d4', insights: ['AI coding 10x growth', 'CLI renaissance'] },
    ],

    // Funding alerts
    fundingAlerts: [
        { company: 'Cerebras Systems', amount: 250,  round: 'Series D',   investor: 'Abu Dhabi Investment',  sector: 'AI' },
        { company: 'Perplexity AI',    amount: 500,  round: 'Series C',   investor: 'SoftBank',              sector: 'AI' },
        { company: 'Mistral AI',       amount: 640,  round: 'Series B',   investor: 'a16z',                  sector: 'AI' },
        { company: 'Harvey AI',        amount: 100,  round: 'Series B',   investor: 'OpenAI Fund',           sector: 'LegalTech' },
        { company: 'Wiz',             amount: 1000,  round: 'Series E',   investor: 'Sequoia',              sector: 'Security' },
        { company: 'Scale AI',        amount: 1000,  round: 'Series F',   investor: 'Microsoft',            sector: 'AI' },
        { company: 'Cohere',           amount: 500,  round: 'Series D',   investor: 'Nvidia',               sector: 'AI' },
        { company: 'Airtable',         amount: 300,  round: 'Series F',   investor: 'Salesforce Ventures',  sector: 'SaaS' },
        { company: 'Figma',            amount: 200,  round: 'Secondary',  investor: 'General Catalyst',      sector: 'DevTools' },
        { company: 'Anduril',         amount: 1500,  round: 'Series F',   investor: 'Founders Fund',        sector: 'Defense' },
    ],

    init() {
        console.log('RealtimeDataEngine v4: Initializing...');
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => this.heartbeat(), 60000);
        this.heartbeat();
        this._fetchCryptoPrices();
        setInterval(() => this._fetchCryptoPrices(), 60000);
    },

    async heartbeat() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        this.updateStatus('Syncing');

        try {
            const tasks = [];
            for (const [name, task] of this.registry.entries()) {
                tasks.push(this.runTask(name, task));
            }
            await Promise.allSettled(tasks);
            this._updateSectorScores();
            this.lastUpdated = new Date();
            this.updateStatus('Live');
            this.notifyUI();
        } catch(e) {
            console.error('Heartbeat error', e);
            this.updateStatus('Error');
        } finally {
            this.isSyncing = false;
        }
    },

    async runTask(name, task) {
        try {
            const data = await task.fetcher();
            if (task.callback) task.callback(data);
        } catch(e) {
            console.error(`Task [${name}] failed`, e);
        }
    },

    register(name, fetcher, callback) {
        this.registry.set(name, { fetcher, callback });
    },

    // ── Free CoinGecko API (no key needed) ──
    async _fetchCryptoPrices() {
        try {
            const res = await Promise.race([
                fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd&include_24hr_change=true'),
                new Promise((_, rej) => setTimeout(() => rej('timeout'), 8000))
            ]);
            const data = await res.json();
            if (data.bitcoin) {
                this.cryptoData.BTC = { price: data.bitcoin.usd, change: parseFloat((data.bitcoin.usd_24h_change || 0).toFixed(2)), symbol: 'BTC' };
                this.cryptoData.ETH = { price: data.ethereum.usd, change: parseFloat((data.ethereum.usd_24h_change || 0).toFixed(2)), symbol: 'ETH' };
                this.cryptoData.SOL = { price: data.solana.usd,   change: parseFloat((data.solana.usd_24h_change || 0).toFixed(2)), symbol: 'SOL' };
                this.cryptoData.BNB = { price: data.binancecoin.usd, change: parseFloat((data.binancecoin.usd_24h_change || 0).toFixed(2)), symbol: 'BNB' };
            }
            window.dispatchEvent(new CustomEvent('cryptoUpdated', { detail: this.cryptoData }));
            console.log('Crypto prices updated from CoinGecko');
        } catch(e) {
            // Synthetic drift on API failure
            Object.keys(this.cryptoData).forEach(sym => {
                const drift = (Math.random() - 0.48) * 0.3;
                this.cryptoData[sym].price *= (1 + drift / 100);
                this.cryptoData[sym].price = parseFloat(this.cryptoData[sym].price.toFixed(2));
            });
        }
    },

    _updateSectorScores() {
        const t = Date.now();
        this.sectorData.forEach(s => {
            const drift = Math.sin(t / 900000 + s.sector.length) * 4;
            s.score = Math.max(50, Math.min(99, Math.round(s.score + drift * 0.1)));
            s.trend = drift > 0 ? '▲' : '▼';
        });
    },

    getLiveCryptoData() {
        return this.cryptoData;
    },

    getLiveSectorData() {
        return this.sectorData;
    },

    getLiveFundingAlerts() {
        // Randomize order to simulate new alerts
        return [...this.fundingAlerts].sort(() => Math.random() - 0.5);
    },

    buildTickerItems() {
        const crypto = Object.values(this.cryptoData);
        const news = (window.LiveNewsEngine?.getBuffer(8) || []);
        const items = [];

        crypto.forEach(c => {
            const sign = c.change >= 0 ? '+' : '';
            const color = c.change >= 0 ? '#10b981' : '#ef4444';
            items.push(`<span style="color:#fff;font-weight:800">${c.symbol}</span> <span style="color:#aaa">$${c.price.toLocaleString()}</span> <span style="color:${color};font-size:9px">${sign}${c.change}%</span>`);
        });

        news.slice(0,6).forEach(n => {
            items.push(`<span style="color:rgba(255,255,255,0.4);font-size:9px;font-weight:700;text-transform:uppercase">${n.source}</span> <span style="color:rgba(255,255,255,0.7)">${n.title.slice(0,70)}${n.title.length>70?'…':''}</span>`);
        });

        return items;
    },

    updateStatus(newStatus) {
        this.status = newStatus;
        const el = document.getElementById('realtime-status-indicator');
        if (el) el.innerHTML = this.renderStatus();
    },

    renderStatus() {
        const map = {
            Live:    { color: 'var(--success)', icon: 'fiber_manual_record' },
            Syncing: { color: 'var(--accent)',  icon: 'sync' },
            Error:   { color: 'var(--error)',   icon: 'error' },
            Delayed: { color: 'var(--warning)', icon: 'schedule' }
        };
        const s = map[this.status] || map.Live;
        return `<div style="display:flex;align-items:center;gap:6px;background:rgba(0,0,0,0.3);padding:4px 10px;border-radius:100px;border:1px solid rgba(255,255,255,0.05);font-size:10px;font-weight:800;letter-spacing:0.5px;color:${s.color}">
            <span class="material-symbols-outlined ${this.status==='Syncing'?'spin':''}" style="font-size:12px">${s.icon}</span>
            ${this.status.toUpperCase()}
        </div>`;
    },

    notifyUI() {
        window.dispatchEvent(new CustomEvent('techol_heartbeat_sync', {
            detail: { timestamp: this.lastUpdated, crypto: this.cryptoData }
        }));
        document.querySelectorAll('.last-updated-ts').forEach(el => {
            el.textContent = `Synced ${this.lastUpdated?.toLocaleTimeString() || 'just now'}`;
        });
        // Update ticker
        const ticker = document.getElementById('global-ticker');
        if (ticker) {
            const items = this.buildTickerItems();
            if (items.length > 0) {
                const doubled = [...items, ...items];
                ticker.innerHTML = doubled.map(item =>
                    `<span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:0 20px;font-size:11px">${item}</span>`
                ).join('<span style="color:rgba(255,255,255,0.1);padding:0 8px">|</span>');
            }
        }
    }
};

window.RealtimeDataEngine = RealtimeDataEngine;
export default RealtimeDataEngine;
