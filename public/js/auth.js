// Authentication utilities
// Handles JWT storage, validation, and session management

const API_BASE_URL = window.location.origin.includes('localhost') 
  ? 'http://localhost:8788' 
  : 'https://fotf-platform-staging.destinhounkpef.workers.dev';

// Initialize Alpine store for auth
function initAuthStore() {
  if (typeof Alpine === 'undefined') {
    console.warn('Alpine.js not loaded yet');
    return;
  }
  
  Alpine.store('auth', {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    isAdmin: false,
    
    init() {
      if (this.token) {
        this.fetchUser();
      }
    },
    
    async fetchUser() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        
        if (response.ok) {
          this.user = await response.json();
          this.isAuthenticated = true;
          this.isAdmin = this.user.role === 'admin';
        } else {
          this.logout();
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        this.logout();
      }
    },
    
    async login(email, password) {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.token = data.token;
        this.user = data.user;
        this.isAuthenticated = true;
        this.isAdmin = data.user.role === 'admin';
        localStorage.setItem('token', data.token);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.error?.message || 'Login failed' 
        };
      }
    },
    
    async register(email, password, name) {
      // Capture UTM params if present
      const utmParams = JSON.parse(localStorage.getItem('utm_first_touch') || '{}');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          ...utmParams
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.token = data.token;
        this.user = data.user;
        this.isAuthenticated = true;
        this.isAdmin = data.user.role === 'admin';
        localStorage.setItem('token', data.token);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.error?.message || 'Registration failed' 
        };
      }
    },
    
    logout() {
      this.token = null;
      this.user = null;
      this.isAuthenticated = false;
      this.isAdmin = false;
      localStorage.removeItem('token');
    }
  });
}

// Check auth status and redirect if needed
function requireAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!requireAuth()) return false;
  
  // This will be checked by the server, but we can do a quick client-side check
  const user = Alpine.store('auth')?.user;
  if (user && user.role !== 'admin') {
    window.location.href = '/dashboard/';
    return false;
  }
  return true;
}

// Initialize on DOM ready
document.addEventListener('alpine:init', initAuthStore);

// Also try immediate init in case Alpine is already loaded
if (typeof Alpine !== 'undefined') {
  initAuthStore();
}
