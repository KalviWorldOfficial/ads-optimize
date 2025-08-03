(function() {
  'use strict';

  // Optimized AdSense Configuration v3.6 Final
  const CONFIG = {
    CLIENT_ID: 'ca-pub-7407983524344370',
    SCRIPT_URL: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    AD_SELECTOR: '.lazy-ads, ins.adsbygoogle, .adsense-unit, [data-ad-client]',
    LAZY_LOAD_MARGIN: '300px',
    LOAD_DELAY: 3000, // Delayed for better performance
    MAX_RETRY_ATTEMPTS: 5, // Reduced retries
    RETRY_DELAY: 2000,
    BATCH_SIZE: 3,
    BATCH_DELAY: 800,
    INTERSECTION_THRESHOLD: 0.1,
    AUTO_ADS_ENABLED: true,
    PRECONNECT_DOMAINS: [
      'https://pagead2.googlesyndication.com',
      'https://googleads.g.doubleclick.net',
      'https://tpc.googlesyndication.com'
    ]
  };

  // Minimal State Management
  const STATE = {
    scriptLoaded: false,
    scriptLoading: false,
    initialized: false,
    autoAdsInitialized: false,
    totalAds: 0,
    loadedAds: 0,
    failedAds: 0,
    sessionId: `ads_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    adRegistry: new Map(),
    processingQueue: new Set()
  };

  // Lightweight Logger
  const logger = {
    info: (msg, data) => console.log(`[AdSense] ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`[AdSense] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[AdSense] ${msg}`, data || ''),
    debug: (msg, data) => {} // Disabled for performance
  };

  // Essential Utilities
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
      return element.id || element.dataset.adId || `ad_${index}_${Date.now()}`;
    }

    static calculateVisibility(element) {
      try {
        const rect = element.getBoundingClientRect();
        const viewport = { 
          width: window.innerWidth, 
          height: window.innerHeight 
        };
        
        const visibleWidth = Math.max(0, Math.min(rect.right, viewport.width) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, viewport.height) - Math.max(rect.top, 0));
        const visibleArea = visibleWidth * visibleHeight;
        const totalArea = rect.width * rect.height;
        
        return totalArea > 0 ? (visibleArea / totalArea) : 0;
      } catch {
        return 0;
      }
    }

    static isAdLoaded(element) {
      return element.getAttribute('data-adsbygoogle-status') === 'done' ||
             element.querySelector('iframe[src*="googleads"]') !== null ||
             element.innerHTML.trim().length > 100;
    }

    static preventLayoutShift(element) {
      const rect = element.getBoundingClientRect();
      const width = rect.width || 320;
      const height = rect.height || 250;
      
      element.style.minWidth = `${Math.min(width, 728)}px`;
      element.style.minHeight = `${Math.max(height, 100)}px`;
      element.style.display = 'block';
      element.style.overflow = 'hidden';
    }
  }

  // Optimized Network Preconnection
  class NetworkOptimizer {
    static preconnect() {
      const fragment = document.createDocumentFragment();
      
      CONFIG.PRECONNECT_DOMAINS.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        fragment.appendChild(link);
      });
      
      document.head.appendChild(fragment);
      logger.info('Network preconnection completed');
    }
  }

  // Fast Script Loader
  class ScriptLoader {
    static async loadAdSenseScript() {
      if (STATE.scriptLoaded) return true;
      if (STATE.scriptLoading) return this.waitForScript();

      STATE.scriptLoading = true;
      logger.info('Loading AdSense script...');

      try {
        await this.createScript();
        await this.verifyScript();
        
        STATE.scriptLoaded = true;
        STATE.scriptLoading = false;
        logger.info('AdSense script loaded successfully');
        return true;
      } catch (error) {
        STATE.scriptLoading = false;
        logger.error('Script loading failed', error.message);
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
        
        const timeout = setTimeout(() => {
          script.remove();
          reject(new Error('Script load timeout'));
        }, 8000);

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
      while (typeof window.adsbygoogle === 'undefined' && attempts < 80) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      if (typeof window.adsbygoogle === 'undefined') {
        throw new Error('AdSense script verification failed');
      }
      
      if (!Array.isArray(window.adsbygoogle)) {
        window.adsbygoogle = [];
      }
    }

    static initializeFallback() {
      window.adsbygoogle = window.adsbygoogle || [];
      STATE.scriptLoaded = true;
      logger.warn('Fallback initialization completed');
    }

    static async waitForScript() {
      let attempts = 0;
      while (STATE.scriptLoading && attempts < 100) {
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

      logger.info('Initializing Auto Ads...');

      try {
        // Wait for script readiness
        if (!STATE.scriptLoaded) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Multiple auto ads pushes for better coverage
        const autoAdsConfigs = [
          {
            google_ad_client: CONFIG.CLIENT_ID,
            enable_page_level_ads: true,
            overlays: { bottom: true }
          },
          {
            google_ad_client: CONFIG.CLIENT_ID,
            enable_page_level_ads: true
          }
        ];

        // Push configurations with delays
        autoAdsConfigs.forEach((config, index) => {
          setTimeout(() => {
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push(config);
              logger.info(`Auto ads config ${index + 1} pushed`);
            } catch (error) {
              logger.warn(`Auto ads push ${index + 1} failed`, error.message);
            }
          }, index * 1000);
        });

        STATE.autoAdsInitialized = true;
        logger.info('Auto Ads initialized successfully');

        // Verify after delay
        setTimeout(() => this.verifyAutoAds(), 5000);

      } catch (error) {
        logger.error('Auto Ads initialization failed', error.message);
      }
    }

    static verifyAutoAds() {
      const autoAdElements = document.querySelectorAll('[data-google-query-id], [data-ad-client="' + CONFIG.CLIENT_ID + '"]');
      
      if (autoAdElements.length > 0) {
        logger.info(`Auto Ads verification: ${autoAdElements.length} elements found`);
      } else {
        logger.warn('Auto Ads verification: No elements found');
      }
    }

    static forceReinitialize() {
      STATE.autoAdsInitialized = false;
      setTimeout(() => this.initialize(), 100);
    }
  }

  // Streamlined Ad Manager
  class AdManager {
    constructor() {
      this.loadedAds = new Set();
      this.failedAds = new Set();
    }

    async discoverAds() {
      const elements = Array.from(document.querySelectorAll(CONFIG.AD_SELECTOR));
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
          attempts: 0
        };
        
        element.setAttribute('data-ad-id', adId);
        STATE.adRegistry.set(adId, adData);
        return adData;
      });

      STATE.totalAds = ads.length;
      return ads;
    }

    calculatePriority(element) {
      try {
        const rect = element.getBoundingClientRect();
        const visibility = AdUtils.calculateVisibility(element);
        
        let priority = 50; // Base priority
        
        // Above fold bonus
        if (rect.top < window.innerHeight && rect.top >= 0) priority += 30;
        
        // Visibility bonus
        priority += visibility * 20;
        
        // Size bonus
        const area = rect.width * rect.height;
        if (area > 200 * 200) priority += 15;
        
        // Position bonus
        if (rect.top < 300) priority += 10;
        
        return Math.min(100, Math.max(1, Math.round(priority)));
      } catch {
        return 50;
      }
    }

    async loadAd(adData) {
      if (this.loadedAds.has(adData.id) || 
          adData.element.hasAttribute('data-ads-loaded') ||
          STATE.processingQueue.has(adData.id)) {
        return true;
      }
      
      const startTime = Date.now();
      adData.attempts++;
      
      try {
        logger.info(`Loading ad: ${adData.id}`);
        
        AdUtils.preventLayoutShift(adData.element);
        this.ensureAdAttributes(adData.element);
        
        adData.status = 'loading';
        STATE.processingQueue.add(adData.id);
        
        await this.executeAdLoad(adData);
        
        this.handleLoadSuccess(adData, Date.now() - startTime);
        return true;
      } catch (error) {
        if (adData.attempts < CONFIG.MAX_RETRY_ATTEMPTS) {
          const delay = CONFIG.RETRY_DELAY * adData.attempts;
          logger.warn(`Ad load failed, retrying in ${delay}ms: ${adData.id}`);
          
          setTimeout(() => this.loadAd(adData), delay);
          return false;
        }
        
        this.handleLoadFailure(adData, error);
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
        element.setAttribute('data-ad-slot', `auto-${Date.now()}`);
      }
      
      if (!element.hasAttribute('data-ad-format')) {
        element.setAttribute('data-ad-format', 'auto');
      }
      
      element.setAttribute('data-full-width-responsive', 'true');
    }

    async executeAdLoad(adData) {
      return new Promise((resolve, reject) => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          
          // Quick check
          setTimeout(() => {
            if (AdUtils.isAdLoaded(adData.element)) {
              resolve();
            }
          }, 500);
          
          // Extended check
          const timeout = setTimeout(() => {
            if (AdUtils.isAdLoaded(adData.element)) {
              resolve();
            } else {
              reject(new Error('Ad load timeout'));
            }
          }, 5000);
          
        } catch (error) {
          reject(error);
        }
      });
    }

    handleLoadSuccess(adData, loadTime) {
      adData.status = 'loaded';
      adData.element.setAttribute('data-ads-loaded', 'true');
      
      STATE.loadedAds++;
      this.loadedAds.add(adData.id);
      
      logger.info(`Ad loaded successfully: ${adData.id} (${loadTime}ms)`);
    }

    handleLoadFailure(adData, error) {
      adData.status = 'failed';
      adData.element.setAttribute('data-ad-failed', 'true');
      
      STATE.failedAds++;
      this.failedAds.add(adData.id);
      
      logger.error(`Ad load failed: ${adData.id}`, error.message);
    }

    async batchProcess(ads) {
      const batches = [];
      for (let i = 0; i < ads.length; i += CONFIG.BATCH_SIZE) {
        batches.push(ads.slice(i, i + CONFIG.BATCH_SIZE));
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i].filter(ad => 
          !ad.element.hasAttribute('data-ads-loaded') && 
          !STATE.processingQueue.has(ad.id)
        );
        
        if (batch.length === 0) continue;
        
        const promises = batch.map(ad => this.loadAd(ad));
        await Promise.allSettled(promises);
        
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        }
      }
    }
  }

  // Efficient Lazy Load Manager
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

      logger.info('Lazy load manager initialized');
      return true;
    }

    observeAd(adData) {
      if (this.observer && !adData.element.hasAttribute('data-ads-loaded')) {
        this.observer.observe(adData.element);
      }
    }

    async handleIntersection(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const adData = this.findAdData(entry.target);
          if (adData && adData.status === 'discovered') {
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

    async loadVisibleAds() {
      const visibleAds = Array.from(STATE.adRegistry.values()).filter(ad => {
        const rect = ad.element.getBoundingClientRect();
        return rect.top < window.innerHeight && 
               rect.bottom > 0 && 
               !ad.element.hasAttribute('data-ads-loaded');
      });

      if (visibleAds.length > 0) {
        logger.info(`Loading ${visibleAds.length} immediately visible ads`);
        visibleAds.sort((a, b) => b.priority - a.priority);
        await this.adManager.batchProcess(visibleAds);
      }
    }
  }

  // Main AdSense Controller v3.6 Final
  class AdSenseController {
    constructor() {
      this.adManager = new AdManager();
      this.lazyLoadManager = new LazyLoadManager(this.adManager);
      this.initialized = false;
    }

    async initialize() {
      if (this.initialized) return;
      this.initialized = true;

      logger.info('🚀 AdSense Optimizer v3.6 Final initializing...');

      try {
        await this.setupOptimalLoading();
        STATE.initialized = true;
        logger.info('✅ AdSense Optimizer v3.6 Final ready');
      } catch (error) {
        logger.error('Initialization failed', error.message);
      }
    }

    async setupOptimalLoading() {
      // Wait for page load completion
      await AdUtils.waitForPageLoad();
      
      // Additional delay for performance
      await new Promise(resolve => setTimeout(resolve, CONFIG.LOAD_DELAY));
      
      await this.executeLoadSequence();
    }

    async executeLoadSequence() {
      try {
        // Phase 1: Network optimization
        NetworkOptimizer.preconnect();
        
        // Phase 2: Load AdSense script
        await ScriptLoader.loadAdSenseScript();
        
        // Phase 3: Initialize Auto Ads (non-blocking)
        if (CONFIG.AUTO_ADS_ENABLED) {
          AutoAdsManager.initialize();
        }
        
        // Phase 4: Discover and setup manual ads
        const ads = await this.adManager.discoverAds();
        
        if (ads.length === 0) {
          logger.info('No manual ads found');
          return;
        }

        // Phase 5: Setup lazy loading
        const lazyLoadSupported = this.lazyLoadManager.initialize();
        
        if (lazyLoadSupported) {
          ads.forEach(ad => this.lazyLoadManager.observeAd(ad));
          await this.lazyLoadManager.loadVisibleAds();
        } else {
          const sortedAds = ads.sort((a, b) => b.priority - a.priority);
          await this.adManager.batchProcess(sortedAds);
        }

        logger.info('Load sequence completed', {
          totalAds: STATE.totalAds,
          loadedAds: STATE.loadedAds,
          autoAdsEnabled: CONFIG.AUTO_ADS_ENABLED
        });

      } catch (error) {
        logger.error('Load sequence failed', error.message);
      }
    }

    // Public API
    getStatus() {
      return {
        version: '3.6-Final',
        ads: {
          total: STATE.totalAds,
          loaded: STATE.loadedAds,
          failed: STATE.failedAds,
          successRate: STATE.totalAds > 0 ? Math.round((STATE.loadedAds / STATE.totalAds) * 100) : 0
        },
        autoAds: {
          enabled: CONFIG.AUTO_ADS_ENABLED,
          initialized: STATE.autoAdsInitialized
        }
      };
    }

    async forcePushAds() {
      logger.info('🔧 Force pushing ads');
      
      if (CONFIG.AUTO_ADS_ENABLED) {
        AutoAdsManager.forceReinitialize();
      }

      const ads = Array.from(STATE.adRegistry.values()).filter(ad => 
        !ad.element.hasAttribute('data-ads-loaded') &&
        !STATE.processingQueue.has(ad.id)
      );
      
      if (ads.length > 0) {
        await this.adManager.batchProcess(ads);
      }
      
      return { attempted: ads.length };
    }
  }

  // Initialize AdSense Optimizer
  async function initializeAdSenseOptimizer() {
    try {
      const controller = new AdSenseController();
      await controller.initialize();
      
      // Minimal global API
      window.AdSenseOptimizer = {
        version: '3.6-Final',
        getStatus: () => controller.getStatus(),
        forcePushAds: () => controller.forcePushAds(),
        reinitializeAutoAds: () => AutoAdsManager.forceReinitialize()
      };
      
      logger.info('🎉 AdSense Optimizer v3.6 Final ready');
      return controller;
    } catch (error) {
      logger.error('Failed to initialize AdSense Optimizer', error.message);
    }
  }

  // Smart initialization system
  const initSystem = {
    promise: null,
    
    async tryInitialize() {
      if (this.promise) return this.promise;
      this.promise = initializeAdSenseOptimizer();
      return this.promise;
    }
  };

  // Page load trigger
  if (document.readyState === 'complete') {
    setTimeout(() => initSystem.tryInitialize(), 100);
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => initSystem.tryInitialize(), 200);
    }, { once: true });
  }

  // User interaction trigger
  const interactionEvents = ['click', 'scroll', 'touchstart'];
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

  // Fallback timeout
  setTimeout(() => {
    if (!initSystem.promise) {
      initSystem.tryInitialize();
    }
  }, 10000);

  // Minimal console output
  console.log('%c🚀 AdSense Optimizer v3.6 Final - Performance Optimized', 'color: #4285f4; font-weight: bold;');

})();
