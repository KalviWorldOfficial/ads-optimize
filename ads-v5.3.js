(function() {
  'use strict';

  // 🚀 AdSense Optimizer v5.0 - Ultimate Performance & Reliability
  const CONFIG = {
    CLIENT_ID: 'ca-pub-7407983524344370',
    VERSION: '5.0',
    
    // Multiple CDN endpoints for maximum reliability
    SCRIPT_URLS: [
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      'https://cdn.jsdelivr.net/gh/googleads/googleads.github.io@master/adsbygoogle.js',
      'https://unpkg.com/adsbygoogle@latest/adsbygoogle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/google-adsense/1.0.0/adsbygoogle.min.js'
    ],
    
    // Aggressive monitoring and retry settings
    HEALTH_CHECK_INTERVAL: 3000,
    FORCE_LOAD_INTERVAL: 10000,
    MAX_RETRY_ATTEMPTS: 8,
    RETRY_DELAY: 1500,
    SCRIPT_TIMEOUT: 8000,
    AD_LOAD_TIMEOUT: 5000,
    
    // Performance and loading settings
    LAZY_LOAD_MARGIN: '150px',
    INTERSECTION_THRESHOLD: 0.05,
    BATCH_SIZE: 3,
    BATCH_DELAY: 800,
    
    // Network optimization
    PRECONNECT_DOMAINS: [
      'https://pagead2.googlesyndication.com',
      'https://googleads.g.doubleclick.net',
      'https://tpc.googlesyndication.com',
      'https://www.google.com'
    ],
    
    // Success thresholds
    TARGET_SUCCESS_RATE: 98,
    CRITICAL_LOAD_TIME: 2000,
    ACCEPTABLE_FAILURE_RATE: 2
  };

  // Enhanced State Management
  const STATE = {
    version: CONFIG.VERSION,
    sessionId: `ads_v5_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`,
    startTime: Date.now(),
    
    // Script loading state
    scriptLoaded: false,
    scriptLoading: false,
    adsenseReady: false,
    scriptSource: null,
    
    // Ad management
    totalAds: 0,
    loadedAds: 0,
    failedAds: 0,
    retryingAds: 0,
    
    // Collections
    adRegistry: new Map(),
    loadQueue: new Set(),
    processingQueue: new Set(),
    healthCheckQueue: new Set(),
    
    // Monitoring
    observers: new Set(),
    timers: new Set(),
    intervals: new Set(),
    
    // Performance metrics
    metrics: {
      scriptLoadTime: 0,
      avgAdLoadTime: 0,
      successRate: 0,
      errorRate: 0,
      totalLoadTime: 0,
      networkSpeed: 'unknown',
      retrySuccessRate: 0
    },
    
    // Health monitoring
    lastHealthCheck: Date.now(),
    healthCheckCount: 0,
    forceLoadCount: 0,
    
    // Flags
    initialized: false,
    aggressiveMode: false,
    emergencyMode: false
  };

  // Advanced Logger with Performance Tracking
  class UltimateLogger {
    constructor() {
      this.levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4 };
      this.currentLevel = 0;
      this.logHistory = [];
      this.performanceLogs = [];
    }

    log(level, message, data = {}, performance = false) {
      const timestamp = Date.now();
      const logEntry = {
        timestamp,
        level,
        message,
        data: { ...data, sessionId: STATE.sessionId },
        performance
      };

      if (this.levels[level] >= this.currentLevel) {
        const time = new Date(timestamp).toISOString().split('T')[1].split('.')[0];
        const prefix = `[AdSense-v5.0 ${time}] [${level}]`;
        const color = this.getLogColor(level);
        
        if (console[level.toLowerCase()]) {
          console[level.toLowerCase()](`%c${prefix} ${message}`, `color: ${color}`, data);
        } else {
          console.log(`%c${prefix} ${message}`, `color: ${color}`, data);
        }
      }

      this.logHistory.push(logEntry);
      if (performance) this.performanceLogs.push(logEntry);
      
      if (this.logHistory.length > 200) {
        this.logHistory = this.logHistory.slice(-150);
      }
      if (this.performanceLogs.length > 50) {
        this.performanceLogs = this.performanceLogs.slice(-30);
      }
    }

    getLogColor(level) {
      const colors = {
        DEBUG: '#6c757d',
        INFO: '#007bff', 
        WARN: '#ffc107',
        ERROR: '#dc3545',
        CRITICAL: '#e83e8c'
      };
      return colors[level] || '#000';
    }

    debug(msg, data) { this.log('DEBUG', msg, data); }
    info(msg, data) { this.log('INFO', msg, data); }
    warn(msg, data) { this.log('WARN', msg, data); }
    error(msg, data) { this.log('ERROR', msg, data); }
    critical(msg, data) { this.log('CRITICAL', msg, data); }
    perf(msg, data) { this.log('INFO', msg, data, true); }
  }

  const logger = new UltimateLogger();

  // Network Optimizer and Preloader
  class NetworkOptimizer {
    constructor() {
      this.connectionInfo = this.getConnectionInfo();
      this.preconnected = false;
    }

    async optimize() {
      await this.preconnectDomains();
      await this.optimizeForConnection();
      this.monitorNetworkChanges();
    }

    async preconnectDomains() {
      if (this.preconnected) return;

      for (const domain of CONFIG.PRECONNECT_DOMAINS) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }

      const dnsPrefetch = [
        'https://fonts.googleapis.com',
        'https://www.gstatic.com'
      ];

      for (const domain of dnsPrefetch) {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain;
        document.head.appendChild(link);
      }

      this.preconnected = true;
      logger.debug('Network preconnection completed');
    }

    async optimizeForConnection() {
      if (this.connectionInfo.saveData) {
        logger.info('Data saver mode detected, optimizing accordingly');
        CONFIG.BATCH_SIZE = 2;
        CONFIG.BATCH_DELAY = 1200;
      }

      if (this.connectionInfo.effectiveType === 'slow-2g' || 
          this.connectionInfo.effectiveType === '2g') {
        logger.warn('Slow connection detected, enabling aggressive optimization');
        STATE.aggressiveMode = true;
        CONFIG.BATCH_SIZE = 1;
        CONFIG.BATCH_DELAY = 2000;
      }
    }

    getConnectionInfo() {
      if (navigator.connection) {
        return {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
          saveData: navigator.connection.saveData
        };
      }
      return { effectiveType: 'unknown' };
    }

    monitorNetworkChanges() {
      if (navigator.connection) {
        navigator.connection.addEventListener('change', () => {
          this.connectionInfo = this.getConnectionInfo();
          STATE.metrics.networkSpeed = this.connectionInfo.effectiveType;
          logger.info('Network changed', this.connectionInfo);
        });
      }
    }
  }

  // Enhanced Utility Functions
  class UltimateUtils {
    static async waitForPageReady() {
      const conditions = [
        () => document.readyState === 'complete',
        () => document.body && document.head,
        () => window.innerWidth > 0,
        () => window.innerHeight > 0
      ];

      let attempts = 0;
      while (!conditions.every(condition => condition()) && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
      logger.debug('Page ready state achieved');
    }

    static generateUniqueAdId(element, index) {
      const id = element.id || 
                 element.dataset.adId || 
                 element.className.replace(/\s+/g, '-') ||
                 `auto-ad-${index}`;
      
      return `${id}_${STATE.sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }

    static isElementVisible(element) {
      const rect = element.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth || document.documentElement.clientWidth,
        height: window.innerHeight || document.documentElement.clientHeight
      };

      return rect.width > 0 && 
             rect.height > 0 && 
             rect.top < viewport.height && 
             rect.bottom > 0 && 
             rect.left < viewport.width && 
             rect.right > 0;
    }

    static calculateVisibilityRatio(element) {
      const rect = element.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth || document.documentElement.clientWidth,
        height: window.innerHeight || document.documentElement.clientHeight
      };
      
      const visibleWidth = Math.max(0, Math.min(rect.right, viewport.width) - Math.max(rect.left, 0));
      const visibleHeight = Math.max(0, Math.min(rect.bottom, viewport.height) - Math.max(rect.top, 0));
      const visibleArea = visibleWidth * visibleHeight;
      const totalArea = rect.width * rect.height;
      
      return totalArea > 0 ? (visibleArea / totalArea) : 0;
    }

    static isAdFullyLoaded(element) {
      const checks = [
        () => element.getAttribute('data-adsbygoogle-status') === 'done',
        () => element.querySelector('iframe') !== null,
        () => element.querySelector('ins[data-ad-status="filled"]') !== null,
        () => element.innerHTML.trim().length > 200,
        () => element.offsetWidth > 50 && element.offsetHeight > 50,
        () => element.querySelector('div[id*="google_ads"]') !== null
      ];

      const passedChecks = checks.filter(check => {
        try { return check(); } catch { return false; }
      }).length;

      return passedChecks >= 2;
    }

    static preventLayoutShift(element) {
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      
      const adSizes = [
        { width: 728, height: 90 },
        { width: 320, height: 250 },
        { width: 300, height: 250 },
        { width: 160, height: 600 },
        { width: 320, height: 50 }
      ];

      let targetSize = adSizes[0];
      
      for (const size of adSizes) {
        if (rect.width <= size.width + 50 && rect.height <= size.height + 50) {
          targetSize = size;
          break;
        }
      }

      if (!computedStyle.width || computedStyle.width === 'auto') {
        element.style.width = rect.width > 0 ? `${rect.width}px` : `${targetSize.width}px`;
      }
      
      if (!computedStyle.height || computedStyle.height === 'auto') {
        element.style.minHeight = rect.height > 0 ? `${rect.height}px` : `${targetSize.height}px`;
      }

      element.style.display = 'block';
      element.style.position = 'relative';
      element.style.overflow = 'hidden';
      
      logger.debug('Layout shift prevention applied', { 
        adId: element.id, 
        targetSize,
        currentSize: { width: rect.width, height: rect.height }
      });
    }

    static createLoadingPlaceholder(element) {
      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: adLoading 1.5s infinite;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: #999;
        z-index: 1;
      `;
      
      if (!document.getElementById('ad-loading-styles')) {
        const style = document.createElement('style');
        style.id = 'ad-loading-styles';
        style.textContent = `
          @keyframes adLoading {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      placeholder.textContent = 'Loading Ad...';
      element.style.position = 'relative';
      element.appendChild(placeholder);
      
      return placeholder;
    }

    static removeLoadingPlaceholder(element) {
      const placeholder = element.querySelector('div[style*="background: linear-gradient"]');
      if (placeholder && placeholder.parentNode) {
        placeholder.remove();
        logger.debug('Loading placeholder removed', { adId: element.getAttribute('data-ads-id') });
      }
    }
  }

  // Multi-CDN Script Loader with Fallbacks
  class UltimateScriptLoader {
    constructor() {
      this.attemptedUrls = new Set();
      this.loadStartTime = 0;
      this.retryCount = 0;
    }

    async loadAdSenseScript() {
      if (STATE.scriptLoaded) return true;
      if (STATE.scriptLoading) return this.waitForScript();

      STATE.scriptLoading = true;
      this.loadStartTime = Date.now();
      
      logger.info('🔄 Starting AdSense script loading sequence...');

      try {
        for (let i = 0; i < CONFIG.SCRIPT_URLS.length; i++) {
          const url = CONFIG.SCRIPT_URLS[i];
          
          if (this.attemptedUrls.has(url)) continue;
          
          logger.debug(`Attempting to load script from URL ${i + 1}/${CONFIG.SCRIPT_URLS.length}`, { url });
          
          try {
            await this.loadFromUrl(url);
            await this.verifyScriptIntegrity();
            
            STATE.scriptLoaded = true;
            STATE.scriptLoading = false;
            STATE.adsenseReady = true;
            STATE.scriptSource = url;
            
            const loadTime = Date.now() - this.loadStartTime;
            STATE.metrics.scriptLoadTime = loadTime;
            
            logger.info('✅ AdSense script loaded successfully', { 
              url, 
              loadTime, 
              attempt: i + 1 
            });
            return true;
            
          } catch (error) {
            this.attemptedUrls.add(url);
            logger.warn(`Script load failed from ${url}`, { error: error.message });
            
            if (i < CONFIG.SCRIPT_URLS.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            throw error;
          }
        }
        
        throw new Error('All script URLs failed');
        
      } catch (error) {
        STATE.scriptLoading = false;
        logger.error('All script loading attempts failed', { error: error.message });
        
        await this.emergencyFallback();
        return true;
      }
    }

    async loadFromUrl(url) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.referrerPolicy = 'strict-origin-when-cross-origin';
        script.src = `${url}?client=${CONFIG.CLIENT_ID}&timestamp=${Date.now()}`;
        
        const timeout = setTimeout(() => {
          script.remove();
          reject(new Error(`Script load timeout from ${url}`));
        }, CONFIG.SCRIPT_TIMEOUT);

        script.onload = () => {
          clearTimeout(timeout);
          resolve();
        };

        script.onerror = () => {
          clearTimeout(timeout);
          script.remove();
          reject(new Error(`Script load error from ${url}`));
        };

        document.head.appendChild(script);
      });
    }

    async verifyScriptIntegrity() {
      let attempts = 0;
      const maxAttempts = 80;
      
      while (attempts < maxAttempts) {
        if (typeof window.adsbygoogle !== 'undefined' && 
            Array.isArray(window.adsbygoogle)) {
          
          try {
            if (window.adsbygoogle.loaded === undefined) {
              window.adsbygoogle.loaded = false;
            }
            logger.debug('Script integrity verified successfully');
            return true;
          } catch (e) {
            logger.warn('Script loaded but with issues', { error: e.message });
            return true;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      throw new Error('Script integrity verification failed');
    }

    async emergencyFallback() {
      logger.critical('🚨 Activating emergency fallback mode');
      STATE.emergencyMode = true;
      
      if (!window.adsbygoogle) {
        window.adsbygoogle = [];
        window.adsbygoogle.loaded = false;
        window.adsbygoogle.push = function(obj) {
          Array.prototype.push.call(this, obj);
          setTimeout(() => {
            logger.warn('Emergency mode: simulated ad push');
          }, 1000);
        };
      }
      
      STATE.scriptLoaded = true;
      STATE.adsenseReady = true;
      STATE.scriptSource = 'emergency-fallback';
      
      logger.warn('Emergency fallback initialized - limited functionality');
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

  // Ultimate Ad Manager with Aggressive Loading
  class UltimateAdManager {
    constructor() {
      this.loadedAds = new Set();
      this.failedAds = new Set();
      this.retryingAds = new Set();
      this.batchProcessor = new BatchProcessor();
      this.retryEngine = new UltimateRetryEngine();
      this.performanceProfiler = new UltimatePerformanceProfiler();
    }

    async discoverAndCategorizeAds() {
      const selectors = [
        '.lazy-ads',
        'ins.adsbygoogle',
        '[data-ad-client]',
        '[class*="ad-"]',
        '[id*="ad-"]',
        '[class*="google"]',
        'ins[style*="display"]'
      ];

      const elements = new Set();
      
      for (const selector of selectors) {
        try {
          const found = document.querySelectorAll(selector);
          found.forEach(el => elements.add(el));
        } catch (e) {
          logger.warn(`Selector failed: ${selector}`, { error: e.message });
        }
      }

      const uniqueElements = Array.from(elements);
      logger.info('🔍 Ad discovery completed', { count: uniqueElements.length, selectors: selectors.length });

      const ads = uniqueElements.map((element, index) => {
        const adId = UltimateUtils.generateUniqueAdId(element, index);
        const rect = element.getBoundingClientRect();
        
        const adData = {
          id: adId,
          element: element,
          index,
          rect: rect,
          visibility: UltimateUtils.calculateVisibilityRatio(element),
          isVisible: UltimateUtils.isElementVisible(element),
          attributes: this.extractAllAdAttributes(element),
          priority: this.calculateAdvancedPriority(element, rect),
          category: this.categorizeAd(element, rect),
          status: 'discovered',
          attempts: 0,
          lastAttempt: 0,
          discoveredAt: Date.now(),
          loadStartTime: 0,
          loadEndTime: 0,
          healthChecks: 0,
          lastHealthCheck: 0,
          retryHistory: [],
          failureReasons: []
        };
        
        STATE.adRegistry.set(adId, adData);
        return adData;
      });

      STATE.totalAds = ads.length;
      
      const categories = {
        critical: ads.filter(ad => ad.priority > 80 || ad.isVisible),
        important: ads.filter(ad => ad.priority > 60 && ad.priority <= 80),
        normal: ads.filter(ad => ad.priority > 30 && ad.priority <= 60),
        low: ads.filter(ad => ad.priority <= 30)
      };

      logger.info('📊 Ad categorization completed', {
        total: ads.length,
        critical: categories.critical.length,
        important: categories.important.length,
        normal: categories.normal.length,
        low: categories.low.length
      });

      return { ads, categories };
    }

    extractAllAdAttributes(element) {
      const attributes = {};
      
      for (const attr of element.attributes) {
        attributes[attr.name] = attr.value;
      }
      
      const computedStyle = window.getComputedStyle(element);
      attributes.computedWidth = computedStyle.width;
      attributes.computedHeight = computedStyle.height;
      attributes.display = computedStyle.display;
      attributes.visibility = computedStyle.visibility;
      
      return attributes;
    }

    calculateAdvancedPriority(element, rect) {
      let priority = 50;
      
      const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
      if (isInViewport) priority += 40;
      
      const foldLine = window.innerHeight;
      if (rect.top < foldLine * 0.5) priority += 30;
      else if (rect.top < foldLine) priority += 20;
      
      const area = rect.width * rect.height;
      if (area >= 728 * 90) priority += 25;
      else if (area >= 320 * 250) priority += 20;
      else if (area >= 300 * 250) priority += 15;
      else if (area >= 160 * 600) priority += 20;
      
      const visibilityRatio = UltimateUtils.calculateVisibilityRatio(element);
      priority += visibilityRatio * 15;
      
      if (element.hasAttribute('data-ad-slot')) priority += 10;
      if (element.hasAttribute('data-ad-client')) priority += 10;
      if (element.className.includes('ad-priority')) priority += 20;
      
      const parent = element.parentElement;
      if (parent) {
        if (parent.className.includes('header')) priority += 15;
        if (parent.className.includes('sidebar')) priority += 10;
        if (parent.className.includes('footer')) priority -= 10;
      }
      
      return Math.min(100, Math.max(1, Math.round(priority)));
    }

    categorizeAd(element, rect) {
      const area = rect.width * rect.height;
      
      if (area >= 728 * 90) return 'leaderboard';
      if (area >= 320 * 250) return 'mobile-large';
      if (area >= 300 * 250) return 'rectangle';
      if (area >= 160 * 600) return 'skyscraper';
      if (area >= 320 * 50) return 'mobile-banner';
      
      return 'unknown';
    }

    async loadAd(adData) {
      // Skip if already loaded or loading
      if (this.loadedAds.has(adData.id) || adData.element.hasAttribute('data-ads-loaded')) {
        logger.debug('Skipping ad load - already loaded', { adId: adData.id });
        UltimateUtils.removeLoadingPlaceholder(adData.element);
        return true;
      }
      if (this.retryingAds.has(adData.id) || STATE.processingQueue.has(adData.id)) {
        logger.debug('Skipping ad load - currently processing or retrying', { adId: adData.id });
        return false;
      }
      
      const startTime = Date.now();
      adData.loadStartTime = startTime;
      adData.lastAttempt = startTime;
      adData.attempts++;
      
      this.performanceProfiler.startProfiling(adData.id);
      
      try {
        logger.debug('🔄 Loading ad', { 
          adId: adData.id, 
          priority: adData.priority,
          category: adData.category,
          attempt: adData.attempts
        });
        
        adData.status = 'loading';
        STATE.processingQueue.add(adData.id);
        
        await this.prepareAdElement(adData);
        
        const placeholder = UltimateUtils.createLoadingPlaceholder(adData.element);
        
        await this.executeAdLoad(adData);
        
        await this.verifyAdLoad(adData);
        
        UltimateUtils.removeLoadingPlaceholder(adData.element);
        
        const loadTime = Date.now() - startTime;
        this.handleLoadSuccess(adData, loadTime);
        
        logger.info('✅ Ad loaded successfully', { 
          adId: adData.id, 
          loadTime,
          category: adData.category,
          attempt: adData.attempts
        });
        
        return true;
        
      } catch (error) {
        const loadTime = Date.now() - startTime;
        
        adData.failureReasons.push({
          reason: error.message,
          timestamp: Date.now(),
          attempt: adData.attempts
        });
        
        UltimateUtils.removeLoadingPlaceholder(adData.element);
        
        if (this.retryEngine.shouldRetry(adData, error)) {
          this.retryingAds.add(adData.id);
          adData.status = 'retrying';
          
          const delay = this.retryEngine.calculateDelay(adData.attempts);
          logger.warn('⚠️ Ad load failed, scheduling retry', { 
            adId: adData.id, 
            error: error.message,
            attempt: adData.attempts,
            retryDelay: delay
          });
          
          setTimeout(async () => {
            this.retryingAds.delete(adData.id);
            await this.loadAd(adData);
          }, delay);
          
          return false;
        }
        
        this.handleLoadFailure(adData, error, loadTime);
        return false;
        
      } finally {
        STATE.processingQueue.delete(adData.id);
        this.performanceProfiler.stopProfiling(adData.id);
      }
    }

    async prepareAdElement(adData) {
      const element = adData.element;
      
      if (!element.hasAttribute('data-ad-client')) {
        element.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
      }
      
      if (!element.hasAttribute('data-ad-slot')) {
        const slot = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        element.setAttribute('data-ad-slot', slot);
      }
      
      if (!element.hasAttribute('data-ad-format')) {
        element.setAttribute('data-ad-format', 'auto');
      }
      
      if (!element.hasAttribute('data-full-width-responsive')) {
        element.setAttribute('data-full-width-responsive', 'true');
      }
      
      UltimateUtils.preventLayoutShift(element);
      
      element.setAttribute('data-ads-processing', 'true');
      element.setAttribute('data-ads-id', adData.id);
      
      logger.debug('Ad element prepared', { adId: adData.id });
    }

    async executeAdLoad(adData) {
      return new Promise((resolve, reject) => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          
          const verificationTimeout = setTimeout(() => {
            this.performLoadVerification(adData, resolve, reject);
          }, CONFIG.AD_LOAD_TIMEOUT);
          
          const checker = setInterval(() => {
            if (UltimateUtils.isAdFullyLoaded(adData.element)) {
              clearTimeout(verificationTimeout);
              clearInterval(checker);
              resolve();
            }
          }, 100); // Increased frequency for faster detection
          
          STATE.timers.add(verificationTimeout);
          STATE.timers.add(checker);
          
        } catch (error) {
          reject(new Error(`AdSense push failed: ${error.message}`));
        }
      });
    }

    performLoadVerification(adData, resolve, reject) {
      const isLoaded = UltimateUtils.isAdFullyLoaded(adData.element);
      
      if (isLoaded) {
        resolve();
      } else {
        const hasAnyContent = adData.element.innerHTML.trim().length > 50;
        const hasFrames = adData.element.querySelectorAll('iframe, frame').length > 0;
        const hasStatus = adData.element.hasAttribute('data-adsbygoogle-status');
        
        if (hasAnyContent || hasFrames || hasStatus) {
          setTimeout(() => {
            if (UltimateUtils.isAdFullyLoaded(adData.element)) {
              resolve();
            } else {
              reject(new Error('Ad partially loaded but incomplete'));
            }
          }, 1000); // Reduced additional wait time
        } else {
          reject(new Error('Ad failed to load - no content detected'));
        }
      }
    }

    async verifyAdLoad(adData) {
      let attempts = 0;
      const maxAttempts = 30; // Increased attempts for faster verification
      
      while (attempts < maxAttempts) {
        if (UltimateUtils.isAdFullyLoaded(adData.element)) {
          adData.element.setAttribute('data-ads-loaded', 'true');
          adData.element.removeAttribute('data-ads-processing');
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100)); // Faster checks
        attempts++;
      }
      
      throw new Error('Ad load verification failed');
    }

    handleLoadSuccess(adData, loadTime) {
      adData.status = 'loaded';
      adData.loadEndTime = Date.now();
      adData.loadTime = loadTime;
      
      STATE.loadedAds++;
      this.loadedAds.add(adData.id);
      
      this.updateMetrics();
      
      STATE.healthCheckQueue.add(adData.id);
    }

    handleLoadFailure(adData, error, loadTime) {
      adData.status = 'failed';
      adData.error = error.message;
      adData.failureTime = loadTime;
      adData.element.removeAttribute('data-ads-processing');
      adData.element.setAttribute('data-ads-failed', 'true');
      
      STATE.failedAds++;
      this.failedAds.add(adData.id);
      
      this.updateMetrics();
      
      logger.error('❌ Ad load failed permanently', { 
        adId: adData.id, 
        error: error.message,
        attempts: adData.attempts,
        category: adData.category
      });
    }

    updateMetrics() {
      const total = STATE.loadedAds + STATE.failedAds;
      if (total > 0) {
        STATE.metrics.successRate = (STATE.loadedAds / total) * 100;
        STATE.metrics.errorRate = (STATE.failedAds / total) * 100;
      }

      const loadedAds = Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'loaded');
      if (loadedAds.length > 0) {
        const totalTime = loadedAds.reduce((sum, ad) => sum + (ad.loadTime || 0), 0);
        STATE.metrics.avgAdLoadTime = totalTime / loadedAds.length;
        STATE.metrics.totalLoadTime = Date.now() - STATE.startTime;
      }

      const retriedAds = Array.from(STATE.adRegistry.values()).filter(ad => ad.attempts > 1);
      if (retriedAds.length > 0) {
        const successfulRetries = retriedAds.filter(ad => ad.status === 'loaded').length;
        STATE.metrics.retrySuccessRate = (successfulRetries / retriedAds.length) * 100;
      }
    }
  }

  // Batch Processing for Efficient Loading
  class BatchProcessor {
    constructor() {
      this.currentBatch = [];
      this.batchQueue = [];
      this.processing = false;
    }

    async processBatches(ads) {
      if (this.processing) return;
      this.processing = true;
      
      logger.info('🔄 Starting batch processing', { totalAds: ads.length, batchSize: CONFIG.BATCH_SIZE });
      
      const batches = [];
      for (let i = 0; i < ads.length; i += CONFIG.BATCH_SIZE) {
        batches.push(ads.slice(i, i + CONFIG.BATCH_SIZE));
      }
      
      logger.debug('Batches created', { batchCount: batches.length });
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i].filter(ad => !ad.element.hasAttribute('data-ads-loaded') && !STATE.processingQueue.has(ad.id));
        if (batch.length === 0) {
          logger.debug(`Skipping batch ${i + 1} - all ads already loaded or processing`);
          continue;
        }
        
        logger.debug(`Processing batch ${i + 1}/${batches.length}`, { batchSize: batch.length });
        
        await this.processBatch(batch);
        
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        }
      }
      
      this.processing = false;
      logger.info('✅ Batch processing completed');
    }

    async processBatch(batch) {
      const promises = batch.map(async (adData) => {
        try {
          return await window.ultimateAdManager.loadAd(adData);
        } catch (error) {
          logger.error('Batch item failed', { adId: adData.id, error: error.message });
          return false;
        }
      });
      
      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      logger.debug('Batch completed', { 
        total: batch.length, 
        successful: successCount,
        failed: batch.length - successCount
      });
    }
  }

  // Ultimate Retry Engine with Smart Logic
  class UltimateRetryEngine {
    constructor() {
      this.retryStates = new Map();
      this.cooldownPeriods = new Map();
    }

    shouldRetry(adData, error) {
      const state = this.retryStates.get(adData.id) || { attempts: 0, failures: [] };
      state.attempts = adData.attempts;
      state.failures.push({
        error: error.message,
        timestamp: Date.now()
      });
      this.retryStates.set(adData.id, state);

      if (this.cooldownPeriods.has(adData.id)) {
        const cooldownEnd = this.cooldownPeriods.get(adData.id);
        if (Date.now() < cooldownEnd) {
          return false;
        }
      }

      const errorSeverity = this.analyzeError(error);
      const maxRetries = this.getMaxRetriesForAd(adData);
      const shouldRetry = state.attempts < maxRetries && errorSeverity > 0.2;

      if (!shouldRetry && state.attempts >= maxRetries) {
        this.cooldownPeriods.set(adData.id, Date.now() + 30000);
        logger.warn('Ad reached max retries, entering cooldown', { 
          adId: adData.id, 
          attempts: state.attempts 
        });
      }

      return shouldRetry;
    }

    getMaxRetriesForAd(adData) {
      if (adData.priority > 80) return CONFIG.MAX_RETRY_ATTEMPTS + 2;
      if (adData.priority > 60) return CONFIG.MAX_RETRY_ATTEMPTS + 1;
      return CONFIG.MAX_RETRY_ATTEMPTS;
    }

    analyzeError(error) {
      const errorMessage = error.message.toLowerCase();
      const severityMap = {
        'timeout': 0.9,
        'network': 0.8,
        'script': 0.7,
        'load': 0.6,
        'verification': 0.8,
        'incomplete': 0.7,
        'content': 0.5
      };
      
      for (const [type, severity] of Object.entries(severityMap)) {
        if (errorMessage.includes(type)) return severity;
      }
      
      return 0.4;
    }

    calculateDelay(attempts) {
      const baseDelay = CONFIG.RETRY_DELAY;
      const backoff = Math.min(Math.pow(1.8, attempts - 1), 8);
      const jitter = Math.random() * 0.4 + 0.8;
      
      return Math.min(baseDelay * backoff * jitter, 15000);
    }
  }

  // Performance Profiler with Advanced Metrics
  class UltimatePerformanceProfiler {
    constructor() {
      this.profiles = new Map();
      this.globalMetrics = {
        startTime: Date.now(),
        memoryBaseline: this.getMemorySnapshot(),
        performanceEntries: []
      };
    }

    startProfiling(adId) {
      const startMark = `ad-start-${adId}`;
      
      if (window.performance && window.performance.mark) {
        try {
          window.performance.mark(startMark);
        } catch (e) {
          logger.warn('Performance mark failed', { error: e.message });
        }
      }
      
      this.profiles.set(adId, {
        start: performance.now(),
        startMark,
        memoryStart: this.getMemorySnapshot()
      });
    }

    stopProfiling(adId) {
      const profile = this.profiles.get(adId);
      if (!profile) return null;

      const endTime = performance.now();
      const duration = endTime - profile.start;

      if (window.performance && window.performance.mark && window.performance.measure) {
        try {
          const endMark = `ad-end-${adId}`;
          window.performance.mark(endMark);
          window.performance.measure(`ad-load-${adId}`, profile.startMark, endMark);
        } catch (e) {
          logger.warn('Performance measure failed', { error: e.message });
        }
      }

      const finalProfile = {
        adId,
        duration,
        startTime: profile.start,
        endTime,
        memoryStart: profile.memoryStart,
        memoryEnd: this.getMemorySnapshot(),
        memoryDelta: this.calculateMemoryDelta(profile.memoryStart, this.getMemorySnapshot())
      };

      this.profiles.set(adId, finalProfile);
      this.globalMetrics.performanceEntries.push(finalProfile);

      return finalProfile;
    }

    getMemorySnapshot() {
      if (window.performance && window.performance.memory) {
        return {
          used: window.performance.memory.usedJSHeapSize,
          total: window.performance.memory.totalJSHeapSize,
          limit: window.performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    }

    calculateMemoryDelta(start, end) {
      if (!start || !end) return null;
      
      return {
        usedDelta: end.used - start.used,
        totalDelta: end.total - start.total
      };
    }

    getGlobalMetrics() {
      return {
        ...this.globalMetrics,
        uptime: Date.now() - this.globalMetrics.startTime,
        currentMemory: this.getMemorySnapshot(),
        profileCount: this.profiles.size
      };
    }
  }

  // Health Monitor - Checks Every 3 Seconds
  class HealthMonitor {
    constructor(adManager) {
      this.adManager = adManager;
      this.interval = null;
      this.forceLoadInterval = null;
      this.lastCheck = Date.now();
    }

    start() {
      logger.info('🏥 Health monitor starting...');
      
      this.interval = setInterval(() => {
        this.performHealthCheck();
      }, CONFIG.HEALTH_CHECK_INTERVAL);
      
      this.forceLoadInterval = setInterval(() => {
        this.performForceLoadCheck();
      }, CONFIG.FORCE_LOAD_INTERVAL);
      
      STATE.intervals.add(this.interval);
      STATE.intervals.add(this.forceLoadInterval);
      
      logger.info('✅ Health monitor active');
    }

    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        STATE.intervals.delete(this.interval);
      }
      
      if (this.forceLoadInterval) {
        clearInterval(this.forceLoadInterval);
        STATE.intervals.delete(this.forceLoadInterval);
      }
      
      logger.info('Health monitor stopped');
    }

    async performHealthCheck() {
      const now = Date.now();
      STATE.lastHealthCheck = now;
      STATE.healthCheckCount++;
      
      logger.debug('🔍 Performing health check', { 
        checkNumber: STATE.healthCheckCount,
        timeSinceLastCheck: now - this.lastCheck
      });
      
      const issues = [];
      
      if (!STATE.scriptLoaded || !STATE.adsenseReady) {
        issues.push('script-not-ready');
        logger.warn('Script not ready during health check');
      }
      
      const failedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'failed' && 
        ad.attempts < CONFIG.MAX_RETRY_ATTEMPTS &&
        (now - ad.lastAttempt) > 10000 &&
        !ad.element.hasAttribute('data-ads-loaded') &&
        !STATE.processingQueue.has(ad.id)
      );
      
      if (failedAds.length > 0) {
        issues.push(`${failedAds.length}-failed-ads-retryable`);
        logger.info(`Found ${failedAds.length} ads that can be retried`);
        
        const adsToRetry = failedAds.slice(0, 2);
        for (const ad of adsToRetry) {
          logger.info('🔄 Health check triggering retry', { adId: ad.id });
          this.adManager.loadAd(ad);
        }
      }
      
      const stuckAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'loading' && 
        (now - ad.loadStartTime) > 30000 &&
        !ad.element.hasAttribute('data-ads-loaded')
      );
      
      if (stuckAds.length > 0) {
        issues.push(`${stuckAds.length}-stuck-ads`);
        logger.warn(`Found ${stuckAds.length} ads stuck in loading state`);
        
        for (const ad of stuckAds) {
          ad.status = 'failed';
          ad.error = 'Stuck in loading state - reset by health check';
          UltimateUtils.removeLoadingPlaceholder(ad.element);
          STATE.processingQueue.delete(ad.id);
        }
      }
      
      if (STATE.metrics.successRate < CONFIG.TARGET_SUCCESS_RATE && STATE.totalAds > 0) {
        issues.push(`low-success-rate-${STATE.metrics.successRate.toFixed(1)}%`);
        logger.warn('Success rate below target', { 
          current: STATE.metrics.successRate,
          target: CONFIG.TARGET_SUCCESS_RATE
        });
      }
      
      const healthStatus = {
        timestamp: now,
        issues,
        healthy: issues.length === 0,
        metrics: { ...STATE.metrics },
        adCounts: {
          total: STATE.totalAds,
          loaded: STATE.loadedAds,
          failed: STATE.failedAds,
          processing: STATE.processingQueue.size
        }
      };
      
      logger.perf('Health check completed', healthStatus);
      this.lastCheck = now;
      
      return healthStatus;
    }

    async performForceLoadCheck() {
      STATE.forceLoadCount++;
      
      logger.debug('🚀 Performing force load check', { 
        forceLoadNumber: STATE.forceLoadCount 
      });
      
      const unloadedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        (ad.status === 'discovered' || 
         (ad.status === 'failed' && ad.attempts < 2)) &&
        !ad.element.hasAttribute('data-ads-loaded') &&
        !STATE.processingQueue.has(ad.id)
      );
      
      if (unloadedAds.length === 0) {
        logger.debug('All ads are loaded or processing');
        return;
      }
      
      unloadedAds.sort((a, b) => b.priority - a.priority);
      
      const adsToForceLoad = unloadedAds.slice(0, 3);
      
      logger.info('🚀 Force loading ads', { 
        count: adsToForceLoad.length,
        totalUnloaded: unloadedAds.length
      });
      
      for (const ad of adsToForceLoad) {
        logger.info('Force loading ad', { 
          adId: ad.id, 
          priority: ad.priority,
          attempts: ad.attempts
        });
        
        this.adManager.loadAd(ad);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // Lazy Load Manager with Intersection Observer
  class UltimateLazyLoadManager {
    constructor(adManager) {
      this.adManager = adManager;
      this.observer = null;
      this.observedAds = new Set();
      this.loadedFromObserver = new Set();
    }

    initialize() {
      if (!window.IntersectionObserver) {
        logger.warn('IntersectionObserver not supported, falling back to immediate loading');
        return false;
      }

      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: CONFIG.LAZY_LOAD_MARGIN,
          threshold: [0, CONFIG.INTERSECTION_THRESHOLD, 0.25, 0.5, 0.75, 1.0]
        }
      );

      STATE.observers.add(this.observer);
      logger.info('🔭 Lazy load manager initialized with advanced intersection detection');
      return true;
    }

    observeAd(adData) {
      if (this.observer && !this.observedAds.has(adData.id) && !adData.element.hasAttribute('data-ads-loaded')) {
        this.observer.observe(adData.element);
        this.observedAds.add(adData.id);
        
        logger.debug('Ad added to lazy observation', { 
          adId: adData.id,
          priority: adData.priority
        });
      }
    }

    async handleIntersection(entries) {
      for (const entry of entries) {
        const adData = this.findAdData(entry.target);
        
        if (!adData || this.loadedFromObserver.has(adData.id) || entry.target.hasAttribute('data-ads-loaded')) continue;
        
        const shouldLoad = entry.isIntersecting || 
                          entry.intersectionRatio > CONFIG.INTERSECTION_THRESHOLD ||
                          (entry.boundingClientRect.top < window.innerHeight * 1.5);
        
        if (shouldLoad && adData.status === 'discovered') {
          logger.info('🔭 Ad entered load zone, triggering load', { 
            adId: adData.id,
            intersectionRatio: entry.intersectionRatio.toFixed(3),
            isIntersecting: entry.isIntersecting
          });
          
          this.observer.unobserve(entry.target);
          this.observedAds.delete(adData.id);
          this.loadedFromObserver.add(adData.id);
          
          this.adManager.loadAd(adData);
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

    async loadImmediatelyVisible() {
      const visibleAds = Array.from(STATE.adRegistry.values()).filter(ad => {
        const rect = ad.element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > -100 && !ad.element.hasAttribute('data-ads-loaded');
      });

      logger.info('🔍 Loading immediately visible ads', { count: visibleAds.length });
      
      visibleAds.sort((a, b) => b.priority - a.priority);
      
      const batchProcessor = new BatchProcessor();
      await batchProcessor.processBatches(visibleAds);
      
      return visibleAds.length;
    }
  }

  // Ultimate AdSense Controller v5.0
  class UltimateAdSenseController {
    constructor() {
      this.networkOptimizer = new NetworkOptimizer();
      this.scriptLoader = new UltimateScriptLoader();
      this.adManager = new UltimateAdManager();
      this.lazyLoadManager = new UltimateLazyLoadManager(this.adManager);
      this.healthMonitor = new HealthMonitor(this.adManager);
      this.initialized = false;
    }

    async initialize() {
      if (this.initialized) return;
      
      logger.info('🚀 AdSense Optimizer v5.0 - Ultimate Edition Initializing...');
      logger.info('🎯 Target: 100% Ad Load Success Rate');
      
      try {
        await this.prepareEnvironment();
        await this.setupLoadingStrategy();
        
        STATE.initialized = true;
        this.initialized = true;
        
        logger.info('✅ AdSense Optimizer v5.0 initialized successfully!');
        logger.info('📊 Starting continuous monitoring and optimization...');
        
      } catch (error) {
        logger.critical('❌ Initialization failed', { error: error.message });
        throw error;
      }
    }

    async prepareEnvironment() {
      logger.debug('🔧 Preparing environment...');
      
      await UltimateUtils.waitForPageReady();
      
      await this.networkOptimizer.optimize();
      
      this.setupGlobalErrorHandling();
      
      this.setupPerformanceMonitoring();
      
      logger.debug('✅ Environment prepared');
    }

    async setupLoadingStrategy() {
      logger.debug('📋 Setting up loading strategy...');
      
      let loadTriggered = false;
      
      const triggerLoad = async () => {
        if (loadTriggered) return;
        loadTriggered = true;
        
        logger.info('🎬 Load sequence triggered!');
        await this.executeUltimateLoadSequence();
      };

      setTimeout(triggerLoad, 1000);

      const interactionEvents = ['click', 'touchstart', 'keydown', 'scroll'];
      const interactionHandler = () => {
        interactionEvents.forEach(event => 
          document.removeEventListener(event, interactionHandler, { passive: true })
        );
        triggerLoad();
      };
      
      interactionEvents.forEach(event => 
        document.addEventListener(event, interactionHandler, { passive: true })
      );

      setTimeout(() => {
        if (!loadTriggered) {
          logger.warn('⏰ Fallback timer triggered load');
          triggerLoad();
        }
      }, 5000);
    }

    async executeUltimateLoadSequence() {
      try {
        logger.info('🚀 Starting Ultimate Load Sequence');
        
        const sequenceStart = Date.now();
        
        logger.info('📥 Step 1: Loading AdSense script...');
        await this.scriptLoader.loadAdSenseScript();
        
        logger.info('🔍 Step 2: Discovering ads...');
        const { ads, categories } = await this.adManager.discoverAndCategorizeAds();
        
        if (ads.length === 0) {
          logger.warn('⚠️ No ads found on page');
          return;
        }
        
        logger.info('🔭 Step 3: Initializing lazy loading...');
        const lazyLoadSupported = this.lazyLoadManager.initialize();
        
        logger.info('⚡ Step 4: Loading critical ads...');
        if (categories.critical.length > 0) {
          const batchProcessor = new BatchProcessor();
          await batchProcessor.processBatches(categories.critical);
        }
        
        if (lazyLoadSupported) {
          logger.info('👁️ Step 5: Setting up lazy loading...');
          [...categories.important, ...categories.normal, ...categories.low]
            .forEach(ad => this.lazyLoadManager.observeAd(ad));
          
          await this.lazyLoadManager.loadImmediatelyVisible();
        } else {
          logger.warn('📦 Fallback: Batch loading all ads...');
          const allRemaining = [...categories.important, ...categories.normal, ...categories.low];
          const batchProcessor = new BatchProcessor();
          await batchProcessor.processBatches(allRemaining);
        }
        
        logger.info('🏥 Step 6: Starting health monitoring...');
        this.healthMonitor.start();
        
        const sequenceTime = Date.now() - sequenceStart;
        
        logger.info('🎉 Ultimate Load Sequence completed!', {
          totalTime: sequenceTime,
          totalAds: STATE.totalAds,
          loadedAds: STATE.loadedAds,
          successRate: STATE.metrics.successRate.toFixed(1) + '%'
        });
        
      } catch (error) {
        logger.critical('💥 Load sequence failed', { error: error.message });
        
        await this.emergencyRecovery();
      }
    }

    async emergencyRecovery() {
      logger.critical('🚨 Activating emergency recovery mode');
      
      try {
        const unloadedAds = Array.from(STATE.adRegistry.values())
          .filter(ad => ad.status !== 'loaded' && !ad.element.hasAttribute('data-ads-loaded'));
        
        logger.info('🚑 Emergency: Force loading all ads', { count: unloadedAds.length });
        
        for (const ad of unloadedAds) {
          try {
            await this.adManager.loadAd(ad);
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            logger.error('Emergency load failed', { adId: ad.id, error: error.message });
          }
        }
        
        logger.info('🚑 Emergency recovery completed');
        
      } catch (error) {
        logger.critical('💀 Emergency recovery failed', { error: error.message });
      }
    }

    setupGlobalErrorHandling() {
      window.addEventListener('error', (event) => {
        if (event.filename && event.filename.includes('adsbygoogle')) {
          logger.warn('AdSense script error intercepted', { 
            message: event.message,
            filename: event.filename,
            lineno: event.lineno
          });
          event.preventDefault();
          return false;
        }
      });

      window.addEventListener('unhandledrejection', (event) => {
        if (event.reason && event.reason.message && 
            event.reason.message.toLowerCase().includes('ad')) {
          logger.warn('Ad-related promise rejection handled', { 
            reason: event.reason.message 
          });
          event.preventDefault();
        }
      });
    }

    setupPerformanceMonitoring() {
      if (typeof PerformanceObserver !== 'undefined') {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'measure' && entry.name.includes('ad-load')) {
                logger.perf('Ad load performance', {
                  name: entry.name,
                  duration: entry.duration,
                  startTime: entry.startTime
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
    }

    getStatus() {
      return {
        version: CONFIG.VERSION,
        sessionId: STATE.sessionId,
        uptime: Date.now() - STATE.startTime,
        initialized: STATE.initialized,
        
        script: {
          loaded: STATE.scriptLoaded,
          ready: STATE.adsenseReady,
          source: STATE.scriptSource,
          loadTime: STATE.metrics.scriptLoadTime
        },
        
        ads: {
          total: STATE.totalAds,
          loaded: STATE.loadedAds,
          failed: STATE.failedAds,
          processing: STATE.processingQueue.size,
          retrying: STATE.retryingAds
        },
        
        metrics: {
          ...STATE.metrics,
          healthChecks: STATE.healthCheckCount,
          forceLoads: STATE.forceLoadCount
        },
        
        health: {
          lastCheck: STATE.lastHealthCheck,
          monitoring: this.healthMonitor.interval !== null,
          aggressiveMode: STATE.aggressiveMode,
          emergencyMode: STATE.emergencyMode
        },
        
        network: this.networkOptimizer.getConnectionInfo(),
        
        performance: window.ultimatePerformanceProfiler?.getGlobalMetrics() || null
      };
    }

    async forceLoadAll() {
      logger.info('🚀 Force loading ALL ads requested');
      
      const unloadedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status !== 'loaded' && !ad.element.hasAttribute('data-ads-loaded')
      );
      
      if (unloadedAds.length === 0) {
        logger.info('✅ All ads already loaded');
        return { attempted: 0, successful: 0, message: 'All ads already loaded' };
      }
      
      logger.info(`🔄 Force loading ${unloadedAds.length} ads...`);
      
      const results = [];
      let successCount = 0;
      
      const batchSize = 5;
      for (let i = 0; i < unloadedAds.length; i += batchSize) {
        const batch = unloadedAds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (ad) => {
          try {
            const result = await this.adManager.loadAd(ad);
            if (result) successCount++;
            return { adId: ad.id, success: result };
          } catch (error) {
            logger.error('Force load failed', { adId: ad.id, error: error.message });
            return { adId: ad.id, success: false, error: error.message };
          }
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
        
        if (i + batchSize < unloadedAds.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      logger.info('🎯 Force load completed', { 
        attempted: unloadedAds.length, 
        successful: successCount,
        successRate: (successCount / unloadedAds.length * 100).toFixed(1) + '%'
      });
      
      return { 
        attempted: unloadedAds.length, 
        successful: successCount,
        results 
      };
    }

    async retryFailedAds() {
      const failedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'failed' && 
        ad.attempts < CONFIG.MAX_RETRY_ATTEMPTS &&
        !ad.element.hasAttribute('data-ads-loaded')
      );
      
      if (failedAds.length === 0) {
        return { message: 'No failed ads to retry', count: 0 };
      }
      
      logger.info(`🔁 Retrying ${failedAds.length} failed ads...`);
      
      let successCount = 0;
      for (const ad of failedAds) {
        try {
          const result = await this.adManager.loadAd(ad);
          if (result) successCount++;
        } catch (error) {
          logger.error('Retry failed', { adId: ad.id, error: error.message });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return { 
        attempted: failedAds.length, 
        successful: successCount 
      };
    }

    enableAggressiveMode() {
      STATE.aggressiveMode = true;
      CONFIG.HEALTH_CHECK_INTERVAL = 2000;
      CONFIG.FORCE_LOAD_INTERVAL = 5000;
      CONFIG.MAX_RETRY_ATTEMPTS = 12;
      
      logger.info('⚡ Aggressive mode enabled');
      
      this.healthMonitor.stop();
      this.healthMonitor.start();
    }

    disableAggressiveMode() {
      STATE.aggressiveMode = false;
      CONFIG.HEALTH_CHECK_INTERVAL = 3000;
      CONFIG.FORCE_LOAD_INTERVAL = 10000;
      CONFIG.MAX_RETRY_ATTEMPTS = 8;
      
      logger.info('🔄 Aggressive mode disabled');
      
      this.healthMonitor.stop();
      this.healthMonitor.start();
    }

    getDetailedReport() {
      const ads = Array.from(STATE.adRegistry.values());
      
      return {
        summary: this.getStatus(),
        
        adDetails: ads.map(ad => ({
          id: ad.id,
          status: ad.status,
          priority: ad.priority,
          category: ad.category,
          attempts: ad.attempts,
          loadTime: ad.loadTime,
          visibility: ad.visibility,
          isVisible: ad.isVisible,
          failureReasons: ad.failureReasons,
          element: {
            tagName: ad.element.tagName,
            className: ad.element.className,
            id: ad.element.id
          }
        })),
        
        performance: {
          scriptLoadTime: STATE.metrics.scriptLoadTime,
          avgAdLoadTime: STATE.metrics.avgAdLoadTime,
          totalLoadTime: STATE.metrics.totalLoadTime,
          successRate: STATE.metrics.successRate,
          retrySuccessRate: STATE.metrics.retrySuccessRate
        },
        
        healthHistory: {
          totalChecks: STATE.healthCheckCount,
          forceLoads: STATE.forceLoadCount,
          lastCheck: new Date(STATE.lastHealthCheck).toISOString()
        },
        
        logs: logger.logHistory.slice(-50)
      };
    }

    destroy() {
      logger.info('🛑 Destroying AdSense Controller v5.0');
      
      this.healthMonitor.stop();
      
      STATE.timers.forEach(timer => {
        clearTimeout(timer);
        clearInterval(timer);
      });
      STATE.timers.clear();
      
      STATE.intervals.forEach(interval => {
        clearInterval(interval);
      });
      STATE.intervals.clear();
      
      STATE.observers.forEach(observer => {
        try {
          if (observer && observer.disconnect) {
            observer.disconnect();
          }
        } catch (e) {
          logger.warn('Observer disconnect failed', { error: e.message });
        }
      });
      STATE.observers.clear();
      
      STATE.adRegistry.clear();
      STATE.loadQueue.clear();
      STATE.processingQueue.clear();
      STATE.healthCheckQueue.clear();
      
      this.initialized = false;
      STATE.initialized = false;
      
      delete window.AdSenseOptimizer;
      delete window.ultimateAdManager;
      delete window.ultimatePerformanceProfiler;
      
      logger.info('💀 AdSense Controller v5.0 destroyed');
    }
  }

  async function initializeUltimateAdSenseOptimizer() {
    try {
      logger.info('🎬 Initializing Ultimate AdSense Optimizer v5.0...');
      
      const controller = new UltimateAdSenseController();
      await controller.initialize();
      
      window.ultimateAdManager = controller.adManager;
      window.ultimatePerformanceProfiler = controller.adManager.performanceProfiler;
      
      window.AdSenseOptimizer = {
        version: CONFIG.VERSION,
        sessionId: STATE.sessionId,
        
        getStatus: () => controller.getStatus(),
        getDetailedReport: () => controller.getDetailedReport(),
        
        forceLoadAll: () => controller.forceLoadAll(),
        retryFailedAds: () => controller.retryFailedAds(),
        
        enableAggressiveMode: () => controller.enableAggressiveMode(),
        disableAggressiveMode: () => controller.disableAggressiveMode(),
        
        getMetrics: () => STATE.metrics,
        getNetworkInfo: () => controller.networkOptimizer.getConnectionInfo(),
        getLogs: (count = 20) => logger.logHistory.slice(-count),
        getPerformanceLogs: () => logger.performanceLogs,
        
        getAdDetails: (adId) => STATE.adRegistry.get(adId),
        getAllAds: () => Array.from(STATE.adRegistry.values()),
        getFailedAds: () => Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'failed'),
        getLoadedAds: () => Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'loaded'),
        
        destroy: () => controller.destroy(),
        
        emergencyRecovery: () => controller.emergencyRecovery(),
        restartHealthMonitor: () => {
          controller.healthMonitor.stop();
          controller.healthMonitor.start();
        }
      };
      
      logger.info('🌟 Ultimate AdSense Optimizer v5.0 is ready!');
      logger.info('💡 Use window.AdSenseOptimizer to access all features');
      logger.info('📊 Health monitoring active - checking every 3 seconds');
      logger.info('🎯 Target: 100% ad load success rate');
      
      return controller;
      
    } catch (error) {
      logger.critical('💥 Failed to initialize Ultimate AdSense Optimizer', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  const initTriggers = {
    domReady: false,
    windowLoad: false,
    timeout: false
  };

  let initPromise = null;

  const tryInitialize = async (trigger) => {
    if (initPromise) return initPromise;
    
    initTriggers[trigger] = true;
    logger.debug(`Initialization trigger: ${trigger}`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    initPromise = initializeUltimateAdSenseOptimizer();
    return initPromise;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tryInitialize('domReady'));
  } else {
    setTimeout(() => tryInitialize('domReady'), 50);
  }

  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => tryInitialize('windowLoad'));
  } else {
    setTimeout(() => tryInitialize('windowLoad'), 100);
  }

  setTimeout(() => {
    if (!initPromise) {
      logger.warn('⏰ Fallback timeout initialization trigger');
      tryInitialize('timeout');
    }
  }, 2000);

  window.initAdSenseOptimizer = () => tryInitialize('manual');

  window.addEventListener('error', function(event) {
    if (event.filename && (
        event.filename.includes('adsbygoogle') || 
        event.filename.includes('googlesyndication')
      )) {
      logger.warn('🛡️ Global error handler caught AdSense error', { 
        message: event.message,
        filename: event.filename,
        lineno: event.lineno
      });
      event.preventDefault();
      return false;
    }
  });

  setTimeout(() => {
    if (typeof console !== 'undefined' && console.log) {
      console.log('%c🚀 AdSense Optimizer v5.0 - Ultimate Edition', 
        'font-size: 16px; font-weight: bold; color: #4CAF50;');
      console.log('%c✨ Maximum ad loading performance and reliability', 
        'font-size: 12px; color: #2196F3;');
      console.log('%c📊 Use window.AdSenseOptimizer.getStatus() to check status', 
        'font-size: 11px; color: #666;');
    }
  }, 3000);

})();
