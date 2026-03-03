// ============================================
// TechOL — Auth Service (Production-Grade)
// ============================================
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    updateProfile as fbUpdateProfile,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    browserLocalPersistence,
    setPersistence
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase-config.js";

const AuthService = {
    currentUser: null,
    initialized: false,
    _authListenerSetup: false,

    /**
     * Initialize auth — sets persistence to LOCAL.
     * State management is now handled in App.init.
     */
    async init() {
        if (this.initialized) return this.currentUser;
        try {
            await setPersistence(auth, browserLocalPersistence);
            this.initialized = true;
        } catch (e) {
            console.warn('Auth: setPersistence failed', e);
        }
        return this.currentUser;
    },

    /**
     * Hydrate user data from Firebase Auth + Firestore
     */
    async updateUserInfo(user) {
        let extra = {};
        try {
            const lastUpdate = localStorage.getItem('techol_last_db_sync');
            const now = Date.now();
            // Fetch from Firestore if cache is stale (>5 min)
            if (!lastUpdate || (now - parseInt(lastUpdate)) > 300000) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    extra = userDoc.data();
                    localStorage.setItem('techol_last_db_sync', now.toString());
                    localStorage.setItem('techol_user_profile_' + user.uid, JSON.stringify(extra));
                }
            } else {
                extra = JSON.parse(localStorage.getItem('techol_user_profile_' + user.uid) || '{}');
            }
        } catch (e) { console.warn('Auth: DB Sync error', e); }

        this.currentUser = {
            uid: user.uid,
            email: user.email,
            phoneNumber: user.phoneNumber,
            displayName: extra.displayName || user.displayName || user.email?.split('@')[0] || 'User',
            username: extra.username || user.email?.split('@')[0] || 'user_' + user.uid.slice(0, 5),
            photoURL: extra.photoURL || user.photoURL || null,
            bio: extra.bio || '',
            location: extra.location || '',
            website: extra.website || '',
            followers: extra.followers || 0,
            following: extra.following || 0,
            joinedDate: extra.createdAt || new Date().toISOString()
        };
        localStorage.setItem('techol_user', JSON.stringify(this.currentUser));
    },

    getUser() { return this.currentUser; },

    /**
     * Email/Password Sign Up
     * Creates user, sets profile, returns immediately — NO re-init
     */
    async signUp(email, password, name, username) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await fbUpdateProfile(result.user, { displayName: name });
        this.currentUser = {
            uid: result.user.uid,
            email: result.user.email,
            displayName: name,
            username: username || email.split('@')[0],
            photoURL: null, bio: '', location: '', website: '',
            followers: 0, following: 0, joinedDate: new Date().toISOString()
        };
        localStorage.setItem('techol_user', JSON.stringify(this.currentUser));
        // Fire-and-forget Firestore write (non-blocking)
        setDoc(doc(db, 'users', result.user.uid), this.currentUser).catch(() => { });
        return result.user;
    },

    /**
     * Email/Password Sign In
     * Signs in and hydrates user data, returns immediately — NO re-init
     */
    async signIn(email, password) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        // Hydrate user data immediately (don't wait for onAuthStateChanged)
        await this.updateUserInfo(result.user);
        return result.user;
    },

    /**
     * Google Sign In via Popup
     * Returns immediately after popup closes — NO re-init
     */
    async signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        // Hydrate user data immediately
        await this.updateUserInfo(result.user);
        return result;
    },

    /**
     * Sign Out — clears all cached data
     */
    async signOut() {
        try { await signOut(auth); } catch (e) { }
        this.currentUser = null;
        localStorage.removeItem('techol_user');
        localStorage.removeItem('techol_last_db_sync');
    },

    async updateProfile(data) {
        if (!this.currentUser) return;
        Object.assign(this.currentUser, data);
        localStorage.setItem('techol_user', JSON.stringify(this.currentUser));
        localStorage.setItem('techol_user_profile_' + this.currentUser.uid, JSON.stringify(this.currentUser));
        try {
            const user = auth.currentUser;
            if (user && data.displayName) await fbUpdateProfile(user, { displayName: data.displayName });
            await setDoc(doc(db, 'users', this.currentUser.uid), this.currentUser, { merge: true });
        } catch (e) { }
    },

    async updateProfilePhoto(file) {
        if (!this.currentUser) throw new Error('Not logged in');
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const dataUrl = ev.target.result;
                this.currentUser.photoURL = dataUrl;
                localStorage.setItem('techol_user', JSON.stringify(this.currentUser));
                await this.updateProfile({ photoURL: dataUrl });
                resolve(dataUrl);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    setupRecaptcha(containerId = 'recaptcha-container') {
        if (this.recaptchaVerifier) return;
        try {
            // Standard invisible recaptcha setup
            this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
                'size': 'invisible',
                'callback': () => { console.log('Recaptcha solved'); }
            });
        } catch (e) {
            console.warn('Recaptcha setup failed:', e);
            throw new Error('Security verification initialization failed.');
        }
    },

    async sendOtp(phoneNumber, containerId) {
        this.setupRecaptcha(containerId);
        try {
            // Set a timeout for the SMS request to prevent infinite waiting
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SMS Request Timed Out. Please check your network.')), 15000));

            const sendPromise = (async () => {
                this.confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, this.recaptchaVerifier);
                return true;
            })();

            return await Promise.race([sendPromise, timeoutPromise]);
        } catch (e) {
            console.error('OTP Send error:', e);
            // Reset recaptcha on error so user can try again
            if (this.recaptchaVerifier) {
                this.recaptchaVerifier.clear();
                this.recaptchaVerifier = null;
            }
            throw e;
        }
    },

    async confirmOtp(code) {
        if (!this.confirmationResult) throw new Error('No active confirmation session found.');
        try {
            const result = await this.confirmationResult.confirm(code);
            await this.updateUserInfo(result.user);
            return result.user;
        } catch (e) {
            console.error('OTP Confirmation error:', e);
            throw new Error('Invalid or expired verification code.');
        }
    }
};

window.AuthService = AuthService;
export default AuthService;
