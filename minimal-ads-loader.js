// ads-lazy-global.js
window.addEventListener("load", function () {
  if (!window.adsbygoogle || !Array.isArray(window.adsbygoogle)) return;

  const adUnits = document.querySelectorAll("ins.adsbygoogle:not([data-loaded])");

  adUnits.forEach((ad) => {
    // Lazy load using IntersectionObserver
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            try {
              (adsbygoogle = window.adsbygoogle || []).push({});
              ad.setAttribute("data-loaded", "true");
            } catch (e) {
              console.warn("Ad load error:", e);
            }
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.25 });

      observer.observe(ad);
    } else {
      // Fallback if IntersectionObserver not supported
      try {
        (adsbygoogle = window.adsbygoogle || []).push({});
        ad.setAttribute("data-loaded", "true");
      } catch (e) {
        console.warn("Fallback Ad load error:", e);
      }
    }
  });
});
