// Theme toggle for dark mode
// Dark mode is the primary theme

(function() {
  // Check for saved preference or system preference
  function getInitialTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved;
    }
    
    // Default to dark mode (as per design spec)
    // Only use light mode if user explicitly prefers it
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    
    return 'dark';
  }
  
  // Apply theme immediately (before paint)
  const theme = getInitialTheme();
  document.documentElement.setAttribute('data-theme', theme);
  
  // Initialize Alpine store when ready
  function initThemeStore() {
    if (typeof Alpine === 'undefined') return;
    
    Alpine.store('theme', {
      mode: theme,
      
      toggle() {
        this.mode = this.mode === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.mode);
        localStorage.setItem('theme', this.mode);
      },
      
      setDark() {
        this.mode = 'dark';
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      },
      
      setLight() {
        this.mode = 'light';
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      }
    });
  }
  
  document.addEventListener('alpine:init', initThemeStore);
  
  // Try immediate init in case Alpine is already loaded
  if (typeof Alpine !== 'undefined') {
    initThemeStore();
  }
})();
