// ============================================
// TechOL — Database Service (localStorage Mock + Firebase Firestore Modular)
// ============================================
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, getDocs, query, orderBy, limit as fsLimit, where, onSnapshot, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase-config.js";
import AuthService from "./auth.js";

const MOCK_USERS = [
    { uid: 's1', displayName: 'Sarah Drift', username: 's_drift', bio: 'Senior AI Engineer at OpenAI. Building the next wave of intelligent systems.', photoURL: 'https://i.pravatar.cc/150?img=1', bannerImage: 'https://images.unsplash.com/photo-1620712943543-bcc4628c71d5?q=80&w=1200&auto=format&fit=crop', followers: 12500, following: 400, joinedDate: '2025-01-10', verified: true, location: 'San Francisco, CA', jobTitle: 'Senior AI Engineer', company: 'OpenAI', skills: ['LLMs', 'PyTorch', 'Rust', 'RAG'], industry: 'AI / ML', socialLinks: { github: 'github.com/s_drift', twitter: 'x.com/s_drift', linkedin: 'linkedin.com/in/s_drift' }, pinnedProjects: [{ title: 'OpenRAG', description: 'Advanced RAG framework for multi-modal LLMs.', link: 'github.com/s_drift/openrag' }], achievements: ['Hackathon Winner 2025', 'Open Source Contributor'] },
    { uid: 's2', displayName: 'Quantum Systems', username: 'quantum_sys', bio: 'Pioneering Quantum Computing. Future is entangled. 🌐', photoURL: 'https://i.pravatar.cc/150?img=2', bannerImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop', followers: 89000, following: 12, joinedDate: '2024-09-01', isCompany: true, verified: true, location: 'Boston, MA', industry: 'Quantum Computing', socialLinks: { website: 'quantumsys.io', twitter: 'x.com/quantumsys' } },
    { uid: 's3', displayName: 'DevOps Dan', username: 'devops_dan', bio: 'Infrastructure at scale. K8s, Terraform, GitOps.', photoURL: 'https://i.pravatar.cc/150?img=3', followers: 6700, following: 230, joinedDate: '2025-02-15', verified: true, location: 'Seattle, WA', jobTitle: 'Staff SRE', company: 'Amazon', skills: ['Kubernetes', 'Terraform', 'AWS', 'Go'], industry: 'DevOps' },
    { uid: 's4', displayName: 'Maya Chen', username: 'maya_ml', bio: 'ML Researcher @ DeepMind. NLP, reasoning, and alignment.', photoURL: 'https://i.pravatar.cc/150?img=5', followers: 15400, following: 180, joinedDate: '2024-11-20', verified: true, location: 'London, UK', jobTitle: 'Research Scientist', company: 'DeepMind', skills: ['PyTorch', 'JAX', 'NLP', 'Transformers'], industry: 'AI / ML' },
    { uid: 's5', displayName: 'Alex Turing', username: 'alex_turing', bio: 'Full-stack builder. TypeScript maximalist. Opinions are my own.', photoURL: 'https://i.pravatar.cc/150?img=8', followers: 3200, following: 540, joinedDate: '2025-03-01', verified: false, location: 'Austin, TX', jobTitle: 'Senior Engineer', company: 'Vercel', skills: ['TypeScript', 'Next.js', 'React', 'Node'], industry: 'Web Dev' },
    { uid: 's6', displayName: 'TechOL Official', username: 'techol_app', bio: 'The official TechOL platform account. Connecting the global building community to the future of technology. 🚀🌍', photoURL: 'assets/techol-logo.jpg', bannerImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop', followers: 980000, following: 10, isCompany: true, verified: true, joinedDate: '2024-01-01', location: 'Global / Decentralized' },
    { uid: 's7', displayName: 'Priya Kapoor', username: 'priya_code', bio: 'Founder & CEO @ CodeFlow. Ex-Stripe. Building developer tools.', photoURL: 'https://i.pravatar.cc/150?img=9', followers: 8900, following: 320, joinedDate: '2024-10-05', verified: true, location: 'New York, NY', jobTitle: 'Founder & CEO', company: 'CodeFlow', skills: ['Product', 'Go', 'React', 'System Design'], industry: 'Startups' },
    { uid: 's8', displayName: 'CSS Wizard', username: 'css_wizard', bio: 'Making the web beautiful, one pixel at a time ✨', photoURL: 'https://i.pravatar.cc/150?img=11', followers: 22000, following: 150, joinedDate: '2025-01-25', verified: true, location: 'Berlin, DE', jobTitle: 'Design Engineer', company: 'Figma', skills: ['CSS', 'Design Systems', 'Animation', 'SVG'], industry: 'Frontend' },
    { uid: 's9', displayName: 'Container King', username: 'container_k', bio: 'Docker, Kubernetes, and everything cloud-native. Open source contributor.', photoURL: 'https://i.pravatar.cc/150?img=12', followers: 4500, following: 280, joinedDate: '2025-04-10', verified: false, location: 'Toronto, CA', jobTitle: 'Cloud Architect', company: 'Shopify', skills: ['Docker', 'K8s', 'GCP', 'Istio'], industry: 'Cloud' },
    { uid: 's10', displayName: 'React Rachel', username: 'react_rachel', bio: 'React core team. Building the future of UI frameworks.', photoURL: 'https://i.pravatar.cc/150?img=16', followers: 45000, following: 90, joinedDate: '2024-08-15', verified: true, location: 'Menlo Park, CA', jobTitle: 'Software Engineer', company: 'Meta', skills: ['React', 'JavaScript', 'Compiler Design', 'WASM'], industry: 'Frontend' }
];

const SEED_POSTS = [
    { id: 'p1', authorId: 's6', text: '🚀 Big news: TechOL is now live with 30+ features! Jobs board, Mentorship, AI news, Code Snippets, Hackathons and much more. Explore and let us know what you think! #TechOL #Launch', category: 'announcement', likes: 2341, comments: 87, shares: 420, createdAt: new Date().toISOString() },
    { id: 'p2', authorId: 's1', text: 'Just finished training a custom LLM on code-completion tasks using only 3B tokens. Perplexity is down to 2.1 — beating GPT-3.5 on coding benchmarks 🔥 Open-sourcing the weights next week! #AI #OpenSource #LLM', category: 'project', likes: 1890, comments: 143, shares: 580, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'p3', authorId: 's4', text: 'Fascinating paper dropped today: "Emergent reasoning in 7B parameter models trained on synthetic CoT data." We\'re showing that reasoning ability is more about training distribution than model size. #ML #Research #NLP', category: 'ai-future', likes: 934, comments: 62, shares: 210, createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'p4', authorId: 's8', text: 'CSS tip of the day: `container-query` is the future. Stop writing media queries based on viewport width when you can query the parent container instead! ```css\n@container (min-width: 400px) {\n  .card { grid-template-columns: 1fr 1fr; }\n}``` #CSS #WebDev', category: 'tutorial', likes: 567, comments: 28, shares: 190, createdAt: new Date(Date.now() - 10800000).toISOString() },
    { id: 'p5', authorId: 's3', text: 'My team just migrated 200 microservices from ECS to Kubernetes. Lessons learned: 1) Invest heavily in observability first 2) Gradual traffic shifting is non-negotiable 3) Helm charts are your best friend. Thread below 🧵 #DevOps #Kubernetes #AWS', category: 'discussion', likes: 724, comments: 51, shares: 150, createdAt: new Date(Date.now() - 14400000).toISOString() },
    { id: 'p6', authorId: 's7', text: 'We just closed our seed round! 🎉 $2.3M raised to build the future of developer collaboration. If you\'re a passionate engineer who wants to shape the next era of tech tooling — we\'re hiring! DM me. #Startup #Hiring', category: 'startup-idea', likes: 1250, comments: 89, shares: 340, createdAt: new Date(Date.now() - 21600000).toISOString() },
    { id: 'p7', authorId: 's2', text: 'Breaking: our quantum error correction algorithm now achieves 99.5% gate fidelity at room temperature. This is the milestone the industry has been waiting for. Paper preprint: arxiv.org/abs/quant #QuantumComputing #Physics', category: 'project', likes: 3400, comments: 210, shares: 890, createdAt: new Date(Date.now() - 28800000).toISOString() },
    { id: 'p8', authorId: 's5', text: 'Hot take: TypeScript will replace Python as the dominant AI/ML language by 2028. The ecosystem is maturing fast, and JS runtime on edge is too compelling. Prove me wrong. #TypeScript #AI #HotTake', category: 'discussion', likes: 445, comments: 178, shares: 90, createdAt: new Date(Date.now() - 36000000).toISOString() },
    { id: 'p9', authorId: 's9', text: 'If your Docker images are larger than 200MB, here\'s what you\'re doing wrong:\n- Using full base images instead of `alpine`\n- Not leveraging multi-stage builds\n- Copying node_modules into the image\n- Not using .dockerignore\nFix these and watch your CI times drop by 60%! #Docker #DevOps', category: 'tutorial', likes: 892, comments: 44, shares: 330, createdAt: new Date(Date.now() - 43200000).toISOString() },
    { id: 'p10', authorId: 's10', text: 'React 19 is absolutely game-changing. The new compiler eliminates almost all need for `useMemo` and `useCallback`. I removed 400 lines of optimization code from our codebase and performance actually improved. #React #Frontend', category: 'tech-problem', likes: 1102, comments: 96, shares: 420, createdAt: new Date(Date.now() - 50400000).toISOString() }
];

const Database = {
    _save(key, data) { try { localStorage.setItem('techol_' + key, JSON.stringify(data)); } catch (e) { } },
    _load(key, def = []) { try { return JSON.parse(localStorage.getItem('techol_' + key)) ?? def; } catch (e) { return def; } },

    seedIfEmpty() {
        if (!this._load('seeded', false)) {
            this._save('posts', SEED_POSTS);
            this._save('comments', []);
            this._save('likes', {});
            this._save('bookmarks', {});
            this._save('follows', {});
            this._save('events', [
                { id: 'ev1', companyId: 's6', title: 'TechOL DevSummit 2026', description: 'The premier conference for builders, startup founders and AI engineers.', date: '2026-04-10', time: '10:00 AM', location: 'Virtual / San Francisco', attendees: 1240 },
                { id: 'ev2', companyId: 's2', title: 'Quantum Computing Bootcamp', description: 'Deep dive into quantum circuits, algorithms and error correction.', date: '2026-03-20', time: '9:00 AM', location: 'MIT Campus, Boston', attendees: 540 }
            ]);
            this._save('seeded', true);
        }
    },

    async getUser(uid) {
        if (!uid) return null;
        const mock = MOCK_USERS.find(u => u.uid === uid);
        if (mock) return { ...mock };
        const registered = this._load('registered_users', []);
        const reg = registered.find(u => u.uid === uid);
        if (reg) return reg;
        try {
            // Race Firestore against a 3s timeout so feed never hangs
            const userDoc = await Promise.race([
                getDoc(doc(db, 'users', uid)),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]);
            if (userDoc.exists()) return { id: userDoc.id, ...userDoc.data() };
        } catch (e) { /* Firestore unreachable or timed out — use fallback */ }
        return { uid, displayName: 'TechOL User', username: 'user_' + uid.substring(0, 5), followers: 0, following: 0, joinedDate: new Date().toISOString() };
    },

    async saveUser(userData) {
        const registered = this._load('registered_users', []);
        const idx = registered.findIndex(u => u.uid === userData.uid);
        if (idx >= 0) registered[idx] = userData; else registered.push(userData);
        this._save('registered_users', registered);
        try { await setDoc(doc(db, 'users', userData.uid), userData, { merge: true }); } catch (e) { }
    },

    async searchUsers(query) {
        if (!query) return [];
        const q = query.toLowerCase().replace('@', '').trim();
        const registered = this._load('registered_users', []);
        const allUsers = [...MOCK_USERS, ...registered];
        const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.uid, u])).values());
        return uniqueUsers.filter(u =>
            (u.displayName && u.displayName.toLowerCase().includes(q)) ||
            (u.username && u.username.toLowerCase().includes(q))
        );
    },

    async getSuggestedUsers(currentUid) {
        return MOCK_USERS.filter(u => u.uid !== currentUid).slice(0, 5);
    },

    /**
     * Stable Feed Architecture (Production Grade)
     */
    getLatestPlatformPosts: async function (limit = 60) {
        try {
            // Try Firebase first
            const q = query(
                collection(db, 'posts'),
                where('type', '==', 'platform'),
                orderBy('createdAt', 'desc'),
                fsLimit(limit)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            // Fallback to localStorage cache
            const cached = localStorage.getItem('techol_platform_posts');
            return cached ? JSON.parse(cached) : [];
        }
    },

    async getFeedPosts(limit = 20, lastDoc = null, source = 'human') {
        const collectionName = source === 'ai' ? 'ai_posts' : 'posts';
        try {
            let q = query(
                collection(db, collectionName),
                orderBy('createdAt', 'desc'),
                fsLimit(limit)
            );

            if (lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : (doc.data().createdAt || new Date().toISOString())
            }));

            return {
                posts,
                lastVisible: snapshot.docs[snapshot.docs.length - 1]
            };
        } catch (e) {
            console.error("Feed Fetch Error:", e);
            return { posts: [], lastVisible: null };
        }
    },

    listenToFeedPosts: function (limit = 50, filter = 'all', callback) {
        // Dashboard requirement: only past 60 minutes
        const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000);

        let q = query(
            collection(db, 'posts'),
            where('createdAt', '>=', sixtyMinAgo),
            orderBy('createdAt', 'desc'),
            fsLimit(limit)
        );

        // Fallback or specific filter?
        if (filter === 'platform') {
            q = query(collection(db, 'posts'), where('type', '==', 'platform'), orderBy('createdAt', 'desc'), fsLimit(limit));
        }

        return onSnapshot(q, (snapshot) => {
            let posts = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
                };
            });

            // FALLBACK: If 60 min filter returned nothing, fetch last 50 regardless of time
            if (posts.length === 0 && filter === 'all') {
                console.warn("Feed: 60min window empty, falling back to historical signals.");
                this.getFeedPosts(limit).then(res => {
                    if (res.posts.length > 0) callback(res.posts, [], false);
                });
                return;
            }

            const docChanges = snapshot.docChanges();

            // Cache for offline access
            localStorage.setItem('techol_feed_posts', JSON.stringify(posts));

            callback(posts, docChanges, snapshot.metadata.fromCache);
        }, (error) => {
            console.error('Feed listener error:', error);
            // Fallback to cached data
            const cached = localStorage.getItem('techol_feed_posts');
            if (cached) {
                callback(JSON.parse(cached), [], true);
            }
        });
    },

    async purgePlatformPosts() {
        try {
            const q = query(collection(db, 'posts'), where('type', '==', 'platform'), fsLimit(500));
            const snap = await getDocs(q);
            const batchCount = snap.size;
            if (batchCount === 0) return;
            for (const d of snap.docs) {
                await deleteDoc(doc(db, 'posts', d.id));
            }
            console.log(`Decommissioned ${batchCount} intelligence nodes.`);
        } catch (e) {
            console.error("Purge Error:", e);
        }
    },

    async createPost(data, source = 'human') {
        if (!data.authorId || !data.text) throw new Error("Missing post data");
        // All posts now go into 'posts' collection for unified feed
        const collectionName = 'posts';

        const post = {
            ...data,
            source,
            type: data.type || (source === 'ai' ? 'platform' : 'human'),
            likes: data.likes !== undefined ? data.likes : 0,
            comments: data.comments !== undefined ? data.comments : 0,
            shares: data.shares !== undefined ? data.shares : 0,
            createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt) : serverTimestamp()
        };

        try {
            let res;
            if (data.id) {
                await setDoc(doc(db, collectionName, data.id), post);
                // For UI return, handle timestamp conversion
                res = { ...post, id: data.id, createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : (new Date().toISOString()) };
            } else {
                const docRef = await addDoc(collection(db, collectionName), post);
                res = { ...post, id: docRef.id, createdAt: new Date().toISOString() };
            }

            return res;
        } catch (e) {
            console.error("Firestore Post Error:", e);
            throw e;
        }
    },



    async getPostsByUser(uid) {
        try {
            const q = query(
                collection(db, 'posts'),
                where('authorId', '==', uid),
                orderBy('createdAt', 'desc'),
                fsLimit(50)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                const ts = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString());
                return { ...data, id: doc.id, createdAt: ts };
            });
        } catch (e) {
            console.warn("DB: Fetch by user failed, using local catch-all", e);
            return this._load('posts', []).filter(p => p.authorId === uid).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
    },

    async deletePost(postId) {
        const posts = this._load('posts', []);
        this._save('posts', posts.filter(p => p.id !== postId));
    },

    async toggleLike(postId, uid) {
        const likes = this._load('likes', {});
        if (!likes[postId]) likes[postId] = [];
        const idx = likes[postId].indexOf(uid);
        const isLiked = idx === -1;
        if (isLiked) likes[postId].push(uid); else likes[postId].splice(idx, 1);
        this._save('likes', likes);
        const posts = this._load('posts', []);
        const p = posts.find(x => x.id === postId);
        if (p) { p.likes = likes[postId].length; this._save('posts', posts); }
        return isLiked;
    },

    isLiked(postId, uid) {
        const likes = this._load('likes', {});
        return !!(likes[postId] && likes[postId].includes(uid));
    },

    async toggleBookmark(postId, uid) {
        const bookmarks = this._load('bookmarks', {});
        if (!bookmarks[uid]) bookmarks[uid] = [];
        const idx = bookmarks[uid].indexOf(postId);
        if (idx === -1) bookmarks[uid].push(postId); else bookmarks[uid].splice(idx, 1);
        this._save('bookmarks', bookmarks);
        return idx === -1;
    },

    async getBookmarkedPosts(uid) {
        const bookmarks = this._load('bookmarks', {});
        const ids = bookmarks[uid] || [];
        if (!ids.length) return [];

        try {
            // Fetch from Firestore in batches (max 10 for 'in' query)
            const batches = [];
            for (let i = 0; i < ids.length; i += 10) {
                const chunk = ids.slice(i, i + 10);
                const q = query(collection(db, 'posts'), where('__name__', 'in', chunk));
                batches.push(getDocs(q));
            }
            const snapshots = await Promise.all(batches);
            const firePosts = snapshots.flatMap(s => s.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt
            })));

            return firePosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (e) {
            console.warn("DB: Bookmarks fetch failed", e);
            const posts = this._load('posts', []);
            return posts.filter(p => ids.includes(p.id));
        }
    },

    async getComments(postId) {
        return this._load('comments', []).filter(c => c.postId === postId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    },

    async addComment(postId, data) {
        const comment = { id: 'c_' + Date.now(), postId, ...data, createdAt: new Date().toISOString() };
        const comments = this._load('comments', []);
        comments.push(comment);
        this._save('comments', comments);
        const posts = this._load('posts', []);
        const p = posts.find(x => x.id === postId);
        if (p) { p.comments = (p.comments || 0) + 1; this._save('posts', posts); }
        return comment;
    },

    async getFollowerCount(uid) {
        const follows = this._load('follows', {});
        let count = 0;
        for (const followerUid in follows) {
            if (follows[followerUid].includes(uid)) count++;
        }
        return count;
    },

    async getFollowingCount(uid) {
        const follows = this._load('follows', {});
        return follows[uid] ? follows[uid].length : 0;
    },

    async getFollowersList(uid) {
        const follows = this._load('follows', {});
        let followers = [];
        for (const followerUid in follows) {
            if (follows[followerUid].includes(uid)) followers.push(followerUid);
        }
        return followers;
    },

    async getFollowingList(uid) {
        const follows = this._load('follows', {});
        return follows[uid] || [];
    },

    async followUser(targetUid, followerUid) {
        const follows = this._load('follows', {});
        if (!follows[followerUid]) follows[followerUid] = [];
        if (!follows[followerUid].includes(targetUid)) follows[followerUid].push(targetUid);
        this._save('follows', follows);
        const users = this._load('users', {});
        if (users[followerUid]) users[followerUid].following = (users[followerUid].following || 0) + 1;
        if (users[targetUid]) users[targetUid].followers = (users[targetUid].followers || 0) + 1;
        this._save('users', users);
        return true;
    },

    async unfollowUser(targetUid, followerUid) {
        const follows = this._load('follows', {});
        if (follows[followerUid]) {
            const index = follows[followerUid].indexOf(targetUid);
            if (index > -1) {
                follows[followerUid].splice(index, 1);
                this._save('follows', follows);
                const users = this._load('users', {});
                if (users[followerUid]) users[followerUid].following = Math.max(0, (users[followerUid].following || 0) - 1);
                if (users[targetUid]) users[targetUid].followers = Math.max(0, (users[targetUid].followers || 0) - 1);
                this._save('users', users);
            }
        }
        return true;
    },

    async isFollowing(targetUid, followerUid) {
        const follows = this._load('follows', {});
        return !!(follows[followerUid] && follows[followerUid].includes(targetUid));
    },

    async getEvents(limit = 20) {
        this.seedIfEmpty();
        return this._load('events', []).slice(0, limit);
    },

    async createEvent(data) {
        const event = { id: 'ev_' + Date.now(), ...data, attendees: 0, createdAt: new Date().toISOString() };
        const events = this._load('events', []);
        events.unshift(event);
        this._save('events', events);
        return event;
    },

    async attendEvent(eventId, uid) {
        const events = this._load('events', []);
        const ev = events.find(e => e.id === eventId);
        if (ev) { ev.attendees = (ev.attendees || 0) + 1; this._save('events', events); }
        return true;
    },

    async getConversations(uid) {
        return this._load('convos', []).filter(c => c.participants.includes(uid)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },

    async getOrCreateConversation(uid1, uid2) {
        let convos = this._load('convos', []);
        let convo = convos.find(c => c.participants.includes(uid1) && c.participants.includes(uid2));
        if (!convo) {
            convo = { id: 'conv_' + Date.now(), participants: [uid1, uid2], lastMessage: '', updatedAt: new Date().toISOString() };
            convos.push(convo);
            this._save('convos', convos);
        }
        return convo;
    },

    async sendMessage(convoId, senderId, text) {
        const msg = { id: 'msg_' + Date.now(), convoId, senderId, text, createdAt: new Date().toISOString(), read: false };
        const msgs = this._load('messages', []);
        msgs.push(msg);
        this._save('messages', msgs);
        const convos = this._load('convos', []);
        const c = convos.find(x => x.id === convoId);
        if (c) { c.lastMessage = text; c.updatedAt = new Date().toISOString(); this._save('convos', convos); }
        window.dispatchEvent(new CustomEvent('techol_msg_' + convoId));
        setTimeout(() => {
            const currentMsgs = this._load('messages', []);
            const m = currentMsgs.find(x => x.id === msg.id);
            if (m) {
                m.read = true;
                this._save('messages', currentMsgs);
                window.dispatchEvent(new CustomEvent('techol_msg_' + convoId));
            }
        }, 2000);
        return msg;
    },

    listenToMessages(convoId, callback) {
        const run = () => {
            const msgs = this._load('messages', []).filter(m => m.convoId === convoId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            let changed = false;
            msgs.forEach(m => {
                if (!m.read && m.senderId !== AuthService.getUser()?.uid) {
                    m.read = true; changed = true;
                }
            });
            if (changed) {
                const allMsgs = this._load('messages', []);
                allMsgs.forEach(am => {
                    const match = msgs.find(m => m.id === am.id);
                    if (match) am.read = match.read;
                });
                this._save('messages', allMsgs);
            }
            callback(msgs);
        };
        run();
        const evt = 'techol_msg_' + convoId;
        window.addEventListener(evt, run);
        return { unsubscribe: () => window.removeEventListener(evt, run) };
    },

    async addReaction(postId, emoji) {
        try {
            const postRef = doc(db, 'posts', postId);
            const postDoc = await getDoc(postRef);
            if (postDoc.exists()) {
                const data = postDoc.data();
                const reactions = data.reactions || {};
                reactions[emoji] = (reactions[emoji] || 0) + 1;
                await setDoc(postRef, { reactions }, { merge: true });
            }
        } catch (e) {
            console.error("DB: Reaction failed", e);
        }
    },

    async getNotifications(uid) {
        return this._load('notifications', []).filter(n => n.targetUid === uid).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async createNotification(data) {
        const n = { id: 'n_' + Date.now(), ...data, createdAt: new Date().toISOString(), read: false };
        const notifs = this._load('notifications', []);
        notifs.unshift(n);
        this._save('notifications', notifs);
        return n;
    },

    async markNotificationsRead(uid) {
        const notifs = this._load('notifications', []);
        notifs.forEach(n => { if (n.targetUid === uid) n.read = true; });
        this._save('notifications', notifs);
    },

    async getTrendingHashtags() {
        return [
            { tag: '#TechOL', count: '12.4K' },
            { tag: '#AI', count: '98.3K' },
            { tag: '#OpenSource', count: '45.1K' },
            { tag: '#Web3', count: '23.7K' },
            { tag: '#React19', count: '8.9K' },
            { tag: '#Kubernetes', count: '14.2K' }
        ];
    },

    async searchPosts(query) {
        if (!query) return [];
        const q = query.toLowerCase().replace('@', '').trim();
        const posts = this._load('posts', []);
        const results = [];
        for (const p of posts) {
            const author = await this.getUser(p.authorId);
            const matchesText = p.text.toLowerCase().includes(q);
            const matchesHashtag = p.hashtags && p.hashtags.join(' ').toLowerCase().includes(q);
            const matchesAuthor = author && (
                author.displayName.toLowerCase().includes(q) ||
                author.username.toLowerCase().includes(q)
            );
            if (matchesText || matchesHashtag || matchesAuthor) results.push(p);
        }
        return results;
    },

    async getJobs() {
        return [
            {
                id: 'j1',
                title: 'Senior AI Engineer',
                company: 'OpenAI',
                location: 'San Francisco, CA',
                salary: '$250k - $400k',
                type: 'Full-time',
                description: 'We are looking for a world-class AI researcher to push the boundaries of LLMs. You will work on pre-training and alignment of next-gen models.',
                requirements: ['PhD in CS or related field', '5+ years experience in ML', 'Expertise in PyTorch/Jax'],
                postedAt: '2d ago'
            },
            {
                id: 'j2',
                title: 'Principal Backend Architect',
                company: 'Vercel',
                location: 'Remote',
                salary: '$200k - $320k',
                type: 'Full-time',
                description: 'Help build the next generation of serverless infrastructure. You will be responsible for low-latency networking and global state management.',
                requirements: ['Expertise in Go/Rust', 'Deep understanding of HTTP/2 and gRPC', 'Experience scaling to millions of req/s'],
                postedAt: '1d ago'
            }
        ];
    },

    async getGroups() {
        return [
            { id: 'g1', name: 'AI & Machine Learning', description: 'Discussing the latest in ML research, papers, and tools.', members: 24500, image: '🤖' },
            { id: 'g2', name: 'Web3 Builders', description: 'Decentralized apps, protocols, and the open web.', members: 12800, image: '🌐' },
            { id: 'g3', name: 'Open Source Alliance', description: 'Maintain, contribute, and discover open-source projects.', members: 34200, image: '💚' },
            { id: 'g4', name: 'Startup Founders', description: 'Founders sharing learnings, fails, and wins.', members: 8700, image: '🚀' },
            { id: 'g5', name: 'DevOps & Cloud', description: 'Kubernetes, Docker, AWS, GCP — all things ops.', members: 19300, image: '☁️' }
        ];
    },

    async getCourses() {
        return [
            {
                id: 'c1',
                title: 'CS50: Introduction to Computer Science',
                duration: '11 weeks',
                level: 'Beginner',
                rating: 4.9,
                instructor: 'David J. Malan',
                platform: 'Harvard / edX',
                image: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=800&auto=format&fit=crop',
                link: 'https://www.edx.org/course/introduction-computer-science-harvardx-cs50x',
                description: 'The legendary introduction to the intellectual enterprises of computer science and the art of programming.'
            },
            {
                id: 'c2',
                title: 'Machine Learning Specialization',
                duration: '3 months',
                level: 'Intermediate',
                rating: 4.8,
                instructor: 'Andrew Ng',
                platform: 'Stanford / Coursera',
                image: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=800&auto=format&fit=crop',
                link: 'https://www.coursera.org/specializations/machine-learning-introduction',
                description: 'Build machine learning models with NumPy and scikit-learn. Build and train neural networks with TensorFlow.'
            },
            {
                id: 'c3',
                title: 'Full Stack Open 2024',
                duration: 'Free Pace',
                level: 'Advanced',
                rating: 4.9,
                instructor: 'Team Helsinki',
                platform: 'University of Helsinki',
                image: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800&auto=format&fit=crop',
                link: 'https://fullstackopen.com/en/',
                description: 'Learn React, Redux, Node.js, MongoDB, GraphQL and TypeScript in one go! This course will introduce you to modern JavaScript-based web development.'
            }
        ];
    },

    async getPodcasts() {
        return [
            { id: 'p1', title: 'The AI & Society Podcast', host: 'TechOL Originals', duration: '52m', listens: 154000, episode: 'Ep. 91' },
            { id: 'p2', title: 'Scaling Startups', host: 'Dev Startup CEO', duration: '38m', listens: 82000, episode: 'Ep. 44' },
            { id: 'p3', title: 'Open Source Weekly', host: 'Open Source Dev', duration: '45m', listens: 41000, episode: 'Ep. 117' },
            { id: 'p4', title: 'Backend Mastery', host: 'Marcus Lee', duration: '61m', listens: 28000, episode: 'Ep. 29' }
        ];
    },

    async getLeaderboard() {
        return [
            { uid: 's6', name: 'TechOL Official', score: 98400, rank: 1, badge: '🏆' },
            { uid: 's4', name: 'Dr. Emily Chen', score: 52000, rank: 2, badge: '🥈' },
            { uid: 's8', name: 'Frontend Ninja', score: 43200, rank: 3, badge: '🥉' },
            { uid: 's2', name: 'Quantum Systems', score: 38700, rank: 4, badge: '🎖️' },
            { uid: 's7', name: 'Dev Startup CEO', score: 29500, rank: 5, badge: '⭐' },
            { uid: 's3', name: 'Marcus Lee', score: 21400, rank: 6, badge: '⭐' },
            { uid: 's1', name: 'Sarah Drift', score: 18200, rank: 7, badge: '⭐' },
            { uid: 's9', name: 'DevOps Master', score: 14400, rank: 8, badge: '⭐' },
            { uid: 's5', name: 'Open Source Dev', score: 8700, rank: 9, badge: '⭐' },
            { uid: 's10', name: 'Jane Web Dev', score: 4100, rank: 10, badge: '⭐' }
        ];
    },

    async getCollabs() {
        return [
            { id: 'col1', title: 'Open Source AI Coding Assistant', seeking: ['Python', 'LLM', 'React'], stage: 'Alpha', owner: 'Sarah Drift', description: 'Building a privacy-first AI assistant that runs locally on modern hardware.' },
            { id: 'col2', title: 'Decentralized Social Protocol', seeking: ['Rust', 'Blockchain', 'P2P'], stage: 'Concept', owner: 'Open Source Dev', description: 'The next evolution of social networking – owned by the users, not the platform.' },
            { id: 'col3', title: 'Developer Ops Dashboard', seeking: ['Go', 'DevOps', 'UI/UX'], stage: 'Beta', owner: 'DevOps Master', description: 'A unified dashboard for tracking K8s clusters across multi-cloud environments.' }
        ];
    },

    async getSnippets() {
        return [
            {
                id: 'sn1',
                title: 'useDebounce Hook',
                language: 'typescript',
                code: 'function useDebounce<T>(value: T, delay: number): T {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const handler = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(handler);\n  }, [value, delay]);\n  return debounced;\n}',
                likes: 1342,
                description: 'A custom React hook that debounces a value. Essential for optimizing performance in inputs.',
                explainer: 'This hook uses useEffect to delay the update of a value. It cleans up previous timeouts on every change, ensuring only the latest value is set after the delay.'
            },
            {
                id: 'sn2',
                title: 'CSS Glassmorphism Card',
                language: 'css',
                code: '.glass-card {\n  background: rgba(255,255,255,0.08);\n  backdrop-filter: blur(12px);\n  border: 1px solid rgba(255,255,255,0.15);\n  border-radius: 16px;\n  box-shadow: 0 0 10px var(--accent-glow);\n}',
                likes: 2890,
                description: 'Premium frosted-glass effect for modern UI cards.',
                explainer: 'Uses backdrop-filter for the blur and alpha-blended backgrounds for the translucent look.'
            }
        ];
    },

    async getMentors() {
        return [
            { id: 'm1', name: 'Dr. Emily Chen', expertise: 'Machine Learning & NLP', company: 'MIT', rate: 'Free', uid: 's4', bio: 'Expert in transformers and reasoning models.' },
            { id: 'm2', name: 'Marcus Lee', expertise: 'System Architecture & Scaling', company: 'Ex-Amazon', rate: '$80/hr', uid: 's3', bio: 'Scaling systems from 0 to 1M+ active users.' },
            { id: 'm3', name: 'Sarah Drift', expertise: 'AI Engineering & LLMs', company: 'OpenAI', rate: '$120/hr', uid: 's1', bio: 'Working on the most advanced AI at OpenAI.' }
        ];
    },

    async getMarketplaceItems() {
        return [
            { id: 'mk1', title: 'TechOL SaaS Starter Kit', price: '$49', rating: 4.9, sales: 1250, category: 'Template' },
            { id: 'mk2', title: 'Advanced System Design PDF', price: '$19', rating: 4.8, sales: 3400, category: 'eBook' },
            { id: 'mk3', title: 'React Component Pack (50+ items)', price: '$29', rating: 4.7, sales: 870, category: 'UI Kit' },
            { id: 'mk4', title: 'DevOps Automation Scripts', price: '$39', rating: 4.6, sales: 420, category: 'Scripts' }
        ];
    },

    async getHackathons() {
        return [
            { id: 'h1', title: 'OpenAI DevDay Hackathon 2026', dates: 'Mar 15 – Mar 20', prize: '$100,000', format: 'Global / Virtual', participants: 4500, link: 'https://devpost.com/hackathons', image: 'https://images.unsplash.com/photo-1620712943543-bcc4628c71d5?q=80&w=800&auto=format&fit=crop', description: 'Build innovative agents using the GPT-5 API. Prizes for creativity, performance, and utility.' },
            { id: 'h2', title: 'Microsoft Imagine Cup', dates: 'May 1 – May 15', prize: '$50,000', format: 'Hybrid', participants: 12000, link: 'https://imaginecup.microsoft.com/', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop', description: 'Experience the magic of technology. Imagine Cup is a global competition that empowers the next generation of students to team up and use their creativity, passion, and knowledge of technology to create solutions.' },
            { id: 'h3', title: 'Unstop Ignite 2026', dates: 'Apr 10 – Apr 12', prize: '₹5,00,000', format: 'In-person / Virtual', participants: 850, link: 'https://unstop.com/hackathons', image: 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?q=80&w=800&auto=format&fit=crop', description: 'The ultimate case-solve and coding challenge. Bring your best ideas to life in 48 hours.' }
        ];
    },

    async uploadPostImage(userId, file) {
        if (!file) return null;
        try {
            const filename = `post_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const storageRef = ref(storage, `posts/${userId}/${filename}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (e) {
            console.error("Storage upload error:", e);
            throw e;
        }
    },

    /**
     * REAL-TIME ENGINE INFRASTRUCTURE
     */
    listenToCollection(collectionPath, callback, limitCount = 20) {
        const q = query(
            collection(db, collectionPath),
            orderBy('updatedAt', 'desc'),
            fsLimit(limitCount)
        );
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(data, snapshot.docChanges());
        }, (err) => {
            console.warn(`Database: Real-time listener failed for [${collectionPath}]`, err);
        });
    },

    async getMarketIntelligence(keyword, sector) {
        try {
            const q = query(
                collection(db, 'market_metrics'),
                where('keyword', '==', keyword),
                orderBy('timestamp', 'desc'),
                fsLimit(30)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                return snap.docs.map(d => d.data());
            }
        } catch (e) { console.error("DB: Market Fetch Error", e); }
        return this._generateLiveSimulation(keyword, sector);
    },

    _generateLiveSimulation(keyword, sector) {
        const data = [];
        let base = 40 + Math.random() * 40;
        for (let i = 0; i < 30; i++) {
            base += (Math.random() - 0.45) * 5;
            data.push({
                timestamp: new Date(Date.now() - (i * 3600000)).toISOString(),
                value: Math.max(10, Math.floor(base)),
                sector: sector,
                keyword: keyword
            });
        }
        return data.reverse();
    },

    async getFundingAlerts(limitCount = 10) {
        try {
            const q = query(collection(db, 'funding_alerts'), orderBy('timestamp', 'desc'), fsLimit(limitCount));
            const snap = await getDocs(q);
            if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) { }
        return [
            { id: 'f1', company: 'NeuralFlow', amount: 45, round: 'Series B', investor: 'Sequoia', timestamp: new Date().toISOString() },
            { id: 'f2', company: 'QuantUM', amount: 120, round: 'Series C', investor: 'Andreessen Horowitz', timestamp: new Date().toISOString() },
            { id: 'f3', company: 'EcoBrix', amount: 12, round: 'Seed', investor: 'Y Combinator', timestamp: new Date().toISOString() }
        ];
    },

    async getSectorMomentum() {
        // AI-calculated momentum score (0-100)
        const sectors = [
            { label: 'AI / ML', volume: 4500000, change: 12.5, intensity: 85 },
            { label: 'Quantum', volume: 2100000, change: 8.2, intensity: 60 },
            { label: 'FinTech', volume: 3800000, change: -2.1, intensity: 70 },
            { label: 'Robotics', volume: 1500000, change: 15.4, intensity: 50 },
            { label: 'HealthTech', volume: 2900000, change: 5.8, intensity: 65 }
        ];
        return sectors.map(s => {
            const base = 50 + Math.random() * 40;
            const change = (Math.random() * 10 - 2).toFixed(1);
            return {
                sector: s.label,
                score: Math.floor(base),
                momentum: change > 0 ? 'up' : 'down',
                change: change,
                insights: [
                    "High clustering of Series A activity detected.",
                    "Talent migration from Big Tech to early stage nodes.",
                    "Anomaly: Search velocity up 40% this week."
                ],
                label: s.label,
                volume: s.volume * (1 + Math.random() * 0.1),
                intensity: s.intensity
            };
        });
    },

    detectAnomalies(data) {
        if (!data || data.length < 5) return null;
        const values = data.map(d => d.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / values.length);
        const lastValue = values[values.length - 1];
        if (lastValue > mean + (2 * stdDev)) {
            return { type: 'SPIKE', message: 'Abnormal growth detected', magnitude: ((lastValue / mean) * 100).toFixed(0) + '%' };
        }
        return null;
    }
};

window.Database = Database;
Database.seedIfEmpty();
export default Database;
