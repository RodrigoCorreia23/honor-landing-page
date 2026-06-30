window.HonorIntegrations = (function () {
  'use strict';

  /*
   * IDs confirmados para a operacao Honor Growth.
   * Antes de reutilizar noutra marca, confirme dominio, Meta Business,
   * conta Umami e conta GoHighLevel.
   */
  var CONFIG = {
    metaPixelId:       '736478694950337',
    umamiWebsiteId:    'd0308b96-5f36-4328-86ca-e83f3315d320',
    umamiScriptUrl:    'https://cloud.umami.is/script.js',
    ghlFormId:         'eQoZuhMtktMEHwP0Pxty',
    ghlIframeBaseUrl:  'https://api.leadconnectorhq.com/widget/form/',
    ghlEmbedScriptUrl: 'https://link.msgsndr.com/js/form_embed.js',
    ghlOrigin:         'https://api.leadconnectorhq.com'
  };

  var _umamiLoaded     = false;
  var _pixelLoaded     = false;
  var _ghlEmbedLoaded  = false;

  var GHL_TARGETS = [
    { containerId: 'hg-ghl-inline', iframeId: 'page-' + CONFIG.ghlFormId },
    { containerId: 'hg-ghl-modal', iframeId: 'inline-' + CONFIG.ghlFormId }
  ];

  function _hasConsent(category) {
    return !!(
      window.HonorConsent &&
      typeof window.HonorConsent.hasConsent === 'function' &&
      window.HonorConsent.hasConsent(category)
    );
  }

  function trackAnalytics(eventName, payload) {
    if (!_hasConsent('analytics')) return;
    if (!window.umami || typeof window.umami.track !== 'function') return;
    window.umami.track(eventName, payload || {});
  }

  function loadUmamiOnce() {
    if (_umamiLoaded || !CONFIG.umamiWebsiteId || !_hasConsent('analytics')) return;
    _umamiLoaded = true;

    var s = document.createElement('script');
    s.src = CONFIG.umamiScriptUrl;
    s.defer = true;
    s.setAttribute('data-website-id', CONFIG.umamiWebsiteId);
    document.head.appendChild(s);
  }

  function loadMetaPixelOnce() {
    if (_pixelLoaded || !CONFIG.metaPixelId || !_hasConsent('marketing')) return;
    _pixelLoaded = true;

    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
    n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
    s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    fbq('init', CONFIG.metaPixelId);
    fbq('track', 'PageView');
  }

  function _loadGhlEmbedScript() {
    if (_ghlEmbedLoaded) return;
    _ghlEmbedLoaded = true;

    var s = document.createElement('script');
    s.src = CONFIG.ghlEmbedScriptUrl;
    document.body.appendChild(s);
  }

  function _placeholderHTML(containerId, iframeId) {
    return (
      '<div class="hg-ghl-placeholder" role="region" aria-label="Formulário de contacto">' +
        '<div class="hg-ghl-placeholder-icon" aria-hidden="true">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"' +
          ' fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
        '</div>' +
        '<p class="hg-ghl-placeholder-title">Formulário protegido</p>' +
        '<p class="hg-ghl-placeholder-desc">' +
          'Este formulário é fornecido pelo GoHighLevel / LeadConnector. Pode aceitar cookies funcionais ou carregar apenas este formulário agora.' +
        '</p>' +
        '<div class="hg-ghl-placeholder-actions">' +
          '<button type="button" class="hg-ghl-placeholder-btn hg-ghl-placeholder-btn-primary"' +
          ' data-ghl-load-form data-container-id="' + containerId + '" data-iframe-id="' + iframeId + '">' +
            'Carregar formulário' +
          '</button>' +
          '<button type="button" class="hg-ghl-placeholder-btn"' +
          ' data-open-cookie-preferences>' +
            'Gerir preferências de cookies' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function _makeIframe(iframeId) {
    var iframe = document.createElement('iframe');
    iframe.src = CONFIG.ghlIframeBaseUrl + CONFIG.ghlFormId;
    iframe.style.cssText = 'width:100%;height:713px;opacity:0;border:none;border-radius:12px;display:block;transition:opacity .35s ease;';
    iframe.id = iframeId;
    iframe.setAttribute('data-layout', "{'id':'INLINE'}");
    iframe.setAttribute('data-trigger-type',       'alwaysShow');
    iframe.setAttribute('data-trigger-value',      '');
    iframe.setAttribute('data-activation-type',    'alwaysActivated');
    iframe.setAttribute('data-activation-value',   '');
    iframe.setAttribute('data-deactivation-type',  'neverDeactivate');
    iframe.setAttribute('data-deactivation-value', '');
    iframe.setAttribute('data-form-name',          'call agent ads');
    iframe.setAttribute('data-height',             '713');
    iframe.setAttribute('data-layout-iframe-id',   iframeId);
    iframe.setAttribute('data-form-id',            CONFIG.ghlFormId);
    iframe.setAttribute('title',                   'Diagnóstico comercial Honor Growth');
    iframe.addEventListener('load', function () {
      iframe.dataset.honorLoaded = 'true';
    }, { once: true });
    return iframe;
  }

  function loadGhlContainer(containerId, iframeId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    if (document.getElementById(iframeId)) return;

    container.innerHTML = '';
    container.appendChild(_makeIframe(iframeId));
    _loadGhlEmbedScript();
  }

  function resetGhlContainer(containerId, iframeId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = _placeholderHTML(containerId, iframeId);
  }

  function refreshGhlContainers() {
    GHL_TARGETS.forEach(function (target) {
      loadGhlContainer(target.containerId, target.iframeId);
    });
  }

  function _bindPlaceholderActions() {
    document.addEventListener('click', function (e) {
      var loadBtn = e.target.closest('[data-ghl-load-form]');
      if (loadBtn) {
        loadGhlContainer(
          loadBtn.getAttribute('data-container-id'),
          loadBtn.getAttribute('data-iframe-id')
        );
        return;
      }

      var prefsBtn = e.target.closest('[data-open-cookie-preferences]');
      if (prefsBtn && window.HonorConsent) {
        window.HonorConsent.openPreferences();
      }
    });
  }

  window.addEventListener('honorConsent:changed', function (e) {
    var prefs = e.detail || {};

    if (prefs.analytics) loadUmamiOnce();
    if (prefs.marketing) loadMetaPixelOnce();

    if (prefs.functional) {
      refreshGhlContainers();
      return;
    }

    GHL_TARGETS.forEach(function (target) {
      resetGhlContainer(target.containerId, target.iframeId);
    });
  });

  _bindPlaceholderActions();

  return {
    trackAnalytics:       trackAnalytics,
    loadGhlContainer:     loadGhlContainer,
    CONFIG: CONFIG
  };
}());
