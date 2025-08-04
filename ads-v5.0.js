(function() {
  'use strict';

  // Advanced AdSense Configuration v5.0 - Mandatory Loading
  const CONFIG = {
    CLIENT_ID: 'ca-pub-7407983524344370',
    SCRIPT_URL: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    AD_SELECTOR: '.lazy-ads, ins.adsbygoogle, .adsense-unit, [data-ad-client], .ads-container ins, .adsbygoogle',
    LAZY_LOAD_MARGIN: '300px',
    INITIAL_LOAD_DELAY: 2000,
    MANDATORY_CHECK_INTERVAL: 3000, // Check every 3 seconds
    MAX_RETRY_ATTEMPTS: 10, // Increased for mandatory loading
    RETRY_DELAY: 1500,
    BATCH_SIZE: 2,
    BATCH_DELAY: 800,
    INTERSECTION_THRESHOLD: 0.05,
    AUTO_ADS_ENABLED: true,
    MOBILE_BREAKPOINT: 768,
    FORCED_LOAD_TIMEOUT: 30000, // 30 seconds max wait
    SCRIPT_LOAD_TIMEOUT: 15000,
    DEBUG_MODE: true,
    PRECONNECT_DOMAINS: [
      'https://pagead2.googlesyndication.com',
      'https://googleads.g.doubleclick.net',
      'https://tpc.googlesyndication.com',
      'https://partner.googleadservices.com',
      'https://fonts.gstatic.com'
    ]
  };

  // Enhanced State Management
  const STATE = {
    scriptLoaded: false,
    scriptLoading: false,
    initialized: false,
    autoAdsInitialized: false,
    mandatoryCheckActive: false,
    totalAds: 0,
    loadedAds: 0,
    failedAds: 0,
    sessionId: `ads_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    adRegistry: new Map(),
    processingQueue: new Set(),
    deviceType: null,
    connectionSpeed: 'unknown',
    mandatoryTimer: null,
    loadingStats: {
      scriptLoadTime: 0,
      firstAdLoadTime: 0,
      totalLoadTime: 0,
      mandatoryChecks: 0,
      forcedLoads: 0
    }
  };

  // Enhanced Logger with Performance Tracking
  const logger = {
    info: (msg, data) => {
      if (CONFIG.DEBUG_MODE) {
        console.log(`%c[AdSense v5.0] ${msg}`, 'color: #4285f4; font-weight: bold;', data || '');
      }
    },
    warn: (msg, data) => console.warn(`[AdSense v5.0] ⚠️ ${msg}`, data || ''),
    error: (msg, data) => console.error(`[AdSense v5.0] ❌ ${msg}`, data || ''),
    success: (msg, data) => {
      if (CONFIG.DEBUG_MODE) {
        console.log(`%c[AdSense v5.0] ✅ ${msg}`, 'color: #0f9d58; font-weight: bold;', data || '');
      }
    },
    performance: (msg, time) => {
      if (CONFIG.DEBUG_MODE) {
        console.log(`%c[AdSense v5.0] ⏱️ ${msg}: ${time}ms`, 'color: #ff9800; font-weight: bold;');
      }
    }
  };

  // Device and Performance Detection
  class DeviceDetector {
    static detect() {
      const userAgent = navigator.userAgent;
      const isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT || 
                      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      STATE.deviceType = isMobile ? 'mobile' : 'desktop';
      
      // Enhanced connection detection
      if (navigator.connection) {
        const connection = navigator.connection;
        STATE.connectionSpeed = connection.effectiveType || connection.type || 'unknown';
      }
      
      logger.info(`Device: ${STATE.deviceType}, Connection: ${STATE.connectionSpeed}`);
      return STATE.deviceType;
    }

    static isMobile() {
      return STATE.deviceType === 'mobile';
    }

    static isSlowConnection() {
      return ['slow-2g', '2g', '3g'].includes(STATE.connectionSpeed);
    }

    static getOptimalBatchSize() {
      if (this.isSlowConnection()) return 1;
      return this.isMobile() ? 2 : 3;
    }

    static getOptimalDelay() {
      if (this.isSlowConnection()) return CONFIG.BATCH_DELAY * 2;
      return this.isMobile() ? CONFIG.BATCH_DELAY * 1.5 : CONFIG.BATCH_DELAY;
    }
  }

  // Enhanced Utilities
  class AdUtils {
    static async waitForPageLoad() {
      if (document.readyState === 'complete') return;
      
      return new Promise(resolve => {
        const checkReady = () => {
          if (document.readyState === 'complete') {
            resolve();
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
             element.getAttribute('data-ad-slot') || 
             `mandatory_ad_${index}_${Date.now()}`;
    }

    static calculateVisibility(element) {
      try {
        const rect = element.getBoundingClientRect();
        const viewport = { 
          width: window.innerWidth || document.documentElement.clientWidth, 
          height: window.innerHeight || document.documentElement.clientHeight
        };
        
        if (rect.width === 0 || rect.height === 0) return 0;
        
        const visibleWidth = Math.max(0, Math.min(rect.right, viewport.width) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, viewport.height) - Math.max(rect.top, 0));
        const visibleArea = visibleWidth * visibleHeight;
        const totalArea = rect.width * rect.height;
        
        return totalArea > 0 ? (visibleArea / totalArea) : 0;
      } catch (error) {
        logger.warn('Visibility calculation failed', error.message);
        return 0;
      }
    }

    static isAdLoaded(element) {
      try {
        const status = element.getAttribute('data-adsbygoogle-status');
        const hasIframe = element.querySelector('iframe[src*="googleads"], iframe[src*="googlesyndication"]') !== null;
        const hasContent = element.innerHTML.trim().length > 100 && !element.innerHTML.includes('adsbygoogle');
        const isProcessed = element.hasAttribute('data-ads-loaded');
        
        return status === 'done' || hasIframe || hasContent || isProcessed;
      } catch (error) {
        logger.warn('Ad load check failed', error.message);
        return false;
      }
    }

    static preventLayoutShift(element) {
      try {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        let width = rect.width || parseInt(computedStyle.width) || 300;
        let height = rect.height || parseInt(computedStyle.height) || 250;
        
        // Device-specific adjustments
        if (DeviceDetector.isMobile()) {
          width = Math.min(width, window.innerWidth - 20);
          height = Math.max(height, 100);
        } else {
          width = Math.min(width, 728);
          height = Math.max(height, 90);
        }
        
        const styles = {
          minWidth: `${width}px`,
          minHeight: `${height}px`,
          display: 'block',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'transparent',
          margin: '10px auto'
        };
        
        Object.assign(element.style, styles);
        
        // Create responsive wrapper if not exists
        if (!element.parentElement?.classList.contains('ad-responsive-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'ad-responsive-wrapper';
          wrapper.style.cssText = `
            width: 100%;
            max-width: ${width}px;
            margin: 10px auto;
            text-align: center;
            position: relative;
          `;
          
          if (element.parentNode) {
            element.parentNode.insertBefore(wrapper, element);
            wrapper.appendChild(element);
          }
        }
        
      } catch (error) {
        logger.warn('Layout shift prevention failed', error.message);
      }
    }

    static addLoadingIndicator(element) {
      if (element.querySelector('.ad-loading-indicator')) return;
      
      const indicator = document.createElement('div');
      indicator.className = 'ad-loading-indicator';
      indicator.innerHTML = `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #4285f4;
          border-radius: 50%;
          animation: adSpin 1s linear infinite;
          z-index: 10;
        "></div>
        <div style="
          position: absolute;
          top: 60%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 12px;
          color: #666;
          z-index: 10;
          white-space: nowrap;
        ">Loading Ad...</div>
      `;
      
      // Add CSS animation if not exists
      if (!document.querySelector('#ad-spinner-styles')) {
        const style = document.createElement('style');
        style.id = 'ad-spinner-styles';
        style.textContent = `
          @keyframes adSpin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
      
      element.appendChild(indicator);
    }

    static removeLoadingIndicator(element) {
      const indicator = element.querySelector('.ad-loading-indicator');
      if (indicator) {
        indicator.remove();
      }
    }

    static markAdAsProcessed(element, status = 'loaded') {
      element.setAttribute('data-ads-loaded', 'true');
      element.setAttribute('data-ads-status', status);
      element.setAttribute('data-load-timestamp', Date.now().toString());
    }
  }

  // Network Optimization
  class NetworkOptimizer {
    static preconnect() {
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
        logger.info('Network preconnections established');
      }
    }

    static prefetchResources() {
      if (!DeviceDetector.isSlowConnection()) {
        const prefetchUrls = [
          CONFIG.SCRIPT_URL,
          'https://googleads.g.doubleclick.net/pagead/html/r20210716/r20190131/zrt_lookup.html'
        ];
        
        prefetchUrls.forEach(url => {
          if (!document.querySelector(`link[href="${url}"]`)) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            link.as = 'script';
            document.head.appendChild(link);
          }
        });
        
        logger.info('Resource prefetching completed');
      }
    }
  }

  // Enhanced Script Loader
  class ScriptLoader {
    static async loadAdSenseScript() {
      if (STATE.scriptLoaded) return true;
      if (STATE.scriptLoading) return this.waitForScript();

      const startTime = performance.now();
      STATE.scriptLoading = true;
      logger.info('Loading AdSense script...');

      try {
        await this.createScript();
        await this.verifyScript();
        
        STATE.scriptLoaded = true;
        STATE.scriptLoading = false;
        STATE.loadingStats.scriptLoadTime = performance.now() - startTime;
        
        logger.performance('Script loaded successfully', STATE.loadingStats.scriptLoadTime);
        return true;
        
      } catch (error) {
        STATE.scriptLoading = false;
        logger.error('Script loading failed, using fallback', error.message);
        this.initializeFallback();
        return true;
      }
    }

    static createScript() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = true;
        script.src = `${CONFIG.SCRIPT_URL}?client=${CONFIG.CLIENT_ID}`;
        script.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
        script.setAttribute('data-adbreak-test', 'on');
        script.setAttribute('data-ad-frequency-hint', '30s');
        
        const timeout = setTimeout(() => {
          script.remove();
          reject(new Error('Script load timeout'));
        }, CONFIG.SCRIPT_LOAD_TIMEOUT);

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

    static async verifyScript() {
      let attempts = 0;
      const maxAttempts = DeviceDetector.isSlowConnection() ? 200 : 150;
      
      while (typeof window.adsbygoogle === 'undefined' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      if (typeof window.adsbygoogle === 'undefined') {
        throw new Error('AdSense script verification failed');
      }
      
      if (!Array.isArray(window.adsbygoogle)) {
        window.adsbygoogle = [];
      }
      
      logger.success('AdSense script verified and ready');
    }

    static initializeFallback() {
      window.adsbygoogle = window.adsbygoogle || [];
      STATE.scriptLoaded = true;
      logger.warn('Fallback initialization completed');
    }

    static async waitForScript() {
      let attempts = 0;
      const maxAttempts = 300;
      
      while (STATE.scriptLoading && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      return STATE.scriptLoaded;
    }
  }

  // Enhanced Auto Ads Manager
  class AutoAdsManager {
    static async initialize() {
      if (STATE.autoAdsInitialized || !CONFIG.AUTO_ADS_ENABLED) return;

      logger.info('Initializing Auto Ads with enhanced configuration...');

      try {
        if (!STATE.scriptLoaded) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const configurations = this.getAutoAdsConfigurations();

        // Push configurations with staggered timing
        configurations.forEach((config, index) => {
          setTimeout(() => {
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push(config);
              logger.success(`Auto ads configuration ${index + 1} pushed successfully`);
            } catch (error) {
              logger.warn(`Auto ads push ${index + 1} failed`, error.message);
            }
          }, index * 1200);
        });

        STATE.autoAdsInitialized = true;
        logger.success('Auto Ads initialized successfully');

        // Verification with multiple attempts
        setTimeout(() => this.verifyAutoAds(), 8000);
        setTimeout(() => this.verifyAutoAds(), 15000);

      } catch (error) {
        logger.error('Auto Ads initialization failed', error.message);
      }
    }

    static getAutoAdsConfigurations() {
      const baseConfig = {
        google_ad_client: CONFIG.CLIENT_ID,
        enable_page_level_ads: true,
        tag_partner: 'site_kit'
      };

      const configurations = [
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
        configurations.push({
          ...baseConfig,
          vignette: { ready: true },
          interstitial: { ready: true }
        });
      }

      return configurations;
    }

    static verifyAutoAds() {
      const selectors = [
        '[data-google-query-id]',
        `[data-ad-client="${CONFIG.CLIENT_ID}"]`,
        '.google-auto-placed',
        'ins[data-anchor-status]',
        '[data-google-av-cxn]'
      ];
      
      let totalElements = 0;
      selectors.forEach(selector => {
        totalElements += document.querySelectorAll(selector).length;
      });
      
      if (totalElements > 0) {
        logger.success(`Auto Ads verification: ${totalElements} elements found`);
      } else {
        logger.warn('Auto Ads verification: No elements found, attempting reinitialize...');
        setTimeout(() => this.forceReinitialize(), 3000);
      }
    }

    static forceReinitialize() {
      STATE.autoAdsInitialized = false;
      setTimeout(() => this.initialize(), 500);
    }
  }

  // Enhanced Ad Manager with Mandatory Loading
  class AdManager {
    constructor() {
      this.loadedAds = new Set();
      this.failedAds = new Set();
      this.retryQueue = new Map();
      this.mandatoryQueue = new Set();
    }

    async discoverAds() {
      const elements = Array.from(document.querySelectorAll(CONFIG.AD_SELECTOR))
        .filter(element => !element.hasAttribute('data-ad-processed'));
      
      logger.info(`Discovered ${elements.length} ad containers`);
      
      const ads = elements.map((element, index) => {
        const adId = AdUtils.generateAdId(element, index);
        const adData = {
          id: adId,
          element,
          index,
          rect: element.getBoundingClientRect(),
          visibility: AdUtils.calculateVisibility(element),
          priority: this.calculatePriority(element),
          status: 'discovered',
          attempts: 0,
          createdAt: Date.now(),
          mandatory: true // All ads are mandatory
        };
        
        element.setAttribute('data-ad-id', adId);
        element.setAttribute('data-ad-processed', 'true');
        STATE.adRegistry.set(adId, adData);
        this.mandatoryQueue.add(adId);
        return adData;
      });

      STATE.totalAds = ads.length;
      logger.info(`Processed ${ads.length} mandatory ads`);
      return ads;
    }

    calculatePriority(element) {
      try {
        const rect = element.getBoundingClientRect();
        const visibility = AdUtils.calculateVisibility(element);
        
        let priority = 60; // Higher base priority for mandatory loading
        
        // Above fold bonus
        if (rect.top < window.innerHeight && rect.top >= 0) priority += 40;
        
        // Visibility bonus
        priority += visibility * 30;
        
        // Size bonus
        const area = rect.width * rect.height;
        if (area > 300 * 250) priority += 25;
        else if (area > 200 * 200) priority += 20;
        
        // Position bonus
        if (rect.top < 500) priority += 20;
        if (rect.top < 200) priority += 15;
        
        // Mobile adjustments
        if (DeviceDetector.isMobile() && rect.top < window.innerHeight * 0.6) {
          priority += 15;
        }
        
        return Math.min(100, Math.max(1, Math.round(priority)));
      } catch (error) {
        logger.warn('Priority calculation failed', error.message);
        return 60;
      }
    }

    async loadAd(adData, isMandatory = false) {
      if (this.loadedAds.has(adData.id) || 
          adData.element.hasAttribute('data-ads-loaded') ||
          STATE.processingQueue.has(adData.id)) {
        return true;
      }
      
      const startTime = performance.now();
      adData.attempts++;
      const logPrefix = isMandatory ? 'MANDATORY' : 'REGULAR';
      
      try {
        logger.info(`${logPrefix} loading ad: ${adData.id} (attempt ${adData.attempts})`);
        
        AdUtils.preventLayoutShift(adData.element);
        AdUtils.addLoadingIndicator(adData.element);
        this.ensureAdAttributes(adData.element);
        
        adData.status = 'loading';
        STATE.processingQueue.add(adData.id);
        
        await this.executeAdLoad(adData, isMandatory);
        
        this.handleLoadSuccess(adData, performance.now() - startTime);
        if (isMandatory) {
          this.mandatoryQueue.delete(adData.id);
          STATE.loadingStats.forcedLoads++;
        }
        return true;
        
      } catch (error) {
        AdUtils.removeLoadingIndicator(adData.element);
        
        if (adData.attempts < CONFIG.MAX_RETRY_ATTEMPTS) {
          const delay = CONFIG.RETRY_DELAY * Math.pow(1.3, adData.attempts - 1);
          logger.warn(`${logPrefix} ad load failed, retrying in ${delay}ms: ${adData.id}`);
          
          this.retryQueue.set(adData.id, {
            adData,
            retryAt: Date.now() + delay,
            isMandatory
          });
          
          setTimeout(() => {
            if (this.retryQueue.has(adData.id)) {
              const retryData = this.retryQueue.get(adData.id);
              this.retryQueue.delete(adData.id);
              this.loadAd(retryData.adData, retryData.isMandatory);
            }
          }, delay);
          
          return false;
        }
        
        this.handleLoadFailure(adData, error);
        if (isMandatory) {
          // Keep in mandatory queue for continued attempts
          logger.error(`MANDATORY ad permanently failed: ${adData.id}`);
        }
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
        const slot = element.getAttribute('data-ad-slot') || 
                    element.dataset.adSlot || 
                    `mandatory-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        element.setAttribute('data-ad-slot', slot);
      }
      
      if (!element.hasAttribute('data-ad-format')) {
        element.setAttribute('data-ad-format', 'auto');
      }
      
      element.setAttribute('data-full-width-responsive', 'true');
      
      // Enhanced mobile attributes
      if (DeviceDetector.isMobile()) {
        element.setAttribute('data-ad-layout-key', '-fb+5w+4e-db+86');
        element.setAttribute('data-matched-content-ui-type', 'image_stacked');
      }
      
      if (!element.className.includes('adsbygoogle')) {
        element.className += ' adsbygoogle';
      }
    }

    async executeAdLoad(adData, isMandatory = false) {
      const timeoutDuration = isMandatory ? CONFIG.FORCED_LOAD_TIMEOUT : 
                            (DeviceDetector.isSlowConnection() ? 10000 : 6000);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (AdUtils.isAdLoaded(adData.element)) {
            resolve();
          } else {
            reject(new Error(`Ad load timeout after ${timeoutDuration}ms`));
          }
        }, timeoutDuration);

        try {
          // Multiple push attempts for mandatory loading
          if (isMandatory) {
            this.performMultiplePushes(adData, resolve, timeout);
          } else {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            this.setupLoadVerification(adData, resolve, timeout);
          }
          
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    }

    performMultiplePushes(adData, resolve, timeout) {
      let pushAttempts = 0;
      const maxPushes = 3;
      
      const pushWithDelay = () => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushAttempts++;
          
          if (pushAttempts < maxPushes) {
            setTimeout(pushWithDelay, 1000);
          }
        } catch (error) {
          logger.warn(`Push attempt ${pushAttempts} failed for ${adData.id}`, error.message);
        }
      };
      
      pushWithDelay();
      this.setupLoadVerification(adData, resolve, timeout, true);
    }

    setupLoadVerification(adData, resolve, timeout, isMandatory = false) {
      // Quick check
      setTimeout(() => {
        if (AdUtils.isAdLoaded(adData.element)) {
          clearTimeout(timeout);
          resolve();
        }
      }, isMandatory ? 1500 : 800);
      
      // Extended verification with multiple checks
      const checkInterval = setInterval(() => {
        if (AdUtils.isAdLoaded(adData.element)) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, isMandatory ? 500 : 1000);
      
      // Clear interval on timeout
      setTimeout(() => clearInterval(checkInterval), 
                isMandatory ? CONFIG.FORCED_LOAD_TIMEOUT : 6000);
    }

    handleLoadSuccess(adData, loadTime) {
      adData.status = 'loaded';
      AdUtils.markAdAsProcessed(adData.element, 'loaded');
      adData.loadTime = loadTime;
      
      STATE.loadedAds++;
      this.loadedAds.add(adData.id);
      
      if (STATE.loadingStats.firstAdLoadTime === 0) {
        STATE.loadingStats.firstAdLoadTime = loadTime;
      }
      
      AdUtils.removeLoadingIndicator(adData.element);
      logger.success(`Ad loaded successfully: ${adData.id} (${Math.round(loadTime)}ms)`);
    }

    handleLoadFailure(adData, error) {
      adData.status = 'failed';
      adData.element.setAttribute('data-ad-failed', 'true');
      adData.error = error.message;
      
      STATE.failedAds++;
      this.failedAds.add(adData.id);
      
      AdUtils.removeLoadingIndicator(adData.element);
      logger.error(`Ad load failed: ${adData.id}`, error.message);
    }

    async batchProcess(ads, isMandatory = false) {
      if (ads.length === 0) return;
      
      const sortedAds = ads.sort((a, b) => b.priority - a.priority);
      const batchSize = DeviceDetector.getOptimalBatchSize();
      
      const batches = [];
      for (let i = 0; i < sortedAds.length; i += batchSize) {
        batches.push(sortedAds.slice(i, i + batchSize));
      }

      const logPrefix = isMandatory ? 'MANDATORY' : 'REGULAR';
      logger.info(`${logPrefix} processing ${batches.length} batches of ads`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i].filter(ad => 
          !ad.element.hasAttribute('data-ads-loaded') && 
          !STATE.processingQueue.has(ad.id)
        );
        
        if (batch.length === 0) continue;
        
        logger.info(`${logPrefix} batch ${i + 1}/${batches.length} with ${batch.length} ads`);
        
        const promises = batch.map(ad => this.loadAd(ad, isMandatory));
        await Promise.allSettled(promises);
        
        if (i < batches.length - 1) {
          const delay = DeviceDetector.getOptimalDelay();
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Mandatory checking system
    async performMandatoryCheck() {
      STATE.loadingStats.mandatoryChecks++;
      
      const unloadedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        !ad.element.hasAttribute('data-ads-loaded') && 
        !STATE.processingQueue.has(ad.id)
      );
      
      if (unloadedAds.length > 0) {
        logger.warn(`MANDATORY CHECK: Found ${unloadedAds.length} unloaded ads, forcing load...`);
        await this.batchProcess(unloadedAds, true);
      } else {
        logger.success('MANDATORY CHECK: All ads loaded successfully');
      }
    }

    getUnloadedAdsCount() {
      return Array.from(STATE.adRegistry.values()).filter(ad => 
        !ad.element.hasAttribute('data-ads-loaded')
      ).length;
    }

    cleanupRetryQueue() {
      const now = Date.now();
      for (const [adId, retryData] of this.retryQueue.entries()) {
        if (now > retryData.retryAt + 60000) { // Clean after 1 minute
          this.retryQueue.delete(adId);
        }
      }
    }
  }

  // Enhanced Lazy Load Manager
  class LazyLoadManager {
    constructor(adManager) {
      this.adManager = adManager;
      this.observer = null;
      this.observedElements = new Set();
    }

    initialize() {
      if (!window.IntersectionObserver) {
        logger.warn('IntersectionObserver not supported, using fallback');
        return false;
      }

      const options = {
        rootMargin: CONFIG.LAZY_LOAD_MARGIN,
        threshold: [0, CONFIG.INTERSECTION_THRESHOLD, 0.25, 0.5, 0.75, 1]
      };

      this.observer = new IntersectionObserver(
        entries => this.handleIntersection(entries),
        options
      );

      logger.info('Lazy load manager initialized with enhanced options');
      return true;
    }

    observeAd(adData) {
      if (this.observer && 
          !adData.element.hasAttribute('data-ads-loaded') &&
          !this.observedElements.has(adData.element)) {
        
        this.observer.observe(adData.element);
        this.observedElements.add(adData.element);
        logger.info(`Observing ad for lazy load: ${adData.id}`);
      }
    }

    async handleIntersection(entries) {
      const visibleEntries = entries.filter(entry => entry.isIntersecting);
      
      if (visibleEntries.length === 0) return;

      logger.info(`${visibleEntries.length} ads became visible, triggering load`);

      for (const entry of visibleEntries) {
        const adData = this.findAdData(entry.target);
        if (adData && adData.status === 'discovered') {
          this.observer.unobserve(entry.target);
          this.observedElements.delete(entry.target);
          
          // Immediate load for visible ads
          setTimeout(() => {
            this.adManager.loadAd(adData, true); // Force as mandatory
          }, 50);
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
        return rect.top < window.innerHeight + 200 && 
               rect.bottom > -200 && 
               !ad.element.hasAttribute('data-ads-loaded');
      });

      if (visibleAds.length > 0) {
        logger.info(`Loading ${visibleAds.length} immediately visible ads`);
        visibleAds.sort((a, b) => b.priority - a.priority);
        
        // Prioritize above-fold ads
        const aboveFoldAds = visibleAds.filter(ad => ad.element.getBoundingClientRect().top < window.innerHeight);
        const belowFoldAds = visibleAds.filter(ad => ad.element.getBoundingClientRect().top >= window.innerHeight);
        
        if (aboveFoldAds.length > 0) {
          await this.adManager.batchProcess(aboveFoldAds, true);
          
          if (belowFoldAds.length > 0) {
            setTimeout(() => {
              this.adManager.batchProcess(belowFoldAds, true);
            }, 1000);
          }
        } else {
          await this.adManager.batchProcess(visibleAds, true);
        }
      }
    }

    cleanup() {
      if (this.observer) {
        this.observer.disconnect();
        this.observedElements.clear();
        logger.info('Lazy load manager cleaned up');
      }
    }
  }

  // Mandatory Loading Monitor
  class MandatoryLoadingMonitor {
    constructor(adManager) {
      this.adManager = adManager;
      this.checkInterval = null;
      this.totalChecks = 0;
      this.maxChecks = 600; // 30 minutes of checking (600 * 3 seconds)
    }

    start() {
      if (STATE.mandatoryCheckActive) return;
      
      STATE.mandatoryCheckActive = true;
      logger.info('🔄 Starting mandatory loading monitor (checks every 3 seconds)');
      
      this.checkInterval = setInterval(() => {
        this.performCheck();
      }, CONFIG.MANDATORY_CHECK_INTERVAL);

      // Initial check after 5 seconds
      setTimeout(() => this.performCheck(), 5000);
    }

    async performCheck() {
      if (this.totalChecks >= this.maxChecks) {
        this.stop();
        logger.warn('Maximum mandatory checks reached, stopping monitor');
        return;
      }

      this.totalChecks++;
      logger.info(`🔍 Mandatory check #${this.totalChecks} - Scanning for unloaded ads...`);

      const unloadedCount = this.adManager.getUnloadedAdsCount();
      
      if (unloadedCount === 0) {
        logger.success('✅ All ads loaded successfully!');
        return;
      }

      logger.warn(`⚠️ Found ${unloadedCount} unloaded ads, attempting mandatory load...`);
      await this.adManager.performMandatoryCheck();

      // Cleanup retry queue periodically
      if (this.totalChecks % 10 === 0) {
        this.adManager.cleanupRetryQueue();
      }
    }

    stop() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
        STATE.mandatoryCheckActive = false;
        logger.info('🛑 Mandatory loading monitor stopped');
      }
    }

    getStatus() {
      return {
        active: STATE.mandatoryCheckActive,
        totalChecks: this.totalChecks,
        unloadedAds: this.adManager.getUnloadedAdsCount()
      };
    }
  }

  // Dynamic Ad Discovery System
  class DynamicAdDiscovery {
    constructor(adManager) {
      this.adManager = adManager;
      this.mutationObserver = null;
      this.discoveryInterval = null;
    }

    initialize() {
      // Mutation Observer for dynamic content
      if (window.MutationObserver) {
        this.mutationObserver = new MutationObserver(mutations => {
          this.handleMutations(mutations);
        });

        this.mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false
        });

        logger.info('Dynamic ad discovery initialized with MutationObserver');
      }

      // Periodic discovery as fallback
      this.discoveryInterval = setInterval(() => {
        this.performDiscovery();
      }, 10000); // Check every 10 seconds
    }

    handleMutations(mutations) {
      let hasNewAds = false;
      
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            const adElements = node.matches && node.matches(CONFIG.AD_SELECTOR) ? 
                              [node] : 
                              Array.from(node.querySelectorAll ? node.querySelectorAll(CONFIG.AD_SELECTOR) : []);
            
            if (adElements.length > 0) {
              hasNewAds = true;
            }
          }
        });
      });

      if (hasNewAds) {
        logger.info('🔍 New ad elements detected, performing discovery...');
        setTimeout(() => this.performDiscovery(), 500);
      }
    }

    async performDiscovery() {
      try {
        const newAds = await this.adManager.discoverAds();
        
        if (newAds.length > 0) {
          logger.info(`🆕 Discovered ${newAds.length} new ad units`);
          
          // Process new ads immediately
          const visibleNewAds = newAds.filter(ad => {
            const rect = ad.element.getBoundingClientRect();
            return rect.top < window.innerHeight + 300 && rect.bottom > -300;
          });

          if (visibleNewAds.length > 0) {
            await this.adManager.batchProcess(visibleNewAds, true);
          }
        }
      } catch (error) {
        logger.warn('Dynamic discovery failed', error.message);
      }
    }

    cleanup() {
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
      if (this.discoveryInterval) {
        clearInterval(this.discoveryInterval);
      }
      logger.info('Dynamic ad discovery cleaned up');
    }
  }

  // Main AdSense Controller v5.0
  class AdSenseController {
    constructor() {
      this.adManager = new AdManager();
      this.lazyLoadManager = new LazyLoadManager(this.adManager);
      this.mandatoryMonitor = new MandatoryLoadingMonitor(this.adManager);
      this.dynamicDiscovery = new DynamicAdDiscovery(this.adManager);
      this.initialized = false;
      this.resizeTimeout = null;
    }

    async initialize() {
      if (this.initialized) return;
      this.initialized = true;

      const startTime = performance.now();
      logger.info('🚀 AdSense Optimizer v5.0 - Mandatory Loading Edition initializing...');

      try {
        DeviceDetector.detect();
        await this.setupOptimalLoading();
        
        STATE.initialized = true;
        STATE.loadingStats.totalLoadTime = performance.now() - startTime;
        
        logger.performance('Total initialization completed', STATE.loadingStats.totalLoadTime);
        logger.success('✅ AdSense Optimizer v5.0 fully operational!');
        
        this.setupEventListeners();
        this.startMandatoryMonitoring();
        
      } catch (error) {
        logger.error('Initialization failed', error.message);
        this.setupRetryInitialization();
      }
    }

    async setupOptimalLoading() {
      // Wait for page readiness
      await AdUtils.waitForPageLoad();
      
      // Adaptive delay based on connection
      const delay = DeviceDetector.isSlowConnection() ? 
                   CONFIG.INITIAL_LOAD_DELAY * 1.5 : CONFIG.INITIAL_LOAD_DELAY;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      await this.executeLoadSequence();
    }

    async executeLoadSequence() {
      try {
        logger.info('📡 Phase 1: Network optimization...');
        NetworkOptimizer.preconnect();
        NetworkOptimizer.prefetchResources();
        
        logger.info('📜 Phase 2: Loading AdSense script...');
        await ScriptLoader.loadAdSenseScript();
        
        logger.info('🤖 Phase 3: Initializing Auto Ads...');
        if (CONFIG.AUTO_ADS_ENABLED) {
          AutoAdsManager.initialize().catch(error => {
            logger.warn('Auto Ads initialization failed', error.message);
          });
        }
        
        logger.info('🔍 Phase 4: Discovering manual ads...');
        const ads = await this.adManager.discoverAds();
        
        if (ads.length === 0) {
          logger.info('No manual ads found, relying on Auto Ads');
          return;
        }

        logger.info('👁️ Phase 5: Setting up lazy loading...');
        const lazyLoadSupported = this.lazyLoadManager.initialize();
        
        if (lazyLoadSupported) {
          ads.forEach(ad => this.lazyLoadManager.observeAd(ad));
          await this.lazyLoadManager.loadVisibleAds();
        } else {
          logger.info('Using fallback batch loading');
          const sortedAds = ads.sort((a, b) => b.priority - a.priority);
          await this.adManager.batchProcess(sortedAds, true);
        }

        logger.info('🔄 Phase 6: Setting up dynamic discovery...');
        this.dynamicDiscovery.initialize();

        logger.success('Load sequence completed successfully', {
          totalAds: STATE.totalAds,
          loadedAds: STATE.loadedAds,
          failedAds: STATE.failedAds,
          autoAdsEnabled: CONFIG.AUTO_ADS_ENABLED
        });

      } catch (error) {
        logger.error('Load sequence failed', error.message);
      }
    }

    setupEventListeners() {
      // Resize handling
      window.addEventListener('resize', () => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          DeviceDetector.detect();
          this.updateAdSizes();
        }, 300);
      });

      // Visibility change handling
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          logger.info('Page became visible, checking ad status...');
          setTimeout(() => this.mandatoryMonitor.performCheck(), 1000);
        }
      });

      // Page unload cleanup
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });

      logger.info('Event listeners configured');
    }

    startMandatoryMonitoring() {
      // Start monitoring after initial load
      setTimeout(() => {
        this.mandatoryMonitor.start();
      }, 5000);
    }

    updateAdSizes() {
      logger.info('Updating ad sizes for new viewport...');
      STATE.adRegistry.forEach(adData => {
        if (adData.status === 'loaded') {
          AdUtils.preventLayoutShift(adData.element);
        }
      });
    }

    setupRetryInitialization() {
      logger.warn('Setting up retry initialization...');
      setTimeout(() => {
        if (!STATE.initialized) {
          this.initialized = false;
          this.initialize();
        }
      }, 10000);
    }

    cleanup() {
      this.mandatoryMonitor.stop();
      this.lazyLoadManager.cleanup();
      this.dynamicDiscovery.cleanup();
      
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      
      logger.info('AdSense Controller cleaned up');
    }

    // Public API Methods
    getDetailedStatus() {
      const unloadedAds = this.adManager.getUnloadedAdsCount();
      const successRate = STATE.totalAds > 0 ? 
                         Math.round((STATE.loadedAds / STATE.totalAds) * 100) : 0;

      return {
        version: '5.0-Mandatory',
        initialized: STATE.initialized,
        device: STATE.deviceType,
        connection: STATE.connectionSpeed,
        ads: {
          total: STATE.totalAds,
          loaded: STATE.loadedAds,
          failed: STATE.failedAds,
          unloaded: unloadedAds,
          successRate: successRate
        },
        autoAds: {
          enabled: CONFIG.AUTO_ADS_ENABLED,
          initialized: STATE.autoAdsInitialized
        },
        monitoring: this.mandatoryMonitor.getStatus(),
        performance: STATE.loadingStats,
        queues: {
          processing: STATE.processingQueue.size,
          retry: this.adManager.retryQueue.size,
          mandatory: this.adManager.mandatoryQueue.size
        }
      };
    }

    async forcePushAllAds() {
      logger.info('🔧 Force pushing all ads (manual trigger)...');
      
      // Force reinitialize Auto Ads
      if (CONFIG.AUTO_ADS_ENABLED) {
        AutoAdsManager.forceReinitialize();
      }

      // Force load all unloaded manual ads
      const unloadedAds = Array.from(STATE.adRegistry.values()).filter(ad => 
        !ad.element.hasAttribute('data-ads-loaded') &&
        !STATE.processingQueue.has(ad.id)
      );
      
      if (unloadedAds.length > 0) {
        logger.info(`Force loading ${unloadedAds.length} unloaded ads...`);
        await this.adManager.batchProcess(unloadedAds, true);
      }
      
      return { 
        attempted: unloadedAds.length,
        status: this.getDetailedStatus()
      };
    }

    async rediscoverAndLoadAds() {
      logger.info('🔍 Rediscovering and loading all ads...');
      
      const newAds = await this.adManager.discoverAds();
      if (newAds.length > 0) {
        await this.adManager.batchProcess(newAds, true);
      }
      
      return {
        discovered: newAds.length,
        status: this.getDetailedStatus()
      };
    }

    toggleMandatoryMonitoring() {
      if (STATE.mandatoryCheckActive) {
        this.mandatoryMonitor.stop();
        return { action: 'stopped', status: this.mandatoryMonitor.getStatus() };
      } else {
        this.mandatoryMonitor.start();
        return { action: 'started', status: this.mandatoryMonitor.getStatus() };
      }
    }
  }

  // Initialize AdSense Optimizer v5.0
  async function initializeAdSenseOptimizer() {
    try {
      const controller = new AdSenseController();
      await controller.initialize();
      
      // Enhanced global API
      window.AdSenseOptimizer = {
        version: '5.0-Mandatory',
        controller: controller,
        
        // Status and monitoring
        getStatus: () => controller.getDetailedStatus(),
        
        // Manual controls
        forcePushAds: () => controller.forcePushAllAds(),
        rediscoverAds: () => controller.rediscoverAndLoadAds(),
        
        // Monitoring controls
        toggleMonitoring: () => controller.toggleMandatoryMonitoring(),
        
        // Auto Ads controls
        reinitializeAutoAds: () => AutoAdsManager.forceReinitialize(),
        
        // Utility methods
        checkUnloadedAds: () => controller.adManager.getUnloadedAdsCount(),
        
        // Debug helpers
        logStats: () => console.table(controller.getDetailedStatus()),
        enableDebug: () => { CONFIG.DEBUG_MODE = true; logger.info('Debug mode enabled'); },
        disableDebug: () => { CONFIG.DEBUG_MODE = false; console.log('Debug mode disabled'); }
      };
      
      logger.success('🎉 AdSense Optimizer v5.0 - Mandatory Loading Edition ready!');
      return controller;
      
    } catch (error) {
      logger.error('Failed to initialize AdSense Optimizer', error.message);
      throw error;
    }
  }

  // Smart initialization system with multiple triggers
  const initSystem = {
    promise: null,
    attempts: 0,
    maxAttempts: 5,
    
    async tryInitialize() {
      if (this.promise) return this.promise;
      
      this.attempts++;
      logger.info(`Initialization attempt ${this.attempts}/${this.maxAttempts}`);
      
      this.promise = initializeAdSenseOptimizer().catch(error => {
        logger.error(`Initialization attempt ${this.attempts} failed`, error.message);
        this.promise = null;
        
        if (this.attempts < this.maxAttempts) {
          const delay = Math.min(5000 * this.attempts, 30000);
          setTimeout(() => this.tryInitialize(), delay);
        }
        
        throw error;
      });
      
      return this.promise;
    }
  };

  // Multiple initialization triggers for reliability
  
  // 1. Immediate trigger if page already loaded
  if (document.readyState === 'complete') {
    setTimeout(() => initSystem.tryInitialize(), 100);
  }
  
  // 2. Window load event
  window.addEventListener('load', () => {
    setTimeout(() => initSystem.tryInitialize(), 200);
  }, { once: true });
  
  // 3. DOM content loaded fallback
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => initSystem.tryInitialize(), 500);
    }, { once: true });
  }
  
  // 4. User interaction trigger
  const interactionEvents = ['click', 'scroll', 'touchstart', 'keydown'];
  const handleInteraction = () => {
    interactionEvents.forEach(event => {
      document.removeEventListener(event, handleInteraction);
    });
    if (!initSystem.promise) {
      setTimeout(() => initSystem.tryInitialize(), 100);
    }
  };

  interactionEvents.forEach(event => {
    document.addEventListener(event, handleInteraction, { 
      once: true, 
      passive: true 
    });
  });

  // 5. Fallback timeout (maximum 15 seconds)
  setTimeout(() => {
    if (!initSystem.promise) {
      logger.warn('Fallback initialization triggered');
      initSystem.tryInitialize();
    }
  }, 15000);

  // 6. Blogger CMS specific trigger
  setTimeout(() => {
    if (!initSystem.promise && typeof Blogger !== 'undefined') {
      logger.info('Blogger CMS detected, initializing...');
      initSystem.tryInitialize();
    }
  }, 8000);

  // Console branding and information
  console.log('%c🚀 AdSense Optimizer v5.0 - Mandatory Loading Edition', 
              'color: #4285f4; font-weight: bold; font-size: 16px; padding: 10px;');
  console.log('%c✅ Features: Auto Ads + Manual Ads + Lazy Loading + Mandatory Checking (every 3s)', 
              'color: #0f9d58; font-weight: bold;');
  console.log('%c📱 Optimized for: Mobile + Desktop + Slow Connections + Blogger CMS', 
              'color: #ff9800; font-weight: bold;');
  console.log('%c🔧 API: window.AdSenseOptimizer (use .getStatus() to check)', 
              'color: #9c27b0; font-weight: bold;');

})();
