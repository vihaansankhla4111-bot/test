/**
 * DataIngestionEngine.js
 * Specialized workers for fetching real-time market signals from FREE sources.
 * Architecture: Fetch -> Normalize -> Store in Firestore
 */

import Database from "./database.js";
import Utils from "./utils.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "./firebase-config.js";

const DataIngestionEngine = {
    workers: {},
    isIngesting: false,
    updateInterval: 60000, // 60 seconds

    init() {
        console.log("DataIngestionEngine: Initializing Core Workers...");

        // Register Workers
        this.registerFundingWorker();
        this.registerMarketWorker();
        this.registerTrendWorker();
        this.registerHiringWorker();
        this.registerDeveloperWorker();
        this.registerNewsWorker();
        this.registerGeoWorker();

        // Start Ingestion Heartbeat
        setInterval(() => this.runHeartbeat(), this.updateInterval);

        // Initial Run
        this.runHeartbeat();
    },

    async runHeartbeat() {
        if (this.isIngesting) return;
        this.isIngesting = true;

        try {
            const tasks = Object.values(this.workers).map(worker => worker.run());
            await Promise.allSettled(tasks);
        } catch (e) {
            console.error("IngestionEngine: Global Heartbeat Failure", e);
        } finally {
            this.isIngesting = false;
        }
    },

    // --- WORKER REGISTRATION ---

    registerFundingWorker() {
        this.workers.funding = this.createWorker('funding', async () => {
            // SEC EDGAR RSS (Public Filings)
            // Note: RSS to JSON bridge used for client-side environment
            const secFilings = await this.fetchPublicDataSource('https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=D&owner=include&output=atom', 'rss');
            if (!secFilings) return null;

            return secFilings.items.map(item => ({
                type: 'FUNDING_FILING',
                title: item.title,
                source: 'SEC EDGAR',
                link: item.link,
                timestamp: item.pubDate,
                metadata: { type: 'Form D', accessionNumber: item.guid }
            }));
        });
    },

    registerMarketWorker() {
        this.workers.market = this.createWorker('market', async () => {
            // Public Market Data (Alpha Vantage / Finnhub Free Tier Simulation)
            // Currently using symbolic tracking for tech sectors
            const techNodes = ['AI_CHIPS', 'CLOUD_INFRA', 'QUANT_COMP', 'BIO_ENGINE'];
            return techNodes.map(node => ({
                node,
                momentum: (50 + Math.random() * 40).toFixed(2),
                velocity: (Math.random() * 5).toFixed(2),
                sentiment: Math.random() > 0.5 ? 'BULLISH' : 'NEUTRAL'
            }));
        });
    },

    registerTrendWorker() {
        this.workers.trend = this.createWorker('trend', async () => {
            // Hacker News Top Stories (Free API)
            const hnIds = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r => r.json());
            const top5 = await Promise.all(hnIds.slice(0, 5).map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())));

            return top5.map(story => ({
                type: 'HN_TREND',
                title: story.title,
                points: story.score,
                author: story.by,
                link: story.url
            }));
        });
    },

    registerHiringWorker() {
        this.workers.hiring = this.createWorker('hiring', async () => {
            // Lever/Greenhouse public job spikes simulation
            return {
                velocity: (12.4 + Math.random() * 8).toFixed(1),
                topRoles: ['AI Research Engineer', 'Rust Infrastructure', 'Distributed Systems Specialist']
            };
        });
    },

    registerDeveloperWorker() {
        this.workers.developer = this.createWorker('developer', async () => {
            // GitHub Trending (Simulated repo acceleration)
            const githubSearch = await fetch('https://api.github.com/search/repositories?q=stars:>1000&sort=updated&order=desc').then(r => r.json());
            return githubSearch.items.slice(0, 5).map(repo => ({
                repo: repo.full_name,
                stars: repo.stargazers_count,
                pushedAt: repo.pushed_at,
                description: repo.description
            }));
        });
    },

    registerNewsWorker() {
        this.workers.news = this.createWorker('news', async () => {
            const sources = [
                'https://techcrunch.com/feed/',
                'http://feeds.feedburner.com/TechCrunch/',
                'https://news.ycombinator.com/rss',
                'https://www.theverge.com/rss/index.xml',
                'https://wired.com/feed/rss',
                'https://arstechnica.com/feed/',
                'https://gizmodo.com/rss',
                'https://mashable.com/feed/',
                'https://venturebeat.com/feed/',
                'https://engadget.com/rss.xml',
                'https://zdnet.com/news/rss.xml',
                'https://cnet.com/rss/all/',
                'https://computerworld.com/index.rss',
                'https://infoworld.com/index.rss',
                'https://networkworld.com/index.rss',
                'https://cio.com/index.rss',
                'https://itworld.com/index.rss',
                'https://pcworld.com/index.rss',
                'https://macworld.com/index.rss',
                'https://techworld.com/rss',
                'https://digitaltrends.com/feed/',
                'https://theNextWeb.com/feed/',
                'https://readwrite.com/feed/',
                'https://geek.com/feed/',
                'https://slashdot.org/slashdot.rss',
                'https://reddit.com/r/technology/.rss',
                'https://reddit.com/r/startups/.rss',
                'https://reddit.com/r/artificial/.rss',
                'https://recode.net/rss/index.xml',
                'https://businessinsider.com/rss',
                'https://forbes.com/technology/feed/',
                'https://bloomberg.com/technology/rss',
                'https://reuters.com/tools/rss/technology',
                'https://nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/technology/rss.xml',
                'https://wsj.com/xml/rss/3_7455.xml', // Tech
                'https://ft.com/technology?format=rss',
                'https://economist.com/sections/science-technology/rss.xml',
                'https://bbc.co.uk/news/technology/rss.xml',
                'https://guardian.co.uk/uk/technology/rss',
                'https://independent.co.uk/life-style/gadgets-and-tech/rss',
                'https://telegraph.co.uk/technology/rss.xml',
                'https://sky.com/feeds/news-technology.xml',
                'https://aljazeera.com/xml/rss/all.xml', // Filtered for tech
                'https://scmp.com/rss/318206/feed', // SCMP Tech
                'https://timesofindia.indiatimes.com/rssfeeds/6697331.xml', // TOI Tech
            ];

            // Randomly sample 10 sources per pulse to provide high variety from the top 50 sources
            const selected = sources.sort(() => 0.5 - Math.random()).slice(0, 10);
            const allItems = [];

            for (const url of selected) {
                const feed = await this.fetchPublicDataSource(url, 'rss');
                if (feed && feed.items) {
                    allItems.push(...feed.items.slice(0, 5).map(item => ({
                        title: item.title,
                        link: item.link,
                        description: item.description,
                        pubDate: item.pubDate,
                        author: item.author || 'Global Signal',
                        source: feed.feed.title || 'Multi-source Node'
                    })));
                }
            }

            return allItems;
        });
    },

    registerGeoWorker() {
        this.workers.geo = this.createWorker('geo', async () => {
            // Macro indicators (Simulated based on World Bank indices)
            return {
                globalRate: '6.4%',
                nodeSaturation: ['SF: High', 'Bangalore: High', 'Berlin: Med', 'Tokyo: Emerging']
            };
        });
    },

    // --- WORKER FACTORY ---

    createWorker(name, fetcher) {
        return {
            name,
            lastRun: 0,
            run: async () => {
                try {
                    console.log(`[Worker:${name}] Pulsing source...`);
                    const data = await fetcher();
                    if (data) {
                        await this.normalizeAndStore(name, data);
                    }
                    // Run cleanup every hour
                    if (Date.now() - this._lastCleanup > 3600000) {
                        this.cleanupOldData();
                    }
                } catch (e) {
                    console.error(`[Worker:${name}] Ingestion failed`, e);
                }
            }
        };
    },

    async normalizeAndStore(name, rawData) {
        // 1. DEDUPLICATION: Check if data already exists
        // 2. NORMALIZATION: Format for technical display
        // 3. STORAGE: Push to Firestore collections

        try {
            const batch = [];
            const timestamp = new Date().toISOString();

            // Map worker names to shared collection names
            const collectionMap = {
                'market': 'market_metrics',
                'funding': 'funding_alerts',
                'trend': 'trend_events',
                'hiring': 'hiring_signals',
                'developer': 'dev_velocity',
                'news': 'posts', // Redirect to main posts collection
                'geo': 'macro_signals'
            };

            const colName = collectionMap[name] || `${name}_events`;

            if (Array.isArray(rawData)) {
                for (const item of rawData) {
                    let sanitized = { ...item, ingestedAt: timestamp };
                    if (name === 'news') {
                        // Transform RSS news into a platform post
                        sanitized = {
                            text: `${item.title}\n\n${item.description?.replace(/<[^>]*>?/gm, '').slice(0, 300)}...\n\nRead more: ${item.link}`,
                            authorId: 's6', // TechOL Official
                            type: 'platform',
                            category: 'tech-problem', // Default category
                            source_link: item.link,
                            source_label: item.source,
                            createdAt: new Date(item.pubDate || Date.now()),
                            timestamp: serverTimestamp()
                        };
                    }
                    batch.push(this.saveEvent(colName, sanitized));
                }
            } else {
                batch.push(this.saveEvent(colName, { ...rawData, ingestedAt: timestamp }));
            }

            await Promise.all(batch);
            console.log(`[Worker:${name}] commit successful.`);
        } catch (e) {
            console.error(`[Worker:${name}] Commit error`, e);
        }
    },

    async saveEvent(colName, data) {
        // Prevent duplicate spamming
        const contentHash = Utils.generateHash(JSON.stringify(data.text || data.title || data));
        const colRef = collection(db, colName);

        const q = query(colRef, where('hash', '==', contentHash), limit(1));
        const existing = await getDocs(q);

        if (existing.empty) {
            await addDoc(colRef, {
                ...data,
                hash: contentHash,
                createdAt: data.createdAt || serverTimestamp(),
                timestamp: serverTimestamp()
            });
        }
    },

    async cleanupOldData() {
        console.log("DataIngestionEngine: Purging stale ingestion data...");
        this._lastCleanup = Date.now();
        // logic for deleting old posts could go here if we want to auto-purge Firestore
        // For now, we'll rely on time-based filtering in the UI (past 60 min)
    },

    _lastCleanup: 0,

    // --- HELPER METHODS ---

    async fetchPublicDataSource(url, type = 'json') {
        try {
            if (type === 'rss') {
                const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
                const json = await res.json();
                return json.status === 'ok' ? json : null;
            }
            const res = await fetch(url);
            return await res.json();
        } catch (e) {
            console.warn(`IngestionEngine: Failed to fetch [${url}]`, e);
            return null;
        }
    }
};

export default DataIngestionEngine;
