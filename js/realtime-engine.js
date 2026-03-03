/**
 * RealtimeDataEngine.js
 * Centralized engine for managing live data synchronization,
 * periodic background fetching, and UI update orchestration.
 */

import Database from "./database.js";
import Utils from "./utils.js";
import AIEngine from "./ai-engine.js";

const RealtimeDataEngine = {
    intervalId: null,
    isSyncing: false,
    lastUpdated: null,
    registry: new Map(), // name -> { fetcher, callback }
    status: 'Live', // 'Live', 'Syncing', 'Delayed', 'Error'

    init() {
        console.log("RealtimeDataEngine: Initializing...");

        // Start the master heartbeat (60s)
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => this.heartbeat(), 60000);

        // Initial heartbeat
        this.heartbeat();

        // 8. Start Platform Intelligence Stream (New signal every minute)
        this.pulseIntelligence();

        // Setup Firestore listeners for real-time collections
        this.setupRealtimeListeners();
    },

    async heartbeat() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        this.updateStatus('Syncing');

        console.log("RealtimeDataEngine: Global heartbeat cycle started.");

        try {
            const tasks = [];
            for (const [name, task] of this.registry.entries()) {
                tasks.push(this.runTask(name, task));
            }

            await Promise.all(tasks);

            this.lastUpdated = new Date();
            this.updateStatus('Live');
            this.notifyUI();
        } catch (error) {
            console.error("RealtimeDataEngine: Heartbeat error", error);
            this.updateStatus('Error');
        } finally {
            this.isSyncing = false;
        }
    },

    async runTask(name, task) {
        try {
            const newData = await task.fetcher();
            if (task.callback) {
                task.callback(newData);
            }
        } catch (error) {
            console.error(`RealtimeDataEngine: Task [${name}] failed`, error);
        }
    },

    register(name, fetcher, callback) {
        this.registry.set(name, { fetcher, callback });
    },

    updateStatus(newStatus) {
        this.status = newStatus;
        const el = document.getElementById('realtime-status-indicator');
        if (el) {
            el.innerHTML = this.renderStatus();
        }
    },

    renderStatus() {
        let color = 'var(--success)';
        let icon = 'fiber_manual_record';
        let label = this.status;

        if (this.status === 'Syncing') {
            color = 'var(--accent)';
            icon = 'sync';
        } else if (this.status === 'Error') {
            color = 'var(--error)';
            icon = 'error';
        } else if (this.status === 'Delayed') {
            color = 'var(--warning)';
            icon = 'schedule';
        }

        return `
            <div class="status-indicator status-${this.status.toLowerCase()}" style="display:flex; align-items:center; gap:6px; background:rgba(0,0,0,0.3); padding:4px 10px; border-radius:100px; border:1px solid rgba(255,255,255,0.05); font-size:10px; font-weight:800; letter-spacing:0.5px; color:${color}">
                <span class="material-symbols-outlined ${this.status === 'Syncing' ? 'spin' : ''}" style="font-size:12px">${icon}</span>
                ${label.toUpperCase()}
            </div>
        `;
    },

    setupRealtimeListeners() {
        // Here we would setup onSnapshot for critical collections
        Database.listenToCollection('funding_alerts', (changes) => {
            window.dispatchEvent(new CustomEvent('techol_funding_alert', { detail: changes }));
        });

        Database.listenToCollection('market_metrics', (data) => {
            window.dispatchEvent(new CustomEvent('techol_metrics_update', { detail: data }));
        });

        // Global Anomaly Detection Task
        this.register('anomaly_detection',
            async () => {
                const results = await Database.detectAnomalies();
                return results;
            },
            (anomalies) => {
                if (anomalies && anomalies.length > 0) {
                    window.dispatchEvent(new CustomEvent('techol_anomaly_alert', { detail: anomalies }));
                    this.showAIAnomalyAlert(anomalies[0]);
                }
            }
        );
    },

    showAIAnomalyAlert(anomaly) {
        const container = document.getElementById('ai-alert-container');
        if (!container) return;

        container.innerHTML = `
            <div class="ai-anomaly-banner animate-slideIn" style="background:var(--bg-card); border-bottom:1px solid var(--error); padding:10px 20px; display:flex; align-items:center; gap:15px; position:relative; overflow:hidden">
                <div class="shimmer" style="position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(90deg, transparent, rgba(255,59,48,0.05), transparent); pointer-events:none"></div>
                <div style="background:rgba(255,59,48,0.1); color:var(--error); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0" class="pulse-red">
                    <span class="material-symbols-outlined" style="font-size:18px">warning</span>
                </div>
                <div style="flex:1">
                    <div style="display:flex; align-items:center; gap:8px">
                        <span style="font-size:10px; font-weight:900; letter-spacing:1px; color:var(--error)">AI DEFENSIVE MIGRATION ALERT</span>
                        <span style="font-size:10px; color:var(--text-tertiary)">${new Date().toLocaleTimeString()}</span>
                    </div>
                    <div style="font-size:13px; font-weight:700; color:var(--text-primary)">
                        ${anomaly.msg}
                    </div>
                </div>
                <button class="btn btn-sm btn-ghost" onclick="this.parentElement.remove()" style="color:var(--text-tertiary)">DISMISS</button>
            </div>
        `;
    },

    notifyUI() {
        // Trigger global UI refreshes for non-listener based components
        window.dispatchEvent(new CustomEvent('techol_heartbeat_sync', {
            detail: { timestamp: this.lastUpdated }
        }));

        // Update all "Last Updated" timestamps
        document.querySelectorAll('.last-updated-ts').forEach(el => {
            el.textContent = `Last synchronized: ${Utils.formatTimeShort(this.lastUpdated)}`;
        });
    },

    async pulseIntelligence() {
        // Run every minute
        setInterval(async () => {
            try {
                // Only "master" clients should post new insights to keep the feed clean,
                // but for this simulation we'll just check if a new post is needed.
                const latest = await Database.getLatestPlatformPosts(1);
                const now = Date.now();
                const lastTime = latest.length > 0 ? new Date(latest[0].createdAt).getTime() : 0;

                // If last platform post was more than 55s ago, post a new one
                if (now - lastTime > 55000) {
                    console.log("RealtimeDataEngine: Generating synthetic market intelligence...");
                    const insight = AIEngine.generateMarketInsight();
                    await Database.createPost({
                        ...insight,
                        authorId: 's6', // AI System Author
                        type: 'platform',
                        createdAt: new Date().toISOString()
                    }, 'ai');
                }
            } catch (e) {
                console.error("Pulse Intelligence Error:", e);
            }
        }, 60000);
    }
};

export default RealtimeDataEngine;
