(function() {
  'use strict';

  // Enhanced AdSense Configuration v3.6
  const CONFIG = {
    CLIENT_ID: 'ca-pub-7407983524344370',
    SCRIPT_URL: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    AD_SELECTOR: '.lazy-ads, ins.adsbygoogle, .adsense-unit, [data-ad-client]',
    LAZY_LOAD_MARGIN: '500px',
    LOAD_DELAY: 2500, // Increased for better page speed
    POST_LOAD_DELAY: 1000, // Additional delay after page load
    MAX_RETRY_ATTEMPTS: 12,
    RETRY_DELAY: 1500,
    PERFORMANCE_BUDGET: 6000,
    HEALTH_CHECK_INTERVAL: 4000,
    BATCH_SIZE: 2, // Reduced for better performance
    BATCH_DELAY: 500,
    CRITICAL_LOAD_TIME: 3000,
    TARGET_SUCCESS_RATE: 95,
    INTERSECTION_THRESHOLD: 0.2,
    PRECONNECT_DOMAINS: [
      'https://pagead2.googlesyndication.com',
      'https://googleads.g.doubleclick.net',
      'https://tpc.googlesyndication.com',
      'https://www.googletagservices.com',
      'https://securepubads.g.doubleclick.net',
      'https://partner.googleadservices.com'
    ],
    AUTO_ADS_ENABLED: true,
    AUTO_ADS_CONFIG: {
      google_ad_client: '', // Will be set dynamically
      enable_page_level_ads: true,
      overlays: { bottom: true },
      auto_ad_client: '', // Will be set dynamically
      delay: 2000,
      retry_attempts: 5
    },
    PAGE_SPEED_MODE: true,
    DEFER_NON_CRITICAL: true
  };

  // Enhanced State Management
  const STATE = {
    scriptLoaded: false,
    scriptLoading: false,
    adsenseReady: false,
    initialized: false,
    autoAdsInitialized: false,
    pageFullyLoaded: false,
    totalAds: 0,
    loadedAds: 0,
    failedAds: 0,
    retryCount: 0,
    startTime: Date.now(),
    pageLoadTime: 0,
    sessionId: `ads_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    adRegistry: new Map(),
    loadQueue: new Set(),
    processingQueue: new Set(),
    healthCheckQueue: new Set(),
    observers: new Set(),
    timers: new Set(),
    intervals: new Set(),
    metrics: {
      avgLoadTime: 0,
      successRate: 0,
      errorRate: 0,
      healthChecks: 0,
      autoAdsStatus: 'pending'
    },
    adBlockerDetected: false,
    networkQuality: 'unknown',
    pushAttempts: 0,
    lastPushTime: 0
  };

  // Enhanced Logger with Performance Tracking
  class AdLogger {
    constructor() {
      this.levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
      this.currentLevel = 1;
      this.logHistory = [];
      this.performanceLogs = [];
    }

    log(level, message, data = {}) {
      const timestamp = Date.now();
      const logEntry = {
        timestamp,
        level,
        message,
        data: { ...data, sessionId: STATE.sessionId, uptime: timestamp - STATE.startTime }
      };

      if (this.levels[level] >= this.currentLevel) {
        const formattedTime = new Date(timestamp).toISOString().split('T')[1].split('.')[0];
        const prefix = `[AdSense-v3.6 ${formattedTime}] [${level}]`;
        const consoleMethod = console[level.toLowerCase()] || console.log;
        consoleMethod(`${prefix} ${message}`, data);
      }

      this.logHistory.push(logEntry);
      if (this.logHistory.length > 150) {
        this.logHistory = this.logHistory.slice(-75);
      }

      // Performance logging
      if (level === 'INFO' || level === 'ERROR') {
        this.performanceLogs.push({
          timestamp,
          level,
          message,
          memoryUsage: this.getMemoryUsage()
        });
        if (this.performanceLogs.length > 50) {
          this.performanceLogs = this.performanceLogs.slice(-25);
        }
      }
    }

    getMemoryUsage() {
      if (window.performance && window.performance.memory) {
        return {
          used: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024)
        };
      }
      return null;
    }

    debug(msg, data) { this.log('DEBUG', msg, data); }
    info(msg, data) { this.log('INFO', msg, data); }
    warn(msg, data) { this.log('WARN', msg, data); }
    error(msg, data) { this.log('ERROR', msg, data); }
  }

  const logger = new AdLogger();

  // Enhanced Utility Functions
  class AdUtils {
    static async waitForPageLoad() {
      const maxWait = 15000; // 15 seconds max wait
      const startTime = Date.now();
      
      const conditions = [
        () => document.readyState === 'complete',
        () => document.body && document.head,
        () => window.jQuery ? window.jQuery.isReady !== false : true
      ];

      let attempts = 0;
      while (!conditions.every(condition => condition()) && 
             Date.now() - startTime < maxWait && 
             attempts < 300) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }

      // Additional wait for resources
      await new Promise(resolve => setTimeout(resolve, 200));
      
      STATE.pageLoadTime = Date.now() - startTime;
      STATE.pageFullyLoaded = true;
      logger.info('Page load sequence completed', { 
        loadTime: STATE.pageLoadTime, 
        attempts 
      });
    }

    static generateAdId(element, index) {
      const id = element.id || 
                 element.dataset.adId || 
                 element.getAttribute('data-ad-slot') ||
                 `ads_${STATE.sessionId}_${index}_${Date.now()}`;
      return id.replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    static calculateVisibility(element) {
      try {
        const rect = element.getBoundingClientRect();
        const viewport = { 
          width: window.innerWidth || document.documentElement.clientWidth, 
          height: window.innerHeight || document.documentElement.clientHeight 
        };
        
        const visibleWidth = Math.max(0, Math.min(rect.right, viewport.width) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, viewport.height) - Math.max(rect.top, 0));
        const visibleArea = visibleWidth * visibleHeight;
        const totalArea = rect.width * rect.height;
        
        return totalArea > 0 ? Math.round((visibleArea / totalArea) * 100) / 100 : 0;
      } catch (error) {
        logger.warn('Visibility calculation failed', { error: error.message });
        return 0;
      }
    }

    static getNetworkInfo() {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        const info = {
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false
        };
        STATE.networkQuality = info.effectiveType;
        return info;
      }
      return { effectiveType: 'unknown' };
    }

    static isAdLoaded(element) {
      const checks = [
        () => element.getAttribute('data-adsbygoogle-status') === 'done',
        () => element.querySelector('iframe[src*="googleads"], iframe[src*="googlesyndication"]') !== null,
        () => element.innerHTML.trim().length > 150,
        () => element.offsetWidth > 50 && element.offsetHeight > 50,
        () => element.querySelector('div[id*="google_ads"], div[id*="aswift"]') !== null,
        () => element.querySelector('ins[style*="display: block"], ins[style*="display:block"]') !== null,
        () => element.getAttribute('data-ad-status') === 'filled',
        () => element.querySelector('iframe[name*="google_ads"]') !== null,
        () => window.getComputedStyle(element).display !== 'none'
      ];
      
      const passedChecks = checks.filter(check => {
        try { return check(); } catch { return false; }
      }).length;
      
      const isLoaded = passedChecks >= 3;
      
      if (isLoaded) {
        element.setAttribute('data-ad-loaded-timestamp', Date.now());
      }
      
      logger.debug('Ad load verification', { 
        adId: element.getAttribute('data-ad-id'), 
        passedChecks, 
        totalChecks: checks.length,
        isLoaded
      });
      
      return isLoaded;
    }

    static preventLayoutShift(element) {
      try {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        const width = rect.width || element.offsetWidth || 
                     (computedStyle.width !== 'auto' ? parseInt(computedStyle.width) : 320);
        const height = rect.height || element.offsetHeight || 
                      (computedStyle.height !== 'auto' ? parseInt(computedStyle.height) : 250);
        
        // Smart responsive sizing
        if (width < 300) {
          element.style.width = '100%';
          element.style.maxWidth = '100%';
        } else {
          element.style.width = `${Math.min(width, 728)}px`;
          element.style.maxWidth = '100%';
        }
        
        element.style.minHeight = `${Math.max(height, 200)}px`;
        element.style.height = height > 200 ? `${height}px` : 'auto';
        element.style.display = 'block';
        element.style.position = 'relative';
        element.style.contain = 'layout';
        element.style.overflow = 'hidden';
        element.style.zIndex = '1';
        element.style.backgroundColor = 'transparent';
        
        logger.debug('Layout shift prevention applied', { 
          adId: element.getAttribute('data-ad-id'), 
          width: element.style.width, 
          height: element.style.minHeight
        });
      } catch (error) {
        logger.warn('Layout shift prevention failed', { error: error.message });
      }
    }

    static createLoadingPlaceholder(element) {
      if (element.hasAttribute('data-placeholder-active')) {
        return element.querySelector('.adsense-loading-placeholder');
      }

      const placeholder = document.createElement('div');
      placeholder.className = 'adsense-loading-placeholder';
      placeholder.setAttribute('data-placeholder-id', `ph_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);
      placeholder.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: #999;
        z-index: 2;
        border-radius: 4px;
        font-family: Arial, sans-serif;
      `;
      
      // Add shimmer animation if not exists
      if (!document.querySelector('#adsense-shimmer-style')) {
        const style = document.createElement('style');
        style.id = 'adsense-shimmer-style';
        style.textContent = `
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      placeholder.innerHTML = '<span>Loading...</span>';
      element.style.position = 'relative';
      element.appendChild(placeholder);
      element.setAttribute('data-placeholder-active', 'true');
      
      logger.debug('Loading placeholder created', { 
        adId: element.getAttribute('data-ad-id'), 
        placeholderId: placeholder.getAttribute('data-placeholder-id') 
      });
      
      return placeholder;
    }

    static removeLoadingPlaceholder(element) {
      const placeholder = element.querySelector('.adsense-loading-placeholder');
      if (placeholder) {
        placeholder.style.opacity = '0';
        placeholder.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
          if (placeholder.parentNode) {
            placeholder.remove();
            element.removeAttribute('data-placeholder-active');
            logger.debug('Loading placeholder removed', { 
              adId: element.getAttribute('data-ad-id')
            });
          }
        }, 500);
      } else {
        element.removeAttribute('data-placeholder-active');
      }
    }

    static detectAdBlocker() {
      try {
        // Multiple detection methods
        const testElement = document.createElement('div');
        testElement.innerHTML = '&nbsp;';
        testElement.className = 'adsbox';
        testElement.style.cssText = 'position:absolute;left:-10000px;';
        document.body.appendChild(testElement);
        
        const isBlocked1 = testElement.offsetHeight === 0;
        document.body.removeChild(testElement);
        
        // Test 2: Script loading
        const isBlocked2 = !window.adsbygoogle && STATE.scriptLoaded;
        
        // Test 3: Common ad blocker signatures
        const isBlocked3 = document.querySelector('script[src*="adblock"]') !== null;
        
        const isBlocked = isBlocked1 || isBlocked2 || isBlocked3;
        
        if (isBlocked) {
          STATE.adBlockerDetected = true;
          logger.warn('Ad blocker detected using multiple methods', {
            test1: isBlocked1,
            test2: isBlocked2,
            test3: isBlocked3
          });
        }
        
        return isBlocked;
      } catch (error) {
        logger.warn('Ad blocker detection failed', { error: error.message });
        return false;
      }
    }

    static optimizeForNetwork() {
      const networkInfo = this.getNetworkInfo();
      
      if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
        CONFIG.BATCH_SIZE = 1;
        CONFIG.BATCH_DELAY = 1000;
        CONFIG.RETRY_DELAY = 3000;
        logger.info('Optimized for slow network', networkInfo);
      } else if (networkInfo.effectiveType === '3g') {
        CONFIG.BATCH_SIZE = 2;
        CONFIG.BATCH_DELAY = 750;
        CONFIG.RETRY_DELAY = 2000;
      } else {
        CONFIG.BATCH_SIZE = 3;
        CONFIG.BATCH_DELAY = 500;
        CONFIG.RETRY_DELAY = 1500;
      }
    }
  }

  // Enhanced Network Optimizer
  class NetworkOptimizer {
    constructor() {
      this.preconnected = false;
      this.prefetched = false;
    }

    async optimize() {
      await this.preconnectDomains();
      await this.prefetchResources();
      this.monitorNetworkChanges();
      this.optimizeCaching();
    }

    async preconnectDomains() {
      if (this.preconnected) return;

      const fragment = document.createDocumentFragment();
      
      for (const domain of CONFIG.PRECONNECT_DOMAINS) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        fragment.appendChild(link);
      }
      
      document.head.appendChild(fragment);
      this.preconnected = true;
      logger.debug('Network preconnection completed');
    }

    async prefetchResources() {
      if (this.prefetched || AdUtils.getNetworkInfo().saveData) return;

      try {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = `${CONFIG.SCRIPT_URL}?client=${CONFIG.CLIENT_ID}`;
        link.as = 'script';
        document.head.appendChild(link);
        
        this.prefetched = true;
        logger.debug('Resource prefetching completed');
      } catch (error) {
        logger.warn('Resource prefetching failed', { error: error.message });
      }
    }

    monitorNetworkChanges() {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        connection.addEventListener('change', () => {
          const networkInfo = AdUtils.getNetworkInfo();
          logger.info('Network status changed', networkInfo);
          AdUtils.optimizeForNetwork();
        });
      }
    }

    optimizeCaching() {
      // Add cache headers information to requests where possible
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            logger.debug('Service worker detected, caching optimized');
          }
        });
      }
    }
  }

  // Enhanced Script Loader with Better Error Handling
  class ScriptLoader {
    constructor() {
      this.retryCount = 0;
      this.loadStartTime = 0;
      this.fallbackMethods = [];
    }

    async loadAdSenseScript() {
      if (STATE.scriptLoaded) return true;
      if (STATE.scriptLoading) return this.waitForScript();

      STATE.scriptLoading = true;
      this.loadStartTime = Date.now();
      logger.info('Loading AdSense script...', { attempt: this.retryCount + 1 });

      try {
        await this.createAndLoadScript();
        await this.verifyScriptIntegrity();
        
        STATE.scriptLoaded = true;
        STATE.scriptLoading = false;
        STATE.adsenseReady = true;
        
        const loadTime = Date.now() - this.loadStartTime;
        logger.info('AdSense script loaded successfully', { 
          loadTime, 
          retryCount: this.retryCount 
        });
        return true;
      } catch (error) {
        STATE.scriptLoading = false;
        logger.error('Script loading failed', { 
          error: error.message, 
          attempt: this.retryCount + 1,
          stack: error.stack 
        });
        
        if (this.retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
          this.retryCount++;
          const delay = this.calculateRetryDelay();
          logger.info(`Retrying script load in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.loadAdSenseScript();
        }
        
        logger.warn('Max retry attempts reached, initializing fallback');
        await this.initializeFallback();
        return true;
      }
    }

    async createAndLoadScript() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.src = `${CONFIG.SCRIPT_URL}?client=${CONFIG.CLIENT_ID}&t=${Date.now()}&v=3.6`;
        script.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
        script.setAttribute('data-script-version', '3.6');
        
        const timeout = setTimeout(() => {
          script.remove();
          reject(new Error('Script load timeout'));
        }, CONFIG.PERFORMANCE_BUDGET);

        script.onload = () => {
          clearTimeout(timeout);
          logger.debug('Script onload event fired');
          resolve();
        };

        script.onerror = (error) => {
          clearTimeout(timeout);
          script.remove();
          reject(new Error(`Script load error: ${error.message || 'Unknown error'}`));
        };

        // Add to head with error handling
        try {
          document.head.appendChild(script);
        } catch (error) {
          clearTimeout(timeout);
          reject(new Error(`Script append error: ${error.message}`));
        }
      });
    }

    async verifyScriptIntegrity() {
      let attempts = 0;
      const maxAttempts = 200;
      
      while (typeof window.adsbygoogle === 'undefined' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      if (typeof window.adsbygoogle === 'undefined') {
        throw new Error('AdSense script not properly loaded - adsbygoogle undefined');
      }
      
      // Enhanced verification
      if (!Array.isArray(window.adsbygoogle)) {
        window.adsbygoogle = [];
      }
      
      // Add error handler to adsbygoogle
      const originalPush = window.adsbygoogle.push;
      window.adsbygoogle.push = function(obj) {
        try {
          return originalPush.call(this, obj);
        } catch (error) {
          logger.warn('AdSense push error', { error: error.message, obj });
          return this.length;
        }
      };
      
      window.adsbygoogle.loaded = window.adsbygoogle.loaded || false;
      logger.debug('Script integrity verified', { attempts });
    }

    calculateRetryDelay() {
      const baseDelay = CONFIG.RETRY_DELAY;
      const backoff = Math.pow(1.5, this.retryCount);
      const jitter = Math.random() * 0.3 + 0.85;
      const networkMultiplier = STATE.networkQuality === 'slow-2g' ? 2 : 1;
      return Math.min(baseDelay * backoff * jitter * networkMultiplier, 10000);
    }

    async initializeFallback() {
      try {
        if (!window.adsbygoogle) {
          window.adsbygoogle = [];
          window.adsbygoogle.push = function(obj) {
            logger.debug('Fallback adsbygoogle push', obj);
            Array.prototype.push.call(this, obj);
            return this.length;
          };
        }
        
        // Create fallback for auto ads
        window.adsbygoogle.push({
          google_ad_client: CONFIG.CLIENT_ID,
          enable_page_level_ads: true
        });
        
        STATE.scriptLoaded = true;
        STATE.adsenseReady = true;
        logger.warn('Fallback initialization completed');
      } catch (error) {
        logger.error('Fallback initialization failed', { error: error.message });
      }
    }

    async waitForScript() {
      let attempts = 0;
      while (STATE.scriptLoading && attempts < 200) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      return STATE.scriptLoaded;
    }
  }

  // Enhanced Auto Ads Manager
  class AutoAdsManager {
    constructor() {
      this.initAttempts = 0;
      this.maxInitAttempts = 5;
      this.initDelay = 2000;
    }

    async initialize() {
      if (!CONFIG.AUTO_ADS_ENABLED || STATE.autoAdsInitialized) {
        logger.debug('Auto ads already initialized or disabled');
        return;
      }

      if (this.initAttempts >= this.maxInitAttempts) {
        logger.error('Max auto ads init attempts reached');
        STATE.metrics.autoAdsStatus = 'failed';
        return;
      }

      this.initAttempts++;
      logger.info('Initializing auto ads', { attempt: this.initAttempts });

      try {
        // Wait for script to be ready
        if (!STATE.adsenseReady) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Set client ID in config
        CONFIG.AUTO_ADS_CONFIG.google_ad_client = CONFIG.CLIENT_ID;
        CONFIG.AUTO_ADS_CONFIG.auto_ad_client = CONFIG.CLIENT_ID;

        // Wait for optimal timing
        await new Promise(resolve => setTimeout(resolve, this.initDelay));

        // Push auto ads configuration
        const autoAdsConfig = {
          google_ad_client: CONFIG.CLIENT_ID,
          enable_page_level_ads: true,
          overlays: {
            bottom: true
          }
        };

        logger.debug('Pushing auto ads config', autoAdsConfig);
        
        (window.adsbygoogle = window.adsbygoogle || []).push(autoAdsConfig);

        // Additional auto ads push for better coverage
        setTimeout(() => {
          (window.adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: CONFIG.CLIENT_ID,
            enable_page_level_ads: true,
            auto_ad_client: CONFIG.CLIENT_ID
          });
        }, 1000);

        STATE.autoAdsInitialized = true;
        STATE.metrics.autoAdsStatus = 'initialized';
        
        logger.info('Auto ads initialized successfully', { 
          attempt: this.initAttempts,
          config: autoAdsConfig
        });

        // Verify auto ads after delay
        setTimeout(() => this.verifyAutoAds(), 5000);

      } catch (error) {
        logger.error('Auto ads initialization failed', { 
          error: error.message, 
          attempt: this.initAttempts 
        });
        
        STATE.metrics.autoAdsStatus = 'error';
        
        // Retry with exponential backoff
        const retryDelay = this.initDelay * Math.pow(2, this.initAttempts - 1);
        setTimeout(() => this.initialize(), retryDelay);
      }
    }

    async verifyAutoAds() {
      try {
        // Check for auto ads elements
        const autoAdElements = document.querySelectorAll('[data-google-query-id], [data-ad-client="' + CONFIG.CLIENT_ID + '"]');
        
        if (autoAdElements.length > 0) {
          STATE.metrics.autoAdsStatus = 'active';
          logger.info('Auto ads verification successful', { 
            elementsFound: autoAdElements.length 
          });
        } else {
          STATE.metrics.autoAdsStatus = 'inactive';
          logger.warn('Auto ads verification failed - no elements found');
          
          // Retry auto ads initialization
          if (this.initAttempts < this.maxInitAttempts) {
            setTimeout(() => this.initialize(), 5000);
          }
        }
      } catch (error) {
        logger.warn('Auto ads verification error', { error: error.message });
      }
    }

    forceReinitialize() {
      STATE.autoAdsInitialized = false;
      this.initAttempts = 0;
      STATE.metrics.autoAdsStatus = 'pending';
      this.initialize();
    }
  }

  // Enhanced Ad Manager with Improved Push Logic
  class AdManager {
    constructor() {
      this.loadedAds = new Set();
      this.failedAds = new Set();
      this.retryEngine = new RetryEngine();
      this.performanceProfiler = new PerformanceProfiler();
      this.pushQueue = [];
      this.processingLock = false;
    }

    async discoverAds() {
      const elements = Array.from(document.querySelectorAll(CONFIG.AD_SELECTOR));
      logger.info('Discovering ad containers', { count: elements.length });
      
      const ads = elements.map((element, index) => {
        const adId = AdUtils.generateAdId(element, index);
        const adData = {
          id: adId,
          element,
          index,
          rect: element.getBoundingClientRect(),
          attributes: this.extractAdAttributes(element),
          visibility: AdUtils.calculateVisibility(element),
          priority: this.calculatePriority(element),
          status: 'discovered',
          attempts: 0,
          timestamp: Date.now(),
          lastAttempt: 0,
          failureReasons: [],
          loadTime: 0
        };
        
        element.setAttribute('data-ad-id', adId);
        element.setAttribute('data-ad-discovered', Date.now());
        STATE.adRegistry.set(adId, adData);
        return adData;
      });

      STATE.totalAds = ads.length;
      logger.info('Ad discovery completed', { 
        totalAds: STATE.totalAds,
        visibleAds: ads.filter(ad => ad.visibility > 0).length
      });
      return ads;
    }

    extractAdAttributes(element) {
      const attributes = {};
      for (const attr of element.attributes) {
        if (attr.name.startsWith('data-ad-') || 
            attr.name === 'class' || 
            attr.name === 'id' ||
            attr.name.includes('google') ||
            attr.name.includes('adsense')) {
          attributes[attr.name] = attr.value;
        }
      }
      return attributes;
    }

    calculatePriority(element) {
      try {
        const rect = element.getBoundingClientRect();
        const visibility = AdUtils.calculateVisibility(element);
        
        let priority = 40; // Base priority
        
        // Viewport position bonus
        if (rect.top < 300) priority += 20;
        
        // Size bonus
        const area = rect.width * rect.height;
        if (area > 300 * 250) priority += 20;
        if (area > 728 * 90) priority += 15;
        if (area > 320 * 50) priority += 10;
        
        // Visibility bonus
        priority += visibility * 30;
        
        // Position bonus (above the fold)
        if (rect.top >= 0 && rect.top < window.innerHeight * 0.6) priority += 25;
        
        // Element type bonus
        if (element.tagName.toLowerCase() === 'ins') priority += 15;
        if (element.classList.contains('adsense')) priority += 10;
        
        return Math.min(100, Math.max(1, Math.round(priority)));
      } catch (error) {
        logger.warn('Priority calculation failed', { error: error.message });
        return 50;
      }
    }

    async loadAd(adData) {
      if (this.loadedAds.has(adData.id) || 
          adData.element.hasAttribute('data-ads-loaded') ||
          adData.status === 'loaded') {
        AdUtils.removeLoadingPlaceholder(adData.element);
        logger.debug('Skipping ad load - already loaded', { adId: adData.id });
        return true;
      }
      
      if (STATE.processingQueue.has(adData.id)) {
        logger.debug('Skipping ad load - currently processing', { adId: adData.id });
        return false;
      }

      const startTime = Date.now();
      adData.lastAttempt = startTime;
      adData.attempts++;
      STATE.pushAttempts++;
      this.performanceProfiler.startProfiling(adData.id);
      
      try {
        logger.debug('Loading ad', { 
          adId: adData.id, 
          priority: adData.priority, 
          attempt: adData.attempts,
          visibility: adData.visibility
        });
        
        AdUtils.preventLayoutShift(adData.element);
        const placeholder = AdUtils.createLoadingPlaceholder(adData.element);
        
        this.ensureAdAttributes(adData.element);
        
        adData.status = 'loading';
        adData.element.setAttribute('data-ad-processing', 'true');
        adData.element.setAttribute('data-ad-attempt', adData.attempts);
        STATE.processingQueue.add(adData.id);
        
        await this.executeAdLoad(adData);
        
        const loadTime = Date.now() - startTime;
        this.handleLoadSuccess(adData, loadTime);
        
        logger.info('Ad loaded successfully', { 
          adId: adData.id, 
          loadTime,
          priority: adData.priority,
          attempt: adData.attempts
        });
        
        return true;
      } catch (error) {
        adData.failureReasons.push({
          reason: error.message,
          timestamp: Date.now(),
          attempt: adData.attempts
        });
        
        AdUtils.removeLoadingPlaceholder(adData.element);
        
        if (this.retryEngine.shouldRetry(adData, error)) {
          const delay = this.retryEngine.calculateDelay(adData.attempts);
          logger.warn('Ad load failed, scheduling retry', { 
            adId: adData.id, 
            error: error.message, 
            retryDelay: delay,
            attempt: adData.attempts
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.loadAd(adData);
        }
        
        const loadTime = Date.now() - startTime;
        this.handleLoadFailure(adData, error, loadTime);
        return false;
      } finally {
        STATE.processingQueue.delete(adData.id);
        adData.element.removeAttribute('data-ad-processing');
        this.performanceProfiler.stopProfiling(adData.id);
      }
    }

    ensureAdAttributes(element) {
      if (!element.hasAttribute('data-ad-client')) {
        element.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
      }
      
      if (!element.hasAttribute('data-ad-slot')) {
        const slot = element.dataset.adSlot || 
                    element.id || 
                    `auto-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        element.setAttribute('data-ad-slot', slot);
        logger.debug('Assigned ad slot', { adId: element.getAttribute('data-ad-id'), slot });
      }
      
      if (!element.hasAttribute('data-ad-format')) {
        const format = element.dataset.adFormat || 'auto';
        element.setAttribute('data-ad-format', format);
      }
      
      if (!element.hasAttribute('data-full-width-responsive')) {
        element.setAttribute('data-full-width-responsive', 'true');
      }
      
      // Remove test mode for production
      element.removeAttribute('data-adtest');
      
      // Add loading state
      element.setAttribute('data-ad-state', 'loading');
    }

    async executeAdLoad(adData) {
      return new Promise((resolve, reject) => {
        try {
          const startPush = Date.now();
          
          // Enhanced push with error handling
          const pushResult = (window.adsbygoogle = window.adsbygoogle || []).push({});
          
          logger.debug('AdSense push executed', { 
            adId: adData.id, 
            pushResult,
            queueLength: window.adsbygoogle.length 
          });
          
          // Immediate verification
          setTimeout(() => {
            if (AdUtils.isAdLoaded(adData.element)) {
              resolve();
              return;
            }
          }, 500);
          
          // Extended verification with multiple checks
          const timeout = setTimeout(() => {
            this.verifyAdLoad(adData, resolve, reject);
          }, CONFIG.CRITICAL_LOAD_TIME);
          
          const checker = setInterval(() => {
            if (AdUtils.isAdLoaded(adData.element)) {
              clearTimeout(timeout);
              clearInterval(checker);
              resolve();
            }
          }, 200);
          
          STATE.timers.add(timeout);
          STATE.timers.add(checker);
          
        } catch (error) {
          logger.error('AdSense push failed', { 
            adId: adData.id, 
            error: error.message 
          });
          reject(error);
        }
      });
    }

    async verifyAdLoad(adData, resolve, reject) {
      let attempts = 0;
      const maxAttempts = 50;
      
      while (attempts < maxAttempts) {
        if (AdUtils.isAdLoaded(adData.element)) {
          logger.debug('Ad load verified', { 
            adId: adData.id, 
            attempts,
            verificationTime: attempts * 200 
          });
          resolve();
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
      
      logger.warn('Ad load verification timeout', { 
        adId: adData.id, 
        attempts,
        totalTime: attempts * 200 
      });
      reject(new Error('Ad failed to load within time limit'));
    }

    handleLoadSuccess(adData, loadTime) {
      adData.status = 'loaded';
      adData.loadTime = loadTime;
      adData.element.setAttribute('data-ads-loaded', 'true');
      adData.element.setAttribute('data-ad-state', 'loaded');
      adData.element.setAttribute('data-ad-load-time', loadTime);
      adData.element.removeAttribute('data-ad-failed');
      
      AdUtils.removeLoadingPlaceholder(adData.element);
      
      STATE.loadedAds++;
      STATE.lastPushTime = Date.now();
      this.loadedAds.add(adData.id);
      STATE.processingQueue.delete(adData.id);
      
      this.updateMetrics();
    }

    handleLoadFailure(adData, error, loadTime) {
      adData.status = 'failed';
      adData.error = error.message;
      adData.failureTime = loadTime;
      adData.element.setAttribute('data-ad-failed', 'true');
      adData.element.setAttribute('data-ad-state', 'failed');
      adData.element.setAttribute('data-ad-error', error.message);
      
      AdUtils.removeLoadingPlaceholder(adData.element);
      
      STATE.failedAds++;
      this.failedAds.add(adData.id);
      STATE.processingQueue.delete(adData.id);
      
      this.updateMetrics();
      logger.error('Ad load failed permanently', { 
        adId: adData.id, 
        error: error.message,
        attempts: adData.attempts,
        priority: adData.priority
      });
    }

    updateMetrics() {
      const total = STATE.loadedAds + STATE.failedAds;
      if (total > 0) {
        STATE.metrics.successRate = Math.round((STATE.loadedAds / total) * 100);
        STATE.metrics.errorRate = Math.round((STATE.failedAds / total) * 100);
      }

      const loadedAds = Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'loaded');
      if (loadedAds.length > 0) {
        const totalTime = loadedAds.reduce((sum, ad) => sum + (ad.loadTime || 0), 0);
        STATE.metrics.avgLoadTime = Math.round(totalTime / loadedAds.length);
      }

      logger.debug('Metrics updated', STATE.metrics);
    }

    async batchProcess(ads) {
      if (this.processingLock) {
        logger.debug('Batch processing locked, skipping');
        return;
      }

      this.processingLock = true;
      logger.info('Starting batch processing', { totalAds: ads.length });
      
      try {
        const batches = [];
        for (let i = 0; i < ads.length; i += CONFIG.BATCH_SIZE) {
          batches.push(ads.slice(i, i + CONFIG.BATCH_SIZE));
        }

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i].filter(ad => 
            !ad.element.hasAttribute('data-ads-loaded') && 
            !STATE.processingQueue.has(ad.id) &&
            !ad.element.hasAttribute('data-ad-processing')
          );
          
          if (batch.length === 0) continue;

          logger.debug(`Processing batch ${i + 1}/${batches.length}`, { 
            batchSize: batch.length 
          });
          
          const promises = batch.map(ad => this.loadAd(ad));
          await Promise.allSettled(promises);
          
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
          }
        }
      } finally {
        this.processingLock = false;
        logger.info('Batch processing completed');
      }
    }
  }

  // Enhanced Retry Engine
  class RetryEngine {
    constructor() {
      this.retryStates = new Map();
      this.cooldownPeriods = new Map();
    }

    shouldRetry(adData, error) {
      const adId = adData.id;
      const state = this.retryStates.get(adId) || { attempts: 0, failures: [] };
      state.attempts = adData.attempts;
      state.failures.push({
        error: error.message,
        timestamp: Date.now()
      });
      this.retryStates.set(adId, state);

      if (this.cooldownPeriods.has(adId)) {
        const cooldownEnd = this.cooldownPeriods.get(adId);
        if (Date.now() < cooldownEnd) {
          logger.debug('Ad in cooldown, skipping retry', { adId });
          return false;
        }
      }

      const errorSeverity = this.analyzeError(error);
      const maxRetries = adData.priority > 80 ? CONFIG.MAX_RETRY_ATTEMPTS + 2 : CONFIG.MAX_RETRY_ATTEMPTS;
      const networkInfo = AdUtils.getNetworkInfo();
      const networkFactor = networkInfo.effectiveType === 'slow-2g' ? 0.7 : 1.0;

      const shouldRetry = state.attempts < maxRetries && errorSeverity * networkFactor > 0.4;

      if (!shouldRetry && state.attempts >= maxRetries) {
        this.cooldownPeriods.set(adId, Date.now() + 60000); // 1 minute cooldown
        logger.warn('Ad reached max retries, entering cooldown', { 
          adId, 
          attempts: state.attempts,
          maxRetries 
        });
      }

      return shouldRetry;
    }

    analyzeError(error) {
      const errorMessage = error.message.toLowerCase();
      const severityMap = {
        'timeout': 0.9,
        'network': 0.8,
        'script': 0.7,
        'load': 0.6,
        'blocked': 0.3,
        'adblock': 0.2
      };
      
      for (const [type, severity] of Object.entries(severityMap)) {
        if (errorMessage.includes(type)) return severity;
      }
      
      return 0.6; // Default severity
    }

    calculateDelay(attempts) {
      const baseDelay = CONFIG.RETRY_DELAY;
      const backoff = Math.pow(1.4, attempts - 1);
      const jitter = Math.random() * 0.4 + 0.8;
      const networkMultiplier = STATE.networkQuality === 'slow-2g' ? 1.5 : 1.0;
      return Math.min(baseDelay * backoff * jitter * networkMultiplier, 12000);
    }
  }

  // Performance Profiler
  class PerformanceProfiler {
    constructor() {
      this.profiles = new Map();
    }

    startProfiling(adId) {
      const startMark = `ad-start-${adId}`;
      if (window.performance && window.performance.mark) {
        try {
          window.performance.mark(startMark);
        } catch (e) {
          logger.debug('Performance mark failed', { error: e.message });
        }
      }
      
      this.profiles.set(adId, {
        start: Date.now(),
        startMark
      });
    }

    stopProfiling(adId) {
      const profile = this.profiles.get(adId);
      if (!profile) return;

      const endTime = Date.now();
      const duration = endTime - profile.start;

      if (window.performance && window.performance.mark && window.performance.measure) {
        try {
          const endMark = `ad-end-${adId}`;
          window.performance.mark(endMark);
          window.performance.measure(`ad-load-${adId}`, profile.startMark, endMark);
        } catch (e) {
          logger.debug('Performance measure failed', { error: e.message });
        }
      }

      const finalProfile = {
        adId,
        duration,
        startTime: profile.start,
        endTime,
        memoryUsage: this.getMemorySnapshot()
      };

      this.profiles.set(adId, finalProfile);
      return finalProfile;
    }

    getMemorySnapshot() {
      if (window.performance && window.performance.memory) {
        return {
          used: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024)
        };
      }
      return null;
    }
  }

  // Enhanced Lazy Load Manager
  class LazyLoadManager {
    constructor(adManager) {
      this.adManager = adManager;
      this.observer = null;
      this.observedAds = new Set();
      this.visibilityThresholds = [0, 0.1, 0.25, 0.5, 1.0];
    }

    initialize() {
      if (!window.IntersectionObserver) {
        logger.warn('IntersectionObserver not supported, using fallback');
        return false;
      }

      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: CONFIG.LAZY_LOAD_MARGIN,
          threshold: this.visibilityThresholds
        }
      );

      STATE.observers.add(this.observer);
      logger.info('Lazy load manager initialized');
      return true;
    }

    observeAd(adData) {
      if (this.observer && 
          !this.observedAds.has(adData.id) && 
          !adData.element.hasAttribute('data-ads-loaded') &&
          !adData.element.hasAttribute('data-ad-processing')) {
        this.observer.observe(adData.element);
        this.observedAds.add(adData.id);
        logger.debug('Ad added to lazy load observation', { adId: adData.id });
      }
    }

    async handleIntersection(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= CONFIG.INTERSECTION_THRESHOLD) {
          const adData = this.findAdData(entry.target);
          if (adData && 
              adData.status === 'discovered' && 
              !adData.element.hasAttribute('data-ads-loaded') &&
              !adData.element.hasAttribute('data-ad-processing')) {
            
            logger.debug('Ad entered viewport, loading immediately', { 
              adId: adData.id, 
              intersectionRatio: entry.intersectionRatio.toFixed(2)
            });
            
            this.observer.unobserve(entry.target);
            this.observedAds.delete(adData.id);
            
            // Load immediately for better UX
            this.adManager.loadAd(adData);
          }
        }
      }
    }

    findAdData(element) {
      for (const adData of STATE.adRegistry.values()) {
        if (adData.element === element) {
          return adData;
        }
      }
      return null;
    }

    async loadVisibleAds() {
      const visibleAds = Array.from(STATE.adRegistry.values()).filter(ad => {
        const rect = ad.element.getBoundingClientRect();
        return rect.top < window.innerHeight && 
               rect.bottom > 0 && 
               !ad.element.hasAttribute('data-ads-loaded') &&
               !ad.element.hasAttribute('data-ad-processing');
      });

      if (visibleAds.length === 0) {
        logger.debug('No visible ads to load immediately');
        return;
      }

      logger.info('Loading immediately visible ads', { count: visibleAds.length });
      
      // Sort by priority for visible ads
      visibleAds.sort((a, b) => b.priority - a.priority);
      
      await this.adManager.batchProcess(visibleAds);
    }
  }

  // Enhanced Health Monitor
  class HealthMonitor {
    constructor(adManager) {
      this.adManager = adManager;
      this.interval = null;
      this.checkCount = 0;
    }

    start() {
      if (this.interval) return;
      
      logger.info('Starting health monitor');
      this.interval = setInterval(() => {
        this.performHealthCheck();
      }, CONFIG.HEALTH_CHECK_INTERVAL);
      
      STATE.intervals.add(this.interval);
    }

    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        STATE.intervals.delete(this.interval);
        this.interval = null;
        logger.info('Health monitor stopped');
      }
    }

    async performHealthCheck() {
      this.checkCount++;
      STATE.metrics.healthChecks++;
      
      logger.debug('Performing health check', { checkNumber: this.checkCount });
      
      const failedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'failed' && 
        ad.attempts < CONFIG.MAX_RETRY_ATTEMPTS &&
        !ad.element.hasAttribute('data-ads-loaded') &&
        !STATE.processingQueue.has(ad.id) &&
        !ad.element.hasAttribute('data-ad-processing') &&
        Date.now() - ad.lastAttempt > 10000 // 10 second cooldown
      );

      if (failedAds.length === 0) {
        logger.debug('Health check: No failed ads to retry');
        return;
      }

      logger.info(`Health check: Retrying ${failedAds.length} failed ads`);
      
      // Prioritize high-priority failed ads
      failedAds.sort((a, b) => b.priority - a.priority);
      
      await this.adManager.batchProcess(failedAds.slice(0, 5)); // Limit to 5 ads per health check
    }
  }

  // Dynamic Ad Scanner
  class AdScanner {
    constructor(adManager, lazyLoadManager) {
      this.adManager = adManager;
      this.lazyLoadManager = lazyLoadManager;
      this.observer = null;
      this.scanCount = 0;
    }

    initialize() {
      if (!window.MutationObserver) {
        logger.warn('MutationObserver not supported, dynamic scanning disabled');
        return;
      }

      this.observer = new MutationObserver(mutations => {
        let hasNewNodes = false;
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length) {
            hasNewNodes = true;
          }
        });
        
        if (hasNewNodes) {
          // Debounce scanning
          clearTimeout(this.scanTimeout);
          this.scanTimeout = setTimeout(() => {
            this.scanForNewAds();
          }, 1000);
        }
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      STATE.observers.add(this.observer);
      logger.info('Ad scanner initialized');
    }

    async scanForNewAds() {
      this.scanCount++;
      const elements = Array.from(document.querySelectorAll(CONFIG.AD_SELECTOR));
      const newAds = elements.filter(el => !el.hasAttribute('data-ad-id'));
      
      if (newAds.length === 0) {
        logger.debug('Scan completed: No new ads found', { scanNumber: this.scanCount });
        return;
      }

      logger.info('Discovered new ad containers', { 
        count: newAds.length, 
        scanNumber: this.scanCount 
      });
      
      const ads = newAds.map((element, index) => {
        const adId = AdUtils.generateAdId(element, STATE.totalAds + index);
        const adData = {
          id: adId,
          element,
          index: STATE.totalAds + index,
          rect: element.getBoundingClientRect(),
          attributes: this.adManager.extractAdAttributes(element),
          visibility: AdUtils.calculateVisibility(element),
          priority: this.adManager.calculatePriority(element),
          status: 'discovered',
          attempts: 0,
          timestamp: Date.now(),
          lastAttempt: 0,
          failureReasons: []
        };
        
        element.setAttribute('data-ad-id', adId);
        element.setAttribute('data-ad-discovered', Date.now());
        STATE.adRegistry.set(adId, adData);
        return adData;
      });

      STATE.totalAds += ads.length;
      
      // Setup lazy loading for new ads
      ads.forEach(ad => this.lazyLoadManager.observeAd(ad));
      
      // Load visible new ads immediately
      const visibleAds = ads.filter(ad => {
        const rect = ad.element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });

      if (visibleAds.length > 0) {
        logger.info('Loading newly discovered visible ads', { count: visibleAds.length });
        await this.adManager.batchProcess(visibleAds);
      }
      
      logger.info('New ad discovery completed', { 
        totalAds: STATE.totalAds,
        newAds: ads.length,
        visibleNewAds: visibleAds.length
      });
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        STATE.observers.delete(this.observer);
        logger.info('Ad scanner destroyed');
      }
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
      }
    }
  }

  // Main AdSense Controller v3.6
  class AdSenseController {
    constructor() {
      this.networkOptimizer = new NetworkOptimizer();
      this.scriptLoader = new ScriptLoader();
      this.adManager = new AdManager();
      this.autoAdsManager = new AutoAdsManager();
      this.lazyLoadManager = new LazyLoadManager(this.adManager);
      this.healthMonitor = new HealthMonitor(this.adManager);
      this.adScanner = new AdScanner(this.adManager, this.lazyLoadManager);
      this.initialized = false;
      this.loadTriggered = false;
    }

    async initialize() {
      if (this.initialized) return;
      this.initialized = true;

      logger.info('🚀 AdSense Optimizer v3.6 Flash initializing...');

      try {
        await this.prepareEnvironment();
        await this.setupOptimalLoading();
        
        AdUtils.detectAdBlocker();
        AdUtils.optimizeForNetwork();
        
        STATE.initialized = true;
        logger.info('✅ AdSense Optimizer v3.6 initialized successfully', {
          pageLoadTime: STATE.pageLoadTime,
          networkQuality: STATE.networkQuality,
          adBlockerDetected: STATE.adBlockerDetected
        });
      } catch (error) {
        logger.error('Initialization failed', { error: error.message });
        throw error;
      }
    }

    async prepareEnvironment() {
      await AdUtils.waitForPageLoad();
      await this.networkOptimizer.optimize();
      this.setupObservers();
      this.setupPerformanceMonitoring();
      this.adScanner.initialize();
    }

    async setupOptimalLoading() {
      if (this.loadTriggered) return;
      this.loadTriggered = true;
      
      const triggerLoad = async () => {
        logger.info('Optimal load timing reached, starting AdSense');
        await this.executeOptimalLoadSequence();
      };

      // Page speed optimized loading strategy
      if (CONFIG.PAGE_SPEED_MODE) {
        // Wait for page to be fully loaded and interactive
        if (document.readyState === 'complete') {
          setTimeout(triggerLoad, CONFIG.LOAD_DELAY);
        } else {
          window.addEventListener('load', () => {
            setTimeout(triggerLoad, CONFIG.POST_LOAD_DELAY);
          }, { once: true });
        }
      } else {
        // Standard loading
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
          setTimeout(triggerLoad, CONFIG.LOAD_DELAY);
        } else {
          document.addEventListener('DOMContentLoaded', () => {
            setTimeout(triggerLoad, CONFIG.LOAD_DELAY);
          }, { once: true });
        }
      }

      // User interaction trigger for faster loading
      const interactionEvents = ['click', 'scroll', 'touchstart', 'keydown'];
      const handleInteraction = () => {
        interactionEvents.forEach(event => {
          document.removeEventListener(event, handleInteraction);
        });
        if (!this.loadTriggered) {
          logger.info('User interaction detected, accelerating load');
          setTimeout(triggerLoad, 500);
        }
      };

      interactionEvents.forEach(event => {
        document.addEventListener(event, handleInteraction, { once: true, passive: true });
      });

      // Fallback timer
      setTimeout(() => {
        if (!STATE.initialized) {
          logger.warn('Fallback timer triggered');
          triggerLoad();
        }
      }, CONFIG.LOAD_DELAY + 5000);
    }

    async executeOptimalLoadSequence() {
      try {
        // Phase 1: Load AdSense script
        await this.scriptLoader.loadAdSenseScript();
        
        // Phase 2: Initialize Auto Ads (non-blocking)
        if (CONFIG.AUTO_ADS_ENABLED) {
          this.autoAdsManager.initialize(); // Don't await, let it run in background
        }
        
        // Phase 3: Discover manual ads
        const ads = await this.adManager.discoverAds();
        
        if (ads.length === 0 && !CONFIG.AUTO_ADS_ENABLED) {
          logger.warn('No manual ads found, scheduling re-scan');
          setTimeout(() => this.adScanner.scanForNewAds(), 2000);
          return;
        }

        // Phase 4: Setup lazy loading
        const lazyLoadSupported = this.lazyLoadManager.initialize();
        
        if (lazyLoadSupported) {
          // Setup observers for all ads
          ads.forEach(ad => this.lazyLoadManager.observeAd(ad));
          
          // Load only immediately visible ads
          await this.lazyLoadManager.loadVisibleAds();
        } else {
          // Fallback: load all ads with batching
          const sortedAds = ads.sort((a, b) => b.priority - a.priority);
          await this.adManager.batchProcess(sortedAds);
        }

        // Phase 5: Start health monitoring
        this.healthMonitor.start();

        // Phase 6: Performance reporting
        setTimeout(() => this.reportPerformance(), 5000);

        logger.info('Optimal load sequence completed successfully', {
          totalAds: STATE.totalAds,
          loadedAds: STATE.loadedAds,
          autoAdsEnabled: CONFIG.AUTO_ADS_ENABLED,
          autoAdsStatus: STATE.metrics.autoAdsStatus,
          successRate: STATE.metrics.successRate + '%',
          avgLoadTime: STATE.metrics.avgLoadTime + 'ms'
        });

      } catch (error) {
        logger.error('Optimal load sequence failed', { error: error.message });
        await this.emergencyRecovery();
      }
    }

    async emergencyRecovery() {
      logger.warn('🚨 Initiating emergency recovery');
      
      try {
        // Retry auto ads if failed
        if (CONFIG.AUTO_ADS_ENABLED && STATE.metrics.autoAdsStatus !== 'initialized') {
          this.autoAdsManager.forceReinitialize();
        }

        // Retry failed manual ads
        const failedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
          ad.status === 'failed' && 
          !ad.element.hasAttribute('data-ads-loaded') &&
          !ad.element.hasAttribute('data-ad-processing')
        );

        if (failedAds.length > 0) {
          logger.info(`Emergency recovery: Retrying ${failedAds.length} failed ads`);
          await this.adManager.batchProcess(failedAds);
        }

        // Scan for new ads
        await this.adScanner.scanForNewAds();

        logger.info('Emergency recovery completed');
      } catch (error) {
        logger.error('Emergency recovery failed', { error: error.message });
      }
    }

    setupObservers() {
      // Network status monitoring
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        connection.addEventListener('change', () => {
          const networkInfo = AdUtils.getNetworkInfo();
          logger.info('Network status changed', networkInfo);
          AdUtils.optimizeForNetwork();
        });
      }

      // Page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          logger.debug('Page became visible, performing checks');
          setTimeout(() => {
            this.healthMonitor.performHealthCheck();
            this.adScanner.scanForNewAds();
          }, 1000);
        }
      });

      // Window focus/blur
      window.addEventListener('focus', () => {
        logger.debug('Window focused, resuming operations');
        if (!this.healthMonitor.interval) {
          this.healthMonitor.start();
        }
      });

      window.addEventListener('blur', () => {
        logger.debug('Window blurred, pausing non-critical operations');
      });

      // Scroll-based optimization
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          // Check for new ads in viewport after scroll
          this.checkViewportAds();
        }, 500);
      }, { passive: true });
    }

    checkViewportAds() {
      const viewportAds = Array.from(STATE.adRegistry.values()).filter(ad => {
        if (ad.status !== 'discovered') return false;
        const rect = ad.element.getBoundingClientRect();
        return rect.top < window.innerHeight + 200 && rect.bottom > -200;
      });

      if (viewportAds.length > 0) {
        logger.debug('Found ads near viewport during scroll', { count: viewportAds.length });
        // Process them with slight delay to avoid performance issues
        setTimeout(() => {
          this.adManager.batchProcess(viewportAds);
        }, 100);
      }
    }

    setupPerformanceMonitoring() {
      // Performance Observer for detailed metrics
      if (typeof PerformanceObserver !== 'undefined') {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'measure' && entry.name.includes('ad-load')) {
                logger.debug('Performance measure', {
                  name: entry.name,
                  duration: Math.round(entry.duration),
                  startTime: Math.round(entry.startTime)
                });
              }
            }
          });
          observer.observe({ entryTypes: ['measure'] });
          STATE.observers.add(observer);
        } catch (e) {
          logger.warn('Performance observer setup failed', { error: e.message });
        }
      }

      // Page load performance tracking
      window.addEventListener('load', () => {
        if (window.performance && window.performance.timing) {
          const timing = window.performance.timing;
          const loadTime = timing.loadEventEnd - timing.navigationStart;
          const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
          
          logger.info('Page performance metrics', { 
            totalLoadTime: loadTime,
            domContentLoaded: domContentLoaded,
            timeToInteractive: timing.domInteractive - timing.navigationStart
          });
        }
      });

      // Memory usage monitoring
      if (window.performance && window.performance.memory) {
        setInterval(() => {
          const memory = window.performance.memory;
          if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
            logger.warn('High memory usage detected', {
              used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
              total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB'
            });
          }
        }, 30000);
      }
    }

    reportPerformance() {
      const report = {
        version: '3.6',
        sessionId: STATE.sessionId,
        uptime: Date.now() - STATE.startTime,
        pageLoadTime: STATE.pageLoadTime,
        ads: {
          total: STATE.totalAds,
          loaded: STATE.loadedAds,
          failed: STATE.failedAds,
          processing: STATE.processingQueue.size,
          successRate: STATE.metrics.successRate,
          avgLoadTime: STATE.metrics.avgLoadTime
        },
        autoAds: {
          enabled: CONFIG.AUTO_ADS_ENABLED,
          status: STATE.metrics.autoAdsStatus,
          initialized: STATE.autoAdsInitialized
        },
        network: {
          quality: STATE.networkQuality,
          info: AdUtils.getNetworkInfo()
        },
        performance: {
          pushAttempts: STATE.pushAttempts,
          lastPushTime: STATE.lastPushTime,
          healthChecks: STATE.metrics.healthChecks,
          adBlockerDetected: STATE.adBlockerDetected
        }
      };

      logger.info('📊 Performance Report', report);
      return report;
    }

    // Public API Methods
    getStatus() {
      return this.reportPerformance();
    }

    async forcePushAds() {
      logger.info('🔧 Force pushing all ads');
      
      // Force auto ads reinitialize
      if (CONFIG.AUTO_ADS_ENABLED) {
        this.autoAdsManager.forceReinitialize();
      }

      // Get all non-loaded ads
      const ads = Array.from(STATE.adRegistry.values()).filter(ad => 
        (ad.status === 'discovered' || ad.status === 'failed') && 
        !ad.element.hasAttribute('data-ads-loaded') &&
        !ad.element.hasAttribute('data-ad-processing')
      );
      
      if (ads.length === 0) {
        // Scan for new ads
        await this.adScanner.scanForNewAds();
        logger.info('No ads to force push, performed new scan');
        return { attempted: 0, successful: 0 };
      }

      // Process all ads
      await this.adManager.batchProcess(ads);
      
      const successful = ads.filter(ad => ad.status === 'loaded').length;
      logger.info('Force push completed', { 
        attempted: ads.length, 
        successful,
        successRate: Math.round((successful / ads.length) * 100) + '%'
      });
      
      // Additional scan for dynamic content
      setTimeout(() => this.adScanner.scanForNewAds(), 1000);
      
      return { attempted: ads.length, successful };
    }

    async optimizePerformance() {
      logger.info('🚀 Optimizing performance...');
      
      // Network optimization
      AdUtils.optimizeForNetwork();
      
      // Clean up failed ads that can't be retried
      const permanentlyFailedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'failed' && 
        ad.attempts >= CONFIG.MAX_RETRY_ATTEMPTS
      );
      
      permanentlyFailedAds.forEach(ad => {
        AdUtils.removeLoadingPlaceholder(ad.element);
        ad.element.style.display = 'none';
      });
      
      // Garbage collection hints
      if (window.gc) {
        window.gc();
      }
      
      logger.info('Performance optimization completed', {
        cleanedFailedAds: permanentlyFailedAds.length,
        currentMemory: logger.getMemoryUsage()
      });
    }

    async refreshAds() {
      logger.info('🔄 Refreshing all ads');
      
      // Reset failed ads for retry
      Array.from(STATE.adRegistry.values()).forEach(ad => {
        if (ad.status === 'failed' && ad.attempts < CONFIG.MAX_RETRY_ATTEMPTS) {
          ad.status = 'discovered';
          ad.attempts = 0;
          ad.element.removeAttribute('data-ad-failed');
          ad.element.removeAttribute('data-ad-processing');
        }
      });
      
      // Force push all ads
      await this.forcePushAds();
      
      // Reinitialize auto ads
      if (CONFIG.AUTO_ADS_ENABLED) {
        setTimeout(() => this.autoAdsManager.forceReinitialize(), 2000);
      }
      
      logger.info('Ad refresh completed');
    }

    destroy() {
      logger.info('🔥 Destroying AdSense Controller');
      
      // Stop all monitoring
      this.healthMonitor.stop();
      this.adScanner.destroy();
      
      // Clear all timers and intervals
      STATE.timers.forEach(timer => {
        clearTimeout(timer);
        clearInterval(timer);
      });
      STATE.timers.clear();
      
      STATE.intervals.forEach(interval => clearInterval(interval));
      STATE.intervals.clear();
      
      // Disconnect all observers
      STATE.observers.forEach(observer => {
        if (observer && observer.disconnect) {
          observer.disconnect();
        }
      });
      STATE.observers.clear();
      
      // Clean up ad elements
      STATE.adRegistry.forEach(ad => {
        AdUtils.removeLoadingPlaceholder(ad.element);
        ad.element.removeAttribute('data-ad-processing');
      });
      
      // Clear state
      STATE.adRegistry.clear();
      STATE.loadQueue.clear();
      STATE.processingQueue.clear();
      STATE.healthCheckQueue.clear();
      
      // Reset flags
      this.initialized = false;
      STATE.initialized = false;
      
      // Remove global reference
      delete window.AdSenseOptimizer;
      
      logger.info('AdSense Controller destroyed successfully');
    }
  }

  // Enhanced Error Handling
  const setupErrorHandling = () => {
    // Global error handler for AdSense related errors
    window.addEventListener('error', function(event) {
      if (event.filename && (
        event.filename.includes('adsbygoogle') || 
        event.filename.includes('googlesyndication') ||
        event.filename.includes('googleads')
      )) {
        logger.warn('AdSense script error intercepted', { 
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
        STATE.adBlockerDetected = true;
        event.preventDefault();
        return false;
      }
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
      if (event.reason && event.reason.message && 
          (event.reason.message.toLowerCase().includes('ad') ||
           event.reason.message.includes('googlesyndication'))) {
        logger.warn('Ad-related promise rejection intercepted', { 
          reason: event.reason.message,
          stack: event.reason.stack
        });
        STATE.adBlockerDetected = true;
        event.preventDefault();
      }
    });
  };

  // Initialize AdSense Optimizer v3.6 Flash
  async function initializeAdSenseOptimizer() {
    try {
      setupErrorHandling();
      
      const controller = new AdSenseController();
      await controller.initialize();
      
      // Enhanced global API
      window.AdSenseOptimizer = {
        version: '3.6-Flash',
        build: Date.now(),
        
        // Status and monitoring
        getStatus: () => controller.getStatus(),
        getMetrics: () => STATE.metrics,
        getNetworkInfo: () => AdUtils.getNetworkInfo(),
        getLogs: () => logger.logHistory.slice(-30),
        getPerformanceLogs: () => logger.performanceLogs.slice(-20),
        
        // Ad management
        forcePushAds: () => controller.forcePushAds(),
        refreshAds: () => controller.refreshAds(),
        getFailedAds: () => Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'failed'),
        getLoadedAds: () => Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'loaded'),
        
        // Auto ads management
        reinitializeAutoAds: () => controller.autoAdsManager.forceReinitialize(),
        getAutoAdsStatus: () => STATE.metrics.autoAdsStatus,
        
        // Performance optimization
        optimizePerformance: () => controller.optimizePerformance(),
        detectAdBlocker: () => AdUtils.detectAdBlocker(),
        
        // Health monitoring
        performHealthCheck: () => controller.healthMonitor.performHealthCheck(),
        scanForNewAds: () => controller.adScanner.scanForNewAds(),
        
        // Utility functions
        calculateVisibility: (element) => AdUtils.calculateVisibility(element),
        isAdLoaded: (element) => AdUtils.isAdLoaded(element),
        
        // Lifecycle management
        destroy: () => controller.destroy(),
        
        // Configuration
        getConfig: () => ({ ...CONFIG }),
        updateConfig: (updates) => {
          Object.assign(CONFIG, updates);
          logger.info('Configuration updated', updates);
        }
      };
      
      logger.info('🎉 AdSense Optimizer v3.6 Flash ready and globally available');
      logger.info('📈 Enhanced features: Auto Ads Fix, Page Speed Optimization, Advanced Error Handling');
      
      return controller;
    } catch (error) {
      logger.error('Failed to initialize AdSense Optimizer v3.6', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  // Multi-trigger initialization system
  const initializationSystem = {
    triggers: {
      domReady: false,
      windowLoad: false,
      userInteraction: false,
      timeout: false
    },
    promise: null,
    
    async tryInitialize(trigger) {
      if (this.promise) return this.promise;
      
      this.triggers[trigger] = true;
      logger.debug(`Initialization trigger activated: ${trigger}`);
      
      this.promise = initializeAdSenseOptimizer();
      return this.promise;
    }
  };

  // DOM ready trigger
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializationSystem.tryInitialize('domReady');
    }, { once: true });
  } else {
    setTimeout(() => initializationSystem.tryInitialize('domReady'), 100);
  }

  // Window load trigger (for page speed optimization)
  window.addEventListener('load', () => {
    if (!initializationSystem.promise) {
      setTimeout(() => initializationSystem.tryInitialize('windowLoad'), 200);
    }
  }, { once: true });

  // User interaction trigger (for faster perceived performance)
  const interactionEvents = ['click', 'scroll', 'touchstart', 'keydown', 'mousemove'];
  const handleInteraction = () => {
    interactionEvents.forEach(event => {
      document.removeEventListener(event, handleInteraction);
    });
    if (!initializationSystem.promise) {
      setTimeout(() => initializationSystem.tryInitialize('userInteraction'), 100);
    }
  };

  interactionEvents.forEach(event => {
    document.addEventListener(event, handleInteraction, { 
      once: true, 
      passive: true 
    });
  });

  // Fallback timeout trigger
  setTimeout(() => {
    if (!initializationSystem.promise) {
      logger.warn('Fallback timeout initialization triggered');
      initializationSystem.tryInitialize('timeout');
    }
  }, 8000);

  // Immediate initialization for fast networks
  const networkInfo = AdUtils.getNetworkInfo();
  if (networkInfo.effectiveType === '4g' && document.readyState !== 'loading') {
    setTimeout(() => {
      if (!initializationSystem.promise) {
        initializationSystem.tryInitialize('fastNetwork');
      }
    }, 1000);
  }

  // Console banner
  console.log(`
  %c🚀 AdSense Optimizer v3.6 Flash Loading...
  %c⚡ Enhanced Auto Ads Support
  %c📱 Page Speed Optimized  
  %c🛡️ Advanced Error Handling
  %c🎯 Smart Lazy Loading
  %c📊 Performance Monitoring
  `, 
    'color: #4285f4; font-size: 16px; font-weight: bold;',
    'color: #34a853; font-size: 12px;',
    'color: #fbbc04; font-size: 12px;',
    'color: #ea4335; font-size: 12px;',
    'color: #9c27b0; font-size: 12px;',
    'color: #ff9800; font-size: 12px;'
  );

})();

// The missing code completion from the calculatePriority function:
// This appears to be the continuation of the priority calculation logic

/* 
Complete calculatePriority function continuation:

        // Position bonus (above the fold)
        if (rect.top >= 0 && rect.top < window.innerHeight && rect.bottom > 0) priority += 30;
        if (rect.top < window.innerHeight / 2) priority += 25;
        if (rect.top < 100) priority += 20; // Very top of page
        if (rect.top < 50) priority += 15;  // Critical above-the-fold area
        
        // Fold position penalties
        if (rect.top > window.innerHeight) priority -= 10; // Below the fold
        if (rect.top > window.innerHeight * 2) priority -= 20; // Far below fold
        
        // Element type and class bonuses
        if (element.tagName.toLowerCase() === 'ins') priority += 15;
        if (element.classList.contains('adsense')) priority += 10;
        if (element.classList.contains('ad-priority-high')) priority += 25;
        if (element.classList.contains('ad-header')) priority += 20;
        if (element.classList.contains('ad-sidebar')) priority += 5;
        
        // Content context analysis
        const parentElement = element.parentElement;
        if (parentElement) {
          const parentClass = parentElement.className.toLowerCase();
          const parentId = parentElement.id.toLowerCase();
          
          // High priority contexts
          if (parentClass.includes('header') || parentClass.includes('hero')) priority += 15;
          if (parentClass.includes('main') || parentClass.includes('content')) priority += 12;
          if (parentClass.includes('article') || parentClass.includes('post')) priority += 10;
          
          // Medium priority contexts
          if (parentClass.includes('sidebar') || parentId.includes('sidebar')) priority += 8;
          if (parentClass.includes('widget') || parentClass.includes('module')) priority += 6;
          
          // Lower priority contexts
          if (parentClass.includes('footer')) priority += 3;
          if (parentClass.includes('comments')) priority += 2;
        }
        
        // Screen size adjustments
        const screenWidth = window.innerWidth || document.documentElement.clientWidth;
        if (screenWidth < 768) { // Mobile
          if (rect.width > screenWidth * 0.9) priority += 10; // Full width on mobile
          if (rect.top < 200) priority += 15; // More important on mobile
        } else if (screenWidth >= 1200) { // Desktop
          if (area > 728 * 250) priority += 12; // Large ads on desktop
        }
        
        // Ad format specific bonuses
        const adFormat = element.getAttribute('data-ad-format') || '';
        if (adFormat === 'fluid') priority += 8;
        if (adFormat === 'rectangle') priority += 6;
        if (adFormat === 'banner') priority += 4;
        
        // Performance considerations
        if (element.hasAttribute('data-ad-slot')) priority += 5; // Has proper slot ID
        if (element.getAttribute('data-full-width-responsive') === 'true') priority += 3;
        
        return Math.min(100, Math.max(1, Math.round(priority)));
      } catch (error) {
        logger.warn('Priority calculation failed', { error: error.message });
        return 50; // Default priority on error
      }
    }

    // Additional methods that might be missing or incomplete:

    getAdElementInfo(element) {
      try {
        const rect = element.getBoundingClientRect();
        return {
          id: element.getAttribute('data-ad-id') || 'unknown',
          rect: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left)
          },
          visibility: AdUtils.calculateVisibility(element),
          isVisible: rect.top < window.innerHeight && rect.bottom > 0,
          attributes: {
            slot: element.getAttribute('data-ad-slot'),
            format: element.getAttribute('data-ad-format'),
            client: element.getAttribute('data-ad-client'),
            responsive: element.getAttribute('data-full-width-responsive')
          },
          status: element.getAttribute('data-ad-state') || 'unknown',
          loaded: element.hasAttribute('data-ads-loaded'),
          processing: element.hasAttribute('data-ad-processing'),
          failed: element.hasAttribute('data-ad-failed')
        };
      } catch (error) {
        logger.warn('Failed to get ad element info', { error: error.message });
        return null;
      }
    }

    // Enhanced debugging method
    debugAdInfo() {
      const ads = Array.from(STATE.adRegistry.values()).map(ad => ({
        id: ad.id,
        status: ad.status,
        priority: ad.priority,
        attempts: ad.attempts,
        visibility: ad.visibility,
        rect: {
          width: Math.round(ad.rect.width),
          height: Math.round(ad.rect.height),
          top: Math.round(ad.rect.top)
        },
        loadTime: ad.loadTime || 0,
        errors: ad.failureReasons.map(f => f.reason)
      }));

      console.table(ads);
      
      return {
        summary: {
          total: STATE.totalAds,
          loaded: STATE.loadedAds,
          failed: STATE.failedAds,
          processing: STATE.processingQueue.size,
          successRate: STATE.metrics.successRate + '%',
          avgLoadTime: STATE.metrics.avgLoadTime + 'ms'
        },
        ads: ads
      };
    }

  } // End of the incomplete class/function

*/

// If you need to add this as a method to an existing class, here's the complete method:
function completeCalculatePriority(element) {
  try {
    const rect = element.getBoundingClientRect();
    const visibility = AdUtils.calculateVisibility(element);
    
    let priority = 40; // Base priority
    
    // Viewport position bonus
    if (rect.top < 300) priority += 20;
    
    // Size bonus
    const area = rect.width * rect.height;
    if (area > 300 * 250) priority += 20;
    if (area > 728 * 90) priority += 15;
    if (area > 320 * 50) priority += 10;
    
    // Visibility bonus
    priority += visibility * 30;
    
    // Position bonus (above the fold) - CONTINUATION FROM YOUR CODE
    if (rect.top >= 0 && rect.top < window.innerHeight && rect.bottom > 0) priority += 30;
    if (rect.top < window.innerHeight / 2) priority += 25;
    if (rect.top < 100) priority += 20; // Very top of page
    if (rect.top < 50) priority += 15;  // Critical above-the-fold area
    
    // Fold position penalties
    if (rect.top > window.innerHeight) priority -= 10; // Below the fold
    if (rect.top > window.innerHeight * 2) priority -= 20; // Far below fold
    
    // Element type and class bonuses
    if (element.tagName.toLowerCase() === 'ins') priority += 15;
    if (element.classList.contains('adsense')) priority += 10;
    if (element.classList.contains('ad-priority-high')) priority += 25;
    if (element.classList.contains('ad-header')) priority += 20;
    if (element.classList.contains('ad-sidebar')) priority += 5;
    
    // Content context analysis
    const parentElement = element.parentElement;
    if (parentElement) {
      const parentClass = parentElement.className.toLowerCase();
      const parentId = parentElement.id.toLowerCase();
      
      // High priority contexts
      if (parentClass.includes('header') || parentClass.includes('hero')) priority += 15;
      if (parentClass.includes('main') || parentClass.includes('content')) priority += 12;
      if (parentClass.includes('article') || parentClass.includes('post')) priority += 10;
      
      // Medium priority contexts
      if (parentClass.includes('sidebar') || parentId.includes('sidebar')) priority += 8;
      if (parentClass.includes('widget') || parentClass.includes('module')) priority += 6;
      
      // Lower priority contexts
      if (parentClass.includes('footer')) priority += 3;
      if (parentClass.includes('comments')) priority += 2;
    }
    
    // Screen size adjustments
    const screenWidth = window.innerWidth || document.documentElement.clientWidth;
    if (screenWidth < 768) { // Mobile
      if (rect.width > screenWidth * 0.9) priority += 10; // Full width on mobile
      if (rect.top < 200) priority += 15; // More important on mobile
    } else if (screenWidth >= 1200) { // Desktop
      if (area > 728 * 250) priority += 12; // Large ads on desktop
    }
    
    // Ad format specific bonuses
    const adFormat = element.getAttribute('data-ad-format') || '';
    if (adFormat === 'fluid') priority += 8;
    if (adFormat === 'rectangle') priority += 6;
    if (adFormat === 'banner') priority += 4;
    
    // Performance considerations
    if (element.hasAttribute('data-ad-slot')) priority += 5; // Has proper slot ID
    if (element.getAttribute('data-full-width-responsive') === 'true') priority += 3;
    
    return Math.min(100, Math.max(1, Math.round(priority)));
  } catch (error) {
    console.warn('Priority calculation failed', { error: error.message });
    return 50; // Default priority on error
  }
}
