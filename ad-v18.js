(function () {
  'use strict';

  // Configuration
  const CONFIG = {
    CLIENT_ID: 'ca-pub-7407983524344370',
    SCRIPT_URL: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    AD_SELECTOR: '.lazy-ads, .adsbygoogle, [data-ad-client]',
    RELOAD_INTERVAL: 5000,
    RELOAD_MAX_ATTEMPTS: 5,
    INTEGRITY_CHECK_INTERVAL: 3000,
    MIN_AD_WIDTH: 250,
    MIN_AD_HEIGHT: 100,
    ADAPTIVE_CONFIG: {
      MAX_RETRIES: { min: 5, max: 20, current: 10 },
      RETRY_INTERVAL: { min: 2000, max: 10000, current: 4000 },
      BATCH_SIZE: { min: 1, max: 5, current: 3 },
      TIMEOUT: { min: 10000, max: 30000, current: 15000 },
    },
    PERFORMANCE: {
      CRITICAL_LOAD_TIME: 3000,
      TARGET_SUCCESS_RATE: 95,
      MAX_MEMORY_USAGE: 80 * 1024 * 1024,
      MAX_CONCURRENT_LOADS: 3,
    },
    FEATURES: {
      AI_OPTIMIZATION: true,
      PREDICTIVE_LOADING: true,
      QUANTUM_RETRY: true,
      REAL_TIME_MONITORING: true,
      AUTO_HEALING: true,
      PERIODIC_RELOAD: true,
      WIDTH_VALIDATION: true,
    },
  };

  // State Management
  const STATE = {
    scriptLoaded: false,
    scriptLoading: false,
    adsenseReady: false,
    isRunning: false,
    pageFullyLoaded: false,
    sessionId: `ads_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    totalAds: 0,
    loadedAds: 0,
    failedAds: 0,
    retryCount: 0,
    reloadCount: 0,
    performanceHistory: [],
    userBehavior: {
      scrollSpeed: 0,
      clickPattern: [],
      viewportTime: [],
      deviceInfo: {},
      engagementScore: 0,
    },
    adRegistry: new Map(),
    processedElements: new WeakSet(),
    loadQueue: new Set(),
    processingQueue: new Set(),
    failureQueue: new Set(),
    successQueue: new Set(),
    reloadQueue: new Map(),
    duplicateTracker: new Set(),
    observers: new Set(),
    timers: new Set(),
    metrics: {
      avgLoadTime: 0,
      successRate: 0,
      errorRate: 0,
      reloadSuccessRate: 0,
      integrityCheckSuccessRate: 0,
      duplicatesPrevented: 0,
    },
  };

  // Logger
  class UltraLogger {
    constructor() {
      this.levels = { TRACE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4, FATAL: 5 };
      this.currentLevel = 1;
      this.logHistory = [];
    }

    log(level, message, data = {}) {
      try {
        const timestamp = Date.now();
        const logEntry = { timestamp, level, message, data, sessionId: STATE.sessionId };
        if (this.levels[level] >= this.currentLevel) {
          const formattedTime = new Date(timestamp).toISOString();
          const prefix = `[AdSense-Ultra-v18.1 ${formattedTime}] [${level}]`;
          console[level.toLowerCase()]?.(`${prefix} ${message}`, data);
        }
        this.logHistory.push(logEntry);
        if (this.logHistory.length > 500) {
          this.logHistory = this.logHistory.slice(-500);
        }
      } catch (error) {
        console.error('Logger error:', error);
      }
    }

    debug(msg, data) { this.log('DEBUG', msg, data); }
    info(msg, data) { this.log('INFO', msg, data); }
    warn(msg, data) { this.log('WARN', msg, data); }
    error(msg, data) { this.log('ERROR', msg, data); }
    fatal(msg, data) { this.log('FATAL', msg, data); }
  }

  const logger = new UltraLogger();

  // AI Utilities
  class AIUtils {
    static async analyzePageContext() {
      try {
        return {
          url: window.location.href,
          title: document.title,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          deviceInfo: this.getDeviceInfo(),
          networkInfo: await this.getNetworkInfo(),
          engagementScore: STATE.userBehavior.engagementScore,
        };
      } catch (error) {
        logger.error('Page context analysis failed', { error: error.message });
        return {};
      }
    }

    static getDeviceInfo() {
      try {
        return {
          platform: navigator.platform,
          hardwareConcurrency: navigator.hardwareConcurrency || 2,
          deviceMemory: navigator.deviceMemory || 4,
        };
      } catch (error) {
        logger.warn('Device info retrieval failed', { error: error.message });
        return {};
      }
    }

    static async getNetworkInfo() {
      try {
        const start = Date.now();
        await fetch('data:text/plain,ping', { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(5000) });
        return {
          online: navigator.onLine,
          latency: Date.now() - start,
          connectionType: navigator.connection?.effectiveType || 'unknown',
        };
      } catch (error) {
        logger.warn('Network info retrieval failed', { error: error.message });
        return { online: false, latency: Infinity, connectionType: 'offline' };
      }
    }

    static predictOptimalLoadTiming(adElement) {
      try {
        const rect = adElement.getBoundingClientRect();
        const scrollSpeed = STATE.userBehavior.scrollSpeed;
        const viewportHeight = window.innerHeight;
        const distanceToViewport = Math.max(0, rect.top - viewportHeight);
        const timeToViewport = scrollSpeed > 0 ? distanceToViewport / scrollSpeed : Infinity;
        return {
          immediate: rect.top < viewportHeight * 1.5,
          predicted: timeToViewport < 5000,
          priority: this.calculateLoadPriority(adElement, timeToViewport),
        };
      } catch (error) {
        logger.warn('Load timing prediction failed', { error: error.message });
        return { immediate: true, predicted: true, priority: 50 };
      }
    }

    static calculateLoadPriority(element, timeToViewport) {
      try {
        let priority = 50;
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight) priority += 40;
        else if (rect.top < window.innerHeight * 2) priority += 20;
        const area = rect.width * rect.height;
        if (area > 300 * 250) priority += 15;
        const scrollPercent = window.pageYOffset / (document.body.scrollHeight - window.innerHeight);
        if (scrollPercent < 0.3) priority += 10;
        if (STATE.userBehavior.engagementScore > 70) priority += 10;
        return Math.min(100, Math.max(0, priority));
      } catch (error) {
        logger.warn('Priority calculation failed', { error: error.message });
        return 50;
      }
    }

    static adaptiveConfig() {
      try {
        const history = STATE.performanceHistory.slice(-10);
        if (history.length < 3) return;
        const avgSuccessRate = history.reduce((sum, h) => sum + h.successRate, 0) / history.length;
        const avgLoadTime = history.reduce((sum, h) => sum + h.loadTime, 0) / history.length;
        if (avgSuccessRate < CONFIG.PERFORMANCE.TARGET_SUCCESS_RATE) {
          CONFIG.ADAPTIVE_CONFIG.MAX_RETRIES.current = Math.min(
            CONFIG.ADAPTIVE_CONFIG.MAX_RETRIES.max,
            CONFIG.ADAPTIVE_CONFIG.MAX_RETRIES.current + 2
          );
          CONFIG.ADAPTIVE_CONFIG.RETRY_INTERVAL.current = Math.min(
            CONFIG.ADAPTIVE_CONFIG.RETRY_INTERVAL.max,
            CONFIG.ADAPTIVE_CONFIG.RETRY_INTERVAL.current + 500
          );
        }
        if (avgLoadTime > CONFIG.PERFORMANCE.CRITICAL_LOAD_TIME) {
          CONFIG.ADAPTIVE_CONFIG.BATCH_SIZE.current = Math.max(
            CONFIG.ADAPTIVE_CONFIG.BATCH_SIZE.min,
            CONFIG.ADAPTIVE_CONFIG.BATCH_SIZE.current - 1
          );
        }
        logger.info('Configuration adapted', { avgSuccessRate, avgLoadTime, newConfig: CONFIG.ADAPTIVE_CONFIG });
      } catch (error) {
        logger.error('Adaptive configuration failed', { error: error.message });
      }
    }
  }

  // Quantum Retry Engine
  class QuantumRetryEngine {
    constructor() {
      this.retryStates = new Map();
    }

    calculateQuantumDelay(attempt, baseDelay) {
      const quantumFactor = Math.random() * 0.3 + 0.85;
      const exponentialBackoff = Math.pow(1.5, attempt);
      return Math.min(baseDelay * exponentialBackoff * quantumFactor, CONFIG.ADAPTIVE_CONFIG.RETRY_INTERVAL.max);
    }

    shouldRetry(adId, error) {
      const state = this.retryStates.get(adId) || { attempts: 0, lastError: null };
      state.attempts++;
      state.lastError = error;
      this.retryStates.set(adId, state);
      const maxRetries = CONFIG.ADAPTIVE_CONFIG.MAX_RETRIES.current;
      const errorSeverity = this.analyzeError(error);
      const quantumProbability = this.calculateRetryProbability(state.attempts, errorSeverity);
      return state.attempts < maxRetries && Math.random() < quantumProbability;
    }

    analyzeError(error) {
      const errorTypes = {
        network: 0.9,
        timeout: 0.8,
        script: 0.7,
        dom: 0.3,
        validation: 0.2,
        width: 0.3,
        duplicate: 0.1,
      };
      const errorMessage = error.message.toLowerCase();
      for (const [type, severity] of Object.entries(errorTypes)) {
        if (errorMessage.includes(type)) return severity;
      }
      return 0.5;
    }

    calculateRetryProbability(attempts, errorSeverity) {
      const baseProbability = errorSeverity;
      const attemptPenalty = Math.pow(0.8, attempts - 1);
      const successRateBonus = STATE.metrics.successRate / 100 * 0.2;
      return Math.max(0.1, baseProbability * attemptPenalty + successRateBonus);
    }
  }

  // Script Loader
  class HyperScriptLoader {
    constructor() {
      this.circuitBreaker = new CircuitBreaker();
    }

    async loadScript() {
      if (STATE.scriptLoaded) return true;
      if (STATE.scriptLoading) return this.waitForScript();
      STATE.scriptLoading = true;
      logger.info('Initiating script loading');
      try {
        if (!this.circuitBreaker.allowRequest()) {
          throw new Error('Circuit breaker is open');
        }
        const script = await this.createOptimizedScript(CONFIG.SCRIPT_URL);
        await this.attemptLoad(script);
        await this.verifyScriptIntegrity();
        STATE.scriptLoaded = true;
        STATE.adsenseReady = true;
        this.circuitBreaker.recordSuccess();
        logger.info('Script loading completed');
        return true;
      } catch (error) {
        this.circuitBreaker.recordFailure();
        logger.error('Script loading failed', { error: error.message });
        throw error;
      } finally {
        STATE.scriptLoading = false;
      }
    }

    async createOptimizedScript(url) {
      const script = document.createElement('script');
      script.src = `${url}?client=${CONFIG.CLIENT_ID}&v=${Date.now()}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
      return script;
    }

    attemptLoad(script) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Script load timeout')), CONFIG.ADAPTIVE_CONFIG.TIMEOUT.current);
        script.onload = () => { clearTimeout(timeout); resolve(); };
        script.onerror = () => { clearTimeout(timeout); reject(new Error('Script load error')); };
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
        window.adsbygoogle = [];
        logger.warn('AdsByGoogle not found, created fallback');
      } else {
        logger.debug('Script integrity verified');
      }
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

  class CircuitBreaker {
    constructor() {
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.lastFailureTime = 0;
      this.threshold = 3;
      this.timeout = 30000;
    }

    allowRequest() {
      if (this.state === 'CLOSED') return true;
      if (this.state === 'OPEN' && Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    recordSuccess() {
      this.state = 'CLOSED';
      this.failureCount = 0;
    }

    recordFailure() {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
      }
    }
  }

  // Ad Manager
  class UltraAdManager {
    constructor() {
      this.quantumRetry = new QuantumRetryEngine();
      this.performanceProfiler = new PerformanceProfiler();
      this.periodicReloadTimer = null;
    }

    async discoverAndAnalyzeAds() {
      const elements = Array.from(document.querySelectorAll(CONFIG.AD_SELECTOR));
      const pageContext = await AIUtils.analyzePageContext();
      const ads = elements
        .map((element, index) => {
          const adId = this.generateUniqueId(element, index);
          if (STATE.processedElements.has(element) || STATE.duplicateTracker.has(adId)) {
            STATE.metrics.duplicatesPrevented++;
            logger.debug('Duplicate ad prevented', { adId });
            return null;
          }
          const adData = {
            id: adId,
            element,
            index,
            rect: element.getBoundingClientRect(),
            attributes: this.extractAdAttributes(element),
            prediction: AIUtils.predictOptimalLoadTiming(element),
            attempts: 0,
            reloadAttempts: 0,
            status: 'discovered',
            timestamp: Date.now(),
          };
          STATE.adRegistry.set(adId, adData);
          STATE.processedElements.add(element);
          STATE.duplicateTracker.add(adId);
          if (adData.status === 'discovered' || adData.status === 'failed') {
            STATE.reloadQueue.set(adId, { attempts: 0, lastAttempt: 0 });
          }
          return adData;
        })
        .filter(Boolean);
      logger.info('Ad discovery completed', { totalAds: ads.length });
      this.startPeriodicReload();
      return ads;
    }

    generateUniqueId(element, index) {
      const baseId = element.id || element.dataset.adId || `ad_${STATE.sessionId}_${index}_${Date.now()}`;
      let counter = 0;
      let uniqueId = baseId;
      while (STATE.duplicateTracker.has(uniqueId)) {
        counter++;
        uniqueId = `${baseId}_${counter}`;
      }
      return uniqueId;
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

    startPeriodicReload() {
      if (this.periodicReloadTimer || !CONFIG.FEATURES.PERIODIC_RELOAD) return;
      this.periodicReloadTimer = setInterval(async () => {
        const now = Date.now();
        const reloadableAds = Array.from(STATE.adRegistry.values()).filter(
          ad =>
            (ad.status === 'discovered' || ad.status === 'failed') &&
            STATE.reloadQueue.has(ad.id) &&
            now - STATE.reloadQueue.get(ad.id).lastAttempt >= CONFIG.RELOAD_INTERVAL &&
            STATE.reloadQueue.get(ad.id).attempts < CONFIG.RELOAD_MAX_ATTEMPTS
        );
        if (reloadableAds.length === 0) return;
        logger.info(`Periodic reload triggered for ${reloadableAds.length} ads`, {
          reloadableAds: reloadableAds.map(ad => ad.id),
        });
        for (const ad of reloadableAds) {
          const reloadData = STATE.reloadQueue.get(ad.id);
          reloadData.attempts++;
          reloadData.lastAttempt = now;
          STATE.reloadQueue.set(ad.id, reloadData);
          STATE.reloadCount++;
          try {
            await this.loadAdWithAI(ad);
          } catch (error) {
            logger.warn(`Periodic reload failed for ad ${ad.id}`, { error: error.message, attempts: reloadData.attempts });
            if (reloadData.attempts >= CONFIG.RELOAD_MAX_ATTEMPTS) {
              STATE.reloadQueue.delete(ad.id);
              logger.error(`Max reload attempts reached for ad ${ad.id}`);
            }
          }
        }
        this.updateMetrics();
      }, CONFIG.RELOAD_INTERVAL);
      STATE.timers.add(this.periodicReloadTimer);
      logger.info('Periodic reload system started', { interval: CONFIG.RELOAD_INTERVAL });
    }

    async loadAdWithAI(adData) {
      const startTime = Date.now();
      try {
        logger.debug(`Ad loading initiated`, { adId: adData.id });
        if (!this.validateAdElement(adData)) {
          throw new Error('Ad validation failed');
        }
        if (!this.validateAdDimensions(adData)) {
          throw new Error('Ad dimensions validation failed');
        }
        if (this.isDuplicateLoad(adData)) {
          throw new Error('Duplicate load prevented');
        }
        await this.optimizeForDevice(adData);
        await this.optimizeForNetwork(adData);
        this.performanceProfiler.startProfiling(adData.id);
        await this.loadWithQuantumRetry(adData);
        const loadTime = Date.now() - startTime;
        this.handleLoadSuccess(adData, loadTime);
        logger.info(`Ad loaded successfully`, { adId: adData.id, loadTime });
        return true;
      } catch (error) {
        const loadTime = Date.now() - startTime;
        this.handleLoadFailure(adData, error, loadTime);
        logger.error(`Ad loading failed`, { adId: adData.id, error: error.message, loadTime });
        if (this.quantumRetry.shouldRetry(adData.id, error)) {
          const delay = this.quantumRetry.calculateQuantumDelay(adData.attempts, CONFIG.ADAPTIVE_CONFIG.RETRY_INTERVAL.current);
          logger.info(`Retry scheduled`, { adId: adData.id, delay, attempt: adData.attempts + 1 });
          setTimeout(() => {
            adData.attempts++;
            this.loadAdWithAI(adData);
          }, delay);
        }
        throw error;
      } finally {
        this.performanceProfiler.stopProfiling(adData.id);
      }
    }

    validateAdElement(adData) {
      const { element } = adData;
      if (!document.contains(element)) {
        logger.warn(`Ad element no longer in DOM`, { adId: adData.id });
        return false;
      }
      const requiredAttrs = ['data-ad-client', 'data-ad-slot'];
      const missingAttrs = requiredAttrs.filter(attr => !element.hasAttribute(attr));
      if (missingAttrs.length > 0) {
        if (!element.hasAttribute('data-ad-client')) {
          element.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
          logger.debug(`Auto-repaired missing data-ad-client`, { adId: adData.id });
        }
        if (missingAttrs.includes('data-ad-slot') && !element.hasAttribute('data-ad-slot')) {
          element.setAttribute('data-ad-slot', `auto-${Date.now()}`);
          logger.debug(`Auto-generated data-ad-slot`, { adId: adData.id });
        }
      }
      return true;
    }

    validateAdDimensions(adData) {
      if (!CONFIG.FEATURES.WIDTH_VALIDATION) return true;
      const { element } = adData;
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      const width = Math.max(rect.width, parseInt(computedStyle.width) || 0, parseInt(element.style.width) || 0);
      const height = Math.max(rect.height, parseInt(computedStyle.height) || 0, parseInt(element.style.height) || 0);
      if (width < CONFIG.MIN_AD_WIDTH) {
        if (element.getAttribute('data-ad-format') === 'fluid') {
          element.style.minWidth = `${CONFIG.MIN_AD_WIDTH}px`;
          element.style.display = 'block';
          logger.debug(`Fixed fluid ad width`, { adId: adData.id, width: CONFIG.MIN_AD_WIDTH });
        } else {
          logger.warn(`Ad width too small`, { adId: adData.id, width, required: CONFIG.MIN_AD_WIDTH });
          return false;
        }
      }
      if (height < CONFIG.MIN_AD_HEIGHT && height > 0) {
        element.style.minHeight = `${CONFIG.MIN_AD_HEIGHT}px`;
        logger.debug(`Fixed ad height`, { adId: adData.id, height: CONFIG.MIN_AD_HEIGHT });
      }
      return true;
    }

    isDuplicateLoad(adData) {
      const status = adData.element.getAttribute('data-adsbygoogle-status');
      if (status && status !== '') {
        STATE.metrics.duplicatesPrevented++;
        logger.warn('Duplicate load attempt prevented', { adId: adData.id, status });
        return true;
      }
      const elementKey = `${adData.element.tagName}_${adData.element.className}_${adData.element.getAttribute('data-ad-slot') || ''}`;
      if (STATE.duplicateTracker.has(elementKey) && adData.status !== 'failed') {
        STATE.metrics.duplicatesPrevented++;
        logger.warn('Duplicate load attempt prevented', { adId: adData.id, elementKey });
        return true;
      }
      STATE.duplicateTracker.add(elementKey);
      return false;
    }

    async optimizeForDevice(adData) {
      try {
        const deviceInfo = STATE.userBehavior.deviceInfo;
        if (deviceInfo.hardwareConcurrency < 4 || (deviceInfo.deviceMemory && deviceInfo.deviceMemory < 4)) {
          adData.element.setAttribute('data-ad-format', 'auto');
          adData.element.setAttribute('data-full-width-responsive', 'true');
          logger.debug(`Device optimization applied`, { adId: adData.id });
        }
      } catch (error) {
        logger.warn('Device optimization failed', { adId: adData.id, error: error.message });
      }
    }

    async optimizeForNetwork(adData) {
      try {
        const networkInfo = await AIUtils.getNetworkInfo();
        if (networkInfo.connectionType === 'slow-2g' || networkInfo.connectionType === '2g' || networkInfo.latency > 500) {
          adData.element.setAttribute('data-ad-format', 'auto');
          adData.element.setAttribute('data-full-width-responsive', 'true');
          logger.debug(`Network optimization applied`, { adId: adData.id });
        }
      } catch (error) {
        logger.warn('Network optimization failed', { adId: adData.id, error: error.message });
      }
    }

    async loadWithQuantumRetry(adData) {
      return new Promise((resolve, reject) => {
        try {
          if (typeof window.adsbygoogle === 'undefined') {
            window.adsbygoogle = [];
          }
          const status = adData.element.getAttribute('data-adsbygoogle-status');
          if (status && status !== '') {
            logger.warn('Element already processed', { adId: adData.id, status });
            reject(new Error('Element already has ads'));
            return;
          }
          adData.element.setAttribute('data-ad-processing', 'true');
          adData.status = 'loading';
          STATE.processingQueue.add(adData.id);
          window.adsbygoogle.push({});
          setTimeout(() => {
            try {
              const status = adData.element.getAttribute('data-adsbygoogle-status');
              const hasIframe = adData.element.querySelector('iframe');
              const hasContent = adData.element.innerHTML.trim().length > 100;
              if (status === 'done' || hasIframe || hasContent) {
                resolve();
              } else {
                reject(new Error('Ad did not render properly'));
              }
            } catch (checkError) {
              reject(checkError);
            }
          }, 3000);
        } catch (error) {
          reject(error);
        }
      });
    }

    handleLoadSuccess(adData, loadTime) {
      adData.status = 'loaded';
      adData.loadTime = loadTime;
      adData.element.setAttribute('data-ad-loaded', 'true');
      adData.element.removeAttribute('data-ad-processing');
      STATE.loadedAds++;
      STATE.successQueue.add(adData.id);
      STATE.processingQueue.delete(adData.id);
      STATE.reloadQueue.delete(adData.id);
      this.updateMetrics();
    }

    handleLoadFailure(adData, error, loadTime) {
      adData.status = 'failed';
      adData.error = error.message;
      adData.loadTime = loadTime;
      adData.element.setAttribute('data-ad-failed', 'true');
      adData.element.removeAttribute('data-ad-processing');
      STATE.failedAds++;
      STATE.failureQueue.add(adData.id);
      STATE.processingQueue.delete(adData.id);
      this.updateMetrics();
    }

    updateMetrics() {
      const total = STATE.loadedAds + STATE.failedAds;
      if (total > 0) {
        STATE.metrics.successRate = (STATE.loadedAds / total) * 100;
        STATE.metrics.errorRate = (STATE.failedAds / total) * 100;
        STATE.metrics.reloadSuccessRate = STATE.reloadCount > 0 ? (STATE.loadedAds / STATE.reloadCount) * 100 : 0;
      }
      STATE.performanceHistory.push({
        timestamp: Date.now(),
        successRate: STATE.metrics.successRate,
        reloadSuccessRate: STATE.metrics.reloadSuccessRate,
        loadTime: this.calculateAverageLoadTime(),
        totalAds: total,
        loadedAds: STATE.loadedAds,
        failedAds: STATE.failedAds,
      });
      if (STATE.performanceHistory.length > 25) {
        STATE.performanceHistory = STATE.performanceHistory.slice(-25);
      }
      if (CONFIG.FEATURES.AI_OPTIMIZATION) {
        AIUtils.adaptiveConfig();
      }
    }

    calculateAverageLoadTime() {
      const loadedAds = Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'loaded');
      if (loadedAds.length === 0) return 0;
      const totalTime = loadedAds.reduce((sum, ad) => sum + (ad.loadTime || 0), 0);
      return totalTime / loadedAds.length;
    }
  }

  // Performance Profiler
  class PerformanceProfiler {
    constructor() {
      this.profiles = new Map();
      this.marks = new Map();
    }

    startProfiling(adId) {
      try {
        const startMark = `ad-start-${adId}-${Date.now()}`;
        if (window.performance?.mark) {
          window.performance.mark(startMark);
        }
        this.marks.set(adId, { start: Date.now(), startMark, endMark: `ad-end-${adId}-${Date.now()}` });
      } catch (error) {
        logger.debug('Performance profiling start failed', { adId, error: error.message });
        this.marks.set(adId, { start: Date.now(), startMark: null, endMark: null });
      }
    }

    stopProfiling(adId) {
      try {
        const marks = this.marks.get(adId);
        if (!marks) return null;
        const endTime = Date.now();
        const duration = endTime - marks.start;
        let performanceEntries = [];
        if (window.performance?.mark && window.performance?.measure && marks.startMark && marks.endMark) {
          try {
            window.performance.mark(marks.endMark);
            window.performance.measure(`ad-load-${adId}`, marks.startMark, marks.endMark);
            performanceEntries = window.performance.getEntriesByName(`ad-load-${adId}`);
          } catch (measureError) {
            logger.debug('Performance measure failed', { adId, error: measureError.message });
          }
        }
        const profile = { adId, duration, startTime: marks.start, endTime, performanceEntries };
        this.profiles.set(adId, profile);
        this.marks.delete(adId);
        logger.debug(`Performance profile completed`, { adId, duration });
        return profile;
      } catch (error) {
        logger.debug('Performance profiling stop failed', { adId, error: error.message });
        return null;
      }
    }
  }

  // Real-Time Monitor
  class RealTimeMonitor {
    constructor() {
      this.metrics = new Map();
      this.alerts = [];
      this.thresholds = {
        successRate: 90,
        averageLoadTime: 5000,
        errorRate: 10,
        memoryUsage: 100 * 1024 * 1024,
        reloadSuccessRate: 80,
      };
    }

    startMonitoring() {
      this.monitoringInterval = setInterval(() => {
        this.collectMetrics();
        this.checkThresholds();
      }, 30000);
      logger.info('Real-time monitoring started');
    }

    collectMetrics() {
      try {
        const timestamp = Date.now();
        const metrics = {
          timestamp,
          successRate: STATE.metrics.successRate,
          errorRate: STATE.metrics.errorRate,
          reloadSuccessRate: STATE.metrics.reloadSuccessRate,
          loadedAds: STATE.loadedAds,
          failedAds: STATE.failedAds,
          totalAds: STATE.totalAds,
        };
        this.metrics.set(timestamp, metrics);
        if (this.metrics.size > 50) {
          const oldest = Math.min(...this.metrics.keys());
          this.metrics.delete(oldest);
        }
      } catch (error) {
        logger.warn('Metrics collection failed', { error: error.message });
      }
    }

    checkThresholds() {
      try {
        const latest = Array.from(this.metrics.values()).pop();
        if (!latest) return;
        if (latest.successRate < this.thresholds.successRate) {
          this.triggerAlert('LOW_SUCCESS_RATE', `Success rate dropped to ${latest.successRate.toFixed(1)}%`);
        }
        if (latest.errorRate > this.thresholds.errorRate) {
          this.triggerAlert('HIGH_ERROR_RATE', `Error rate: ${latest.errorRate.toFixed(1)}%`);
        }
      } catch (error) {
        logger.warn('Threshold checking failed', { error: error.message });
      }
    }

    triggerAlert(type, message) {
      try {
        const alert = { type, message, timestamp: Date.now() };
        this.alerts.push(alert);
        logger.warn(`ALERT: ${type}`, { message });
        if (this.alerts.length > 25) {
          this.alerts = this.alerts.slice(-25);
        }
        if (CONFIG.FEATURES.AUTO_HEALING) {
          this.triggerAutoHealing(type);
        }
      } catch (error) {
        logger.error('Alert triggering failed', { error: error.message });
      }
    }

    triggerAutoHealing(type) {
      try {
        if (type === 'LOW_SUCCESS_RATE' || type === 'HIGH_ERROR_RATE') {
          this.resetFailedAds();
        }
      } catch (error) {
        logger.error('Auto-healing failed', { type, error: error.message });
      }
    }

    resetFailedAds() {
      try {
        const failedAds = Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'failed');
        failedAds.forEach(ad => {
          ad.status = 'discovered';
          ad.attempts = 0;
          ad.reloadAttempts = 0;
          ad.element.removeAttribute('data-ad-failed');
          STATE.reloadQueue.set(ad.id, { attempts: 0, lastAttempt: 0 });
        });
        STATE.failedAds = 0;
        STATE.failureQueue.clear();
        logger.info('Auto-healing: Reset failed ads', { count: failedAds.length });
      } catch (error) {
        logger.error('Failed ads reset error', { error: error.message });
      }
    }

    stopMonitoring() {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }
      logger.info('Real-time monitoring stopped');
    }
  }

  // User Behavior Tracker
  class UserBehaviorTracker {
    constructor() {
      this.tracking = false;
      this.scrollData = [];
      this.clickData = [];
      this.lastScrollTime = Date.now();
      this.lastScrollY = window.pageYOffset;
    }

    startTracking() {
      if (this.tracking) return;
      this.tracking = true;
      this.setupScrollTracking();
      this.setupClickTracking();
      logger.info('User behavior tracking started');
    }

    setupScrollTracking() {
      const trackScroll = this.throttle(() => {
        try {
          const now = Date.now();
          const currentY = window.pageYOffset;
          const timeDiff = now - this.lastScrollTime;
          const distanceDiff = Math.abs(currentY - this.lastScrollY);
          const speed = timeDiff > 0 ? distanceDiff / timeDiff : 0;
          this.scrollData.push({ timestamp: now, position: currentY, speed });
          if (this.scrollData.length > 50) {
            this.scrollData = this.scrollData.slice(-50);
          }
          STATE.userBehavior.scrollSpeed = this.calculateAverageScrollSpeed();
          STATE.userBehavior.engagementScore = this.calculateEngagementScore();
          this.lastScrollTime = now;
          this.lastScrollY = currentY;
        } catch (error) {
          logger.debug('Scroll tracking error', { error: error.message });
        }
      }, 100);
      window.addEventListener('scroll', trackScroll, { passive: true });
    }

    setupClickTracking() {
      const trackClick = event => {
        try {
          this.clickData.push({
            timestamp: Date.now(),
            x: event.clientX,
            y: event.clientY,
            isAd: event.target.closest(CONFIG.AD_SELECTOR) !== null,
          });
          if (this.clickData.length > 25) {
            this.clickData = this.clickData.slice(-25);
          }
          STATE.userBehavior.clickPattern = this.clickData;
          STATE.userBehavior.engagementScore = this.calculateEngagementScore();
        } catch (error) {
          logger.debug('Click tracking error', { error: error.message });
        }
      };
      document.addEventListener('click', trackClick, { passive: true });
    }

    calculateAverageScrollSpeed() {
      if (this.scrollData.length < 2) return 0;
      const recentData = this.scrollData.slice(-10);
      const totalSpeed = recentData.reduce((sum, data) => sum + data.speed, 0);
      return totalSpeed / recentData.length;
    }

    calculateEngagementScore() {
      try {
        const sessionTime = Date.now() - STATE.startTime;
        const scrollActivity = this.scrollData.length;
        const clickActivity = this.clickData.length;
        const timeScore = Math.min(sessionTime / 60000, 1) * 30;
        const scrollScore = Math.min(scrollActivity / 50, 1) * 40;
        const clickScore = Math.min(clickActivity / 20, 1) * 30;
        return Math.min(100, timeScore + scrollScore + clickScore);
      } catch (error) {
        logger.debug('Engagement score calculation failed', { error: error.message });
        return 50;
      }
    }

    throttle(func, limit) {
      let inThrottle;
      return function () {
        if (!inThrottle) {
          func.apply(this, arguments);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    }

    stopTracking() {
      this.tracking = false;
      logger.info('User behavior tracking stopped');
    }
  }

  // Main Controller
  class UltraController {
    constructor() {
      this.scriptLoader = new HyperScriptLoader();
      this.adManager = new UltraAdManager();
      this.monitor = new RealTimeMonitor();
      this.userBehaviorTracker = new UserBehaviorTracker();
    }

    async initialize() {
      if (STATE.isRunning) {
        logger.warn('Ultra controller already running');
        return;
      }
      STATE.isRunning = true;
      logger.info('🚀 AdSense Loader v18.1 initializing...', { sessionId: STATE.sessionId });
      try {
        await this.prepareEnvironment();
        await this.scriptLoader.loadScript();
        this.userBehaviorTracker.startTracking();
        if (CONFIG.FEATURES.REAL_TIME_MONITORING) {
          this.monitor.startMonitoring();
        }
        await this.executeLoadingSequence();
        this.setupObservers();
        logger.info('✅ AdSense Loader v18.1 initialized', {
          loadedAds: STATE.loadedAds,
          totalAds: STATE.totalAds,
          successRate: STATE.metrics.successRate,
        });
      } catch (error) {
        logger.fatal('❌ Initialization failed', { error: error.message });
        throw error;
      }
    }

    async prepareEnvironment() {
      logger.info('Preparing environment...');
      await this.waitForPageLoad();
      STATE.userBehavior.deviceInfo = AIUtils.getDeviceInfo();
      logger.info('Environment preparation completed');
    }

    async waitForPageLoad() {
      logger.debug('Waiting for page load...');
      while (document.readyState !== 'complete') {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await new Promise(resolve => setTimeout(resolve, CONFIG.PERFORMANCE.CRITICAL_LOAD_TIME));
      STATE.pageFullyLoaded = true;
      logger.info('Page load completed');
    }

    async executeLoadingSequence() {
      logger.info('Executing loading sequence...');
      const ads = await this.adManager.discoverAndAnalyzeAds();
      if (ads.length === 0) {
        logger.warn('No ads discovered');
        return;
      }
      STATE.totalAds = ads.length;
      ads.sort((a, b) => b.prediction.priority - a.prediction.priority);
      await this.executeBatchLoading(ads);
    }

    async executeBatchLoading(ads) {
      const batchSize = Math.min(CONFIG.ADAPTIVE_CONFIG.BATCH_SIZE.current, CONFIG.PERFORMANCE.MAX_CONCURRENT_LOADS);
      const batches = [];
      for (let i = 0; i < ads.length; i += batchSize) {
        batches.push(ads.slice(i, i + batchSize));
      }
      logger.info(`Executing ${batches.length} batches`, { totalAds: ads.length, batchSize });
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchStartTime = Date.now();
        const batchPromises = batch.map(ad => this.adManager.loadAdWithAI(ad).catch(error => ({ error, adId: ad.id })));
        const results = await Promise.allSettled(batchPromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && !r.value?.error).length;
        const batchLoadTime = Date.now() - batchStartTime;
        logger.info(`Batch ${i + 1} completed`, {
          batchLoadTime,
          successCount,
          totalInBatch: batch.length,
          successRate: (successCount / batch.length * 100).toFixed(1) + '%',
        });
        if (i < batches.length - 1) {
          const delay = this.calculateDynamicDelay(batchLoadTime, successCount, batch.length);
          if (delay > 0) {
            logger.debug(`Dynamic delay applied`, { delay });
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    calculateDynamicDelay(batchLoadTime, successCount, batchSize) {
      const successRate = successCount / batchSize;
      const baseDelay = CONFIG.ADAPTIVE_CONFIG.RETRY_INTERVAL.current / 10;
      if (successRate < 0.7) return baseDelay * 3;
      if (batchLoadTime > 6000) return baseDelay * 2;
      if (successRate > 0.9 && batchLoadTime < 2000) return 0;
      return baseDelay;
    }

    setupObservers() {
      logger.info('Setting up observers...');
      this.setupMutationObserver();
      this.setupIntersectionObserver();
    }

    setupMutationObserver() {
      if (!window.MutationObserver) return;
      const observer = new MutationObserver(this.debounce(async mutations => {
        let hasNewAds = false;
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE && (node.matches(CONFIG.AD_SELECTOR) || node.querySelector(CONFIG.AD_SELECTOR))) {
                hasNewAds = true;
                break;
              }
            }
          }
        }
        if (hasNewAds) {
          logger.info('New ads detected');
          await this.executeLoadingSequence();
        }
      }, 2000));
      observer.observe(document.body, { childList: true, subtree: true });
      STATE.observers.add(observer);
      logger.debug('Mutation observer setup completed');
    }

    setupIntersectionObserver() {
      if (!window.IntersectionObserver) return;
      const observer = new IntersectionObserver(this.debounce(entries => {
        const visibleAds = entries.filter(entry => entry.isIntersecting);
        if (visibleAds.length > 0) {
          logger.debug(`${visibleAds.length} ads became visible`);
          visibleAds.forEach(entry => {
            const adData = Array.from(STATE.adRegistry.values()).find(ad => ad.element === entry.target);
            if (adData && (adData.status === 'discovered' || adData.status === 'failed')) {
              this.adManager.loadAdWithAI(adData);
            }
          });
        }
      }, 1000), { rootMargin: '200px 0px', threshold: [0, 0.1] });
      document.querySelectorAll(CONFIG.AD_SELECTOR).forEach(ad => observer.observe(ad));
      STATE.observers.add(observer);
      logger.debug('Intersection observer setup completed');
    }

    debounce(func, wait) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    getUltraStatus() {
      return {
        sessionId: STATE.sessionId,
        uptime: Date.now() - STATE.startTime,
        state: {
          scriptLoaded: STATE.scriptLoaded,
          adsenseReady: STATE.adsenseReady,
          isRunning: STATE.isRunning,
          pageFullyLoaded: STATE.pageFullyLoaded,
        },
        ads: {
          total: STATE.totalAds,
          loaded: STATE.loadedAds,
          failed: STATE.failedAds,
          successRate: STATE.metrics.successRate.toFixed(2) + '%',
        },
      };
    }

    async forceReload() {
      logger.info('🔄 Force reload initiated');
      STATE.loadedAds = 0;
      STATE.failedAds = 0;
      STATE.retryCount = 0;
      STATE.reloadCount = 0;
      STATE.adRegistry.clear();
      STATE.processedElements = new WeakSet();
      STATE.processingQueue.clear();
      STATE.failureQueue.clear();
      STATE.successQueue.clear();
      STATE.reloadQueue.clear();
      STATE.duplicateTracker.clear();
      document.querySelectorAll(CONFIG.AD_SELECTOR).forEach(ad => {
        ['data-ad-loaded', 'data-ad-failed', 'data-ad-processing', 'data-adsbygoogle-status'].forEach(attr => ad.removeAttribute(attr));
      });
      await this.executeLoadingSequence();
      logger.info('✅ Force reload completed');
    }

    destroy() {
      logger.info('🛑 Destroying AdSense Loader...');
      STATE.isRunning = false;
      this.monitor.stopMonitoring();
      this.userBehaviorTracker.stopTracking();
      STATE.timers.forEach(timer => clearTimeout(timer) || clearInterval(timer));
      STATE.timers.clear();
      STATE.observers.forEach(observer => observer.disconnect());
      STATE.observers.clear();
      logger.info('✅ AdSense Loader destroyed');
    }
  }

  const ultraController = new UltraController();

  // Event Listeners
  const setupEventListeners = () => {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && STATE.failedAds > 0) {
        logger.info('Page visible, retrying failed ads');
        ultraController.executeLoadingSequence();
      }
    });
    window.addEventListener('online', () => {
      logger.info('Network online, resuming operations');
      ultraController.executeLoadingSequence();
    });
    window.addEventListener('error', event => {
      logger.error('Global error detected', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
      });
    });
    window.addEventListener('unhandledrejection', event => {
      logger.error('Unhandled promise rejection', { reason: event.reason });
    });
  };

  // Global API
  window.UltraAdSenseLoader = {
    getStatus: () => ultraController.getUltraStatus(),
    forceReload: () => ultraController.forceReload(),
    destroy: () => ultraController.destroy(),
    restart: async () => {
      ultraController.destroy();
      await new Promise(resolve => setTimeout(resolve, 1000));
      return ultraController.initialize();
    },
  };

  // Auto-Initialization
  const autoInitialize = () => {
    const initialize = () => {
      if (!STATE.isRunning) {
        ultraController.initialize().catch(error => {
          logger.fatal('Auto-initialization failed', { error: error.message });
        });
      }
    };
    if (document.readyState === 'complete') {
      setTimeout(initialize, 500);
    } else {
      document.addEventListener('DOMContentLoaded', () => setTimeout(initialize, 500), { once: true });
    }
  };

  setupEventListeners();
  autoInitialize();

  logger.info('🎯 AdSense Loader v18.1 loaded', { sessionId: STATE.sessionId });
})();
