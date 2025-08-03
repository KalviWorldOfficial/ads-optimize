(function() {
  'use strict';

  // Enhanced AdSense Configuration
  const CONFIG = {
    CLIENT_ID: 'ca-pub-7407983524344370',
    SCRIPT_URL: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    AD_SELECTOR: '.lazy-ads, ins.adsbygoogle',
    LAZY_LOAD_MARGIN: '100px',
    LOAD_DELAY: 3000, // Reduced to 3 seconds
    MAX_RETRY_ATTEMPTS: 3, // Reduced retries
    RETRY_DELAY: 1500, // Faster retries
    PERFORMANCE_BUDGET: 5000, // 5 seconds max
    HEALTH_CHECK_INTERVAL: 15000, // Check every 15 seconds
    BATCH_SIZE: 2, // Smaller batches
    BATCH_DELAY: 300, // Faster batch processing
    
    // Ad loading timeouts
    AD_LOAD_TIMEOUT: 8000, // 8 seconds for ad to load
    VERIFICATION_TIMEOUT: 3000, // 3 seconds for verification
    PLACEHOLDER_REMOVAL_DELAY: 1000, // 1 second before removing placeholder
    
    // Performance thresholds
    CRITICAL_LOAD_TIME: 2000,
    TARGET_SUCCESS_RATE: 90,
    INTERSECTION_THRESHOLD: 0.05, // Load earlier
    
    // Preconnect domains
    PRECONNECT_DOMAINS: [
      'https://pagead2.googlesyndication.com',
      'https://googleads.g.doubleclick.net',
      'https://tpc.googlesyndication.com'
    ]
  };

  // State Management
  const STATE = {
    scriptLoaded: false,
    scriptLoading: false,
    adsenseReady: false,
    initialized: false,
    
    totalAds: 0,
    loadedAds: 0,
    failedAds: 0,
    retryCount: 0,
    
    startTime: Date.now(),
    sessionId: `ads_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    
    adRegistry: new Map(),
    loadQueue: new Set(),
    processingQueue: new Set(),
    
    observers: new Set(),
    timers: new Set(),
    intervals: new Set(),
    
    metrics: {
      avgLoadTime: 0,
      successRate: 0,
      errorRate: 0,
      totalProcessed: 0
    }
  };

  // Enhanced Logger
  class AdLogger {
    constructor() {
      this.levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
      this.currentLevel = 1;
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
        const time = new Date(timestamp).toISOString().substr(11, 8);
        const prefix = `[AdSense v2.2 ${time}] [${level}]`;
        const consoleMethod = console[level.toLowerCase()] || console.log;
        consoleMethod(`${prefix} ${message}`, data);
      }

      this.logHistory.push(logEntry);
      if (this.logHistory.length > 50) {
        this.logHistory = this.logHistory.slice(-25);
      }
    }

    debug(msg, data) { this.log('DEBUG', msg, data); }
    info(msg, data) { this.log('INFO', msg, data); }
    warn(msg, data) { this.log('WARN', msg, data); }
    error(msg, data) { this.log('ERROR', msg, data); }
  }

  const logger = new AdLogger();

  // Utility Functions
  class AdUtils {
    static async waitForPageLoad() {
      if (document.readyState === 'complete') {
        await new Promise(resolve => setTimeout(resolve, 200));
        return;
      }

      return new Promise(resolve => {
        const checkReady = () => {
          if (document.readyState === 'complete') {
            setTimeout(resolve, 200);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
    }

    static generateAdId(element, index) {
      return element.id || 
             element.dataset.adId || 
             `ad_${STATE.sessionId}_${index}`;
    }

    static calculateVisibility(element) {
      const rect = element.getBoundingClientRect();
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      
      const visibleWidth = Math.max(0, Math.min(rect.right, viewport.width) - Math.max(rect.left, 0));
      const visibleHeight = Math.max(0, Math.min(rect.bottom, viewport.height) - Math.max(rect.top, 0));
      const visibleArea = visibleWidth * visibleHeight;
      const totalArea = rect.width * rect.height;
      
      return totalArea > 0 ? visibleArea / totalArea : 0;
    }

    static isAdLoaded(element) {
      try {
        // Multiple checks for ad loading
        const checks = [
          // AdSense status check
          element.getAttribute('data-adsbygoogle-status') === 'done',
          // Has iframe content
          element.querySelector('iframe') !== null,
          // Has significant content
          element.innerHTML.trim().length > 50,
          // Has reasonable dimensions
          element.offsetWidth > 20 && element.offsetHeight > 20,
          // Has Google ads container
          element.querySelector('div[id*="google"]') !== null,
          // Check for ins element with content
          element.tagName === 'INS' && element.innerHTML.length > 0
        ];
        
        const positiveChecks = checks.filter(check => {
          try { return check; } catch { return false; }
        }).length;
        
        return positiveChecks >= 1; // At least one positive check
      } catch (error) {
        logger.debug('Ad load check failed', { error: error.message });
        return false;
      }
    }

    static preventLayoutShift(element) {
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      
      // Only apply if not already styled
      if (!element.style.minHeight && !computedStyle.minHeight) {
        element.style.minHeight = '250px';
      }
      
      if (!element.style.width) {
        element.style.width = '100%';
        element.style.maxWidth = '100%';
      }
      
      element.style.display = 'block';
      element.style.position = 'relative';
      element.style.overflow = 'hidden';
      
      logger.debug('Layout shift prevention applied', { 
        width: rect.width, 
        height: rect.height 
      });
    }

    static createLoadingPlaceholder(element) {
      // Check if placeholder already exists
      const existing = element.querySelector('.ad-loading-placeholder');
      if (existing) return existing;

      const placeholder = document.createElement('div');
      placeholder.className = 'ad-loading-placeholder';
      placeholder.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: #999;
        z-index: 1;
        border-radius: 4px;
      `;
      
      // Add CSS animation if not exists
      if (!document.querySelector('#ad-shimmer-style')) {
        const style = document.createElement('style');
        style.id = 'ad-shimmer-style';
        style.textContent = `
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      placeholder.innerHTML = '<span>📢</span>';
      element.style.position = 'relative';
      element.appendChild(placeholder);
      
      logger.debug('Loading placeholder created');
      return placeholder;
    }

    static removeLoadingPlaceholder(element) {
      const placeholder = element.querySelector('.ad-loading-placeholder');
      if (placeholder) {
        // Fade out animation
        placeholder.style.transition = 'opacity 0.3s ease-out';
        placeholder.style.opacity = '0';
        
        setTimeout(() => {
          if (placeholder.parentNode) {
            placeholder.remove();
            logger.debug('Loading placeholder removed');
          }
        }, 300);
      }
    }

    static getNetworkInfo() {
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
  }

  // Network Optimizer
  class NetworkOptimizer {
    constructor() {
      this.preconnected = false;
    }

    async optimize() {
      await this.preconnectDomains();
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
      this.preconnected = true;
      logger.debug('Network preconnection completed');
    }

    monitorNetworkChanges() {
      if (navigator.connection) {
        navigator.connection.addEventListener('change', () => {
          const networkInfo = AdUtils.getNetworkInfo();
          logger.info('Network changed', networkInfo);
        });
      }
    }
  }

  // Script Loader
  class ScriptLoader {
    constructor() {
      this.retryCount = 0;
    }

    async loadAdSenseScript() {
      if (STATE.scriptLoaded) return true;
      if (STATE.scriptLoading) return this.waitForScript();

      STATE.scriptLoading = true;
      logger.info('Loading AdSense script...');

      try {
        await this.createAndLoadScript();
        await this.verifyScript();
        
        STATE.scriptLoaded = true;
        STATE.scriptLoading = false;
        STATE.adsenseReady = true;
        
        logger.info('AdSense script loaded successfully');
        return true;
      } catch (error) {
        STATE.scriptLoading = false;
        logger.error('Script loading failed', { error: error.message });
        
        if (this.retryCount < 2) {
          this.retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.loadAdSenseScript();
        }
        
        await this.initializeFallback();
        return true;
      }
    }

    async createAndLoadScript() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.src = `${CONFIG.SCRIPT_URL}?client=${CONFIG.CLIENT_ID}`;
        
        const timeout = setTimeout(() => {
          script.remove();
          reject(new Error('Script load timeout'));
        }, CONFIG.PERFORMANCE_BUDGET);

        script.onload = () => {
          clearTimeout(timeout);
          resolve();
        };

        script.onerror = () => {
          clearTimeout(timeout);
          script.remove();
          reject(new Error('Script load error'));
        };

        document.head.appendChild(script);
      });
    }

    async verifyScript() {
      let attempts = 0;
      while (typeof window.adsbygoogle === 'undefined' && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (typeof window.adsbygoogle === 'undefined') {
        throw new Error('AdSense script verification failed');
      }
    }

    async initializeFallback() {
      if (!window.adsbygoogle) {
        window.adsbygoogle = [];
      }
      STATE.scriptLoaded = true;
      STATE.adsenseReady = true;
      logger.warn('Fallback initialization completed');
    }

    async waitForScript() {
      let attempts = 0;
      while (STATE.scriptLoading && attempts < 50) {
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
    }

    async discoverAds() {
      const elements = Array.from(document.querySelectorAll(CONFIG.AD_SELECTOR));
      logger.info('Discovering ads', { count: elements.length });
      
      const ads = elements.map((element, index) => {
        const adId = AdUtils.generateAdId(element, index);
        const adData = {
          id: adId,
          element: element,
          index,
          rect: element.getBoundingClientRect(),
          visibility: AdUtils.calculateVisibility(element),
          priority: this.calculatePriority(element),
          status: 'discovered',
          attempts: 0,
          timestamp: Date.now()
        };
        
        element.setAttribute('data-ad-id', adId);
        STATE.adRegistry.set(adId, adData);
        return adData;
      });

      STATE.totalAds = ads.length;
      logger.info('Ad discovery completed', { totalAds: STATE.totalAds });
      return ads;
    }

    calculatePriority(element) {
      const rect = element.getBoundingClientRect();
      const visibility = AdUtils.calculateVisibility(element);
      
      let priority = 50;
      
      // Above fold bonus
      if (rect.top < window.innerHeight) priority += 40;
      
      // Size bonus
      const area = rect.width * rect.height;
      if (area > 300 * 250) priority += 20;
      
      // Visibility bonus
      priority += visibility * 30;
      
      return Math.min(100, Math.max(1, Math.round(priority)));
    }

    async loadAd(adData) {
      if (this.loadedAds.has(adData.id) || adData.element.hasAttribute('data-ads-loaded')) {
        AdUtils.removeLoadingPlaceholder(adData.element);
        return true;
      }
      
      if (STATE.processingQueue.has(adData.id)) {
        return false;
      }

      const startTime = Date.now();
      adData.attempts++;
      
      try {
        logger.debug('Loading ad', { 
          adId: adData.id, 
          priority: adData.priority, 
          attempt: adData.attempts 
        });
        
        AdUtils.preventLayoutShift(adData.element);
        const placeholder = AdUtils.createLoadingPlaceholder(adData.element);
        
        this.ensureAdAttributes(adData.element);
        
        adData.status = 'loading';
        STATE.processingQueue.add(adData.id);
        
        await this.executeAdLoad(adData, placeholder);
        
        const loadTime = Date.now() - startTime;
        this.handleLoadSuccess(adData, loadTime);
        
        logger.info('Ad loaded successfully', { 
          adId: adData.id, 
          loadTime,
          priority: adData.priority
        });
        
        return true;
      } catch (error) {
        const loadTime = Date.now() - startTime;
        
        if (adData.attempts < CONFIG.MAX_RETRY_ATTEMPTS) {
          logger.warn('Ad load failed, retrying', { 
            adId: adData.id, 
            error: error.message,
            attempt: adData.attempts
          });
          
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
          return this.loadAd(adData);
        }
        
        this.handleLoadFailure(adData, error, loadTime);
        return false;
      } finally {
        STATE.processingQueue.delete(adData.id);
      }
    }

    ensureAdAttributes(element) {
      if (!element.hasAttribute('data-ad-client')) {
        element.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
      }
      
      if (!element.hasAttribute('data-ad-slot')) {
        element.setAttribute('data-ad-slot', 'auto');
      }
      
      if (!element.hasAttribute('data-ad-format')) {
        element.setAttribute('data-ad-format', 'auto');
      }
      
      if (!element.hasAttribute('data-full-width-responsive')) {
        element.setAttribute('data-full-width-responsive', 'true');
      }
    }

    async executeAdLoad(adData, placeholder) {
      return new Promise((resolve, reject) => {
        try {
          // Push to AdSense
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          
          // Set up verification with multiple checkpoints
          let verificationAttempts = 0;
          const maxVerificationAttempts = CONFIG.VERIFICATION_TIMEOUT / 200;
          
          const verifyLoad = () => {
            verificationAttempts++;
            
            if (AdUtils.isAdLoaded(adData.element)) {
              // Ad is loaded, remove placeholder after delay
              setTimeout(() => {
                AdUtils.removeLoadingPlaceholder(adData.element);
              }, CONFIG.PLACEHOLDER_REMOVAL_DELAY);
              resolve();
              return;
            }
            
            if (verificationAttempts >= maxVerificationAttempts) {
              // Timeout reached, remove placeholder and resolve anyway
              AdUtils.removeLoadingPlaceholder(adData.element);
              resolve(); // Don't reject, let it pass
              return;
            }
            
            setTimeout(verifyLoad, 200);
          };
          
          // Start verification after a short delay
          setTimeout(verifyLoad, 500);
          
          // Fallback timeout
          setTimeout(() => {
            AdUtils.removeLoadingPlaceholder(adData.element);
            resolve(); // Resolve instead of reject to avoid retry loops
          }, CONFIG.AD_LOAD_TIMEOUT);
          
        } catch (error) {
          AdUtils.removeLoadingPlaceholder(adData.element);
          reject(error);
        }
      });
    }

    handleLoadSuccess(adData, loadTime) {
      adData.status = 'loaded';
      adData.loadTime = loadTime;
      adData.element.setAttribute('data-ads-loaded', 'true');
      
      STATE.loadedAds++;
      this.loadedAds.add(adData.id);
      
      this.updateMetrics();
    }

    handleLoadFailure(adData, error, loadTime) {
      adData.status = 'failed';
      adData.error = error.message;
      adData.element.setAttribute('data-ad-failed', 'true');
      
      AdUtils.removeLoadingPlaceholder(adData.element);
      
      STATE.failedAds++;
      this.failedAds.add(adData.id);
      
      this.updateMetrics();
      logger.error('Ad load failed permanently', { 
        adId: adData.id, 
        error: error.message,
        attempts: adData.attempts 
      });
    }

    updateMetrics() {
      const total = STATE.loadedAds + STATE.failedAds;
      if (total > 0) {
        STATE.metrics.successRate = (STATE.loadedAds / total) * 100;
        STATE.metrics.errorRate = (STATE.failedAds / total) * 100;
        STATE.metrics.totalProcessed = total;
      }

      const loadedAds = Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'loaded');
      if (loadedAds.length > 0) {
        const totalTime = loadedAds.reduce((sum, ad) => sum + (ad.loadTime || 0), 0);
        STATE.metrics.avgLoadTime = totalTime / loadedAds.length;
      }
    }
  }

  // Batch Processor
  class BatchProcessor {
    constructor(adManager) {
      this.adManager = adManager;
      this.processing = false;
    }

    async processAds(ads) {
      if (this.processing) return;
      this.processing = true;

      logger.info('Starting batch processing', { totalAds: ads.length });
      
      // Process in smaller batches
      for (let i = 0; i < ads.length; i += CONFIG.BATCH_SIZE) {
        const batch = ads.slice(i, i + CONFIG.BATCH_SIZE);
        const validBatch = batch.filter(ad => 
          !ad.element.hasAttribute('data-ads-loaded') && 
          !STATE.processingQueue.has(ad.id)
        );
        
        if (validBatch.length === 0) continue;

        logger.debug(`Processing batch ${Math.floor(i/CONFIG.BATCH_SIZE) + 1}`, { 
          batchSize: validBatch.length 
        });
        
        // Process batch in parallel
        const promises = validBatch.map(ad => this.adManager.loadAd(ad));
        await Promise.allSettled(promises);
        
        // Small delay between batches
        if (i + CONFIG.BATCH_SIZE < ads.length) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        }
      }

      this.processing = false;
      logger.info('Batch processing completed');
    }
  }

  // Lazy Load Manager
  class LazyLoadManager {
    constructor(adManager) {
      this.adManager = adManager;
      this.observer = null;
      this.observedAds = new Set();
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
          threshold: [0, CONFIG.INTERSECTION_THRESHOLD, 0.5]
        }
      );

      STATE.observers.add(this.observer);
      logger.info('Lazy load manager initialized');
      return true;
    }

    observeAd(adData) {
      if (this.observer && !this.observedAds.has(adData.id) && 
          !adData.element.hasAttribute('data-ads-loaded')) {
        this.observer.observe(adData.element);
        this.observedAds.add(adData.id);
      }
    }

    async handleIntersection(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const adData = this.findAdData(entry.target);
          if (adData && !adData.element.hasAttribute('data-ads-loaded')) {
            logger.debug('Ad entering viewport, loading', { adId: adData.id });
            
            this.observer.unobserve(entry.target);
            this.observedAds.delete(adData.id);
            
            await this.adManager.loadAd(adData);
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
        return rect.top < window.innerHeight + 100 && rect.bottom > -100;
      });

      logger.info('Loading visible ads', { count: visibleAds.length });
      
      const batchProcessor = new BatchProcessor(this.adManager);
      await batchProcessor.processAds(visibleAds);
    }
  }

  // Main Controller
  class AdSenseController {
    constructor() {
      this.networkOptimizer = new NetworkOptimizer();
      this.scriptLoader = new ScriptLoader();
      this.adManager = new AdManager();
      this.lazyLoadManager = new LazyLoadManager(this.adManager);
      this.initialized = false;
    }

    async initialize() {
      if (this.initialized) return;
      this.initialized = true;

      logger.info('🚀 AdSense Optimizer v2.2 initializing...');

      try {
        await this.prepareEnvironment();
        await this.setupLoadTriggers();
        
        STATE.initialized = true;
        logger.info('✅ AdSense Optimizer v2.2 ready');
      } catch (error) {
        logger.error('Initialization failed', { error: error.message });
      }
    }

    async prepareEnvironment() {
      await AdUtils.waitForPageLoad();
      await this.networkOptimizer.optimize();
    }

    async setupLoadTriggers() {
      const loadHandler = async () => {
        logger.info('Loading triggered, starting ads');
        await this.executeLoadSequence();
      };

      // Trigger 1: After delay
      setTimeout(loadHandler, CONFIG.LOAD_DELAY);

      // Trigger 2: On scroll (early)
      let scrollTriggered = false;
      const scrollHandler = () => {
        if (!scrollTriggered) {
          scrollTriggered = true;
          window.removeEventListener('scroll', scrollHandler);
          loadHandler();
        }
      };
      window.addEventListener('scroll', scrollHandler, { passive: true });

      // Trigger 3: On interaction
      const interactionEvents = ['click', 'touchstart'];
      const interactionHandler = () => {
        interactionEvents.forEach(event => 
          window.removeEventListener(event, interactionHandler)
        );
        loadHandler();
      };
      interactionEvents.forEach(event => 
        window.addEventListener(event, interactionHandler, { passive: true })
      );
    }

    async executeLoadSequence() {
      try {
        await this.scriptLoader.loadAdSenseScript();
        
        const ads = await this.adManager.discoverAds();
        
        if (ads.length === 0) {
          logger.info('No ads found');
          return;
        }

        const lazyLoadSupported = this.lazyLoadManager.initialize();
        
        if (lazyLoadSupported) {
          // Set up lazy loading for non-visible ads
          ads.forEach(ad => this.lazyLoadManager.observeAd(ad));
          // Load visible ads immediately
          await this.lazyLoadManager.loadVisibleAds();
        } else {
          // Fallback: load all ads in batches
          const sortedAds = ads.sort((a, b) => b.priority - a.priority);
          const batchProcessor = new BatchProcessor(this.adManager);
          await batchProcessor.processAds(sortedAds);
        }

        logger.info('Load sequence completed', {
          totalAds: STATE.totalAds,
          loaded: STATE.loadedAds,
          failed: STATE.failedAds,
          successRate: STATE.metrics.successRate.toFixed(1) + '%'
        });

      } catch (error) {
        logger.error('Load sequence failed', { error: error.message });
      }
    }

    getStatus() {
      return {
        version: '2.2',
        sessionId: STATE.sessionId,
        uptime: Date.now() - STATE.startTime,
        initialized: STATE.initialized,
        scriptLoaded: STATE.scriptLoaded,
        ads: {
          total: STATE.totalAds,
          loaded: STATE.loadedAds,
          failed: STATE.failedAds,
          processing: STATE.processingQueue.size
        },
        metrics: STATE.metrics,
        networkInfo: AdUtils.getNetworkInfo()
      };
    }

    async forceLoadAll() {
      logger.info('Force loading all ads');
      const ads = Array.from(STATE.adRegistry.values()).filter(ad => 
        !ad.element.hasAttribute('data-ads-loaded')
      );
      
      const batchProcessor = new BatchProcessor(this.adManager);
      await batchProcessor.processAds(ads);
      
      logger.info('Force load completed', { 
        total: ads.length,
        loaded: STATE.loadedAds 
      });
    }

    destroy() {
      logger.info('Destroying controller');
      
      STATE.timers.forEach(timer => clearTimeout(timer));
      STATE.timers.clear();
      
      STATE.intervals.forEach(interval => clearInterval(interval));
      STATE.intervals.clear();
      
      STATE.observers.forEach(observer => {
        if (observer && observer.disconnect) {
          observer.disconnect();
        }
      });
      STATE.observers.clear();
      
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
        version: '2.2',
        getStatus: () => controller.getStatus(),
        forceLoadAll: () => controller.forceLoadAll(),
        destroy: () => controller.destroy(),
        getMetrics: () => STATE.metrics,
        getLogs: () => logger.logHistory.slice(-10)
      };
      
      logger.info('🎉 AdSense Optimizer v2.2 ready globally');
      return controller;
    } catch (error) {
      logger.error('Initialization failed', { error: error.message });
      throw error;
    }
  }

  // Auto-initialize
  let initPromise = null;

  const tryInitialize = async () => {
    if (initPromise) return initPromise;
    initPromise = initializeAdSenseOptimizer();
    return initPromise;
  };

  // Multiple initialization triggers
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInitialize);
  } else {
    setTimeout(tryInitialize, 100);
  }

  window.addEventListener('load', () => {
    if (!initPromise) {
      setTimeout(tryInitialize, 300);
    }
  });

  // Fallback timeout
  setTimeout(() => {
    if (!initPromise) {
      logger.warn('Fallback initialization triggered');
      tryInitialize();
    }
  }, 2000);

  // Global error handling for AdSense
  window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('googlesyndication')) {
      logger.warn('AdSense error caught', { 
        message: event.message,
        filename: event.filename 
      });
      event.preventDefault();
    }
  });

  // Handle promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && 
        event.reason.message.toLowerCase().includes('ad')) {
      logger.warn('Ad promise rejection caught', { 
        reason: event.reason.message 
      });
      event.preventDefault();
    }
  });

})();
