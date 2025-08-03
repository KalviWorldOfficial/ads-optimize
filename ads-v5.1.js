(function() {
  'use strict';

  // 🚀 AdSense Optimizer v5.1 - Fixed Production Version
  const CONFIG = {
    CLIENT_ID: 'ca-pub-7407983524344370',
    VERSION: '5.1',
    
    // CDN endpoints for script loading
    SCRIPT_URLS: [
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      'https://cdn.jsdelivr.net/gh/googleads/googleads.github.io@master/adsbygoogle.js'
    ],
    
    // Optimized settings to prevent errors
    HEALTH_CHECK_INTERVAL: 5000,    // Check every 5 seconds
    FORCE_LOAD_INTERVAL: 15000,     // Force load every 15 seconds
    MAX_RETRY_ATTEMPTS: 3,          // Reduced retries to prevent spam
    RETRY_DELAY: 2000,              // 2 second retry delay
    SCRIPT_TIMEOUT: 10000,          // Script load timeout
    AD_LOAD_TIMEOUT: 8000,          // Individual ad timeout
    
    // Performance settings
    LAZY_LOAD_MARGIN: '200px',
    INTERSECTION_THRESHOLD: 0.1,
    BATCH_SIZE: 2,                  // Smaller batches
    BATCH_DELAY: 1500,              // Longer delay between batches
    
    // Success thresholds
    TARGET_SUCCESS_RATE: 85,
    CRITICAL_LOAD_TIME: 3000
  };

  // Enhanced State Management
  const STATE = {
    version: CONFIG.VERSION,
    sessionId: `ads_v5_1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    
    // Script state
    scriptLoaded: false,
    scriptLoading: false,
    adsenseReady: false,
    
    // Ad management
    totalAds: 0,
    loadedAds: 0,
    failedAds: 0,
    processingAds: 0,
    
    // Collections
    adRegistry: new Map(),
    processedElements: new WeakSet(), // Track processed DOM elements
    adsenseElements: new Set(),       // Track AdSense-processed elements
    
    // Monitoring
    observers: new Set(),
    timers: new Set(),
    intervals: new Set(),
    
    // Performance metrics
    metrics: {
      scriptLoadTime: 0,
      avgAdLoadTime: 0,
      successRate: 0,
      totalLoadTime: 0
    },
    
    // Health monitoring
    lastHealthCheck: Date.now(),
    healthCheckCount: 0,
    
    // Flags
    initialized: false,
    emergencyMode: false
  };

  // Enhanced Logger
  class Logger {
    constructor() {
      this.levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4 };
      this.currentLevel = 1; // INFO level for production
      this.logHistory = [];
    }

    log(level, message, data = {}) {
      const timestamp = Date.now();
      const logEntry = {
        timestamp,
        level,
        message,
        data: { ...data, sessionId: STATE.sessionId }
      };

      if (this.levels[level] >= this.currentLevel) {
        const time = new Date(timestamp).toISOString().split('T')[1].split('.')[0];
        const prefix = `[AdSense-v5.1 ${time}] [${level}]`;
        const color = this.getLogColor(level);
        
        if (console[level.toLowerCase()]) {
          console[level.toLowerCase()](`%c${prefix} ${message}`, `color: ${color}`, data);
        } else {
          console.log(`%c${prefix} ${message}`, `color: ${color}`, data);
        }
      }

      this.logHistory.push(logEntry);
      if (this.logHistory.length > 100) {
        this.logHistory = this.logHistory.slice(-75);
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
  }

  const logger = new Logger();

  // Utility Functions
  class Utils {
    static async waitForPageReady() {
      const conditions = [
        () => document.readyState === 'complete',
        () => document.body && document.head
      ];

      let attempts = 0;
      while (!conditions.every(condition => condition()) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      logger.debug('Page ready state achieved');
    }

    static generateUniqueAdId(element, index) {
      const baseId = element.id || 
                   element.dataset.adId || 
                   element.className.replace(/\s+/g, '-') ||
                   `auto-ad-${index}`;
      
      return `${baseId}_${STATE.sessionId}_${index}`;
    }

    static isElementVisible(element) {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && 
             rect.height > 0 && 
             rect.top < window.innerHeight && 
             rect.bottom > 0;
    }

    static isAdAlreadyProcessed(element) {
      // Multiple checks to determine if element already has ads
      return STATE.processedElements.has(element) ||
             element.hasAttribute('data-adsbygoogle-status') ||
             element.querySelector('iframe') !== null ||
             element.innerHTML.includes('google_ads') ||
             element.getAttribute('data-ads-loaded') === 'true' ||
             STATE.adsenseElements.has(element.outerHTML);
    }

    static markElementAsProcessed(element) {
      STATE.processedElements.add(element);
      STATE.adsenseElements.add(element.outerHTML);
      element.setAttribute('data-ads-loaded', 'true');
      element.setAttribute('data-ads-session', STATE.sessionId);
    }

    static isValidAdElement(element) {
      // Check if element has required attributes or classes
      return (element.classList.contains('adsbygoogle') ||
              element.hasAttribute('data-ad-client') ||
              element.hasAttribute('data-ad-slot')) &&
             element.tagName.toLowerCase() === 'ins';
    }

    static prepareAdElement(element) {
      // Ensure required attributes exist
      if (!element.hasAttribute('data-ad-client')) {
        element.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
      }
      
      if (!element.hasAttribute('data-ad-slot')) {
        const slot = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        element.setAttribute('data-ad-slot', slot);
      }
      
      if (!element.hasAttribute('data-ad-format')) {
        element.setAttribute('data-ad-format', 'auto');
      }
      
      if (!element.hasAttribute('data-full-width-responsive')) {
        element.setAttribute('data-full-width-responsive', 'true');
      }

      // Ensure proper styling
      element.style.display = 'block';
      
      return true;
    }
  }

  // Script Loader with Fallbacks
  class ScriptLoader {
    constructor() {
      this.loadStartTime = 0;
    }

    async loadAdSenseScript() {
      if (STATE.scriptLoaded) return true;
      if (STATE.scriptLoading) return this.waitForScript();

      STATE.scriptLoading = true;
      this.loadStartTime = Date.now();
      
      logger.info('🔄 Loading AdSense script...');

      try {
        for (let i = 0; i < CONFIG.SCRIPT_URLS.length; i++) {
          const url = CONFIG.SCRIPT_URLS[i];
          logger.debug(`Attempting script load from URL ${i + 1}`, { url });
          
          try {
            await this.loadFromUrl(url);
            await this.verifyScriptIntegrity();
            
            STATE.scriptLoaded = true;
            STATE.scriptLoading = false;
            STATE.adsenseReady = true;
            
            const loadTime = Date.now() - this.loadStartTime;
            STATE.metrics.scriptLoadTime = loadTime;
            
            logger.info('✅ AdSense script loaded successfully', { url, loadTime });
            return true;
            
          } catch (error) {
            logger.warn(`Script load failed from ${url}`, { error: error.message });
            if (i < CONFIG.SCRIPT_URLS.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            throw error;
          }
        }
        
      } catch (error) {
        STATE.scriptLoading = false;
        logger.error('Script loading failed, activating emergency mode', { error: error.message });
        await this.emergencyFallback();
        return true;
      }
    }

    async loadFromUrl(url) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.src = `${url}?client=${CONFIG.CLIENT_ID}`;
        
        const timeout = setTimeout(() => {
          script.remove();
          reject(new Error(`Script timeout from ${url}`));
        }, CONFIG.SCRIPT_TIMEOUT);

        script.onload = () => {
          clearTimeout(timeout);
          resolve();
        };

        script.onerror = () => {
          clearTimeout(timeout);
          script.remove();
          reject(new Error(`Script error from ${url}`));
        };

        document.head.appendChild(script);
      });
    }

    async verifyScriptIntegrity() {
      let attempts = 0;
      const maxAttempts = 50;
      
      while (attempts < maxAttempts) {
        if (typeof window.adsbygoogle !== 'undefined' && 
            Array.isArray(window.adsbygoogle)) {
          logger.debug('Script integrity verified');
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      throw new Error('Script integrity verification failed');
    }

    async emergencyFallback() {
      logger.critical('🚨 Activating emergency fallback');
      STATE.emergencyMode = true;
      
      if (!window.adsbygoogle) {
        window.adsbygoogle = [];
        window.adsbygoogle.loaded = false;
      }
      
      STATE.scriptLoaded = true;
      STATE.adsenseReady = true;
      logger.warn('Emergency fallback initialized');
    }

    async waitForScript() {
      let attempts = 0;
      while (STATE.scriptLoading && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      return STATE.scriptLoaded;
    }
  }

  // Enhanced Ad Manager
  class AdManager {
    constructor() {
      this.loadedAds = new Set();
      this.failedAds = new Set();
      this.retryCount = new Map();
    }

    async discoverAds() {
      const selectors = [
        'ins.adsbygoogle',
        '.adsbygoogle',
        '[data-ad-client]'
      ];

      const elements = new Set();
      
      for (const selector of selectors) {
        try {
          const found = document.querySelectorAll(selector);
          found.forEach(el => {
            if (Utils.isValidAdElement(el) && !Utils.isAdAlreadyProcessed(el)) {
              elements.add(el);
            }
          });
        } catch (e) {
          logger.warn(`Selector failed: ${selector}`, { error: e.message });
        }
      }

      const uniqueElements = Array.from(elements);
      logger.info('🔍 Ad discovery completed', { 
        found: uniqueElements.length,
        filtered: uniqueElements.length
      });

      const ads = uniqueElements.map((element, index) => {
        const adId = Utils.generateUniqueAdId(element, index);
        const rect = element.getBoundingClientRect();
        
        const adData = {
          id: adId,
          element: element,
          index,
          rect: rect,
          isVisible: Utils.isElementVisible(element),
          priority: this.calculatePriority(element, rect),
          status: 'discovered',
          attempts: 0,
          discoveredAt: Date.now()
        };
        
        STATE.adRegistry.set(adId, adData);
        return adData;
      });

      STATE.totalAds = ads.length;
      
      // Sort by priority
      ads.sort((a, b) => b.priority - a.priority);
      
      logger.info('📊 Ads categorized', { total: ads.length });
      return ads;
    }

    calculatePriority(element, rect) {
      let priority = 50;
      
      // Viewport visibility
      if (rect.top < window.innerHeight && rect.bottom > 0) priority += 30;
      
      // Position bonus (above fold)
      if (rect.top < window.innerHeight * 0.5) priority += 20;
      
      // Size bonus
      const area = rect.width * rect.height;
      if (area >= 300 * 250) priority += 15;
      if (area >= 728 * 90) priority += 20;
      
      // Attribute bonus
      if (element.hasAttribute('data-ad-slot')) priority += 10;
      if (element.id) priority += 5;
      
      return Math.min(100, Math.max(1, Math.round(priority)));
    }

    async loadAd(adData) {
      if (this.loadedAds.has(adData.id)) {
        logger.debug('Ad already loaded', { adId: adData.id });
        return true;
      }

      // Final check before loading
      if (Utils.isAdAlreadyProcessed(adData.element)) {
        logger.info('Ad already processed by AdSense', { adId: adData.id });
        this.handleLoadSuccess(adData, 0);
        return true;
      }

      const startTime = Date.now();
      adData.attempts++;
      adData.status = 'loading';
      STATE.processingAds++;
      
      try {
        logger.debug('🔄 Loading ad', { 
          adId: adData.id, 
          priority: adData.priority,
          attempt: adData.attempts
        });
        
        // Prepare element
        Utils.prepareAdElement(adData.element);
        
        // Execute load
        await this.executeAdLoad(adData);
        
        // Verify and mark as processed
        const loadTime = Date.now() - startTime;
        Utils.markElementAsProcessed(adData.element);
        this.handleLoadSuccess(adData, loadTime);
        
        logger.info('✅ Ad loaded successfully', { 
          adId: adData.id, 
          loadTime,
          attempt: adData.attempts
        });
        
        return true;
        
      } catch (error) {
        const loadTime = Date.now() - startTime;
        return this.handleLoadError(adData, error, loadTime);
        
      } finally {
        STATE.processingAds--;
      }
    }

    async executeAdLoad(adData) {
      return new Promise((resolve, reject) => {
        try {
          // Push to AdSense queue
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          
          // Set up verification timeout
          const timeout = setTimeout(() => {
            if (this.verifyAdLoad(adData.element)) {
              resolve();
            } else {
              reject(new Error('Ad load verification failed'));
            }
          }, CONFIG.AD_LOAD_TIMEOUT);
          
          STATE.timers.add(timeout);
          
        } catch (error) {
          reject(new Error(`AdSense push failed: ${error.message}`));
        }
      });
    }

    verifyAdLoad(element) {
      // Multiple verification methods
      return element.hasAttribute('data-adsbygoogle-status') ||
             element.querySelector('iframe') !== null ||
             element.innerHTML.includes('google_ads') ||
             element.innerHTML.length > 100;
    }

    async handleLoadError(adData, error, loadTime) {
      const errorMsg = error.message;
      
      // Check if it's the "already have ads" error
      if (errorMsg.includes('already have ads')) {
        logger.info('Ad already loaded by AdSense', { adId: adData.id });
        Utils.markElementAsProcessed(adData.element);
        this.handleLoadSuccess(adData, loadTime);
        return true;
      }
      
      // Retry logic
      const retryCount = this.retryCount.get(adData.id) || 0;
      
      if (retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
        this.retryCount.set(adData.id, retryCount + 1);
        adData.status = 'retrying';
        
        const delay = CONFIG.RETRY_DELAY * (retryCount + 1);
        logger.warn('⚠️ Ad load failed, scheduling retry', { 
          adId: adData.id, 
          error: errorMsg,
          attempt: adData.attempts,
          retryDelay: delay
        });
        
        setTimeout(() => this.loadAd(adData), delay);
        return false;
      }
      
      // Mark as permanently failed
      this.handleLoadFailure(adData, error);
      return false;
    }

    handleLoadSuccess(adData, loadTime) {
      adData.status = 'loaded';
      adData.loadTime = loadTime;
      
      STATE.loadedAds++;
      this.loadedAds.add(adData.id);
      
      this.updateMetrics();
    }

    handleLoadFailure(adData, error) {
      adData.status = 'failed';
      adData.error = error.message;
      
      STATE.failedAds++;
      this.failedAds.add(adData.id);
      
      this.updateMetrics();
      
      logger.error('❌ Ad load failed permanently', { 
        adId: adData.id, 
        error: error.message,
        attempts: adData.attempts
      });
    }

    updateMetrics() {
      const total = STATE.loadedAds + STATE.failedAds;
      if (total > 0) {
        STATE.metrics.successRate = (STATE.loadedAds / total) * 100;
      }

      const loadedAds = Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'loaded');
      if (loadedAds.length > 0) {
        const totalTime = loadedAds.reduce((sum, ad) => sum + (ad.loadTime || 0), 0);
        STATE.metrics.avgAdLoadTime = totalTime / loadedAds.length;
      }
    }

    async processBatch(ads) {
      logger.info('🔄 Processing ad batch', { size: ads.length });
      
      for (const ad of ads) {
        await this.loadAd(ad);
        
        // Delay between individual ads in batch
        if (ads.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    }
  }

  // Health Monitor
  class HealthMonitor {
    constructor(adManager) {
      this.adManager = adManager;
      this.interval = null;
    }

    start() {
      logger.info('🏥 Health monitor starting...');
      
      this.interval = setInterval(() => {
        this.performHealthCheck();
      }, CONFIG.HEALTH_CHECK_INTERVAL);
      
      STATE.intervals.add(this.interval);
      logger.info('✅ Health monitor active');
    }

    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        STATE.intervals.delete(this.interval);
      }
      logger.info('Health monitor stopped');
    }

    async performHealthCheck() {
      STATE.lastHealthCheck = Date.now();
      STATE.healthCheckCount++;
      
      logger.debug('🔍 Health check', { checkNumber: STATE.healthCheckCount });
      
      // Check for failed ads that can be retried
      const retryableAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'failed' && 
        (this.adManager.retryCount.get(ad.id) || 0) < CONFIG.MAX_RETRY_ATTEMPTS
      );
      
      if (retryableAds.length > 0) {
        logger.info(`Found ${retryableAds.length} ads that can be retried`);
        
        // Retry up to 1 ad per health check
        const adToRetry = retryableAds[0];
        logger.info('🔄 Health check triggering retry', { adId: adToRetry.id });
        this.adManager.loadAd(adToRetry);
      }
      
      // Log current status
      const status = {
        total: STATE.totalAds,
        loaded: STATE.loadedAds,
        failed: STATE.failedAds,
        processing: STATE.processingAds,
        successRate: STATE.metrics.successRate.toFixed(1) + '%'
      };
      
      logger.debug('Health status', status);
    }
  }

  // Lazy Load Manager
  class LazyLoadManager {
    constructor(adManager) {
      this.adManager = adManager;
      this.observer = null;
    }

    initialize() {
      if (!window.IntersectionObserver) {
        logger.warn('IntersectionObserver not supported');
        return false;
      }

      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: CONFIG.LAZY_LOAD_MARGIN,
          threshold: CONFIG.INTERSECTION_THRESHOLD
        }
      );

      STATE.observers.add(this.observer);
      logger.info('🔭 Lazy load manager initialized');
      return true;
    }

    observeAd(adData) {
      if (this.observer) {
        this.observer.observe(adData.element);
        logger.debug('Ad added to lazy observation', { adId: adData.id });
      }
    }

    async handleIntersection(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const adData = this.findAdData(entry.target);
          
          if (adData && adData.status === 'discovered') {
            logger.info('🔭 Ad entered viewport, loading', { adId: adData.id });
            
            this.observer.unobserve(entry.target);
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
  }

  // Main Controller
  class AdSenseController {
    constructor() {
      this.scriptLoader = new ScriptLoader();
      this.adManager = new AdManager();
      this.lazyLoadManager = new LazyLoadManager(this.adManager);
      this.healthMonitor = new HealthMonitor(this.adManager);
      this.initialized = false;
    }

    async initialize() {
      if (this.initialized) return;
      
      logger.info('🚀 AdSense Optimizer v5.1 Initializing...');
      
      try {
        await this.prepareEnvironment();
        await this.executeLoadSequence();
        
        STATE.initialized = true;
        this.initialized = true;
        
        logger.info('✅ AdSense Optimizer v5.1 initialized successfully!');
        
      } catch (error) {
        logger.critical('❌ Initialization failed', { error: error.message });
        throw error;
      }
    }

    async prepareEnvironment() {
      await Utils.waitForPageReady();
      this.setupErrorHandling();
    }

    async executeLoadSequence() {
      logger.info('🚀 Starting load sequence');
      
      // Step 1: Load script
      await this.scriptLoader.loadAdSenseScript();
      
      // Step 2: Discover ads
      const ads = await this.adManager.discoverAds();
      
      if (ads.length === 0) {
        logger.warn('⚠️ No ads found');
        return;
      }
      
      // Step 3: Initialize lazy loading
      const lazyLoadSupported = this.lazyLoadManager.initialize();
      
      // Step 4: Load visible ads immediately
      const visibleAds = ads.filter(ad => ad.isVisible).slice(0, 3); // Limit to 3
      if (visibleAds.length > 0) {
        logger.info('⚡ Loading visible ads', { count: visibleAds.length });
        await this.processBatches(visibleAds);
      }
      
      // Step 5: Setup lazy loading for remaining ads
      if (lazyLoadSupported) {
        const remainingAds = ads.filter(ad => !ad.isVisible);
        remainingAds.forEach(ad => this.lazyLoadManager.observeAd(ad));
        logger.info('👁️ Lazy loading setup for remaining ads', { count: remainingAds.length });
      } else {
        // Fallback: load all ads in batches
        const remainingAds = ads.filter(ad => !ad.isVisible);
        if (remainingAds.length > 0) {
          logger.info('📦 Batch loading remaining ads', { count: remainingAds.length });
          setTimeout(() => this.processBatches(remainingAds), 2000);
        }
      }
      
      // Step 6: Start monitoring
      this.healthMonitor.start();
      
      logger.info('🎉 Load sequence completed');
    }

    async processBatches(ads) {
      const batches = [];
      for (let i = 0; i < ads.length; i += CONFIG.BATCH_SIZE) {
        batches.push(ads.slice(i, i + CONFIG.BATCH_SIZE));
      }
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        await this.adManager.processBatch(batch);
        
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        }
      }
    }

    setupErrorHandling() {
      window.addEventListener('error', (event) => {
        if (event.filename && event.filename.includes('adsbygoogle')) {
          logger.warn('AdSense error handled', { message: event.message });
          event.preventDefault();
          return false;
        }
      });
    }

    // Public API
    getStatus() {
      return {
        version: CONFIG.VERSION,
        sessionId: STATE.sessionId,
        uptime: Date.now() - STATE.startTime,
        initialized: STATE.initialized,
        
        script: {
          loaded: STATE.scriptLoaded,
          ready: STATE.adsenseReady
        },
        
        ads: {
          total: STATE.totalAds,
          loaded: STATE.loadedAds,
          failed: STATE.failedAds,
          processing: STATE.processingAds
        },
        
        metrics: STATE.metrics,
        
        health: {
          lastCheck: STATE.lastHealthCheck,
          checkCount: STATE.healthCheckCount
        }
      };
    }

    async forceLoadAll() {
      const unloadedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status !== 'loaded'
      );
      
      if (unloadedAds.length === 0) {
        return { message: 'All ads already loaded', count: 0 };
      }
      
      logger.info(`🚀 Force loading ${unloadedAds.length} ads`);
      
      let successCount = 0;
      for (const ad of unloadedAds) {
        try {
          const result = await this.adManager.loadAd(ad);
          if (result) successCount++;
        } catch (error) {
          logger.error('Force load failed', { adId: ad.id, error: error.message });
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return { 
        attempted: unloadedAds.length, 
        successful: successCount 
      };
    }

    destroy() {
      logger.info('🛑 Destroying controller');
      
      this.healthMonitor.stop();
      
      STATE.timers.forEach(timer => clearTimeout(timer));
      STATE.intervals.forEach(interval => clearInterval(interval));
      STATE.observers.forEach(observer => {
        if (observer.disconnect) observer.disconnect();
      });
      
      STATE.adRegistry.clear();
      this.initialized = false;
      
      delete window.AdSenseOptimizer;
    }
  }

  // Initialize
  async function initializeAdSenseOptimizer() {
    try {
      const controller = new AdSenseController();
      await controller.initialize();
      
      // Global API
      window.AdSenseOptimizer = {
        version: CONFIG.VERSION,
        getStatus: () => controller.getStatus(),
        forceLoadAll: () => controller.forceLoadAll(),
        getLogs: (count = 20) => logger.logHistory.slice(-count),
        destroy: () => controller.destroy()
      };
      
      logger.info('🌟 AdSense Optimizer v5.1 ready!');
      return controller;
      
    } catch (error) {
      logger.critical('💥 Failed to initialize AdSense Optimizer', { 
        error: error.message 
      });
      throw error;
    }
  }

  // Auto-initialization with multiple triggers
  let initPromise = null;

  const tryInitialize = async (trigger) => {
    if (initPromise) return initPromise;
    
    logger.debug(`Initialization trigger: ${trigger}`);
    
    // Small delay to allow other triggers
    await new Promise(resolve => setTimeout(resolve, 200));
    
    initPromise = initializeAdSenseOptimizer();
    return initPromise;
  };

  // Trigger 1: DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tryInitialize('domReady'));
  } else {
    setTimeout(() => tryInitialize('domReady'), 100);
  }

  // Trigger 2: Window load
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => tryInitialize('windowLoad'));
  } else {
    setTimeout(() => tryInitialize('windowLoad'), 200);
  }

  // Trigger 3: Fallback timeout
  setTimeout(() => {
    if (!initPromise) {
      logger.warn('⏰ Fallback timeout initialization');
      tryInitialize('timeout');
    }
  }, 3000);

  // Manual trigger
  window.initAdSenseOptimizer = () => tryInitialize('manual');

  // Global error handler for stability
  window.addEventListener('error', function(event) {
    if (event.filename && (
        event.filename.includes('adsbygoogle') || 
        event.filename.includes('googlesyndication')
      )) {
      logger.warn('🛡️ AdSense error handled', { 
        message: event.message,
        filename: event.filename
      });
      event.preventDefault();
      return false;
    }
  });

  // Prevent unhandled promise rejections from breaking the script
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && 
        event.reason.message.toLowerCase().includes('ad')) {
      logger.warn('🛡️ Ad-related promise rejection handled', { 
        reason: event.reason.message 
      });
      event.preventDefault();
    }
  });

  // Console welcome message
  setTimeout(() => {
    if (typeof console !== 'undefined' && console.log) {
      console.log('%c🚀 AdSense Optimizer v5.1 - Production Ready', 
        'font-size: 16px; font-weight: bold; color: #4CAF50;');
      console.log('%c✅ Fixed duplicate loading issues', 
        'font-size: 12px; color: #2196F3;');
      console.log('%c📊 Use window.AdSenseOptimizer.getStatus() to check status', 
        'font-size: 11px; color: #666;');
    }
  }, 4000);

})();
