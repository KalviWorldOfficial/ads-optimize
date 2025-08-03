(function() {
  'use strict';

  // Optimized AdSense Configuration
  const CONFIG = {
    CLIENT_ID: 'ca-pub-7407983524344370',
    SCRIPT_URL: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    AD_SELECTOR: '.lazy-ads, ins.adsbygoogle',
    LAZY_LOAD_MARGIN: '300px', // Increased for better page speed
    LOAD_DELAY: 1000, // Reduced for faster post-load initialization
    MAX_RETRY_ATTEMPTS: 8, // Increased for reliability
    RETRY_DELAY: 1500, // Reduced for faster retries
    PERFORMANCE_BUDGET: 5000,
    HEALTH_CHECK_INTERVAL: 6000, // More frequent checks
    BATCH_SIZE: 3,
    BATCH_DELAY: 300, // Reduced for performance
    CRITICAL_LOAD_TIME: 2500,
    TARGET_SUCCESS_RATE: 95,
    INTERSECTION_THRESHOLD: 0.1,
    PRECONNECT_DOMAINS: [
      'https://pagead2.googlesyndication.com',
      'https://googleads.g.doubleclick.net',
      'https://tpc.googlesyndication.com'
    ],
    AUTO_ADS_ENABLED: true // Enable auto ads
  };

  // State Management
  const STATE = {
    scriptLoaded: false,
    scriptLoading: false,
    adsenseReady: false,
    initialized: false,
    autoAdsInitialized: false,
    totalAds: 0,
    loadedAds: 0,
    failedAds: 0,
    retryCount: 0,
    startTime: Date.now(),
    sessionId: `ads_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
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
      healthChecks: 0
    },
    adBlockerDetected: false
  };

  // Enhanced Logger
  class AdLogger {
    constructor() {
      this.levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
      this.currentLevel = 1; // Set to 0 for detailed debugging
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
        const formattedTime = new Date(timestamp).toISOString();
        const prefix = `[AdSense-Optimizer v3.0 ${formattedTime}] [${level}]`;
        const consoleMethod = console[level.toLowerCase()] || console.log;
        consoleMethod(`${prefix} ${message}`, data);
      }

      this.logHistory.push(logEntry);
      if (this.logHistory.length > 100) {
        this.logHistory = this.logHistory.slice(-50);
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
      const conditions = [
        () => document.readyState === 'complete',
        () => document.body && document.head
      ];

      let attempts = 0;
      while (!conditions.every(condition => condition()) && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      logger.info('Page load completed');
    }

    static generateAdId(element, index) {
      return element.id || 
             element.dataset.adId || 
             `ads_${STATE.sessionId}_${index}_${Date.now()}`;
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

    static isAdLoaded(element) {
      const checks = [
        () => element.getAttribute('data-adsbygoogle-status') === 'done',
        () => element.querySelector('iframe[src*="googleads"]') !== null,
        () => element.innerHTML.trim().length > 100,
        () => element.offsetWidth > 50 && element.offsetHeight > 50,
        () => element.querySelector('div[id*="google_ads"]') !== null,
        () => element.querySelector('ins[style*="display: block"]') !== null
      ];
      
      const passedChecks = checks.filter(check => {
        try { return check(); } catch { return false; }
      }).length;
      
      logger.debug('Ad load check', { 
        adId: element.getAttribute('data-ad-id'), 
        passedChecks, 
        totalChecks: checks.length 
      });
      
      return passedChecks >= 3; // Stricter criteria
    }

    static preventLayoutShift(element) {
      const rect = element.getBoundingClientRect() || {};
      const width = rect.width || element.offsetWidth || 320;
      const height = rect.height || element.offsetHeight || 250;
      
      element.style.width = width < 300 ? '100%' : `${width}px`;
      element.style.maxWidth = '728px';
      element.style.minHeight = height < 200 ? '250px' : `${height}px`;
      element.style.display = 'block';
      element.style.position = 'relative';
      element.style.contain = 'content';
      element.style.overflow = 'hidden';
      element.style.zIndex = '0';
      
      logger.debug('Layout shift prevention applied', { 
        adId: element.getAttribute('data-ad-id'), 
        width, 
        height 
      });
    }

    static createLoadingPlaceholder(element) {
      if (element.hasAttribute('data-placeholder-active')) {
        logger.debug('Placeholder already exists, skipping creation', { 
          adId: element.getAttribute('data-ad-id') 
        });
        return null;
      }

      const placeholder = document.createElement('div');
      placeholder.className = 'adsense-loading-placeholder';
      placeholder.setAttribute('data-placeholder-id', `ph_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`);
      placeholder.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: #666;
        z-index: 1;
        transition: opacity 0.3s ease;
      `;
      placeholder.textContent = 'Loading Ad...';
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
      if (placeholder && placeholder.parentNode) {
        placeholder.style.opacity = '0';
        setTimeout(() => {
          if (placeholder.parentNode) {
            placeholder.remove();
            element.removeAttribute('data-placeholder-active');
            logger.debug('Loading placeholder removed', { 
              adId: element.getAttribute('data-ad-id'), 
              placeholderId: placeholder.getAttribute('data-placeholder-id') 
            });
          }
        }, 300);
      } else {
        element.removeAttribute('data-placeholder-active');
        logger.debug('No placeholder found to remove', { 
          adId: element.getAttribute('data-ad-id') 
        });
      }
    }

    static detectAdBlocker() {
      const testAd = document.createElement('div');
      testAd.className = 'adsense-loading-placeholder';
      testAd.style.display = 'none';
      document.body.appendChild(testAd);
      const isBlocked = testAd.offsetHeight === 0;
      document.body.removeChild(testAd);
      
      if (isBlocked) {
        STATE.adBlockerDetected = true;
        logger.warn('Potential ad blocker detected');
      }
      return isBlocked;
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
          logger.info('Network status changed', networkInfo);
          if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
            CONFIG.RETRY_DELAY = 2000;
          } else {
            CONFIG.RETRY_DELAY = 1500;
          }
        });
      }
    }
  }

  // Performance-Optimized Script Loader
  class ScriptLoader {
    constructor() {
      this.retryCount = 0;
      this.loadStartTime = 0;
    }

    async loadAdSenseScript() {
      if (STATE.scriptLoaded) return true;
      if (STATE.scriptLoading) return this.waitForScript();

      STATE.scriptLoading = true;
      this.loadStartTime = Date.now();
      logger.info('Loading AdSense script...');

      try {
        await this.createAndLoadScript();
        await this.verifyScriptIntegrity();
        
        STATE.scriptLoaded = true;
        STATE.scriptLoading = false;
        STATE.adsenseReady = true;
        
        const loadTime = Date.now() - this.loadStartTime;
        logger.info('AdSense script loaded successfully', { loadTime });
        return true;
      } catch (error) {
        STATE.scriptLoading = false;
        logger.error('Script loading failed', { error: error.message, attempt: this.retryCount });
        
        if (this.retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
          this.retryCount++;
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
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
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.src = `${CONFIG.SCRIPT_URL}?client=${CONFIG.CLIENT_ID}&t=${Date.now()}`;
        script.setAttribute('data-ad-client', CONFIG.CLIENT_ID); // Required for auto ads
        
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

    async verifyScriptIntegrity() {
      let attempts = 0;
      const maxAttempts = 80;
      while (typeof window.adsbygoogle === 'undefined' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (typeof window.adsbygoogle === 'undefined') {
        throw new Error('AdSense script not properly loaded');
      }
      
      window.adsbygoogle.loaded = window.adsbygoogle.loaded || false;
      logger.debug('Script integrity verified');
    }

    async initializeFallback() {
      if (!window.adsbygoogle) {
        window.adsbygoogle = [];
        window.adsbygoogle.push = function(obj) {
          Array.prototype.push.call(this, obj);
          logger.warn('Fallback: Simulated ad push');
        };
      }
      
      STATE.scriptLoaded = true;
      STATE.adsenseReady = true;
      logger.warn('Fallback initialization completed');
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

  // Dynamic Ad Scanner
  class AdScanner {
    constructor(adManager, lazyLoadManager) {
      this.adManager = adManager;
      this.lazyLoadManager = lazyLoadManager;
      this.observer = null;
    }

    initialize() {
      if (!window.MutationObserver) {
        logger.warn('MutationObserver not supported, relying on initial scan');
        return;
      }

      this.observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length) {
            this.scanForNewAds();
          }
        });
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      STATE.observers.add(this.observer);
      logger.info('Ad scanner initialized');
    }

    async scanForNewAds() {
      const elements = Array.from(document.querySelectorAll(CONFIG.AD_SELECTOR));
      const newAds = elements.filter(el => !el.hasAttribute('data-ad-id'));
      
      if (newAds.length === 0) return;

      logger.info('Discovered new ad containers', { count: newAds.length });
      
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
        STATE.adRegistry.set(adId, adData);
        return adData;
      });

      STATE.totalAds += ads.length;
      
      ads.forEach(ad => this.lazyLoadManager.observeAd(ad));
      
      const visibleAds = ads.filter(ad => {
        const rect = ad.element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });

      if (visibleAds.length > 0) {
        const batchProcessor = new BatchProcessor(this.adManager);
        await batchProcessor.processAds(visibleAds);
      }
      
      logger.info('New ad discovery completed', { totalAds: STATE.totalAds });
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        STATE.observers.delete(this.observer);
        logger.info('Ad scanner destroyed');
      }
    }
  }

  // Advanced Ad Manager with Auto Ads Support
  class AdManager {
    constructor() {
      this.loadedAds = new Set();
      this.failedAds = new Set();
      this.retryEngine = new RetryEngine();
      this.performanceProfiler = new PerformanceProfiler();
      this.pushQueue = [];
    }

    async initializeAutoAds() {
      if (!CONFIG.AUTO_ADS_ENABLED || STATE.autoAdsInitialized) return;

      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({
          google_ad_client: CONFIG.CLIENT_ID,
          enable_page_level_ads: true
        });
        STATE.autoAdsInitialized = true;
        logger.info('Auto ads initialized');
      } catch (error) {
        logger.error('Auto ads initialization failed', { error: error.message });
      }
    }

    async discoverAds() {
      const elements = Array.from(document.querySelectorAll(CONFIG.AD_SELECTOR));
      logger.info('Discovering manual ads', { count: elements.length });
      
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
          failureReasons: []
        };
        
        element.setAttribute('data-ad-id', adId);
        STATE.adRegistry.set(adId, adData);
        return adData;
      });

      STATE.totalAds = ads.length;
      logger.info('Manual ad discovery completed', { totalAds: STATE.totalAds });
      return ads;
    }

    extractAdAttributes(element) {
      const attributes = {};
      for (const attr of element.attributes) {
        if (attr.name.startsWith('data-ad-') || attr.name === 'class' || attr.name === 'id') {
          attributes[attr.name] = attr.value;
        }
      }
      return attributes;
    }

    calculatePriority(element) {
      const rect = element.getBoundingClientRect();
      const visibility = AdUtils.calculateVisibility(element);
      
      let priority = 50;
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        priority += 30;
      }
      const area = rect.width * rect.height;
      if (area > 300 * 250) priority += 20;
      if (area > 728 * 90) priority += 15;
      priority += visibility * 20;
      if (rect.top < window.innerHeight / 2) priority += 25;
      return Math.min(100, Math.max(1, priority));
    }

    queueAdPush(adData) {
      if (!this.pushQueue.some(item => item.id === adData.id)) {
        this.pushQueue.push(adData);
        logger.debug('Ad queued for push', { adId: adData.id });
      }
    }

    async processPushQueue() {
      if (this.pushQueue.length === 0) return;

      const batch = this.pushQueue.splice(0, CONFIG.BATCH_SIZE);
      logger.debug('Processing ad push queue', { batchSize: batch.length });

      for (const adData of batch) {
        await this.loadAd(adData);
      }

      if (this.pushQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        await this.processPushQueue();
      }
    }

    async loadAd(adData) {
      if (this.loadedAds.has(adData.id) || adData.element.hasAttribute('data-ads-loaded')) {
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
      this.performanceProfiler.startProfiling(adData.id);
      
      try {
        logger.debug('Loading ad', { adId: adData.id, priority: adData.priority, attempt: adData.attempts });
        
        AdUtils.preventLayoutShift(adData.element);
        const placeholder = AdUtils.createLoadingPlaceholder(adData.element);
        
        this.ensureAdAttributes(adData.element);
        
        adData.status = 'loading';
        adData.element.setAttribute('data-ad-processing', 'true');
        STATE.processingQueue.add(adData.id);
        
        await this.executeAdLoad(adData);
        
        await this.verifyAdLoad(adData);
        
        AdUtils.removeLoadingPlaceholder(adData.element);
        
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
        const slot = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        element.setAttribute('data-ad-slot', slot);
        logger.debug('Assigned fallback ad slot', { adId: element.getAttribute('data-ad-id'), slot });
      }
      
      if (!element.hasAttribute('data-ad-format')) {
        element.setAttribute('data-ad-format', 'auto');
      }
      
      if (!element.hasAttribute('data-full-width-responsive')) {
        element.setAttribute('data-full-width-responsive', 'true');
      }
    }

    async executeAdLoad(adData) {
      return new Promise((resolve, reject) => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          
          const timeout = setTimeout(() => {
            this.verifyAdLoad(adData, resolve, reject);
          }, CONFIG.CRITICAL_LOAD_TIME);
          
          const checker = setInterval(() => {
            if (AdUtils.isAdLoaded(adData.element)) {
              clearTimeout(timeout);
              clearInterval(checker);
              resolve();
            }
          }, 100);
          
          STATE.timers.add(timeout);
          STATE.timers.add(checker);
          
        } catch (error) {
          reject(error);
        }
      });
    }

    async verifyAdLoad(adData, resolve, reject) {
      let attempts = 0;
      const maxAttempts = 80;
      
      while (attempts < maxAttempts) {
        if (AdUtils.isAdLoaded(adData.element)) {
          resolve();
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      reject(new Error('Ad failed to load within time limit'));
    }

    handleLoadSuccess(adData, loadTime) {
      adData.status = 'loaded';
      adData.loadTime = loadTime;
      adData.element.setAttribute('data-ads-loaded', 'true');
      adData.element.removeAttribute('data-ad-failed');
      
      AdUtils.removeLoadingPlaceholder(adData.element);
      
      STATE.loadedAds++;
      this.loadedAds.add(adData.id);
      STATE.processingQueue.delete(adData.id);
      
      this.updateMetrics();
    }

    handleLoadFailure(adData, error, loadTime) {
      adData.status = 'failed';
      adData.error = error.message;
      adData.failureTime = loadTime;
      adData.element.setAttribute('data-ad-failed', 'true');
      
      AdUtils.removeLoadingPlaceholder(adData.element);
      
      STATE.failedAds++;
      this.failedAds.add(adData.id);
      STATE.processingQueue.delete(adData.id);
      
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
      }

      const loadedAds = Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'loaded');
      if (loadedAds.length > 0) {
        const totalTime = loadedAds.reduce((sum, ad) => sum + (ad.loadTime || 0), 0);
        STATE.metrics.avgLoadTime = totalTime / loadedAds.length;
      }

      logger.debug('Metrics updated', STATE.metrics);
    }
  }

  // Intelligent Retry Engine
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
      const maxRetries = adData.priority > 75 ? CONFIG.MAX_RETRY_ATTEMPTS + 2 : CONFIG.MAX_RETRY_ATTEMPTS;
      const networkInfo = AdUtils.getNetworkInfo();
      const networkFactor = networkInfo.effectiveType === 'slow-2g' ? 0.5 : 1.0;

      const shouldRetry = state.attempts < maxRetries && errorSeverity * networkFactor > 0.3;

      if (!shouldRetry && state.attempts >= maxRetries) {
        this.cooldownPeriods.set(adId, Date.now() + 30000);
        logger.warn('Ad reached max retries, entering cooldown', { adId, attempts: state.attempts });
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
        'blocked': 0.4
      };
      
      for (const [type, severity] of Object.entries(severityMap)) {
        if (errorMessage.includes(type)) return severity;
      }
      
      return 0.5;
    }

    calculateDelay(attempts) {
      const baseDelay = CONFIG.RETRY_DELAY;
      const backoff = Math.pow(1.5, attempts - 1);
      const jitter = Math.random() * 0.3 + 0.85;
      return Math.min(baseDelay * backoff * jitter, 8000);
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
          logger.warn('Performance mark failed', { error: e.message });
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
          logger.warn('Performance measure failed', { error: e.message });
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
      logger.debug('Performance profile completed', { adId, duration });
      return finalProfile;
    }

    getMemorySnapshot() {
      if (window.performance && window.performance.memory) {
        return {
          used: window.performance.memory.usedJSHeapSize,
          total: window.performance.memory.totalJSHeapSize
        };
      }
      return null;
    }
  }

  // Health Monitor for Failed Ads
  class HealthMonitor {
    constructor(adManager) {
      this.adManager = adManager;
      this.interval = null;
    }

    start() {
      if (this.interval) return;
      
      logger.info('Starting health monitor');
      this.interval = setInterval(() => {
        this.checkFailedAds();
      }, CONFIG.HEALTH_CHECK_INTERVAL);
      
      STATE.intervals.add(this.interval);
    }

    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        STATE.intervals.delete(this.interval);
        logger.info('Health monitor stopped');
      }
    }

    async checkFailedAds() {
      STATE.metrics.healthChecks++;
      const failedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'failed' && 
        ad.attempts < CONFIG.MAX_RETRY_ATTEMPTS &&
        !ad.element.hasAttribute('data-ads-loaded') &&
        !STATE.processingQueue.has(ad.id) &&
        !ad.element.hasAttribute('data-ad-processing')
      );

      if (failedAds.length === 0) {
        logger.debug('Health check: No failed ads to retry');
        return;
      }

      logger.info(`Health check: Found ${failedAds.length} failed ads to retry`);
      
      const batches = [];
      for (let i = 0; i < failedAds.length; i += CONFIG.BATCH_SIZE) {
        batches.push(failedAds.slice(i, i + CONFIG.BATCH_SIZE));
      }

      for (const batch of batches) {
        await Promise.allSettled(batch.map(ad => this.adManager.loadAd(ad)));
        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
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

        logger.debug(`Processing batch ${i + 1}/${batches.length}`, { batchSize: batch.length });
        
        const promises = batch.map(ad => this.adManager.loadAd(ad));
        await Promise.allSettled(promises);
        
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        }
      }

      this.processing = false;
      logger.info('Batch processing completed');
    }
  }

  // Advanced Intersection Observer for Lazy Loading
  class LazyLoadManager {
    constructor(adManager) {
      this.adManager = adManager;
      this.observer = null;
      this.observedAds = new Set();
    }

    initialize() {
      if (!window.IntersectionObserver) {
        logger.warn('IntersectionObserver not supported, loading all ads immediately');
        return false;
      }

      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: CONFIG.LAZY_LOAD_MARGIN,
          threshold: [0, CONFIG.INTERSECTION_THRESHOLD, 0.5, 1.0]
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
        if (entry.isIntersecting || entry.intersectionRatio >= CONFIG.INTERSECTION_THRESHOLD) {
          const adData = this.findAdData(entry.target);
          if (adData && 
              adData.status === 'discovered' && 
              !adData.element.hasAttribute('data-ads-loaded') &&
              !adData.element.hasAttribute('data-ad-processing')) {
            logger.debug('Ad entered viewport, queuing for push', { 
              adId: adData.id, 
              intersectionRatio: entry.intersectionRatio 
            });
            
            this.observer.unobserve(entry.target);
            this.observedAds.delete(adData.id);
            
            this.adManager.queueAdPush(adData);
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

      logger.info('Loading immediately visible ads', { count: visibleAds.length });
      
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
      this.healthMonitor = new HealthMonitor(this.adManager);
      this.adScanner = new AdScanner(this.adManager, this.lazyLoadManager);
      this.initialized = false;
      this.loadTriggered = false;
    }

    async initialize() {
      if (this.initialized) return;
      this.initialized = true;

      logger.info('🚀 AdSense Optimizer v3.0 initializing...');

      try {
        await this.prepareEnvironment();
        await this.setupDelayedLoading();
        
        AdUtils.detectAdBlocker();
        
        STATE.initialized = true;
        logger.info('✅ AdSense Optimizer initialized successfully');
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

    async setupDelayedLoading() {
      if (this.loadTriggered) return;
      this.loadTriggered = true;
      
      const triggerLoad = async () => {
        logger.info('Load triggered, starting AdSense initialization');
        await this.executeLoadSequence();
      };

      // Defer until window.load for page speed
      window.addEventListener('load', () => {
        setTimeout(triggerLoad, CONFIG.LOAD_DELAY);
      }, { once: true });

      // Fallback for slow-loading pages
      setTimeout(triggerLoad, CONFIG.LOAD_DELAY + 2000);
    }

    async executeLoadSequence() {
      try {
        await this.scriptLoader.loadAdSenseScript();
        
        if (CONFIG.AUTO_ADS_ENABLED) {
          await this.adManager.initializeAutoAds();
        }
        
        const ads = await this.adManager.discoverAds();
        
        if (ads.length === 0 && !CONFIG.AUTO_ADS_ENABLED) {
          logger.warn('No ads found to load, scheduling re-scan');
          setTimeout(() => this.adScanner.scanForNewAds(), 1000);
          return;
        }

        const lazyLoadSupported = this.lazyLoadManager.initialize();
        
        if (lazyLoadSupported) {
          ads.forEach(ad => this.lazyLoadManager.observeAd(ad));
          await this.lazyLoadManager.loadVisibleAds();
        } else {
          const sortedAds = ads.sort((a, b) => b.priority - a.priority);
          const batchProcessor = new BatchProcessor(this.adManager);
          await batchProcessor.processAds(sortedAds);
        }

        await this.adManager.processPushQueue();
        this.healthMonitor.start();

        logger.info('Load sequence completed', {
          totalAds: STATE.totalAds,
          loadedAds: STATE.loadedAds,
          autoAds: CONFIG.AUTO_ADS_ENABLED,
          successRate: STATE.metrics.successRate.toFixed(1) + '%',
          adBlockerDetected: STATE.adBlockerDetected
        });

      } catch (error) {
        logger.error('Load sequence failed', { error: error.message });
        await this.emergencyRecovery();
      }
    }

    async emergencyRecovery() {
      logger.warn('Initiating emergency recovery');
      const failedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'failed' && 
        !ad.element.hasAttribute('data-ads-loaded') &&
        !ad.element.hasAttribute('data-ad-processing')
      );

      if (failedAds.length > 0) {
        logger.info(`Retrying ${failedAds.length} failed ads in emergency mode`);
        const batchProcessor = new BatchProcessor(this.adManager);
        await batchProcessor.processAds(failedAds);
      }

      if (CONFIG.AUTO_ADS_ENABLED && !STATE.autoAdsInitialized) {
        await this.adManager.initializeAutoAds();
      }

      await this.adScanner.scanForNewAds();
    }

    setupObservers() {
      if ('connection' in navigator) {
        navigator.connection.addEventListener('change', () => {
          const networkInfo = AdUtils.getNetworkInfo();
          logger.info('Network status changed', networkInfo);
        });
      }

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          logger.debug('Page became visible, checking ad status');
          this.healthMonitor.checkFailedAds();
          this.adScanner.scanForNewAds();
          this.adManager.processPushQueue();
        }
      });
    }

    setupPerformanceMonitoring() {
      if (typeof PerformanceObserver !== 'undefined') {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'measure' && entry.name.includes('ad-load')) {
                logger.debug('Performance measure', {
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

      window.addEventListener('load', () => {
        if (window.performance && window.performance.timing) {
          const timing = window.performance.timing;
          const loadTime = timing.loadEventEnd - timing.navigationStart;
          logger.info('Page load completed', { loadTime });
        }
      });
    }

    getStatus() {
      return {
        version: '3.0',
        sessionId: STATE.sessionId,
        uptime: Date.now() - STATE.startTime,
        initialized: STATE.initialized,
        scriptLoaded: STATE.scriptLoaded,
        adsenseReady: STATE.adsenseReady,
        autoAdsInitialized: STATE.autoAdsInitialized,
        adBlockerDetected: STATE.adBlockerDetected,
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

    async forcePushAds() {
      logger.info('Force pushing all ads');
      
      if (CONFIG.AUTO_ADS_ENABLED && !STATE.autoAdsInitialized) {
        await this.adManager.initializeAutoAds();
      }

      const ads = Array.from(STATE.adRegistry.values()).filter(ad => 
        (ad.status === 'discovered' || ad.status === 'failed') && 
        !ad.element.hasAttribute('data-ads-loaded') &&
        !ad.element.hasAttribute('data-ad-processing')
      );
      
      ads.forEach(ad => this.adManager.queueAdPush(ad));
      await this.adManager.processPushQueue();
      
      const successCount = ads.filter(ad => ad.status === 'loaded').length;
      logger.info('Force push completed', { attempted: ads.length, successful: successCount });
      
      await this.adScanner.scanForNewAds();
      
      return { attempted: ads.length, successful: successCount };
    }

    destroy() {
      logger.info('Destroying AdSense Controller');
      
      this.healthMonitor.stop();
      this.adScanner.destroy();
      
      STATE.timers.forEach(timer => {
        clearTimeout(timer);
        clearInterval(timer);
      });
      STATE.timers.clear();
      
      STATE.intervals.forEach(interval => clearInterval(interval));
      STATE.intervals.clear();
      
      STATE.observers.forEach(observer => {
        if (observer && observer.disconnect) {
          observer.disconnect();
        }
      });
      STATE.observers.clear();
      
      STATE.adRegistry.forEach(ad => {
        AdUtils.removeLoadingPlaceholder(ad.element);
      });
      
      STATE.adRegistry.clear();
      STATE.loadQueue.clear();
      STATE.processingQueue.clear();
      STATE.healthCheckQueue.clear();
      
      this.initialized = false;
      delete window.AdSenseOptimizer;
      
      logger.info('AdSense Controller destroyed');
    }
  }

  // Initialize the optimized AdSense loader
  async function initializeAdSenseOptimizer() {
    try {
      const controller = new AdSenseController();
      await controller.initialize();
      
      window.AdSenseOptimizer = {
        version: '3.0',
        getStatus: () => controller.getStatus(),
        forcePushAds: () => controller.forcePushAds(),
        destroy: () => controller.destroy(),
        getMetrics: () => STATE.metrics,
        getNetworkInfo: () => AdUtils.getNetworkInfo(),
        getLogs: () => logger.logHistory.slice(-20),
        getFailedAds: () => Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'failed'),
        retryFailedAds: () => controller.healthMonitor.checkFailedAds()
      };
      
      logger.info('🎉 AdSense Optimizer v3.0 ready and available globally');
      return controller;
    } catch (error) {
      logger.error('Failed to initialize AdSense Optimizer', { error: error.message });
      throw error;
    }
  }

  // Auto-initialize with multiple triggers
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
    
    initPromise = initializeAdSenseOptimizer();
    return initPromise;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tryInitialize('domReady'));
  } else {
    setTimeout(() => tryInitialize('domReady'), 50);
  }

  window.addEventListener('load', () => {
    if (!initPromise) {
      setTimeout(() => tryInitialize('windowLoad'), 100);
    }
  });

  setTimeout(() => {
    if (!initPromise) {
      logger.warn('Fallback timeout initialization trigger');
      tryInitialize('timeout');
    }
  }, 5000);

  // Global error handling
  window.addEventListener('error', function(event) {
    if (event.filename && (event.filename.includes('adsbygoogle') || event.filename.includes('googlesyndication'))) {
      logger.warn('AdSense script error caught', { 
        message: event.message,
        filename: event.filename,
        lineno: event.lineno
      });
      STATE.adBlockerDetected = true;
      event.preventDefault();
      return false;
    }
  });

  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && 
        event.reason.message.toLowerCase().includes('ad')) {
      logger.warn('Ad-related promise rejection caught', { 
        reason: event.reason.message 
      });
      STATE.adBlockerDetected = true;
      event.preventDefault();
    }
  });

})();
