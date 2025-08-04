(function() {
  'use strict';

  // AdSense Configuration
  const CONFIG = {
    CLIENT_ID: 'ca-pub-7407983524344370',
    SCRIPT_URL: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    AD_SELECTOR: '.lazy-ads, ins.adsbygoogle, .adsense-unit, [data-ad-client], .ads-container ins',
    LAZY_LOAD_MARGIN: '200px',
    LOAD_DELAY: 2000,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1500,
    BATCH_DELAY: 500,
    INTERSECTION_THRESHOLD: 0.1,
    AUTO_ADS_ENABLED: true,
    MOBILE_BREAKPOINT: 768,
    PRECONNECT_DOMAINS: [
      'https://pagead2.googlesyndication.com',
      'https://googleads.g.doubleclick.net',
      'https://tpc.googlesyndication.com'
    ],
    DEBUG_MODE: false
  };

  // State Management
  const STATE = {
    scriptLoaded: false,
    scriptLoading: false,
    initialized: false,
    autoAdsInitialized: false,
    totalAds: 0,
    loadedAds: 0,
    failedAds: 0,
    adRegistry: new Map(),
    processingQueue: new Set(),
    deviceType: window.innerWidth <= CONFIG.MOBILE_BREAKPOINT ? 'mobile' : 'desktop',
    connectionSpeed: navigator.connection ? navigator.connection.effectiveType : 'unknown'
  };

  // Logger
  const logger = {
    log: (msg, data) => CONFIG.DEBUG_MODE && console.log(`[AdSense] ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`[AdSense] ⚠️ ${msg}`, data || ''),
    error: (msg, data) => console.error(`[AdSense] ❌ ${msg}`, data || '')
  };

  // Utility Functions
  class AdUtils {
    static async waitForPageLoad() {
      if (document.readyState === 'complete') return;
      return new Promise(resolve => {
        document.addEventListener('readystatechange', () => {
          if (document.readyState === 'complete') resolve();
        }, { once: true });
      });
    }

    static generateAdId(element, index) {
      return element.id || element.dataset.adId || `ad_${index}_${Date.now()}`;
    }

    static preventLayoutShift(element) {
      try {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        let width = rect.width || parseInt(computedStyle.width) || 300;
        let height = rect.height || parseInt(computedStyle.height) || 250;

        if (STATE.deviceType === 'mobile') {
          width = Math.min(width, window.innerWidth - 20);
          height = Math.max(height, 100);
        } else {
          width = Math.min(width, 728);
          height = Math.max(height, 90);
        }

        Object.assign(element.style, {
          minWidth: `${width}px`,
          minHeight: `${height}px`,
          display: 'block',
          overflow: 'hidden'
        });

        if (!element.parentElement.classList.contains('ad-responsive-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'ad-responsive-wrapper';
          wrapper.style.cssText = `
            width: 100%;
            max-width: ${width}px;
            margin: 10px auto;
            text-align: center;
          `;
          element.parentNode.insertBefore(wrapper, element);
          wrapper.appendChild(element);
        }
      } catch (error) {
        logger.warn('Layout shift prevention failed', error.message);
      }
    }

    static isAdLoaded(element) {
      return (
        element.getAttribute('data-adsbygoogle-status') === 'done' ||
        element.querySelector('iframe[src*="googleads"], iframe[src*="googlesyndication"]') !== null ||
        (element.innerHTML.trim().length > 100 && element.querySelector('.adsbygoogle')) ||
        element.classList.contains('adsbygoogle')
      );
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
      if (fragment.children.length) document.head.appendChild(fragment);
      logger.log('Network preconnection completed');
    }
  }

  // Script Loader
  class ScriptLoader {
    static async loadAdSenseScript() {
      if (STATE.scriptLoaded) return true;
      if (STATE.scriptLoading) return this.waitForScript();

      STATE.scriptLoading = true;
      logger.log('Loading AdSense script...');

      try {
        await this.createScript();
        await this.verifyScript();
        STATE.scriptLoaded = true;
        logger.log('AdSense script loaded');
        return true;
      } catch (error) {
        logger.error('Script loading failed', error.message);
        this.initializeFallback();
        return true;
      } finally {
        STATE.scriptLoading = false;
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
        }, 10000);

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
      const maxAttempts = 100;
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
    }

    static initializeFallback() {
      window.adsbygoogle = window.adsbygoogle || [];
      STATE.scriptLoaded = true;
      logger.warn('Fallback initialization completed');
    }

    static async waitForScript() {
      let attempts = 0;
      const maxAttempts = 100;
      while (STATE.scriptLoading && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      return STATE.scriptLoaded;
    }
  }

  // Auto Ads Manager
  class AutoAdsManager {
    static async initialize() {
      if (STATE.autoAdsInitialized || !CONFIG.AUTO_ADS_ENABLED) return;
      logger.log('Initializing Auto Ads...');

      try {
        if (!STATE.scriptLoaded) await ScriptLoader.loadAdSenseScript();

        const config = {
          google_ad_client: CONFIG.CLIENT_ID,
          enable_page_level_ads: true,
          overlays: { bottom: STATE.deviceType === 'mobile' },
          auto_ad_settings: { ads_by_google: { status: true } }
        };

        setTimeout(() => {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push(config);
            logger.log('Auto ads pushed');
          } catch (error) {
            logger.warn('Auto ads push failed', error.message);
          }
        }, 1000);

        STATE.autoAdsInitialized = true;
        setTimeout(() => this.verifyAutoAds(), 5000);
      } catch (error) {
        logger.error('Auto Ads initialization failed', error.message);
      }
    }

    static verifyAutoAds() {
      const autoAdElements = document.querySelectorAll(
        '[data-google-query-id], [data-ad-client="' + CONFIG.CLIENT_ID + '"], .google-auto-placed'
      );
      if (autoAdElements.length > 0) {
        logger.log(`Auto Ads verification: ${autoAdElements.length} elements found`);
      } else {
        logger.warn('Auto Ads verification: No elements found');
        setTimeout(() => this.initialize(), 3000);
      }
    }
  }

  // Ad Manager
  class AdManager {
    constructor() {
      this.loadedAds = new Set();
      this.retryQueue = new Map();
    }

    async discoverAds() {
      const elements = Array.from(document.querySelectorAll(CONFIG.AD_SELECTOR))
        .filter(el => !el.hasAttribute('data-ad-processed'));
      logger.log(`Discovered ${elements.length} ad containers`);

      const ads = elements.map((element, index) => {
        const adId = AdUtils.generateAdId(element, index);
        const adData = {
          id: adId,
          element,
          index,
          priority: this.calculatePriority(element),
          status: 'discovered',
          attempts: 0
        };
        element.setAttribute('data-ad-id', adId);
        element.setAttribute('data-ad-processed', 'true');
        STATE.adRegistry.set(adId, adData);
        return adData;
      });

      STATE.totalAds = ads.length;
      return ads;
    }

    calculatePriority(element) {
      try {
        const rect = element.getBoundingClientRect();
        let priority = 50;
        if (rect.top < window.innerHeight && rect.top >= 0) priority += 30;
        const area = rect.width * rect.height;
        if (area > 200 * 200) priority += 10;
        if (rect.top < 300) priority += 10;
        return Math.min(100, Math.max(1, priority));
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

      adData.attempts++;
      STATE.processingQueue.add(adData.id);

      try {
        logger.log(`Loading ad: ${adData.id} (attempt ${adData.attempts})`);
        AdUtils.preventLayoutShift(adData.element);
        this.ensureAdAttributes(adData.element);

        await this.executeAdLoad(adData);
        this.handleLoadSuccess(adData);
        return true;
      } catch (error) {
        if (adData.attempts < CONFIG.MAX_RETRY_ATTEMPT

S) {
          const delay = CONFIG.RETRY_DELAY * adData.attempts;
          logger.warn(`Ad load failed, retrying in ${delay}ms: ${adData.id}`);
          this.retryQueue.set(adData.id, setTimeout(() => {
            this.retryQueue.delete(adData.id);
            this.loadAd(adData);
          }, delay));
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
        const slot = element.getAttribute('data-ad-slot') || `auto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        element.setAttribute('data-ad-slot', slot);
      }
      element.setAttribute('data-ad-format', 'auto');
      element.setAttribute('data-full-width-responsive', 'true');
      if (!element.classList.contains('adsbygoogle')) {
        element.classList.add('adsbygoogle');
      }
    }

    async executeAdLoad(adData) {
      const timeoutDuration = ['slow-2g', '2g'].includes(STATE.connectionSpeed) ? 10000 : 5000;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (AdUtils.isAdLoaded(adData.element)) resolve();
          else reject(new Error('Ad load timeout'));
        }, timeoutDuration);

        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
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

    handleLoadSuccess(adData) {
      adData.status = 'loaded';
      adData.element.setAttribute('data-ads-loaded', 'true');
      STATE.loadedAds++;
      this.loadedAds.add(adData.id);
      logger.log(`Ad loaded: ${adData.id}`);
    }

    handleLoadFailure(adData, error) {
      adData.status = 'failed';
      adData.element.setAttribute('data-ad-failed', 'true');
      STATE.failedAds++;
      logger.error(`Ad load failed: ${adData.id}`, error.message);
    }

    async batchProcess(ads) {
      if (!ads.length) return;
      const sortedAds = ads.sort((a, b) => b.priority - a.priority);
      const batchSize = STATE.deviceType === 'mobile' ? 1 : 2;
      const batches = [];
      for (let i = 0; i < sortedAds.length; i += batchSize) {
        batches.push(sortedAds.slice(i, i + batchSize));
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i].filter(ad => 
          !ad.element.hasAttribute('data-ads-loaded') && 
          !STATE.processingQueue.has(ad.id));
        if (!batch.length) continue;

        logger.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} ads`);
        await Promise.allSettled(batch.map(ad => this.loadAd(ad)));
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        }
      }
    }

    updateAdSizes() {
      STATE.adRegistry.forEach(adData => {
        if (adData.status === 'loaded') {
          AdUtils.preventLayoutShift(adData.element);
        }
      });
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
        logger.warn('IntersectionObserver not supported, using fallback');
        return false;
      }
      this.observer = new IntersectionObserver(
        entries => this.handleIntersection(entries),
        { rootMargin: CONFIG.LAZY_LOAD_MARGIN, threshold: CONFIG.INTERSECTION_THRESHOLD }
      );
      logger.log('Lazy load manager initialized');
      return true;
    }

    observeAd(adData) {
      if (this.observer && !adData.element.hasAttribute('data-ads-loaded')) {
        this.observer.observe(adData.element);
        logger.log(`Observing ad: ${adData.id}`);
      }
    }

    async handleIntersection(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const adData = Array.from(STATE.adRegistry.values()).find(ad => ad.element === entry.target);
          if (adData && adData.status === 'discovered') {
            this.observer.unobserve(entry.target);
            this.adManager.loadAd(adData);
          }
        }
      }
    }

    async loadVisibleAds() {
      const visibleAds = Array.from(STATE.adRegistry.values()).filter(ad => {
        const rect = ad.element.getBoundingClientRect();
        return rect.top < window.innerHeight + 100 && 
               rect.bottom > -100 && 
               !ad.element.hasAttribute('data-ads-loaded');
      });

      if (visibleAds.length) {
        logger.log(`Loading ${visibleAds.length} immediately visible ads`);
        await this.adManager.batchProcess(visibleAds);
      }
    }
  }

  // Main Controller
  class AdSenseController {
    constructor() {
      this.adManager = new AdManager();
      this.lazyLoadManager = new LazyLoadManager(this.adManager);
      this.resizeTimeout = null;
    }

    async initialize() {
      if (STATE.initialized) return;
      STATE.initialized = true;
      logger.log('🚀 AdSense Optimizer initializing...');

      try {
        await AdUtils.waitForPageLoad();
        const loadDelay = ['slow-2g', '2g'].includes(STATE.connectionSpeed) ? CONFIG.LOAD_DELAY * 2 : CONFIG.LOAD_DELAY;
        await new Promise(resolve => setTimeout(resolve, loadDelay));
        await this.executeLoadSequence();
        this.setupResizeListener();
        setTimeout(() => this.finalAdCheck(), 10000);
        logger.log('✅ AdSense Optimizer ready');
      } catch (error) {
        logger.error('Initialization failed', error.message);
      }
    }

    async executeLoadSequence() {
      NetworkOptimizer.preconnect();
      await ScriptLoader.loadAdSenseScript();
      if (CONFIG.AUTO_ADS_ENABLED) AutoAdsManager.initialize();
      const ads = await this.adManager.discoverAds();

      if (!ads.length) {
        logger.log('No manual ads found');
        return;
      }

      const lazyLoadSupported = this.lazyLoadManager.initialize();
      if (lazyLoadSupported) {
        ads.forEach(ad => this.lazyLoadManager.observeAd(ad));
        await this.lazyLoadManager.loadVisibleAds();
      } else {
        await this.adManager.batchProcess(ads);
      }

      logger.log('Load sequence completed', {
        totalAds: STATE.totalAds,
        loadedAds: STATE.loadedAds
      });
    }

    setupResizeListener() {
      window.addEventListener('resize', () => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => this.adManager.updateAdSizes(), 200);
      });
    }

    finalAdCheck() {
      const unloadedAds = Array.from(STATE.adRegistry.values()).filter(ad => ad.status === 'discovered');
      if (unloadedAds.length) {
        logger.warn(`Found ${unloadedAds.length} unloaded ads, attempting to load`);
        this.adManager.batchProcess(unloadedAds);
      }
    }
  }

  // Initialize
  async function initializeAdSenseOptimizer() {
    const controller = new AdSenseController();
    await controller.initialize();
    window.AdSenseOptimizer = {
      version: '1.1',
      getStatus: () => ({
        totalAds: STATE.totalAds,
        loadedAds: STATE.loadedAds,
        failedAds: STATE.failedAds,
        autoAdsInitialized: STATE.autoAdsInitialized
      })
    };
  }

  // Trigger Initialization
  if (document.readyState === 'complete') {
    setTimeout(initializeAdSenseOptimizer, 100);
  } else {
    window.addEventListener('load', () => setTimeout(initializeAdSenseOptimizer, 100), { once: true });
  }

  // Fallback for Blogger CMS
  setTimeout(initializeAdSenseOptimizer, 8000);

  console.log('%c🚀 AdSense Optimizer v1.1', 'color: #4285f4; font-weight: bold;');
})();
