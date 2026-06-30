/* ============================================================
 * HonorConsent — sistema de consentimento de cookies
 * Honor Growth · versão v1
 *
 * API pública: window.HonorConsent
 *   .getPreferences()   → objeto com categorias ou null
 *   .hasConsent(cat)    → boolean
 *   .openPreferences()  → abre o modal
 *   .resetPreferences() → apaga decisão e mostra banner
 *   .onChange(fn)       → callback chamado em cada alteração
 *
 * Evento: window.dispatchEvent(new CustomEvent('honorConsent:changed', { detail: prefs }))
 *
 * Para alterar a versão do consentimento (ex.: nova categoria adicionada):
 *   Mude CONSENT_VERSION para 'v2'. Todos os visitantes com v1 guardado
 *   verão o banner novamente e terão que aceitar/rejeitar de novo.
 * ============================================================ */

window.HonorConsent = (function () {
  'use strict';

  var STORAGE_KEY     = 'honor_cookie_consent_v1';
  var CONSENT_VERSION = 'v1';
  var EXPIRATION_MS   = 180 * 24 * 60 * 60 * 1000; /* 180 dias */

  var _prefs       = null;
  var _cbs         = [];
  var _bannerEl    = null;
  var _modalEl     = null;
  var _modalTrigger = null;
  var _modalOpen   = false;
  var _bannerVisible = false;

  /* ── Armazenamento ────────────────────────────────────────────────────── */
  function _read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (d.version !== CONSENT_VERSION) return null;
      if (Date.now() > d.expires) return null;
      return d;
    } catch (e) { return null; }
  }

  function _write(p) {
    var d = {
      version:    CONSENT_VERSION,
      expires:    Date.now() + EXPIRATION_MS,
      necessary:  true,
      functional: !!p.functional,
      analytics:  !!p.analytics,
      marketing:  !!p.marketing
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
    return d;
  }

  /* ── Global Privacy Control ───────────────────────────────────────────── */
  function _gpcActive() {
    return navigator.globalPrivacyControl === true;
  }

  /* ── API pública ──────────────────────────────────────────────────────── */
  function getPreferences() {
    return _prefs ? Object.assign({}, _prefs) : null;
  }

  function hasConsent(category) {
    if (category === 'necessary') return true;
    return _prefs ? !!_prefs[category] : false;
  }

  function onChange(cb) {
    if (typeof cb === 'function') _cbs.push(cb);
  }

  function openPreferences() {
    _modalTrigger = document.activeElement;
    _openModal();
  }

  function resetPreferences() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    _prefs = null;
    if (_bannerVisible) return;
    _ensureCreated();
    _showBanner();
  }

  /* ── Dispatch interno ─────────────────────────────────────────────────── */
  function _apply(prefs) {
    _prefs = prefs;
    var copy = Object.assign({}, prefs);
    _cbs.forEach(function (cb) { try { cb(copy); } catch (e) {} });
    window.dispatchEvent(new CustomEvent('honorConsent:changed', { detail: copy }));
  }

  /* ── Aceitar / Recusar ────────────────────────────────────────────────── */
  function _acceptAll() {
    _apply(_write({ functional: true, analytics: true, marketing: true }));
    _hideBanner();
    _closeModal();
  }

  function _rejectOptional() {
    _apply(_write({ functional: false, analytics: false, marketing: false }));
    _hideBanner();
    _closeModal();
  }

  function _saveFromModal() {
    var get = function (name) {
      var el = _modalEl && _modalEl.querySelector('[data-consent-toggle="' + name + '"]');
      return el ? el.checked : false;
    };
    _apply(_write({
      functional: get('functional'),
      analytics:  get('analytics'),
      marketing:  get('marketing')
    }));
    _hideBanner();
    _closeModal();
  }

  /* ── Banner ───────────────────────────────────────────────────────────── */
  function _createBanner() {
    if (_bannerEl) return;
    _bannerEl = document.createElement('div');
    _bannerEl.id        = 'hc-banner';
    _bannerEl.className = 'hc-banner hc-hidden';
    _bannerEl.setAttribute('role',        'region');
    _bannerEl.setAttribute('aria-label',  'Preferências de cookies');
    _bannerEl.setAttribute('aria-live',   'polite');
    _bannerEl.setAttribute('aria-hidden', 'true');
    _bannerEl.innerHTML = (
      '<div class="hc-banner-inner">' +
        '<div class="hc-banner-text">' +
          '<p class="hc-banner-title">Nós usamos cookies</p>' +
          '<p class="hc-banner-desc">' +
            'Utilizamos cookies necessários para o funcionamento da página e, ' +
            'mediante a sua autorização, recursos funcionais, analytics e marketing.' +
          '</p>' +
        '</div>' +
        '<div class="hc-banner-actions">' +
          '<button type="button" class="hc-btn hc-btn-primary"    id="hc-accept-all">Aceitar todos</button>' +
          '<button type="button" class="hc-btn hc-btn-secondary"  id="hc-reject">Recusar opcionais</button>' +
          '<button type="button" class="hc-btn hc-btn-ghost"      id="hc-configure">Configurar cookies</button>' +
        '</div>' +
      '</div>'
    );
    _bannerEl.querySelector('#hc-accept-all').addEventListener('click', _acceptAll);
    _bannerEl.querySelector('#hc-reject').addEventListener('click',     _rejectOptional);
    _bannerEl.querySelector('#hc-configure').addEventListener('click',  openPreferences);
    document.body.appendChild(_bannerEl);
  }

  function _showBanner() {
    if (!_bannerEl) return;
    _bannerEl.classList.remove('hc-hidden');
    _bannerEl.setAttribute('aria-hidden', 'false');
    _bannerVisible = true;
  }

  function _hideBanner() {
    if (!_bannerEl) return;
    _bannerEl.classList.add('hc-hidden');
    _bannerEl.setAttribute('aria-hidden', 'true');
    _bannerVisible = false;
  }

  /* ── Categorias do modal ──────────────────────────────────────────────── */
  var CATEGORIES = [
    {
      id:       'necessary',
      label:    'Necessários',
      desc:     'Guardam a sua decisão de consentimento. Sem estes cookies a preferência não pode ser gravada entre visitas.',
      required: true
    },
    {
      id:    'functional',
      label: 'Funcionais',
      desc:  'Carregam o formulário GoHighLevel / LeadConnector (serviço externo de captação de leads). Também pode carregar o formulário por ação explícita no próprio placeholder.'
    },
    {
      id:    'analytics',
      label: 'Analytics',
      desc:  'Umami — métricas de visitas, comportamento e eventos de interação. Sem cookies de identificação pessoal.'
    },
    {
      id:    'marketing',
      label: 'Marketing',
      desc:  'Meta Pixel — medição de campanhas, remarketing e públicos personalizados no Facebook e Instagram.'
    }
  ];

  function _categoryHTML(cat) {
    var on = cat.required ? true : (_prefs ? !!_prefs[cat.id] : false);
    var stateText = cat.required ? 'Sempre ativo' : (on ? 'Ativo' : 'Inativo');
    return (
      '<div class="hc-category">' +
        '<div class="hc-category-info">' +
          '<span class="hc-category-label">' + cat.label + '</span>' +
          '<span class="hc-category-desc">'  + cat.desc  + '</span>' +
        '</div>' +
        '<label class="hc-toggle-wrap" aria-label="' + cat.label +
          (cat.required ? ' (sempre ativo)' : '') + '">' +
          '<input class="hc-toggle-input" type="checkbox"' +
            ' data-consent-toggle="' + cat.id + '"' +
            (on            ? ' checked'  : '') +
            (cat.required  ? ' disabled' : '') +
          '>' +
          '<span class="hc-toggle-track" aria-hidden="true">' +
            '<span class="hc-toggle-thumb"></span>' +
          '</span>' +
          '<span class="hc-toggle-state">' + stateText + '</span>' +
        '</label>' +
      '</div>'
    );
  }

  /* ── Modal ────────────────────────────────────────────────────────────── */
  function _createModal() {
    if (_modalEl) return;
    _modalEl = document.createElement('div');
    _modalEl.id        = 'hc-modal';
    _modalEl.className = 'hc-modal-backdrop';
    _modalEl.setAttribute('role',           'dialog');
    _modalEl.setAttribute('aria-modal',     'true');
    _modalEl.setAttribute('aria-labelledby','hc-modal-heading');
    _modalEl.setAttribute('aria-hidden',    'true');

    var cats = CATEGORIES.map(_categoryHTML).join('');

    _modalEl.innerHTML = (
      '<div class="hc-modal-box" role="document">' +
        '<div class="hc-modal-header">' +
          '<h2 id="hc-modal-heading" class="hc-modal-heading">Preferências de cookies</h2>' +
          '<button type="button" class="hc-modal-close" id="hc-modal-close" aria-label="Fechar">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"' +
            ' fill="none" stroke="currentColor" stroke-width="2.5"' +
            ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="hc-modal-body">' +
          '<p class="hc-modal-intro">' +
            'Escolha quais categorias de cookies pretende aceitar. ' +
            'A sua decisão é guardada por 180 dias e pode ser alterada a qualquer momento.' +
          '</p>' +
          '<div class="hc-categories">' + cats + '</div>' +
          '<div class="hc-modal-legal">' +
            '<a href="politica-privacidade.html" target="_blank" rel="noopener" class="hc-legal-link">Política de Privacidade</a>' +
            '<a href="politica-cookies.html"     target="_blank" rel="noopener" class="hc-legal-link">Política de Cookies</a>' +
          '</div>' +
        '</div>' +
        '<div class="hc-modal-footer">' +
          '<button type="button" class="hc-btn hc-btn-secondary" id="hc-modal-reject">Recusar opcionais</button>' +
          '<button type="button" class="hc-btn hc-btn-primary"   id="hc-modal-accept-all">Aceitar todos</button>' +
          '<button type="button" class="hc-btn hc-btn-save"      id="hc-modal-save">Guardar preferências</button>' +
        '</div>' +
      '</div>'
    );

    /* Atualiza label ao mudar toggle */
    _modalEl.querySelectorAll('[data-consent-toggle]').forEach(function (input) {
      input.addEventListener('change', function () {
        var stateEl = input.closest('.hc-toggle-wrap').querySelector('.hc-toggle-state');
        if (stateEl) stateEl.textContent = input.checked ? 'Ativo' : 'Inativo';
      });
    });

    _modalEl.querySelector('#hc-modal-close').addEventListener(    'click', _closeModal);
    _modalEl.querySelector('#hc-modal-reject').addEventListener(   'click', _rejectOptional);
    _modalEl.querySelector('#hc-modal-accept-all').addEventListener('click', _acceptAll);
    _modalEl.querySelector('#hc-modal-save').addEventListener(     'click', _saveFromModal);

    /* Fechar ao clicar no backdrop */
    _modalEl.addEventListener('click', function (e) {
      if (e.target === _modalEl) _closeModal();
    });

    document.body.appendChild(_modalEl);
  }

  function _focusable() {
    return Array.from(_modalEl.querySelectorAll(
      'button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])'
    ));
  }

  function _onKeydown(e) {
    if (e.key === 'Escape') { _closeModal(); return; }
    if (e.key !== 'Tab') return;
    var els = _focusable();
    if (!els.length) return;
    var first = els[0], last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }

  function _syncModalToggles() {
    if (!_modalEl) return;
    CATEGORIES.forEach(function (cat) {
      if (cat.required) return;
      var input = _modalEl.querySelector('[data-consent-toggle="' + cat.id + '"]');
      if (!input) return;
      var on = _prefs ? !!_prefs[cat.id] : false;
      input.checked = on;
      var stateEl = input.closest('.hc-toggle-wrap').querySelector('.hc-toggle-state');
      if (stateEl) stateEl.textContent = on ? 'Ativo' : 'Inativo';
    });
  }

  function _openModal() {
    _ensureCreated();
    _syncModalToggles();
    _modalOpen = true;
    _modalEl.setAttribute('aria-hidden', 'false');
    _modalEl.classList.add('hc-modal-open');
    document.body.classList.add('hc-body-lock');
    document.addEventListener('keydown', _onKeydown);
    requestAnimationFrame(function () {
      var btn = _modalEl.querySelector('#hc-modal-close');
      if (btn) btn.focus();
    });
  }

  function _closeModal() {
    if (!_modalOpen) return;
    _modalOpen = false;
    _modalEl.setAttribute('aria-hidden', 'true');
    _modalEl.classList.remove('hc-modal-open');
    document.body.classList.remove('hc-body-lock');
    document.removeEventListener('keydown', _onKeydown);
    if (_modalTrigger && typeof _modalTrigger.focus === 'function') {
      _modalTrigger.focus();
      _modalTrigger = null;
    }
  }

  /* ── Infraestrutura ───────────────────────────────────────────────────── */
  function _ensureCreated() {
    if (!_bannerEl) _createBanner();
    if (!_modalEl)  _createModal();
  }

  function _bindFooterPrefs() {
    var btn = document.getElementById('hc-footer-prefs');
    if (btn) btn.addEventListener('click', openPreferences);
  }

  /* ── Init ─────────────────────────────────────────────────────────────── */
  function _init() {
    var stored = _read();

    /* Visitante com consentimento válido: aplica preferências e devolve */
    if (stored) {
      _ensureCreated(); /* cria UI para openPreferences funcionar */
      _apply(stored);   /* dispara honorConsent:changed para integrations.js */
      _bindFooterPrefs();
      return;
    }

    /* Sem consentimento — aceitar automaticamente na primeira visita */
    _ensureCreated();
    _acceptAll(); /* aceita automaticamente todos os cookies */
    _bindFooterPrefs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  return {
    getPreferences:  getPreferences,
    hasConsent:      hasConsent,
    openPreferences: openPreferences,
    resetPreferences: resetPreferences,
    onChange:        onChange
  };
}());
