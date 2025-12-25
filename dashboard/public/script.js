(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    cookieName: 'wa_session',
    cookieExpiry: 30, // days
    batchSize: 10,
    flushInterval: 5000, // ms
    endpoint: 'http://api.publickeyboard.com/api/analytics', // FastAPI backend
    trackMouseMovement: true,
    mouseSampleRate: 100, // ms between mouse position samples
    debug: false
  };

  // Event queue
  let eventQueue = [];
  let lastMouseSample = 0;

  // Cookie utilities
  const Cookie = {
    set(name, value, days) {
      const expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    },

    get(name) {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      if (match) {
        try {
          return JSON.parse(decodeURIComponent(match[2]));
        } catch (e) {
          return null;
        }
      }
      return null;
    },

    delete(name) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  };

  // Generate unique IDs
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Session management
  function getOrCreateSession() {
    let session = Cookie.get(CONFIG.cookieName);

    if (!session) {
      session = {
        id: generateId(),
        visitorId: generateId(),
        startTime: Date.now(),
        pageViews: 0,
        isNew: true
      };
    } else {
      session.isNew = false;
    }

    session.pageViews++;
    session.lastActivity = Date.now();
    Cookie.set(CONFIG.cookieName, session, CONFIG.cookieExpiry);

    return session;
  }

  const session = getOrCreateSession();

  // Get element identifier
  function getElementPath(element) {
    if (!element || element === document.body) return 'body';

    const path = [];
    while (element && element !== document.body) {
      let selector = element.tagName.toLowerCase();

      if (element.id) {
        selector += `#${element.id}`;
        path.unshift(selector);
        break;
      }

      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (classes) selector += `.${classes}`;
      }

      path.unshift(selector);
      element = element.parentElement;
    }

    return path.join(' > ');
  }

  // Create event object
  function createEvent(type, data = {}) {
    return {
      type,
      timestamp: Date.now(),
      sessionId: session.id,
      visitorId: session.visitorId,
      page: {
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      ...data
    };
  }

  // Queue event
  function trackEvent(type, data) {
    const event = createEvent(type, data);
    eventQueue.push(event);

    if (CONFIG.debug) {
      console.log('[Analytics]', type, event);
    }

    if (eventQueue.length >= CONFIG.batchSize) {
      flush();
    }
  }

  // Send events to server
  function flush() {
    if (eventQueue.length === 0) return;

    const events = [...eventQueue];
    eventQueue = [];

    const payload = {
      events,
      meta: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`
      }
    };

    // Use sendBeacon for reliability (works even when page is closing)
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(CONFIG.endpoint, blob);
    } else {
      fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    }
  }

  // Track page view
  function trackPageView() {
    trackEvent('pageview', {
      isNewVisitor: session.isNew,
      pageViewNumber: session.pageViews
    });
  }

  // Track clicks
  function trackClick(e) {
    const target = e.target;
    trackEvent('click', {
      element: {
        tag: target.tagName.toLowerCase(),
        id: target.id || null,
        classes: target.className || null,
        text: (target.textContent || '').slice(0, 100).trim(),
        href: target.href || target.closest('a')?.href || null,
        path: getElementPath(target)
      },
      position: {
        x: e.clientX,
        y: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY
      }
    });
  }

  // Track mouse movement (throttled)
  function trackMouseMove(e) {
    const now = Date.now();
    if (now - lastMouseSample < CONFIG.mouseSampleRate) return;
    lastMouseSample = now;

    trackEvent('mousemove', {
      position: {
        x: e.clientX,
        y: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY
      }
    });
  }

  // Track scrolling
  let scrollTimeout;
  let lastScrollDepth = 0;

  function trackScroll() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ) - window.innerHeight;

      const scrollDepth = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

      // Only track if scroll depth increased significantly
      if (scrollDepth > lastScrollDepth + 10) {
        lastScrollDepth = scrollDepth;
        trackEvent('scroll', {
          depth: scrollDepth,
          position: scrollTop
        });
      }
    }, 150);
  }

  // Track form interactions
  function trackFormInteraction(e) {
    const target = e.target;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    trackEvent('form_interaction', {
      eventType: e.type,
      element: {
        tag: target.tagName.toLowerCase(),
        type: target.type || null,
        name: target.name || null,
        id: target.id || null,
        path: getElementPath(target)
      }
    });
  }

  // Track visibility changes (tab focus/blur)
  function trackVisibility() {
    trackEvent('visibility', {
      state: document.visibilityState,
      hidden: document.hidden
    });
  }

  // Track errors
  function trackError(message, source, lineno, colno, error) {
    trackEvent('error', {
      message: message,
      source: source,
      line: lineno,
      column: colno,
      stack: error?.stack?.slice(0, 500) || null
    });
  }

  // Track time on page
  let engagementTime = 0;
  let lastEngagementCheck = Date.now();
  let isEngaged = true;

  function updateEngagement() {
    if (isEngaged && !document.hidden) {
      engagementTime += Date.now() - lastEngagementCheck;
    }
    lastEngagementCheck = Date.now();
  }

  setInterval(updateEngagement, 1000);

  // Initialize tracking
  function init() {
    // Page view
    trackPageView();

    // Click tracking
    document.addEventListener('click', trackClick, { passive: true });

    // Mouse movement tracking
    if (CONFIG.trackMouseMovement) {
      document.addEventListener('mousemove', trackMouseMove, { passive: true });
    }

    // Scroll tracking
    window.addEventListener('scroll', trackScroll, { passive: true });

    // Form interactions
    document.addEventListener('focus', trackFormInteraction, { capture: true, passive: true });
    document.addEventListener('blur', trackFormInteraction, { capture: true, passive: true });
    document.addEventListener('change', trackFormInteraction, { passive: true });

    // Visibility
    document.addEventListener('visibilitychange', trackVisibility);

    // Errors
    window.onerror = trackError;

    // Periodic flush
    setInterval(flush, CONFIG.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      trackEvent('page_exit', {
        timeOnPage: Date.now() - session.startTime,
        engagementTime: engagementTime,
        scrollDepth: lastScrollDepth
      });
      flush();
    });

    // Flush on visibility change (mobile)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) flush();
    });

    if (CONFIG.debug) {
      console.log('[Analytics] Initialized', { session });
    }
  }

  // Public API
  window.WebAnalytics = {
    track: (eventName, data) => trackEvent(`custom:${eventName}`, { custom: data }),
    identify: (userId, traits) => {
      session.userId = userId;
      session.traits = traits;
      Cookie.set(CONFIG.cookieName, session, CONFIG.cookieExpiry);
      trackEvent('identify', { userId, traits });
    },
    getSession: () => ({ ...session }),
    flush: flush,
    setEndpoint: (url) => { CONFIG.endpoint = url; },
    setDebug: (enabled) => { CONFIG.debug = enabled; }
  };

  // Start tracking when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
