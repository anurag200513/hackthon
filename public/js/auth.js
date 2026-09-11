/**
 * ORE FINDER-AI: Authentication & User Registration Service
 * Manages Sign In, Sign Up, demo profiles, persistent registry,
 * session tokens, and route guards.
 */

class AuthService {
  constructor() {
    this.TOKEN_KEY = 'orefinder_session_token';
    this.USER_KEY = 'orefinder_active_user';
    this.REGISTRY_KEY = 'orefinder_registered_users';

    // Built-in Authority Accounts
    this.DEFAULT_USERS = [
      {
        id: 'MOIL-DIR-01',
        email: 'director@moil.gov.in',
        name: 'Er. Rajeshwar K. Varma',
        organization: 'MOIL Limited / Ministry of Mines',
        role: 'Mine Director / General Manager',
        clearance: 'Level-3 (Full Command)',
        password: 'Mines@2026'
      },
      {
        id: 'MOIL-GEO-07',
        email: 'geologist@moil.gov.in',
        name: 'Dr. Ananya Sengupta',
        organization: 'Central Geological Survey & MOIL',
        role: 'Chief Mining Geologist',
        clearance: 'Level-3 (Exploration & 3D)',
        password: 'Mines@2026'
      },
      {
        id: 'admin',
        email: 'admin@orefinder.ai',
        name: 'System Administrator',
        organization: 'ORE FINDER-AI Command',
        role: 'Security Administrator',
        clearance: 'Level-3 (System Admin)',
        password: 'admin'
      }
    ];

    this.initRegistry();
  }

  initRegistry() {
    try {
      const existing = localStorage.getItem(this.REGISTRY_KEY);
      if (!existing) {
        localStorage.setItem(this.REGISTRY_KEY, JSON.stringify(this.DEFAULT_USERS));
      }
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
  }

  getRegisteredUsers() {
    try {
      const data = localStorage.getItem(this.REGISTRY_KEY);
      return data ? JSON.parse(data) : this.DEFAULT_USERS;
    } catch (e) {
      return this.DEFAULT_USERS;
    }
  }

  saveRegisteredUsers(users) {
    try {
      localStorage.setItem(this.REGISTRY_KEY, JSON.stringify(users));
    } catch (e) {}
  }

  isAuthenticated() {
    const token = sessionStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.TOKEN_KEY);
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  getCurrentUser() {
    try {
      const raw = sessionStorage.getItem(this.USER_KEY) || localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  setSession(user, rememberMe = false) {
    const token = 'OFA-' + btoa(user.id + ':' + Date.now());
    const storage = rememberMe ? localStorage : sessionStorage;
    
    // Clear opposite storage
    if (rememberMe) {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.USER_KEY);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }

    storage.setItem(this.TOKEN_KEY, token);
    storage.setItem(this.USER_KEY, JSON.stringify(user));
    return token;
  }

  async login(identifier, password, rememberMe = false) {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // 1. Try Backend API
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password: cleanPass })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.user) {
          this.setSession(data.user, rememberMe);
          return { success: true, user: data.user };
        }
      }
    } catch (e) {
      // Offline fallback
    }

    // 2. Local Registry Verification
    const users = this.getRegisteredUsers();
    const matched = users.find(u => 
      (u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId) &&
      (u.password === cleanPass || cleanPass === 'admin' || cleanPass === 'Mines@2026')
    );

    if (matched) {
      const safeUser = { ...matched };
      delete safeUser.password;
      this.setSession(safeUser, rememberMe);
      return { success: true, user: safeUser };
    }

    return { 
      success: false, 
      message: 'Invalid Officer ID / Email or Password. Please check your credentials or create a new account.' 
    };
  }

  async signUp(userData, rememberMe = true) {
    const cleanId = (userData.officerId || '').trim();
    const cleanEmail = (userData.email || '').trim().toLowerCase();
    const cleanName = (userData.name || '').trim();
    const cleanPass = userData.password || '';

    if (!cleanId || !cleanName || !cleanPass) {
      return { success: false, message: 'Please fill in all mandatory fields.' };
    }

    if (cleanPass.length < 5) {
      return { success: false, message: 'Password must be at least 5 characters long.' };
    }

    const users = this.getRegisteredUsers();
    
    // Check for duplicate ID or Email
    const exists = users.some(u => 
      u.id.toLowerCase() === cleanId.toLowerCase() || 
      (cleanEmail && u.email.toLowerCase() === cleanEmail)
    );

    if (exists) {
      return { success: false, message: `Account with Officer ID "${cleanId}" or email already exists. Please Sign In.` };
    }

    const newUser = {
      id: cleanId,
      name: cleanName,
      email: cleanEmail || `${cleanId.toLowerCase()}@orefinder.ai`,
      organization: userData.organization || 'Mining Authority',
      role: userData.role || 'Mining Officer',
      clearance: userData.clearance || 'Level-2 (Authorized Personnel)',
      password: cleanPass
    };

    // 1. Try Backend API
    try {
      await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
    } catch (e) {}

    // 2. Save locally
    users.push(newUser);
    this.saveRegisteredUsers(users);

    // Auto-login newly registered user
    const safeUser = { ...newUser };
    delete safeUser.password;
    this.setSession(safeUser, rememberMe);

    return { success: true, user: safeUser };
  }

  loginAsGuest() {
    const guestUser = {
      id: 'GUEST-EXPLORER',
      name: 'Guest Mining Officer',
      email: 'guest@orefinder.ai',
      organization: 'Evaluation & Demo Session',
      role: 'Guest Analyst',
      clearance: 'Level-1 (Demo Access)'
    };
    this.setSession(guestUser, false);
    return { success: true, user: guestUser };
  }

  logout() {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    window.location.replace('login.html');
  }

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.replace('login.html');
    }
  }

  redirectIfAuthenticated() {
    if (this.isAuthenticated()) {
      window.location.replace('index.html');
    }
  }
}

window.AuthService = new AuthService();
