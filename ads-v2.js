(function() {
  'use strict';

  // Optimized AdSense Configuration
  const CONFIG = {
    CLIENT_ID: 'ca-pub-7407983524344370',
    SCRIPT_URL: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    AD_SELECTOR: '.lazy-ads, ins.adsbygoogle',
    LAZY_LOAD_MARGIN: '200px',
    LOAD_DELAY: 5000, // 5 seconds or on scroll
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000,
    PERFORMANCE_BUDGET: 3000, // 3 seconds max load time
    
    // Performance thresholds
    CRITICAL_LOAD_TIME: 1500,
    TARGET_SUCCESS_RATE: 95,
    INTERSECTION_THRESHOLD: 0.1
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
    sessionId: `ads_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    
    adRegistry: new Map(),
    loadQueue: new Set(),
    processingQueue: new Set(),
    
    observers: new Set(),
    timers: new Set(),
    
    metrics: {
      avgLoadTime: 0,
      successRate: 0,
      errorRate: 0
    }
  };

  // Enhanced Logger
  class AdLogger {
    constructor() {
      this.levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
      this.currentLevel = 1; // INFO level
      this.logHistory = [];
    }

    log(level, message, data = {}) {
      const timestamp = Date.now();
      const logEntry = {
        timestamp,
        level,
        message,
        data,
        sessionId: STATE.sessionId
      };

      if (this.levels[level] >= this.currentLevel) {
        const formattedTime = new Date(timestamp).toISOString();
        const prefix = `[AdSense-Optimizer ${formattedTime}] [${level}]`;
        console[level.toLowerCase()] || console.log(`${prefix} ${message}`, data);
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

      while (!conditions.every(condition => condition())) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Additional delay for stability
      await new Promise(resolve => setTimeout(resolve, 300));
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
      const status = element.getAttribute('data-adsbygoogle-status');
      const hasIframe = element.querySelector('iframe') !== null;
      const hasContent = element.innerHTML.trim().length > 100;
      const hasVisibleContent = element.offsetWidth > 0 && element.offsetHeight > 0;
      
      return status === 'done' || hasIframe || (hasContent && hasVisibleContent);
    }

    static preventLayoutShift(element) {
      const rect = element.getBoundingClientRect() || {};
      const width = rect.width || element.offsetWidth || 320;
      const height = rect.height || element.offsetHeight || 250;
      
      // Set minimum dimensions to prevent layout shift
      if (!element.style.width && width < 300) {
        element.style.width = '100%';
        element.style.maxWidth = '728px';
      }
      
      if (!element.style.height && height < 200) {
        element.style.minHeight = '250px';
      }
      
      // Add container styles for better rendering
      element.style.display = 'block';
      element.style.position = 'relative';
      
      logger.debug('Layout shift prevention applied', { width, height });
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
        
        // Fallback initialization
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
        script.src = `${CONFIG.SCRIPT_URL}?client=${CONFIG.CLIENT_ID}`;
        
        const timeout = setTimeout(() => {
          reject(new Error('Script load timeout'));
        }, CONFIG.PERFORMANCE_BUDGET);

        script.onload = () => {
          clearTimeout(timeout);
          resolve();
        };

        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Script load error'));
        };

        document.head.appendChild(script);
      });
    }

    async verifyScriptIntegrity() {
      let attempts = 0;
      while (typeof window.adsbygoogle === 'undefined' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (typeof window.adsbygoogle === 'undefined') {
        throw new Error('AdSense script not properly loaded');
      }
      
      logger.debug('Script integrity verified');
    }

    async initializeFallback() {
      // Initialize minimal adsbygoogle array
      if (!window.adsbygoogle) {
        window.adsbygoogle = [];
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

  // Advanced Ad Manager with Lazy Loading
  class AdManager {
    constructor() {
      this.loadedAds = new Set();
      this.failedAds = new Set();
      this.retryEngine = new RetryEngine();
      this.performanceProfiler = new PerformanceProfiler();
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
          attributes: this.extractAdAttributes(element),
          visibility: AdUtils.calculateVisibility(element),
          priority: this.calculatePriority(element),
          status: 'discovered',
          attempts: 0,
          timestamp: Date.now()
        };
        
        STATE.adRegistry.set(adId, adData);
        return adData;
      });

      STATE.totalAds = ads.length;
      logger.info('Ad discovery completed', { totalAds: STATE.totalAds });
      return ads;
    }

    extractAdAttributes(element) {
      const attributes = {};
      for (const attr of element.attributes) {
        if (attr.name.startsWith('data-ad-')) {
          attributes[attr.name] = attr.value;
        }
      }
      return attributes;
    }

    calculatePriority(element) {
      const rect = element.getBoundingClientRect();
      const visibility = AdUtils.calculateVisibility(element);
      
      let priority = 50; // Base priority
      
      // Viewport bonus
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        priority += 30;
      }
      
      // Size bonus
      const area = rect.width * rect.height;
      if (area > 300 * 250) priority += 20;
      if (area > 728 * 90) priority += 15;
      
      // Visibility bonus
      priority += visibility * 20;
      
      // Position bonus (above the fold gets higher priority)
      if (rect.top < window.innerHeight / 2) priority += 25;
      
      return Math.min(100, Math.max(1, priority));
    }

    async loadAd(adData) {
      const startTime = Date.now();
      this.performanceProfiler.startProfiling(adData.id);
      
      try {
        logger.debug('Loading ad', { adId: adData.id, priority: adData.priority });
        
        // Prevent layout shift
        AdUtils.preventLayoutShift(adData.element);
        
        // Ensure required attributes
        this.ensureAdAttributes(adData.element);
        
        // Load the ad
        await this.executeAdLoad(adData);
        
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
        
        if (this.retryEngine.shouldRetry(adData.id, error)) {
          const delay = this.retryEngine.calculateDelay(adData.attempts);
          logger.warn('Ad load failed, retrying', { 
            adId: adData.id, 
            error: error.message, 
            retryDelay: delay 
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.loadAd(adData);
        }
        
        this.handleLoadFailure(adData, error, loadTime);
        return false;
      } finally {
        this.performanceProfiler.stopProfiling(adData.id);
      }
    }

    ensureAdAttributes(element) {
      if (!element.hasAttribute('data-ad-client')) {
        element.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
      }
      
      if (!element.hasAttribute('data-ad-slot')) {
        // Generate a unique slot ID if missing
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
    }

    async executeAdLoad(adData) {
      return new Promise((resolve, reject) => {
        try {
          adData.status = 'loading';
          adData.attempts++;
          STATE.processingQueue.add(adData.id);
          
          // Push to adsbygoogle queue
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          
          // Set up verification timer
          const timeout = setTimeout(() => {
            this.verifyAdLoad(adData, resolve, reject);
          }, CONFIG.CRITICAL_LOAD_TIME);
          
          // Also check periodically
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
          reject(error);
        }
      });
    }

    verifyAdLoad(adData, resolve, reject) {
      const isLoaded = AdUtils.isAdLoaded(adData.element);
      
      if (isLoaded) {
        resolve();
      } else {
        reject(new Error('Ad failed to load within time limit'));
      }
    }

    handleLoadSuccess(adData, loadTime) {
      adData.status = 'loaded';
      adData.loadTime = loadTime;
      adData.element.setAttribute('data-ads-loaded', 'true');
      
      STATE.loadedAds++;
      this.loadedAds.add(adData.id);
      STATE.processingQueue.delete(adData.id);
      
      this.updateMetrics();
    }

    handleLoadFailure(adData, error, loadTime) {
      adData.status = 'failed';
      adData.error = error.message;
      adData.failureTime = loadTime;
      
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
    }

    shouldRetry(adId, error) {
      const state = this.retryStates.get(adId) || { attempts: 0 };
      state.attempts++;
      this.retryStates.set(adId, state);

      const errorSeverity = this.analyzeError(error);
      const maxRetries = CONFIG.MAX_RETRY_ATTEMPTS;
      
      return state.attempts < maxRetries && errorSeverity > 0.3;
    }

    analyzeError(error) {
      const errorMessage = error.message.toLowerCase();
      const severityMap = {
        'timeout': 0.8,
        'network': 0.9,
        'script': 0.7,
        'load': 0.6
      };
      
      for (const [type, severity] of Object.entries(severityMap)) {
        if (errorMessage.includes(type)) return severity;
      }
      
      return 0.5; // Default severity
    }

    calculateDelay(attempts) {
      const baseDelay = CONFIG.RETRY_DELAY;
      const backoff = Math.pow(1.5, attempts - 1);
      const jitter = Math.random() * 0.3 + 0.85; // 85-115% jitter
      
      return Math.min(baseDelay * backoff * jitter, 10000);
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
        window.performance.mark(startMark);
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
        const endMark = `ad-end-${adId}`;
        window.performance.mark(endMark);
        window.performance.measure(`ad-load-${adId}`, profile.startMark, endMark);
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
      if (this.observer && !this.observedAds.has(adData.id)) {
        this.observer.observe(adData.element);
        this.observedAds.add(adData.id);
        logger.debug('Ad added to lazy load observation', { adId: adData.id });
      }
    }

    async handleIntersection(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const adData = this.findAdData(entry.target);
          if (adData && adData.status === 'discovered') {
            logger.debug('Ad entered viewport, loading', { adId: adData.id });
            
            // Unobserve to prevent multiple loads
            this.observer.unobserve(entry.target);
            this.observedAds.delete(adData.id);
            
            // Load the ad
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

    loadVisibleAds() {
      // Load ads that are immediately visible
      const visibleAds = Array.from(STATE.adRegistry.values()).filter(ad => {
        const rect = ad.element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });

      logger.info('Loading immediately visible ads', { count: visibleAds.length });
      
      return Promise.allSettled(
        visibleAds.map(ad => this.adManager.loadAd(ad))
      );
    }
  }

  // Main Controller
  class AdSenseController {
    constructor() {
      this.scriptLoader = new ScriptLoader();
      this.adManager = new AdManager();
      this.lazyLoadManager = new LazyLoadManager(this.adManager);
      this.initialized = false;
      this.loadTriggered = false;
    }

    async initialize() {
      if (this.initialized) return;
      this.initialized = true;

      logger.info('🚀 AdSense Optimizer v2.0 initializing...');

      try {
        await this.prepareEnvironment();
        await this.setupDelayedLoading();
        
        STATE.initialized = true;
        logger.info('✅ AdSense Optimizer initialized successfully');
      } catch (error) {
        logger.error('Initialization failed', { error: error.message });
        throw error;
      }
    }

    async prepareEnvironment() {
      await AdUtils.waitForPageLoad();
      this.setupObservers();
      this.setupPerformanceMonitoring();
    }

    async setupDelayedLoading() {
      // Set up triggers for delayed loading
      let loadTriggered = false;
      
      const triggerLoad = async () => {
        if (loadTriggered) return;
        loadTriggered = true;
        
        logger.info('Load triggered, starting AdSense initialization');
        await this.executeLoadSequence();
      };

      // Trigger 1: After delay
      setTimeout(triggerLoad, CONFIG.LOAD_DELAY);

      // Trigger 2: On scroll
      const scrollHandler = () => {
        if (!loadTriggered) {
          window.removeEventListener('scroll', scrollHandler, { passive: true });
          triggerLoad();
        }
      };
      window.addEventListener('scroll', scrollHandler, { passive: true });

      // Trigger 3: On user interaction
      const interactionEvents = ['click', 'touchstart', 'keydown'];
      const interactionHandler = () => {
        if (!loadTriggered) {
          interactionEvents.forEach(event => 
            window.removeEventListener(event, interactionHandler, { passive: true })
          );
          triggerLoad();
        }
      };
      interactionEvents.forEach(event => 
        window.addEventListener(event, interactionHandler, { passive: true })
      );
    }

    async executeLoadSequence() {
      try {
        // Load AdSense script
        await this.scriptLoader.loadAdSenseScript();
        
        // Discover ads
        const ads = await this.adManager.discoverAds();
        
        if (ads.length === 0) {
          logger.info('No ads found to load');
          return;
        }

        // Initialize lazy loading
        const lazyLoadSupported = this.lazyLoadManager.initialize();
        
        if (lazyLoadSupported) {
          // Set up lazy loading for all ads
          ads.forEach(ad => this.lazyLoadManager.observeAd(ad));
          
          // Load immediately visible ads
          await this.lazyLoadManager.loadVisibleAds();
        } else {
          // Fallback: load all ads with priority
          const sortedAds = ads.sort((a, b) => b.priority - a.priority);
          for (const ad of sortedAds) {
            await this.adManager.loadAd(ad);
            // Small delay between loads to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        logger.info('Load sequence completed', {
          totalAds: STATE.totalAds,
          loadedAds: STATE.loadedAds,
          successRate: STATE.metrics.successRate.toFixed(1) + '%'
        });

      } catch (error) {
        logger.error('Load sequence failed', { error: error.message });
      }
    }

    setupObservers() {
      // Network status observer
      if ('connection' in navigator) {
        navigator.connection.addEventListener('change', () => {
          const networkInfo = AdUtils.getNetworkInfo();
          logger.info('Network status changed', networkInfo);
        });
      }

      // Page visibility observer
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          logger.debug('Page became visible');
        }
      });
    }

    setupPerformanceMonitoring() {
      // Monitor Core Web Vitals
      if ('web-vital' in window) {
        // This would integrate with web-vitals library if available
        logger.debug('Performance monitoring setup completed');
      }

      // Simple performance tracking
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
        version: '2.0',
        sessionId: STATE.sessionId,
        uptime: Date.now() - STATE.startTime,
        initialized: STATE.initialized,
        scriptLoaded: STATE.scriptLoaded,
        adsenseReady: STATE.adsenseReady,
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
      logger.info('Force loading all discovered ads');
      const ads = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'discovered' || ad.status === 'failed'
      );
      
      const results = await Promise.allSettled(
        ads.map(ad => this.adManager.loadAd(ad))
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
      logger.info('Force load completed', { attempted: ads.length, successful: successCount });
      
      return { attempted: ads.length, successful: successCount };
    }

    destroy() {
      logger.info('Destroying AdSense Controller');
      
      // Clear all timers
      STATE.timers.forEach(timer => {
        if (typeof timer === 'number') {
          clearTimeout(timer);
          clearInterval(timer);
        }
      });
      STATE.timers.clear();
      
      // Disconnect all observers
      STATE.observers.forEach(observer => {
        if (observer && observer.disconnect) {
          observer.disconnect();
        }
      });
      STATE.observers.clear();
      
      // Clear state
      STATE.adRegistry.clear();
      STATE.loadQueue.clear();
      STATE.processingQueue.clear();
      
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
      
      // Expose global API
      window.AdSenseOptimizer = {
        version: '2.0',
        getStatus: () => controller.getStatus(),
        forceLoadAll: () => controller.forceLoadAll(),
        destroy: () => controller.destroy(),
        
        // Advanced methods
        getMetrics: () => STATE.metrics,
        getNetworkInfo: () => AdUtils.getNetworkInfo(),
        getLogs: () => logger.logHistory.slice(-20)
      };
      
      logger.info('🎉 AdSense Optimizer v2.0 ready and available globally');
      return controller;
    } catch (error) {
      logger.error('Failed to initialize AdSense Optimizer', { error: error.message });
      throw error;
    }
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdSenseOptimizer);
  } else {
    // DOM already loaded
    setTimeout(initializeAdSenseOptimizer, 100);
  }

  // Backup initialization on window load
  window.addEventListener('load', () => {
    if (!window.AdSenseOptimizer) {
      setTimeout(initializeAdSenseOptimizer, 500);
    }
  });

  // Global error handling to ensure stability
  window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('adsbygoogle')) {
      logger.warn('AdSense script error caught', { 
        message: event.message,
        filename: event.filename,
        lineno: event.lineno
      });
      // Prevent error from breaking the page
      event.preventDefault();
      return false;
    }
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && 
        event.reason.message.toLowerCase().includes('ad')) {
      logger.warn('Ad-related promise rejection caught', { 
        reason: event.reason.message 
      });
      event.preventDefault();
    }
  });

})();
