(function() {
  'use strict';

  // Configuration Constants
  const CONFIG = {
    CLIENT_ID: 'ca-pub-7407983524344370',
    SCRIPT_URL: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    AD_SELECTOR: '.lazy-ads',
    MAX_RETRIES: 15,
    RETRY_INTERVAL: 5000,
    SCRIPT_TIMEOUT: 10000,
    AD_LOAD_TIMEOUT: 30000,
    PAGE_LOAD_DELAY: 3000,
    AD_BATCH_SIZE: 3,
    AD_BATCH_DELAY: 500,
    HEALTH_CHECK_INTERVAL: 10000,
    VIEWPORT_CHECK: true,
    MUTATION_OBSERVER: true
  };

  // State Management
  const STATE = {
    scriptLoaded: false,
    scriptLoading: false,
    adsenseReady: false,
    totalAds: 0,
    loadedAds: 0,
    failedAds: 0,
    retryCount: 0,
    isRunning: false,
    pageFullyLoaded: false,
    observers: [],
    timers: [],
    adQueue: new Set(),
    loadedAdIds: new WeakSet(),
    failedAdIds: new WeakSet()
  };

  // Logger with levels
  const Logger = {
    levels: { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 },
    currentLevel: 2,
    
    log(level, message, ...args) {
      if (this.levels[level] <= this.currentLevel) {
        const timestamp = new Date().toISOString();
        console[level.toLowerCase()](`[AdSense ${timestamp}] ${message}`, ...args);
      }
    },
    
    error: (msg, ...args) => Logger.log('ERROR', msg, ...args),
    warn: (msg, ...args) => Logger.log('WARN', msg, ...args),
    info: (msg, ...args) => Logger.log('INFO', msg, ...args),
    debug: (msg, ...args) => Logger.log('DEBUG', msg, ...args)
  };

  // Utility Functions
  const Utils = {
    // Advanced page load detection
    isPageFullyLoaded() {
      const timing = window.performance?.timing;
      const navigation = window.performance?.getEntriesByType?.('navigation')?.[0];
      
      return document.readyState === 'complete' &&
             (!timing || timing.loadEventEnd > 0) &&
             (!navigation || navigation.loadEventEnd > 0) &&
             document.body &&
             document.head;
    },

    // Network connectivity check
    async checkNetworkConnectivity() {
      if (!navigator.onLine) return false;
      
      try {
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        });
        return true;
      } catch {
        return navigator.onLine;
      }
    },

    // Viewport detection
    isInViewport(element) {
      if (!CONFIG.VIEWPORT_CHECK) return true;
      
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;
      
      return rect.top >= -100 && 
             rect.left >= -100 && 
             rect.bottom <= windowHeight + 100 && 
             rect.right <= windowWidth + 100;
    },

    // Generate unique ID for ads
    generateAdId(element) {
      return element.id || 
             element.dataset.adId || 
             `ad-${Array.from(document.querySelectorAll(CONFIG.AD_SELECTOR)).indexOf(element)}`;
    },

    // Debounce function
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // Promise with timeout
    promiseWithTimeout(promise, timeoutMs, errorMessage) {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
        )
      ]);
    }
  };

  // AdSense Script Loader
  const ScriptLoader = {
    async loadScript() {
      if (STATE.scriptLoaded) return true;
      if (STATE.scriptLoading) {
        return this.waitForScript();
      }

      STATE.scriptLoading = true;
      Logger.info('Loading AdSense script...');

      try {
        // Check network connectivity first
        const isOnline = await Utils.checkNetworkConnectivity();
        if (!isOnline) {
          throw new Error('No network connectivity');
        }

        const script = document.createElement('script');
        script.src = `${CONFIG.SCRIPT_URL}?client=${CONFIG.CLIENT_ID}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.setAttribute('data-ad-client', CONFIG.CLIENT_ID);

        const loadPromise = new Promise((resolve, reject) => {
          script.onload = () => {
            STATE.scriptLoaded = true;
            STATE.scriptLoading = false;
            Logger.info('AdSense script loaded successfully');
            resolve(true);
          };

          script.onerror = () => {
            STATE.scriptLoading = false;
            reject(new Error('Script failed to load'));
          };
        });

        document.head.appendChild(script);

        await Utils.promiseWithTimeout(
          loadPromise, 
          CONFIG.SCRIPT_TIMEOUT, 
          'Script loading timeout'
        );

        // Wait for adsbygoogle to be available
        await this.waitForAdsByGoogle();
        return true;

      } catch (error) {
        STATE.scriptLoading = false;
        Logger.error('Script loading failed:', error.message);
        throw error;
      }
    },

    async waitForScript() {
      let attempts = 0;
      while (STATE.scriptLoading && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      return STATE.scriptLoaded;
    },

    async waitForAdsByGoogle() {
      let attempts = 0;
      while (typeof window.adsbygoogle === 'undefined' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (typeof window.adsbygoogle === 'undefined') {
        window.adsbygoogle = [];
      }
      
      STATE.adsenseReady = true;
      Logger.info('AdsByGoogle is ready');
    }
  };

  // Ad Manager
  const AdManager = {
    // Discover all ads
    discoverAds() {
      const ads = Array.from(document.querySelectorAll(CONFIG.AD_SELECTOR));
      const newAds = ads.filter(ad => 
        !STATE.loadedAdIds.has(ad) && 
        !STATE.failedAdIds.has(ad)
      );

      Logger.info(`Discovered ${ads.length} total ads, ${newAds.length} new ads`);
      STATE.totalAds = ads.length;

      return newAds.map(ad => ({
        element: ad,
        id: Utils.generateAdId(ad),
        inViewport: Utils.isInViewport(ad),
        attempts: 0
      }));
    },

    // Validate ad element
    validateAd(adData) {
      const { element } = adData;
      
      // Check if element is still in DOM
      if (!document.contains(element)) {
        Logger.warn(`Ad ${adData.id} no longer in DOM`);
        return false;
      }

      // Check required attributes
      const requiredAttrs = ['data-ad-client', 'data-ad-slot'];
      const missingAttrs = requiredAttrs.filter(attr => !element.hasAttribute(attr));
      
      if (missingAttrs.length > 0) {
        Logger.warn(`Ad ${adData.id} missing attributes:`, missingAttrs);
        // Auto-fix if possible
        if (!element.hasAttribute('data-ad-client')) {
          element.setAttribute('data-ad-client', CONFIG.CLIENT_ID);
        }
      }

      // Check if already processed
      if (element.hasAttribute('data-adsbygoogle-status')) {
        Logger.debug(`Ad ${adData.id} already processed`);
        return false;
      }

      return true;
    },

    // Load single ad
    async loadSingleAd(adData) {
      const { element, id } = adData;

      try {
        Logger.debug(`Loading ad ${id}...`);

        // Validate before loading
        if (!this.validateAd(adData)) {
          throw new Error('Ad validation failed');
        }

        // Check viewport if enabled
        if (CONFIG.VIEWPORT_CHECK && !Utils.isInViewport(element)) {
          Logger.debug(`Ad ${id} not in viewport, skipping`);
          return false;
        }

        // Ensure adsbygoogle is ready
        if (!STATE.adsenseReady || typeof window.adsbygoogle === 'undefined') {
          throw new Error('AdsByGoogle not ready');
        }

        // Mark as processing
        element.setAttribute('data-ad-processing', 'true');

        // Push to adsbygoogle with timeout
        const loadPromise = new Promise((resolve, reject) => {
          try {
            window.adsbygoogle.push({});
            
            // Check if ad loaded successfully after a delay
            setTimeout(() => {
              const status = element.getAttribute('data-adsbygoogle-status');
              if (status === 'done' || element.querySelector('iframe')) {
                resolve(true);
              } else {
                reject(new Error('Ad did not render'));
              }
            }, 2000);
            
          } catch (error) {
            reject(error);
          }
        });

        await Utils.promiseWithTimeout(
          loadPromise,
          CONFIG.AD_LOAD_TIMEOUT,
          `Ad ${id} loading timeout`
        );

        // Mark as loaded
        element.removeAttribute('data-ad-processing');
        element.setAttribute('data-ad-loaded', 'true');
        STATE.loadedAdIds.add(element);
        STATE.loadedAds++;

        Logger.info(`Ad ${id} loaded successfully`);
        return true;

      } catch (error) {
        element.removeAttribute('data-ad-processing');
        element.setAttribute('data-ad-failed', 'true');
        STATE.failedAdIds.add(element);
        STATE.failedAds++;
        
        Logger.error(`Ad ${id} failed to load:`, error.message);
        return false;
      }
    },

    // Load ads in batches
    async loadAdsBatch(ads) {
      const batches = [];
      for (let i = 0; i < ads.length; i += CONFIG.AD_BATCH_SIZE) {
        batches.push(ads.slice(i, i + CONFIG.AD_BATCH_SIZE));
      }

      Logger.info(`Loading ${ads.length} ads in ${batches.length} batches`);

      for (const batch of batches) {
        const promises = batch.map(ad => this.loadSingleAd(ad));
        await Promise.allSettled(promises);
        
        // Delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.AD_BATCH_DELAY));
        }
      }
    }
  };

  // Main Controller
  const Controller = {
    async initialize() {
      if (STATE.isRunning) {
        Logger.warn('Controller already running');
        return;
      }

      STATE.isRunning = true;
      Logger.info('Initializing AdSense loader...');

      try {
        // Wait for page to be fully loaded
        await this.waitForPageLoad();
        
        // Load AdSense script
        await ScriptLoader.loadScript();
        
        // Start mutation observer if enabled
        if (CONFIG.MUTATION_OBSERVER) {
          this.startMutationObserver();
        }

        // Start viewport observer
        this.startViewportObserver();
        
        // Start health check
        this.startHealthCheck();
        
        // Initial ad loading
        await this.loadAllAds();
        
        Logger.info('Initialization complete');

      } catch (error) {
        Logger.error('Initialization failed:', error.message);
        this.scheduleRetry();
      }
    },

    async waitForPageLoad() {
      Logger.info('Waiting for page to fully load...');
      
      while (!Utils.isPageFullyLoaded()) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Additional delay for safety
      await new Promise(resolve => setTimeout(resolve, CONFIG.PAGE_LOAD_DELAY));
      
      STATE.pageFullyLoaded = true;
      Logger.info('Page fully loaded');
    },

    async loadAllAds() {
      try {
        Logger.info(`Starting ad loading attempt ${STATE.retryCount + 1}/${CONFIG.MAX_RETRIES + 1}`);

        const ads = AdManager.discoverAds();
        
        if (ads.length === 0) {
          Logger.warn('No ads found to load');
          return;
        }

        await AdManager.loadAdsBatch(ads);

        const successRate = STATE.totalAds > 0 ? (STATE.loadedAds / STATE.totalAds * 100).toFixed(1) : 0;
        Logger.info(`Ad loading complete: ${STATE.loadedAds}/${STATE.totalAds} (${successRate}%) loaded`);

        // Check if we should retry
        if (STATE.failedAds > 0 && STATE.retryCount < CONFIG.MAX_RETRIES) {
          this.scheduleRetry();
        }

      } catch (error) {
        Logger.error('Ad loading failed:', error.message);
        this.scheduleRetry();
      }
    },

    scheduleRetry() {
      if (STATE.retryCount >= CONFIG.MAX_RETRIES) {
        Logger.warn(`Maximum retries (${CONFIG.MAX_RETRIES}) reached`);
        return;
      }

      STATE.retryCount++;
      const delay = CONFIG.RETRY_INTERVAL * (1 + Math.random() * 0.2); // Add jitter
      
      Logger.info(`Scheduling retry ${STATE.retryCount} in ${(delay/1000).toFixed(1)}s`);
      
      const timer = setTimeout(() => {
        this.loadAllAds();
      }, delay);
      
      STATE.timers.push(timer);
    },

    startMutationObserver() {
      const observer = new MutationObserver(Utils.debounce(() => {
        Logger.debug('DOM mutations detected, checking for new ads...');
        this.loadAllAds();
      }, 1000));

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      STATE.observers.push(observer);
      Logger.info('Mutation observer started');
    },

    startViewportObserver() {
      if (!CONFIG.VIEWPORT_CHECK || !window.IntersectionObserver) return;

      const observer = new IntersectionObserver(Utils.debounce((entries) => {
        const visibleAds = entries.filter(entry => entry.isIntersecting);
        if (visibleAds.length > 0) {
          Logger.debug(`${visibleAds.length} ads entered viewport`);
          this.loadAllAds();
        }
      }, 500), {
        rootMargin: '100px'
      });

      // Observe existing ads
      document.querySelectorAll(CONFIG.AD_SELECTOR).forEach(ad => {
        observer.observe(ad);
      });

      STATE.observers.push(observer);
      Logger.info('Viewport observer started');
    },

    startHealthCheck() {
      const healthCheck = setInterval(() => {
        Logger.debug(`Health check: ${STATE.loadedAds}/${STATE.totalAds} ads loaded`);
        
        // Check for new ads
        const currentAds = document.querySelectorAll(CONFIG.AD_SELECTOR).length;
        if (currentAds > STATE.totalAds) {
          Logger.info(`New ads detected: ${currentAds} vs ${STATE.totalAds}`);
          this.loadAllAds();
        }
        
        // Check for failed ads that might be retryable
        if (STATE.failedAds > 0 && STATE.retryCount < CONFIG.MAX_RETRIES) {
          this.loadAllAds();
        }
        
      }, CONFIG.HEALTH_CHECK_INTERVAL);

      STATE.timers.push(healthCheck);
      Logger.info('Health check started');
    },

    // Public API
    getStatus() {
      return {
        scriptLoaded: STATE.scriptLoaded,
        adsenseReady: STATE.adsenseReady,
        totalAds: STATE.totalAds,
        loadedAds: STATE.loadedAds,
        failedAds: STATE.failedAds,
        successRate: STATE.totalAds > 0 ? (STATE.loadedAds / STATE.totalAds * 100).toFixed(1) + '%' : '0%',
        retryCount: STATE.retryCount,
        isRunning: STATE.isRunning
      };
    },

    forceReload() {
      Logger.info('Force reload requested');
      STATE.retryCount = 0;
      STATE.loadedAds = 0;
      STATE.failedAds = 0;
      STATE.loadedAdIds = new WeakSet();
      STATE.failedAdIds = new WeakSet();
      
      // Clear existing ad states
      document.querySelectorAll(CONFIG.AD_SELECTOR).forEach(ad => {
        ad.removeAttribute('data-ad-loaded');
        ad.removeAttribute('data-ad-failed');
        ad.removeAttribute('data-ad-processing');
      });
      
      this.loadAllAds();
    },

    destroy() {
      Logger.info('Destroying AdSense loader');
      
      STATE.isRunning = false;
      
      // Clear timers
      STATE.timers.forEach(timer => clearTimeout(timer));
      STATE.timers = [];
      
      // Disconnect observers
      STATE.observers.forEach(observer => observer.disconnect());
      STATE.observers = [];
    }
  };

  // Event Listeners
  const setupEventListeners = () => {
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && STATE.failedAds > 0) {
        Logger.info('Page became visible, retrying failed ads');
        Controller.loadAllAds();
      }
    });

    // Network status change
    window.addEventListener('online', () => {
      Logger.info('Network reconnected, retrying ads');
      Controller.loadAllAds();
    });

    // Window focus
    window.addEventListener('focus', Utils.debounce(() => {
      if (STATE.failedAds > 0) {
        Logger.info('Window focused, retrying failed ads');
        Controller.loadAllAds();
      }
    }, 2000));
  };

  // Global API
  window.AdSenseLoader = {
    getStatus: () => Controller.getStatus(),
    forceReload: () => Controller.forceReload(),
    destroy: () => Controller.destroy(),
    setLogLevel: (level) => Logger.currentLevel = Logger.levels[level] || 2
  };

  // Auto-start based on page state
  const autoStart = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => Controller.initialize(), 1000);
      });
    } else if (document.readyState === 'interactive') {
      setTimeout(() => Controller.initialize(), 2000);
    } else {
      setTimeout(() => Controller.initialize(), 500);
    }

    // Fallback initialization
    setTimeout(() => {
      if (!STATE.isRunning) {
        Logger.warn('Fallback initialization triggered');
        Controller.initialize();
      }
    }, 10000);
  };

  // Initialize
  setupEventListeners();
  autoStart();

  Logger.info('Advanced AdSense Loader initialized');

})();
