// UTM parameter capture for attribution tracking
// Captures first-touch UTM params and stores in localStorage

(function() {
  // Parse URL parameters
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
      content: params.get('utm_content'),
      term: params.get('utm_term')
    };
  }
  
  // Capture UTM params on page load
  function captureUtmParams() {
    // Only capture if not already stored (first-touch attribution)
    const existing = localStorage.getItem('utm_first_touch');
    if (existing) {
      return;
    }
    
    const params = getUrlParams();
    
    // Only store if at least one UTM param is present
    if (params.source || params.medium || params.campaign) {
      const utmData = {
        first_touch_source: params.source,
        first_touch_medium: params.medium,
        first_touch_campaign: params.campaign,
        first_touch_page: window.location.pathname,
        captured_at: new Date().toISOString()
      };
      
      localStorage.setItem('utm_first_touch', JSON.stringify(utmData));
      
      // Also push to dataLayer for GTM if available
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'utm_captured',
          ...utmData
        });
      }
    }
  }
  
  // Get stored UTM data (for registration)
  window.getUtmData = function() {
    const data = localStorage.getItem('utm_first_touch');
    return data ? JSON.parse(data) : null;
  };
  
  // Clear UTM data (optional, after conversion)
  window.clearUtmData = function() {
    localStorage.removeItem('utm_first_touch');
  };
  
  // Capture on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', captureUtmParams);
  } else {
    captureUtmParams();
  }
})();
