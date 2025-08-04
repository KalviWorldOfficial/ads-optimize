(function() {
  'use strict';

  // AdSense Optimizer v60.71 - Ultimate Loading Engine
  const CONFIG = {
    CLIENT_ID: 'ca-pub-7407983524344370',
    SCRIPT_URL: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    AD_SELECTOR: '.lazy-ads, ins.adsbygoogle, .adsense-unit, [data-ad-client], .ads-container ins, .adsbygoogle, [data-ad-slot], div[id*="ad"], div[class*="ad-"]',
    LAZY_LOAD_MARGIN: '200px',
    LOAD_DELAY: 800,
    MANDATORY_CHECK_INTERVAL: 4000,
    MAX_RETRY_ATTEMPTS: 8,
    RETRY_DELAY: 1500,
    BATCH_SIZE: 1,
    BATCH_DELAY: 1200,
    INTERSECTION_THRESHOLD: 0.05,
    AUTO_ADS_ENABLED: true,
    MOBILE_BREAKPOINT: 768,
    SCRIPT_TIMEOUT: 12000,
    AD_LOAD_TIMEOUT: 18000,
    DEBUG_MODE: true,
    FORCE_LOAD_ALL: true,
    PRECONNECT_DOMAINS: [
      'https://pagead2.googlesyndication.com',
      'https://googleads.g.doubleclick.net',
      'https://tpc.googlesyndication.com',
      'https://partner.googleadservices.com',
      'https://securepubads.g.doubleclick.net'
    ]
  };

  // Enhanced State Management
  const STATE = {
    scriptLoaded: false,
    scriptLoading: false,
    initialized: false,
    autoAdsInitialized: false,
    autoAdsPushed: 0,
    mandatoryCheckActive: false,
    totalAds: 0,
    loadedAds: 0,
    failedAds: 0,
    sessionId: `ads_v6071_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    adRegistry: new Map(),
    processingQueue: new Set(),
    deviceType: window.innerWidth <= CONFIG.MOBILE_BREAKPOINT ? 'mobile' : 'desktop',
    connectionSpeed: navigator.connection ? navigator.connection.effectiveType : 'unknown',
    mandatoryTimer: null,
    autoAdsTimer: null,
    loadingStats: {
      scriptLoadTime: 0,
      firstAdLoadTime: 0,
      totalLoadTime: 0,
      mandatoryChecks: 0,
      forcedLoads: 0,
      autoAdsAttempts: 0
    },
    isPageVisible: !document.hidden
  };

  // Enhanced Logger with Performance Tracking
  const logger = {
    log: (level, msg, data) => {
      const timestamp = new Date().toISOString();
      const style = {
        info: 'color: #4285f4; font-weight: bold;',
        success: 'color: #0f9d58; font-weight: bold;',
        warn: 'color: #ff9800; font-weight: bold;',
        error: 'color: #f44336; font-weight: bold;',
        debug: 'color: #9c27b0;'
      };
      
      if (CONFIG.DEBUG_MODE || level === 'error' || level === 'warn') {
        console.log(`%c[AdSense v60.71] ${level.toUpperCase()}: ${msg}`, 
                   style[level] || '', data || '');
      }
    },
    info: (msg, data) => logger.log('info', msg, data),
    success: (msg, data) => logger.log('success', msg, data),
    warn: (msg, data) => logger.log('warn', msg, data),
    error: (msg, data) => logger.log('error', msg, data),
    debug: (msg, data) => logger.log('debug', msg, data),
    performance: (msg, time) => logger.info(`⏱️ ${msg}: ${Math.round(time)}ms`)
  };

  // Device Detection & Optimization
  class DeviceDetector {
    static detect() {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth || document.documentElement.clientWidth;
      
      STATE.deviceType = width <= CONFIG.MOBILE_BREAKPOINT || 
                        /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent) ? 
                        'mobile' : 'desktop';
      
      if (navigator.connection) {
        const conn = navigator.connection;
        STATE.connectionSpeed = conn.effectiveType || conn.type || 'unknown';
      }
      
      logger.info(`Device: ${STATE.deviceType}, Connection: ${STATE.connectionSpeed}, Width: ${width}px`);
      return STATE.deviceType;
    }

    static isMobile() {
      return STATE.deviceType === 'mobile';
    }

    static isSlowConnection() {
      return ['slow-2g', '2g'].includes(STATE.connectionSpeed);
    }

    static getOptimalBatchSize() {
      if (this.isSlowConnection()) return 1;
      return this.isMobile() ? 1 : 2;
    }
  }

  // Enhanced Ad Utilities with Better Loading Detection
  class AdUtils {
    static async waitForPageLoad() {
      if (document.readyState === 'complete') {
        logger.debug('Page already loaded');
        return Promise.resolve();
      }
      
      logger.info('Waiting for page load...');
      return new Promise(resolve => {
        const checkReady = () => {
          if (document.readyState === 'complete') {
            logger.success('Page loaded successfully');
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', checkReady, { once: true });
        } else {
          checkReady();
        }
      });
    }

    static generateAdId(element, index) {
      return element.id || 
             element.dataset.adId || 
             element.getAttribute('data-ad-slot') || 
             element.className.split(' ').find(c => c.includes('ad')) ||
             `auto_ad_${index}_${Date.now()}`;
    }

    static isAdLoaded(element) {
      try {
        // Comprehensive ad loading checks
        const checks = [
          element.getAttribute('data-adsbygoogle-status') === 'done',
          element.getAttribute('data-ads-loaded') === 'true',
          element.querySelector('iframe[src*="googleads"]') !== null,
          element.querySelector('iframe[src*="googlesyndication"]') !== null,
          element.querySelector('iframe[src*="doubleclick"]') !== null,
          element.innerHTML.includes('google_ads_iframe'),
          element.innerHTML.includes('google-ads-placeholder'),
          element.childElementCount > 0 && element.innerHTML.trim().length > 200,
          element.querySelector('ins[data-adsbygoogle-status="done"]') !== null,
          element.querySelector('[data-google-query-id]') !== null,
          element.offsetHeight > 50 && element.offsetWidth > 50 && element.innerHTML.trim().length > 100
        ];
        
        return checks.some(check => check);
      } catch (error) {
        logger.warn('Ad load check failed', error.message);
        return false;
      }
    }

    static ensureAdContainer(element) {
      try {
        if (!element.classList.contains('adsbygoogle')) {
          element.classList.add('adsbygoogle');
        }

        const rect = element.getBoundingClientRect();
        let width = rect.width || parseInt(getComputedStyle(element).width) || 320;
        let height = rect.height || parseInt(getComputedStyle(element).height) || 100;

        if (DeviceDetector.isMobile()) {
          width = Math.min(width, window.innerWidth - 20);
          height = Math.max(height, 50);
        } else {
          width = Math.min(width, 970);
          height = Math.max(height, 90);
        }

        Object.assign(element.style, {
          display: 'block',
          minWidth: `${width}px`,
          minHeight: `${height}px`,
          margin: '10px auto',
          textAlign: 'center',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none'
        });

        logger.debug(`Ad container prepared: ${width}x${height}px`);
      } catch (error) {
        logger.warn('Failed to prepare ad container', error.message);
      }
    }

    static addLoadingIndicator(element) {
      if (element.querySelector('.ad-loading-indicator')) return;
      
      const loader = document.createElement('div');
      loader.className = 'ad-loading-indicator';
      loader.innerHTML = `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 999;
          background: rgba(255,255,255,0.95);
          padding: 15px 20px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          text-align: center;
          min-width: 150px;
          border: 1px solid #e0e0e0;
        ">
          <div style="
            width: 24px;
            height: 24px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #4285f4;
            border-radius: 50%;
            animation: adSpin 1s linear infinite;
            margin: 0 auto 8px;
          "></div>
          <div style="
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            color: #666;
            font-weight: 500;
          ">Loading Ad...</div>
        </div>
      `;
      
      if (!document.querySelector('#ad-loading-styles')) {
        const style = document.createElement('style');
        style.id = 'ad-loading-styles';
        style.textContent = `
          @keyframes adSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
      
      element.appendChild(loader);
    }

    static removeLoadingIndicator(element) {
      const loader = element.querySelector('.ad-loading-indicator');
      if (loader) {
        loader.style.transition = 'opacity 0.3s ease';
        loader.style.opacity = '0';
        setTimeout(() => {
          if (loader.parentNode) loader.remove();
        }, 300);
      }
    }

    static markAdAsLoaded(element, method = 'standard') {
      element.setAttribute('data-ads-loaded', 'true');
      element.setAttribute('data-load-method', method);
      element.setAttribute('data-load-time', Date.now().toString());
      this.removeLoadingIndicator(element);
      logger.success(`Ad loaded successfully via ${method}`);
    }
  }

  // Network Optimization Engine
  class NetworkOptimizer {
    static preconnect() {
      logger.info('Establishing network preconnections...');
      const fragment = document.createDocumentFragment();
      
      CONFIG.PRECONNECT_DOMAINS.forEach(domain => {
        if (!document.querySelector(`link[href="${domain}"]`)) {
          const link = document.createElement('link');
          link.rel = 'preconnect';
          link.href = domain;
          link.crossOrigin = 'anonymous';
          fragment.appendChild(link);
        }
      });
      
      if (fragment.children.length > 0) {
        document.head.appendChild(fragment);
        logger.success(`${fragment.children.length} preconnections established`);
      }
    }

    static prefetchResources() {
      if (DeviceDetector.isSlowConnection()) {
        logger.warn('Skipping prefetch on slow connection');
        return;
      }

      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.href = CONFIG.SCRIPT_URL;
      prefetchLink.as = 'script';
      document.head.appendChild(prefetchLink);
      
      logger.info('AdSense script prefetched');
    }

    static optimizeDNS() {
      const dnsLink = document.createElement('link');
      dnsLink.rel = 'dns-prefetch';
      dnsLink.href = '//pagead2.googlesyndication.com';
      document.head.appendChild(dnsLink);
    }
  }

  // Enhanced Script Loader with Better Error Handling
  class ScriptLoader {
    static async loadAdSenseScript() {
      if (STATE.scriptLoaded) {
        logger.debug('AdSense script already loaded');
        return true;
      }
      
      if (STATE.scriptLoading) {
        logger.debug('Script loading in progress, waiting...');
        return this.waitForScript();
      }

      const startTime = performance.now();
      STATE.scriptLoading = true;
      logger.info('Loading AdSense script...');

      try {
        await this.createScript();
        await this.verifyScript();
        await this.initializeAdsByGoogle();
        
        STATE.scriptLoaded = true;
        STATE.loadingStats.scriptLoadTime = performance.now() - startTime;
        
        logger.performance('AdSense script loaded', STATE.loadingStats.scriptLoadTime);
        return true;
        
      } catch (error) {
        logger.error('Script loading failed, using fallback', error.message);
        this.initializeFallback();
        return true;
      } finally {
        STATE.scriptLoading = false;
      }
    }

    static createScript() {
      return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src*="adsbygoogle.js"]`);
        if (existingScript) {
          existingScript.remove();
        }

        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.src = `${CONFIG.SCRIPT_URL}?client=${CONFIG.CLIENT_ID}`;
        script.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
        script.setAttribute('crossorigin', 'anonymous');
        
        const timeout = setTimeout(() => {
          script.remove();
          reject(new Error('Script load timeout'));
        }, CONFIG.SCRIPT_TIMEOUT);

        script.onload = () => {
          clearTimeout(timeout);
          logger.success('AdSense script downloaded');
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

    static async verifyScript() {
      logger.info('Verifying AdSense script...');
      let attempts = 0;
      const maxAttempts = DeviceDetector.isSlowConnection() ? 200 : 150;
      
      while (typeof window.adsbygoogle === 'undefined' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      if (typeof window.adsbygoogle === 'undefined') {
        throw new Error('AdSense script verification failed');
      }
      
      logger.success('AdSense script verified');
    }

    static async initializeAdsByGoogle() {
      if (!Array.isArray(window.adsbygoogle)) {
        window.adsbygoogle = [];
      }
      
      try {
        const testConfig = { test: 'initialization' };
        window.adsbygoogle.push(testConfig);
        logger.success('AdsByGoogle array initialized');
      } catch (error) {
        logger.warn('AdsByGoogle initialization test failed', error.message);
      }
    }

    static initializeFallback() {
      window.adsbygoogle = window.adsbygoogle || [];
      STATE.scriptLoaded = true;
      logger.warn('Fallback initialization completed');
    }

    static async waitForScript() {
      let attempts = 0;
      const maxAttempts = 200;
      
      while (STATE.scriptLoading && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      return STATE.scriptLoaded;
    }
  }

  // Ultimate Auto Ads Manager with Enhanced Monitoring
  class UltimateAutoAdsManager {
    static async initialize() {
      if (!CONFIG.AUTO_ADS_ENABLED || STATE.autoAdsInitialized) {
        logger.info('Auto Ads already initialized or disabled');
        return;
      }

      logger.info('🤖 Initializing Ultimate Auto Ads...');

      try {
        if (!STATE.scriptLoaded) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        await this.performAutoAdsPushes();
        this.setupContinuousMonitoring();
        
        STATE.autoAdsInitialized = true;
        logger.success('Ultimate Auto Ads initialized');

      } catch (error) {
        logger.error('Auto Ads initialization failed', error.message);
        setTimeout(() => this.initialize(), 5000);
      }
    }

    static async performAutoAdsPushes() {
      const configurations = this.getAutoAdsConfigs();
      
      logger.info(`Pushing ${configurations.length} auto ads configurations...`);

      for (let i = 0; i < configurations.length; i++) {
        setTimeout(() => {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push(configurations[i]);
            STATE.autoAdsPushed++;
            STATE.loadingStats.autoAdsAttempts++;
            
            logger.success(`Auto ads config ${i + 1} pushed`);
            
            setTimeout(() => this.verifyAutoAds(`Push ${i + 1}`), 3000);
            
          } catch (error) {
            logger.error(`Auto ads push ${i + 1} failed`, error.message);
          }
        }, i * 1500);
      }
    }

    static getAutoAdsConfigs() {
      const baseConfig = {
        google_ad_client: CONFIG.CLIENT_ID,
        enable_page_level_ads: true
      };

      const configs = [
        // Primary auto ads configuration
        baseConfig,
        
        // Enhanced configuration
        {
          ...baseConfig,
          overlays: { bottom: true },
          auto_ad_settings: {
            page_level_ads: {
              ads_by_google: { status: true }
            }
          }
        }
      ];

      if (DeviceDetector.isMobile()) {
        configs.push({
          ...baseConfig,
          overlays: { bottom: true, top: false },
          vignette: { ready: true }
        });
      }

      return configs;
    }

    static setupContinuousMonitoring() {
      STATE.autoAdsTimer = setInterval(() => {
        this.verifyAutoAds('Monitor');
        
        if (STATE.autoAdsPushed < 5 && Math.random() > 0.8) {
          this.performAdditionalPush();
        }
      }, 8000);

      logger.info('Auto ads continuous monitoring started');
    }

    static performAdditionalPush() {
      try {
        const config = {
          google_ad_client: CONFIG.CLIENT_ID,
          enable_page_level_ads: true,
          timestamp: Date.now()
        };

        (window.adsbygoogle = window.adsbygoogle || []).push(config);
        STATE.autoAdsPushed++;
        
        logger.info('Additional auto ads push performed');
      } catch (error) {
        logger.warn('Additional auto ads push failed', error.message);
      }
    }

    static verifyAutoAds(source = 'Unknown') {
      const selectors = [
        '[data-google-query-id]',
        `[data-ad-client="${CONFIG.CLIENT_ID}"]`,
        '.google-auto-placed',
        'ins[data-anchor-status]',
        'iframe[src*="googleads.g.doubleclick.net"]',
        'ins[data-adsbygoogle-status="done"]'
      ];
      
      let totalElements = 0;
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        totalElements += elements.length;
      });
      
      if (totalElements > 0) {
        logger.success(`Auto Ads verification (${source}): ${totalElements} elements found`);
      } else {
        logger.warn(`Auto Ads verification (${source}): No elements found`);
      }
      
      return totalElements;
    }

    static cleanup() {
      if (STATE.autoAdsTimer) {
        clearInterval(STATE.autoAdsTimer);
        STATE.autoAdsTimer = null;
      }
    }
  }

  // Ultimate Ad Manager with Improved Loading
  class UltimateAdManager {
    constructor() {
      this.loadedAds = new Set();
      this.failedAds = new Set();
      this.retryQueue = new Map();
      this.loadingPromises = new Map();
    }

    async discoverAllAds() {
      logger.info('🔍 Discovering ad containers...');
      
      const elements = Array.from(document.querySelectorAll(CONFIG.AD_SELECTOR))
        .filter(el => !el.hasAttribute('data-ad-processed'))
        .filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width >= 0 && rect.height >= 0;
        });
      
      logger.info(`Discovered ${elements.length} ad containers`);
      
      const ads = elements.map((element, index) => {
        const adId = AdUtils.generateAdId(element, index);
        const adData = {
          id: adId,
          element,
          index,
          rect: element.getBoundingClientRect(),
          priority: this.calculatePriority(element),
          status: 'discovered',
          attempts: 0,
          createdAt: Date.now()
        };
        
        element.setAttribute('data-ad-id', adId);
        element.setAttribute('data-ad-processed', 'true');
        STATE.adRegistry.set(adId, adData);
        
        return adData;
      });

      STATE.totalAds = ads.length;
      logger.success(`Processed ${ads.length} ad containers`);
      return ads;
    }

    calculatePriority(element) {
      try {
        const rect = element.getBoundingClientRect();
        let priority = 50;
        
        // Viewport visibility boost
        const viewportHeight = window.innerHeight;
        if (rect.top >= 0 && rect.top < viewportHeight) {
          priority += 40; // Above the fold
        } else if (rect.top < viewportHeight * 1.5) {
          priority += 20; // Near viewport
        }
        
        // Size priority
        const area = rect.width * rect.height;
        if (area > 250 * 250) priority += 25;
        else if (area > 150 * 150) priority += 15;
        else if (area > 100 * 100) priority += 10;
        
        // Position priority
        if (rect.top < 400) priority += 15;
        
        // Device specific adjustments
        if (DeviceDetector.isMobile() && rect.top < viewportHeight * 0.8) {
          priority += 10;
        }
        
        return Math.min(100, Math.max(1, Math.round(priority)));
      } catch (error) {
        return 50;
      }
    }

    async loadAd(adData) {
      const adId = adData.id;
      
      if (this.loadedAds.has(adId) || 
          adData.element.hasAttribute('data-ads-loaded') ||
          STATE.processingQueue.has(adId)) {
        return true;
      }

      if (this.loadingPromises.has(adId)) {
        return this.loadingPromises.get(adId);
      }

      const loadPromise = this.performAdLoad(adData);
      this.loadingPromises.set(adId, loadPromise);
      
      try {
        const result = await loadPromise;
        this.loadingPromises.delete(adId);
        return result;
      } catch (error) {
        this.loadingPromises.delete(adId);
        throw error;
      }
    }

    async performAdLoad(adData) {
      const startTime = performance.now();
      const adId = adData.id;
      
      adData.attempts++;
      STATE.processingQueue.add(adId);

      try {
        logger.info(`Loading ad: ${adId} (attempt ${adData.attempts})`);
        
        // Prepare the ad container
        AdUtils.ensureAdContainer(adData.element);
        AdUtils.addLoadingIndicator(adData.element);
        this.ensureAdAttributes(adData.element);

        // Execute the ad load
        await this.executeAdLoad(adData);
        
        // Verify successful loading
        const isLoaded = await this.verifyAdLoad(adData);
        
        if (isLoaded) {
          this.handleLoadSuccess(adData, performance.now() - startTime);
          return true;
        } else {
          throw new Error('Ad load verification failed');
        }
        
      } catch (error) {
        if (adData.attempts < CONFIG.MAX_RETRY_ATTEMPTS) {
          const delay = CONFIG.RETRY_DELAY * adData.attempts;
          logger.warn(`Ad load failed, retrying in ${delay}ms: ${adId}`);
          
          this.retryQueue.set(adId, setTimeout(() => {
            this.retryQueue.delete(adId);
            this.loadAd(adData);
          }, delay));
          
          return false;
        } else {
          this.handleLoadFailure(adData, error);
          return false;
        }
      } finally {
        STATE.processingQueue.delete(adId);
      }
    }

    ensureAdAttributes(element) {
      if (!element.hasAttribute('data-ad-client')) {
        element.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
      }
      
      if (!element.hasAttribute('data-ad-slot')) {
        const slot = element.getAttribute('data-ad-slot') || 
                    `${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        element.setAttribute('data-ad-slot', slot);
      }
      
      element.setAttribute('data-ad-format', 'auto');
      element.setAttribute('data-full-width-responsive', 'true');
      
      if (!element.classList.contains('adsbygoogle')) {
        element.classList.add('adsbygoogle');
      }
    }

    async executeAdLoad(adData) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (AdUtils.isAdLoaded(adData.element)) {
            resolve();
          } else {
            reject(new Error('Ad load timeout'));
          }
        }, CONFIG.AD_LOAD_TIMEOUT);

        try {
          // Push to adsbygoogle queue
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          
          // Check for quick loading
          setTimeout(() => {
            if (AdUtils.isAdLoaded(adData.element)) {
              clearTimeout(timeout);
              resolve();
            }
          }, 1000);
          
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    }

    async verifyAdLoad(adData) {
      // Wait a bit for ad to render
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        if (AdUtils.isAdLoaded(adData.element)) {
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      return false;
    }

    handleLoadSuccess(adData, loadTime) {
      adData.status = 'loaded';
      AdUtils.markAdAsLoaded(adData.element, 'standard');
      STATE.loadedAds++;
      this.loadedAds.add(adData.id);
      
      logger.performance(`Ad loaded: ${adData.id}`, loadTime);
    }

    handleLoadFailure(adData, error) {
      adData.status = 'failed';
      adData.element.setAttribute('data-ad-failed', 'true');
      AdUtils.removeLoadingIndicator(adData.element);
      STATE.failedAds++;
      this.failedAds.add(adData.id);
      
      logger.error(`Ad load failed: ${adData.id}`, error.message);
    }

    async batchProcess(ads) {
      if (!ads || ads.length === 0) return;
      
      const sortedAds = ads.sort((a, b) => b.priority - a.priority);
      const batchSize = DeviceDetector.getOptimalBatchSize();
      
      logger.info(`Processing ${sortedAds.length} ads in batches of ${batchSize}`);
      
      for (let i = 0; i < sortedAds.length; i += batchSize) {
        const batch = sortedAds.slice(i, i + batchSize)
          .filter(ad => !ad.element.hasAttribute('data-ads-loaded') && 
                        !STATE.processingQueue.has(ad.id));
        
        if (batch.length === 0) continue;
        
        logger.info(`Processing batch ${Math.floor(i/batchSize) + 1} with ${batch.length} ads`);
        
        await Promise.allSettled(batch.map(ad => this.loadAd(ad)));
        
        if (i + batchSize < sortedAds.length) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        }
      }
    }

    getLoadingStats() {
      return {
        totalAds: STATE.totalAds,
        loadedAds: STATE.loadedAds,
        failedAds: STATE.failedAds,
        loadingRate: STATE.totalAds > 0 ? ((STATE.loadedAds / STATE.totalAds) * 100).toFixed(2) + '%' : '0%'
      };
    }

    cleanup() {
      this.retryQueue.forEach(timer => clearTimeout(timer));
      this.retryQueue.clear();
      this.loadingPromises.clear();
    }
  }

  // Enhanced Lazy Load Manager
  class LazyLoadManager {
    constructor(adManager) {
      this.adManager = adManager;
      this.observer = null;
      this.observedAds = new Set();
    }

    initialize() {
      if (!window.IntersectionObserver) {
        logger.warn('IntersectionObserver not supported, using fallback');
        return false;
      }

      this.observer = new IntersectionObserver(
        entries => this.handleIntersection(entries),
        {
          rootMargin: CONFIG.LAZY_LOAD_MARGIN,
          threshold: CONFIG.INTERSECTION_THRESHOLD
        }
      );

      logger.info('Lazy load manager initialized');
      return true;
    }

    observeAd(adData) {
      if (this.observer && !this.observedAds.has(adData.id) && 
          !adData.element.hasAttribute('data-ads-loaded')) {
        this.observer.observe(adData.element);
        this.observedAds.add(adData.id);
        logger.debug(`Observing ad: ${adData.id}`);
      }
    }

    async handleIntersection(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const adData = Array.from(STATE.adRegistry.values())
            .find(ad => ad.element === entry.target);
          
          if (adData && adData.status === 'discovered') {
            this.observer.unobserve(entry.target);
            this.observedAds.delete(adData.id);
            await this.adManager.loadAd(adData);
          }
        }
      }
    }

    async loadVisibleAds() {
      const visibleAds = Array.from(STATE.adRegistry.values()).filter(ad => {
        const rect = ad.element.getBoundingClientRect();
        return rect.top < window.innerHeight + 200 && 
               rect.bottom > -200 && 
               !ad.element.hasAttribute('data-ads-loaded');
      });

      if (visibleAds.length > 0) {
        logger.info(`Loading ${visibleAds.length} immediately visible ads`);
        await this.adManager.batchProcess(visibleAds);
      }
    }

    cleanup() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.observedAds.clear();
    }
  }

  // Mandatory Check Manager for Force Loading
  class MandatoryCheckManager {
    static initialize() {
      if (STATE.mandatoryCheckActive) return;
      
      STATE.mandatoryCheckActive = true;
      logger.info('🔄 Starting mandatory ad checks...');
      
      STATE.mandatoryTimer = setInterval(() => {
        this.performMandatoryCheck();
      }, CONFIG.MANDATORY_CHECK_INTERVAL);
    }

    static async performMandatoryCheck() {
      STATE.loadingStats.mandatoryChecks++;
      
      const unloadedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        ad.status === 'discovered' && 
        !ad.element.hasAttribute('data-ads-loaded') &&
        !ad.element.hasAttribute('data-ad-failed') &&
        !STATE.processingQueue.has(ad.id)
      );

      if (unloadedAds.length > 0) {
        logger.info(`Mandatory check found ${unloadedAds.length} unloaded ads`);
        
        // Force load high priority ads
        const priorityAds = unloadedAds
          .filter(ad => ad.priority > 70)
          .slice(0, 3);

        if (priorityAds.length > 0) {
          STATE.loadingStats.forcedLoads += priorityAds.length;
          await Promise.allSettled(priorityAds.map(ad => 
            window.adManager.loadAd(ad)
          ));
        }
      }

      // Auto-restart auto ads if needed
      if (CONFIG.AUTO_ADS_ENABLED && STATE.autoAdsPushed < 3) {
        logger.warn('Auto ads seems inactive, restarting...');
        UltimateAutoAdsManager.performAdditionalPush();
      }
    }

    static cleanup() {
      if (STATE.mandatoryTimer) {
        clearInterval(STATE.mandatoryTimer);
        STATE.mandatoryTimer = null;
      }
      STATE.mandatoryCheckActive = false;
    }
  }

  // Page Visibility Manager
  class PageVisibilityManager {
    static initialize() {
      document.addEventListener('visibilitychange', () => {
        STATE.isPageVisible = !document.hidden;
        
        if (STATE.isPageVisible) {
          logger.info('Page became visible, checking ads...');
          setTimeout(() => {
            if (window.adManager) {
              MandatoryCheckManager.performMandatoryCheck();
            }
          }, 1000);
        } else {
          logger.debug('Page became hidden');
        }
      });
    }
  }

  // Main Controller Class
  class AdSenseController {
    constructor() {
      this.adManager = new UltimateAdManager();
      this.lazyLoadManager = new LazyLoadManager(this.adManager);
      this.startTime = performance.now();
    }

    async initialize() {
      if (STATE.initialized) {
        logger.warn('AdSense Controller already initialized');
        return;
      }

      STATE.initialized = true;
      logger.info('🚀 AdSense Optimizer v60.71 initializing...');

      try {
        // Initialize device detection
        DeviceDetector.detect();
        
        // Initialize page visibility manager
        PageVisibilityManager.initialize();
        
        // Wait for page to be ready
        await AdUtils.waitForPageLoad();
        await new Promise(resolve => setTimeout(resolve, CONFIG.LOAD_DELAY));
        
        // Execute main loading sequence
        await this.executeLoadSequence();
        
        // Start mandatory checks
        MandatoryCheckManager.initialize();
        
        const totalTime = performance.now() - this.startTime;
        logger.performance('AdSense Optimizer v60.71 initialized', totalTime);
        
        // Setup global access
        this.setupGlobalAccess();
        
      } catch (error) {
        logger.error('Initialization failed', error.message);
        // Attempt recovery
        setTimeout(() => this.attemptRecovery(), 5000);
      }
    }

    async executeLoadSequence() {
      try {
        // Step 1: Network optimization
        NetworkOptimizer.preconnect();
        NetworkOptimizer.prefetchResources();
        NetworkOptimizer.optimizeDNS();
        
        // Step 2: Load AdSense script
        await ScriptLoader.loadAdSenseScript();
        
        // Step 3: Initialize Auto Ads
        if (CONFIG.AUTO_ADS_ENABLED) {
          UltimateAutoAdsManager.initialize();
        }
        
        // Step 4: Discover and process manual ads
        const ads = await this.adManager.discoverAllAds();
        
        if (ads.length === 0) {
          logger.info('No manual ads found, focusing on auto ads');
          return;
        }
        
        // Step 5: Setup lazy loading or direct loading
        const lazyLoadSupported = this.lazyLoadManager.initialize();
        
        if (lazyLoadSupported && !CONFIG.FORCE_LOAD_ALL) {
          // Observe ads for lazy loading
          ads.forEach(ad => this.lazyLoadManager.observeAd(ad));
          
          // Load immediately visible ads
          await this.lazyLoadManager.loadVisibleAds();
        } else {
          // Force load all ads
          logger.info('Force loading all ads...');
          await this.adManager.batchProcess(ads);
        }
        
        // Log final stats
        const stats = this.adManager.getLoadingStats();
        logger.success('Load sequence completed', stats);
        
      } catch (error) {
        logger.error('Load sequence failed', error.message);
        throw error;
      }
    }

    setupGlobalAccess() {
      window.adManager = this.adManager;
      window.AdSenseOptimizer = {
        version: '60.71',
        getStatus: () => this.getStatus(),
        getStats: () => this.getDetailedStats(),
        forceLoadAll: () => this.forceLoadAllAds(),
        restart: () => this.restart(),
        cleanup: () => this.cleanup()
      };
      
      logger.success('Global access configured');
    }

    getStatus() {
      return {
        version: '60.71',
        initialized: STATE.initialized,
        scriptLoaded: STATE.scriptLoaded,
        autoAdsInitialized: STATE.autoAdsInitialized,
        totalAds: STATE.totalAds,
        loadedAds: STATE.loadedAds,
        failedAds: STATE.failedAds,
        deviceType: STATE.deviceType,
        connectionSpeed: STATE.connectionSpeed,
        loadingRate: STATE.totalAds > 0 ? 
          ((STATE.loadedAds / STATE.totalAds) * 100).toFixed(2) + '%' : '0%'
      };
    }

    getDetailedStats() {
      return {
        ...this.getStatus(),
        loadingStats: STATE.loadingStats,
        autoAdsPushed: STATE.autoAdsPushed,
        mandatoryCheckActive: STATE.mandatoryCheckActive,
        isPageVisible: STATE.isPageVisible,
        sessionId: STATE.sessionId,
        adRegistry: Array.from(STATE.adRegistry.values()).map(ad => ({
          id: ad.id,
          status: ad.status,
          priority: ad.priority,
          attempts: ad.attempts
        }))
      };
    }

    async forceLoadAllAds() {
      logger.info('🔥 Force loading all remaining ads...');
      
      const unloadedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        !ad.element.hasAttribute('data-ads-loaded') &&
        !ad.element.hasAttribute('data-ad-failed')
      );

      if (unloadedAds.length > 0) {
        await this.adManager.batchProcess(unloadedAds);
        logger.success(`Force loaded ${unloadedAds.length} ads`);
      } else {
        logger.info('No ads to force load');
      }
    }

    async restart() {
      logger.warn('🔄 Restarting AdSense Optimizer...');
      this.cleanup();
      
      // Reset state
      Object.assign(STATE, {
        initialized: false,
        autoAdsInitialized: false,
        totalAds: 0,
        loadedAds: 0,
        failedAds: 0,
        adRegistry: new Map(),
        processingQueue: new Set()
      });
      
      // Reinitialize
      setTimeout(() => this.initialize(), 2000);
    }

    async attemptRecovery() {
      logger.warn('🛠️ Attempting recovery...');
      
      try {
        // Try to reinitialize auto ads
        if (CONFIG.AUTO_ADS_ENABLED && !STATE.autoAdsInitialized) {
          await UltimateAutoAdsManager.initialize();
        }
        
        // Try to load remaining ads
        await this.forceLoadAllAds();
        
        logger.success('Recovery attempt completed');
      } catch (error) {
        logger.error('Recovery failed', error.message);
      }
    }

    cleanup() {
      try {
        this.adManager.cleanup();
        this.lazyLoadManager.cleanup();
        MandatoryCheckManager.cleanup();
        UltimateAutoAdsManager.cleanup();
        
        // Clear all timers
        if (STATE.mandatoryTimer) {
          clearInterval(STATE.mandatoryTimer);
          STATE.mandatoryTimer = null;
        }
        
        if (STATE.autoAdsTimer) {
          clearInterval(STATE.autoAdsTimer);
          STATE.autoAdsTimer = null;
        }
        
        logger.info('Cleanup completed');
      } catch (error) {
        logger.error('Cleanup failed', error.message);
      }
    }
  }

  // Initialize the AdSense Optimizer
  async function initializeAdSenseOptimizer() {
    try {
      const controller = new AdSenseController();
      await controller.initialize();
      
      // Store controller reference globally
      window.AdSenseController = controller;
      
      logger.success('✅ AdSense Optimizer v60.71 ready!');
      
    } catch (error) {
      logger.error('Failed to initialize AdSense Optimizer', error.message);
      
      // Fallback initialization
      setTimeout(() => {
        logger.warn('Attempting fallback initialization...');
        initializeAdSenseOptimizer();
      }, 10000);
    }
  }

  // Trigger initialization based on page state
  if (document.readyState === 'complete') {
    setTimeout(initializeAdSenseOptimizer, 200);
  } else if (document.readyState === 'interactive') {
    setTimeout(initializeAdSenseOptimizer, 500);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeAdSenseOptimizer, 300);
    }, { once: true });
    
    window.addEventListener('load', () => {
      setTimeout(initializeAdSenseOptimizer, 100);
    }, { once: true });
  }

  // Emergency fallback for slow connections
  setTimeout(initializeAdSenseOptimizer, 15000);

  // Console branding
  console.log('%c🚀 AdSense Optimizer v60.71 - Ultimate Loading Engine', 
    'color: #4285f4; font-weight: bold; font-size: 16px; text-shadow: 1px 1px 1px rgba(0,0,0,0.3);');
  console.log('%cFeatures: Auto Ads + Manual Ads + Lazy Loading + Force Loading + Recovery System', 
    'color: #0f9d58; font-weight: bold;');

})();
