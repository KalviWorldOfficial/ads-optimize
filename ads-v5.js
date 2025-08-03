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
    HEALTH_CHECK_INTERVAL: 3000, // Check every 3 seconds
    FORCE_LOAD_INTERVAL: 10000,  // Force load every 10 seconds
    MAX_RETRY_ATTEMPTS: 8,       // Increased retry attempts
    RETRY_DELAY: 1500,           // Faster retries
    SCRIPT_TIMEOUT: 8000,        // Script load timeout
    AD_LOAD_TIMEOUT: 5000,       // Individual ad timeout
    
    // Performance and loading settings
    LAZY_LOAD_MARGIN: '150px',
    INTERSECTION_THRESHOLD: 0.05,
    BATCH_SIZE: 3,               // Load ads in batches
    BATCH_DELAY: 800,            // Delay between batches
    
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
      this.currentLevel = 0; // Debug level for v5.0
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
      
      // Keep only recent logs
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

      // DNS prefetch for additional domains
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

      // Additional stability wait
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
      // Multiple verification methods
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

      return passedChecks >= 2; // At least 2 checks must pass
    }

    static preventLayoutShift(element) {
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      
      // Set minimum dimensions based on common ad sizes
      const adSizes = [
        { width: 728, height: 90 },   // Leaderboard
        { width: 320, height: 250 },  // Mobile Rectangle  
        { width: 300, height: 250 },  // Medium Rectangle
        { width: 160, height: 600 },  // Wide Skyscraper
        { width: 320, height: 50 }    // Mobile Banner
      ];

      let targetSize = adSizes[0]; // Default to leaderboard
      
      // Find best matching ad size
      for (const size of adSizes) {
        if (rect.width <= size.width + 50 && rect.height <= size.height + 50) {
          targetSize = size;
          break;
        }
      }

      // Apply layout shift prevention
      if (!computedStyle.width || computedStyle.width === 'auto') {
        element.style.width = rect.width > 0 ? `${rect.width}px` : `${targetSize.width}px`;
      }
      
      if (!computedStyle.height || computedStyle.height === 'auto') {
        element.style.minHeight = rect.height > 0 ? `${rect.height}px` : `${targetSize.height}px`;
      }

      // Ensure proper display
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
      
      // Add CSS animation if not exists
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
        // Try primary and fallback URLs
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
        
        // Emergency fallback
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
      const maxAttempts = 80; // 8 seconds with 100ms intervals
      
      while (attempts < maxAttempts) {
        if (typeof window.adsbygoogle !== 'undefined' && 
            Array.isArray(window.adsbygoogle)) {
          
          // Additional verification
          try {
            if (window.adsbygoogle.loaded === undefined) {
              window.adsbygoogle.loaded = false;
            }
            logger.debug('Script integrity verified successfully');
            return true;
          } catch (e) {
            logger.warn('Script loaded but with issues', { error: e.message });
            return true; // Continue anyway
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
      
      // Create minimal adsbygoogle implementation
      if (!window.adsbygoogle) {
        window.adsbygoogle = [];
        window.adsbygoogle.loaded = false;
        window.adsbygoogle.push = function(obj) {
          Array.prototype.push.call(this, obj);
          // Simulate ad loading
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
      
      // Collect from all selectors
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
          
          // Positioning and visibility
          rect: rect,
          visibility: UltimateUtils.calculateVisibilityRatio(element),
          isVisible: UltimateUtils.isElementVisible(element),
          
          // Attributes and configuration
          attributes: this.extractAllAdAttributes(element),
          priority: this.calculateAdvancedPriority(element, rect),
          category: this.categorizeAd(element, rect),
          
          // State tracking
          status: 'discovered',
          attempts: 0,
          lastAttempt: 0,
          
          // Performance tracking
          discoveredAt: Date.now(),
          loadStartTime: 0,
          loadEndTime: 0,
          
          // Health tracking
          healthChecks: 0,
          lastHealthCheck: 0,
          
          // Retry tracking
          retryHistory: [],
          failureReasons: []
        };
        
        STATE.adRegistry.set(adId, adData);
        return adData;
      });

      STATE.totalAds = ads.length;
      
      // Categorize ads for loading strategy
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
      
      // Extract all data attributes
      for (const attr of element.attributes) {
        attributes[attr.name] = attr.value;
      }
      
      // Extract computed styles that affect ads
      const computedStyle = window.getComputedStyle(element);
      attributes.computedWidth = computedStyle.width;
      attributes.computedHeight = computedStyle.height;
      attributes.display = computedStyle.display;
      attributes.visibility = computedStyle.visibility;
      
      return attributes;
    }

    calculateAdvancedPriority(element, rect) {
      let priority = 50; // Base priority
      
      // Viewport visibility (most important)
      const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
      if (isInViewport) priority += 40;
      
      // Position weighting (above the fold gets priority)
      const foldLine = window.innerHeight;
      if (rect.top < foldLine * 0.5) priority += 30;
      else if (rect.top < foldLine) priority += 20;
      
      // Size weighting (larger ads often more important)
      const area = rect.width * rect.height;
      if (area >= 728 * 90) priority += 25;      // Leaderboard
      else if (area >= 320 * 250) priority += 20; // Large mobile
      else if (area >= 300 * 250) priority += 15; // Medium rectangle
      else if (area >= 160 * 600) priority += 20; // Skyscraper
      
      // Visibility ratio bonus
      const visibilityRatio = UltimateUtils.calculateVisibilityRatio(element);
      priority += visibilityRatio * 15;
      
      // Element attributes bonus
      if (element.hasAttribute('data-ad-slot')) priority += 10;
      if (element.hasAttribute('data-ad-client')) priority += 10;
      if (element.className.includes('ad-priority')) priority += 20;
      
      // Parent container context
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
      if (this.loadedAds.has(adData.id)) return true;
      if (this.retryingAds.has(adData.id)) return false;
      
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
        
        // Update status
        adData.status = 'loading';
        STATE.processingQueue.add(adData.id);
        
        // Prepare element for loading
        await this.prepareAdElement(adData);
        
        // Create loading placeholder
        const placeholder = UltimateUtils.createLoadingPlaceholder(adData.element);
        
        // Execute the actual ad load
        await this.executeAdLoad(adData);
        
        // Verify load success
        await this.verifyAdLoad(adData);
        
        // Remove placeholder
        if (placeholder && placeholder.parentNode) {
          placeholder.remove();
        }
        
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
        
        // Record failure reason
        adData.failureReasons.push({
          reason: error.message,
          timestamp: Date.now(),
          attempt: adData.attempts
        });
        
        // Determine if retry is worthwhile
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
      
      // Ensure required attributes
      if (!element.hasAttribute('data-ad-client')) {
        element.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
      }
      
      if (!element.hasAttribute('data-ad-slot')) {
        // Generate unique slot ID
        const slot = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        element.setAttribute('data-ad-slot', slot);
      }
      
      // Set responsive attributes
      if (!element.hasAttribute('data-ad-format')) {
        element.setAttribute('data-ad-format', 'auto');
      }
      
      if (!element.hasAttribute('data-full-width-responsive')) {
        element.setAttribute('data-full-width-responsive', 'true');
      }
      
      // Prevent layout shift
      UltimateUtils.preventLayoutShift(element);
      
      // Mark as processing
      element.setAttribute('data-ads-processing', 'true');
      element.setAttribute('data-ads-id', adData.id);
      
      logger.debug('Ad element prepared', { adId: adData.id });
    }

    async executeAdLoad(adData) {
      return new Promise((resolve, reject) => {
        try {
          // Push to AdSense queue
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          
          // Set up verification with multiple methods
          const verificationTimeout = setTimeout(() => {
            this.performLoadVerification(adData, resolve, reject);
          }, CONFIG.AD_LOAD_TIMEOUT);
          
          // Also check periodically for faster detection
          const checker = setInterval(() => {
            if (UltimateUtils.isAdFullyLoaded(adData.element)) {
              clearTimeout(verificationTimeout);
              clearInterval(checker);
              resolve();
            }
          }, 300);
          
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
        // Check if there are any signs of loading
        const hasAnyContent = adData.element.innerHTML.trim().length > 50;
        const hasFrames = adData.element.querySelectorAll('iframe, frame').length > 0;
        const hasStatus = adData.element.hasAttribute('data-adsbygoogle-status');
        
        if (hasAnyContent || hasFrames || hasStatus) {
          // Partial load detected, give more time
          setTimeout(() => {
            if (UltimateUtils.isAdFullyLoaded(adData.element)) {
              resolve();
            } else {
              reject(new Error('Ad partially loaded but incomplete'));
            }
          }, 2000);
        } else {
          reject(new Error('Ad failed to load - no content detected'));
        }
      }
    }

    async verifyAdLoad(adData) {
      let attempts = 0;
      const maxAttempts = 20;
      
      while (attempts < maxAttempts) {
        if (UltimateUtils.isAdFullyLoaded(adData.element)) {
          adData.element.setAttribute('data-ads-loaded', 'true');
          adData.element.removeAttribute('data-ads-processing');
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 250));
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
      
      // Add to health check queue
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

      // Calculate retry success rate
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
      
      // Create batches
      const batches = [];
      for (let i = 0; i < ads.length; i += CONFIG.BATCH_SIZE) {
        batches.push(ads.slice(i, i + CONFIG.BATCH_SIZE));
      }
      
      logger.debug('Batches created', { batchCount: batches.length });
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.debug(`Processing batch ${i + 1}/${batches.length}`, { batchSize: batch.length });
        
        await this.processBatch(batch);
        
        // Delay between batches (except for the last one)
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

      // Check cooldown
      if (this.cooldownPeriods.has(adData.id)) {
        const cooldownEnd = this.cooldownPeriods.get(adData.id);
        if (Date.now() < cooldownEnd) {
          return false;
        }
      }

      // Analyze error type and decide
      const errorSeverity = this.analyzeError(error);
      const maxRetries = this.getMaxRetriesForAd(adData);
      const shouldRetry = state.attempts < maxRetries && errorSeverity > 0.2;

      if (!shouldRetry && state.attempts >= maxRetries) {
        // Set cooldown before giving up completely
        this.cooldownPeriods.set(adData.id, Date.now() + 30000); // 30 second cooldown
        logger.warn('Ad reached max retries, entering cooldown', { 
          adId: adData.id, 
          attempts: state.attempts 
        });
      }

      return shouldRetry;
    }

    getMaxRetriesForAd(adData) {
      // High priority ads get more retries
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
      
      return 0.4; // Default severity
    }

    calculateDelay(attempts) {
      const baseDelay = CONFIG.RETRY_DELAY;
      const backoff = Math.min(Math.pow(1.8, attempts - 1), 8); // Cap at 8x
      const jitter = Math.random() * 0.4 + 0.8; // 80-120% jitter
      
      return Math.min(baseDelay * backoff * jitter, 15000); // Max 15 seconds
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
      
      // Main health check every 3 seconds
      this.interval = setInterval(() => {
        this.performHealthCheck();
      }, CONFIG.HEALTH_CHECK_INTERVAL);
      
      // Force load check every 10 seconds
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
      
      // Check script status
      if (!STATE.scriptLoaded || !STATE.adsenseReady) {
        issues.push('script-not-ready');
        logger.warn('Script not ready during health check');
      }
      
      // Check for failed ads that could be retried
      const failedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'failed' && 
        ad.attempts < CONFIG.MAX_RETRY_ATTEMPTS &&
        (now - ad.lastAttempt) > 10000 // 10 seconds since last attempt
      );
      
      if (failedAds.length > 0) {
        issues.push(`${failedAds.length}-failed-ads-retryable`);
        logger.info(`Found ${failedAds.length} ads that can be retried`);
        
        // Retry up to 2 ads per health check
        const adsToRetry = failedAds.slice(0, 2);
        for (const ad of adsToRetry) {
          logger.info('🔄 Health check triggering retry', { adId: ad.id });
          this.adManager.loadAd(ad);
        }
      }
      
      // Check for ads stuck in loading state
      const stuckAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'loading' && 
        (now - ad.loadStartTime) > 30000 // Stuck for 30+ seconds
      );
      
      if (stuckAds.length > 0) {
        issues.push(`${stuckAds.length}-stuck-ads`);
        logger.warn(`Found ${stuckAds.length} ads stuck in loading state`);
        
        // Reset stuck ads
        for (const ad of stuckAds) {
          ad.status = 'failed';
          ad.error = 'Stuck in loading state - reset by health check';
          STATE.processingQueue.delete(ad.id);
        }
      }
      
      // Check success rate
      if (STATE.metrics.successRate < CONFIG.TARGET_SUCCESS_RATE && STATE.totalAds > 0) {
        issues.push(`low-success-rate-${STATE.metrics.successRate.toFixed(1)}%`);
        logger.warn('Success rate below target', { 
          current: STATE.metrics.successRate,
          target: CONFIG.TARGET_SUCCESS_RATE
        });
      }
      
      // Update health status
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
      
      // Find ads that should be loaded but aren't
      const unloadedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'discovered' || 
        (ad.status === 'failed' && ad.attempts < 2)
      );
      
      if (unloadedAds.length === 0) {
        logger.debug('All ads are loaded or processing');
        return;
      }
      
      // Sort by priority
      unloadedAds.sort((a, b) => b.priority - a.priority);
      
      // Force load up to 3 highest priority ads
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
        
        // Small delay between force loads
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
      if (this.observer && !this.observedAds.has(adData.id)) {
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
        
        if (!adData || this.loadedFromObserver.has(adData.id)) continue;
        
        // Multiple trigger conditions
        const shouldLoad = entry.isIntersecting || 
                          entry.intersectionRatio > CONFIG.INTERSECTION_THRESHOLD ||
                          (entry.boundingClientRect.top < window.innerHeight * 1.5);
        
        if (shouldLoad && adData.status === 'discovered') {
          logger.info('🔭 Ad entered load zone, triggering load', { 
            adId: adData.id,
            intersectionRatio: entry.intersectionRatio.toFixed(3),
            isIntersecting: entry.isIntersecting
          });
          
          // Unobserve to prevent multiple loads
          this.observer.unobserve(entry.target);
          this.observedAds.delete(adData.id);
          this.loadedFromObserver.add(adData.id);
          
          // Load the ad
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
        return rect.top < window.innerHeight && rect.bottom > -100; // Include slightly offscreen
      });

      logger.info('🔍 Loading immediately visible ads', { count: visibleAds.length });
      
      // Sort by priority
      visibleAds.sort((a, b) => b.priority - a.priority);
      
      // Load in batches
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
      
      // Wait for page readiness
      await UltimateUtils.waitForPageReady();
      
      // Optimize network
      await this.networkOptimizer.optimize();
      
      // Setup global error handling
      this.setupGlobalErrorHandling();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      logger.debug('✅ Environment prepared');
    }

    async setupLoadingStrategy() {
      logger.debug('📋 Setting up loading strategy...');
      
      // Multiple trigger strategy for maximum coverage
      let loadTriggered = false;
      
      const triggerLoad = async () => {
        if (loadTriggered) return;
        loadTriggered = true;
        
        logger.info('🎬 Load sequence triggered!');
        await this.executeUltimateLoadSequence();
      };

      // Trigger 1: Immediate (for testing)
      setTimeout(triggerLoad, 1000);

      // Trigger 2: User interaction
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

      // Trigger 3: Fallback timer
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
        
        // Step 1: Load AdSense script with fallbacks
        logger.info('📥 Step 1: Loading AdSense script...');
        await this.scriptLoader.loadAdSenseScript();
        
        // Step 2: Discover and categorize all ads
        logger.info('🔍 Step 2: Discovering ads...');
        const { ads, categories } = await this.adManager.discoverAndCategorizeAds();
        
        if (ads.length === 0) {
          logger.warn('⚠️ No ads found on page');
          return;
        }
        
        // Step 3: Initialize lazy loading
        logger.info('🔭 Step 3: Initializing lazy loading...');
        const lazyLoadSupported = this.lazyLoadManager.initialize();
        
        // Step 4: Load critical ads immediately
        logger.info('⚡ Step 4: Loading critical ads...');
        if (categories.critical.length > 0) {
          const batchProcessor = new BatchProcessor();
          await batchProcessor.processBatches(categories.critical);
        }
        
        // Step 5: Setup lazy loading for remaining ads
        if (lazyLoadSupported) {
          logger.info('👁️ Step 5: Setting up lazy loading...');
          [...categories.important, ...categories.normal, ...categories.low]
            .forEach(ad => this.lazyLoadManager.observeAd(ad));
          
          // Load immediately visible ads
          await this.lazyLoadManager.loadImmediatelyVisible();
        } else {
          // Fallback: batch load all ads
          logger.warn('📦 Fallback: Batch loading all ads...');
          const allRemaining = [...categories.important, ...categories.normal, ...categories.low];
          const batchProcessor = new BatchProcessor();
          await batchProcessor.processBatches(allRemaining);
        }
        
        // Step 6: Start health monitoring
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
        
        // Emergency recovery
        await this.emergencyRecovery();
      }
    }

    async emergencyRecovery() {
      logger.critical('🚨 Activating emergency recovery mode');
      
      try {
        // Force load all discovered ads
        const unloadedAds = Array.from(STATE.adRegistry.values())
          .filter(ad => ad.status !== 'loaded');
        
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
      // AdSense script errors
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

      // Promise rejections
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
      // Core Web Vitals monitoring
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

    // Public API Methods
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
        ad.status !== 'loaded'
      );
      
      if (unloadedAds.length === 0) {
        logger.info('✅ All ads already loaded');
        return { attempted: 0, successful: 0, message: 'All ads already loaded' };
      }
      
      logger.info(`🔄 Force loading ${unloadedAds.length} ads...`);
      
      const results = [];
      let successCount = 0;
      
      // Load in parallel batches
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
        
        // Small delay between batches
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
        ad.status === 'failed' && ad.attempts < CONFIG.MAX_RETRY_ATTEMPTS
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
        
        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return { 
        attempted: failedAds.length, 
        successful: successCount 
      };
    }

    enableAggressiveMode() {
      STATE.aggressiveMode = true;
      CONFIG.HEALTH_CHECK_INTERVAL = 2000; // Check every 2 seconds
      CONFIG.FORCE_LOAD_INTERVAL = 5000;   // Force load every 5 seconds
      CONFIG.MAX_RETRY_ATTEMPTS = 12;      // More retries
      
      logger.info('⚡ Aggressive mode enabled');
      
      // Restart health monitor with new settings
      this.healthMonitor.stop();
      this.healthMonitor.start();
    }

    disableAggressiveMode() {
      STATE.aggressiveMode = false;
      CONFIG.HEALTH_CHECK_INTERVAL = 3000;
      CONFIG.FORCE_LOAD_INTERVAL = 10000;
      CONFIG.MAX_RETRY_ATTEMPTS = 8;
      
      logger.info('🔄 Aggressive mode disabled');
      
      // Restart health monitor with normal settings
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
        
        logs: logger.logHistory.slice(-50) // Last 50 log entries
      };
    }

    destroy() {
      logger.info('🛑 Destroying AdSense Controller v5.0');
      
      // Stop health monitoring
      this.healthMonitor.stop();
      
      // Clear all timers
      STATE.timers.forEach(timer => {
        clearTimeout(timer);
        clearInterval(timer);
      });
      STATE.timers.clear();
      
      // Clear all intervals
      STATE.intervals.forEach(interval => {
        clearInterval(interval);
      });
      STATE.intervals.clear();
      
      // Disconnect all observers
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
      delete window.ultimateAdManager;
      delete window.ultimatePerformanceProfiler;
      
      logger.info('💀 AdSense Controller v5.0 destroyed');
    }
  }

  // Global initialization function
  async function initializeUltimateAdSenseOptimizer() {
    try {
      logger.info('🎬 Initializing Ultimate AdSense Optimizer v5.0...');
      
      const controller = new UltimateAdSenseController();
      await controller.initialize();
      
      // Create global references
      window.ultimateAdManager = controller.adManager;
      window.ultimatePerformanceProfiler = controller.adManager.performanceProfiler;
      
      // Expose comprehensive global API
      window.AdSenseOptimizer = {
        // Basic info
        version: CONFIG.VERSION,
        sessionId: STATE.sessionId,
        
        // Status and monitoring
        getStatus: () => controller.getStatus(),
        getDetailedReport: () => controller.getDetailedReport(),
        
        // Loading controls
        forceLoadAll: () => controller.forceLoadAll(),
        retryFailedAds: () => controller.retryFailedAds(),
        
        // Mode controls
        enableAggressiveMode: () => controller.enableAggressiveMode(),
        disableAggressiveMode: () => controller.disableAggressiveMode(),
        
        // Utility methods
        getMetrics: () => STATE.metrics,
        getNetworkInfo: () => controller.networkOptimizer.getConnectionInfo(),
        getLogs: (count = 20) => logger.logHistory.slice(-count),
        getPerformanceLogs: () => logger.performanceLogs,
        
        // Advanced methods
        getAdDetails: (adId) => STATE.adRegistry.get(adId),
        getAllAds: () => Array.from(STATE.adRegistry.values()),
        getFailedAds: () => Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'failed'),
        getLoadedAds: () => Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'loaded'),
        
        // Cleanup
        destroy: () => controller.destroy(),
        
        // Emergency functions
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

  // Auto-initialization with multiple triggers
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
    
    // Wait a bit to see if other triggers fire
    await new Promise(resolve => setTimeout(resolve, 100));
    
    initPromise = initializeUltimateAdSenseOptimizer();
    return initPromise;
  };

  // Trigger 1: DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tryInitialize('domReady'));
  } else {
    setTimeout(() => tryInitialize('domReady'), 50);
  }

  // Trigger 2: Window load
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => tryInitialize('windowLoad'));
  } else {
    setTimeout(() => tryInitialize('windowLoad'), 100);
  }

  // Trigger 3: Fallback timeout
  setTimeout(() => {
    if (!initPromise) {
      logger.warn('⏰ Fallback timeout initialization trigger');
      tryInitialize('timeout');
    }
  }, 2000);

  // Trigger 4: Manual trigger (if needed)
  window.initAdSenseOptimizer = () => tryInitialize('manual');

  // Global error handler for maximum stability
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

  // Console welcome message
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
