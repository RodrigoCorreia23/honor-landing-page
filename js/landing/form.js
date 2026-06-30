window.HonorModal = (function () {
  'use strict';

  var _opened = false;
  var _prevFocus = null;
  var _el = {};
  var _soundOverlayDismissed = false;
  var _pendingOpen = false;
  var _ready = { video: false, form: false };
  var _iframeLoadTimer = null;
  var _observer = null;
  var _maxWaitTimer = null;
  var MAX_WAIT_MS = 5000;

  var SVG_MUTED   = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
  var SVG_UNMUTED = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
  var SVG_PLAY    = '<polygon points="5 3 19 12 5 21 5 3"/>';
  var SVG_PAUSE   = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

  /* ── focus trap ──────────────────────────────────────────────────────────── */
  function getFocusable() {
    return Array.from(
      _el.modal.querySelectorAll(
        'button:not([disabled]),a[href],iframe,[tabindex]:not([tabindex="-1"])'
      )
    );
  }

  /* ── video sync ──────────────────────────────────────────────────────────── */
  function syncSound() {
    var muted = _el.video.muted;
    _el.soundIcon.innerHTML   = muted ? SVG_MUTED : SVG_UNMUTED;
    _el.soundLabel.textContent = muted ? 'Habilitar som' : 'Silenciar';
    _el.soundBtn.setAttribute('aria-label',   muted ? 'Habilitar som' : 'Silenciar');
    _el.soundBtn.setAttribute('aria-pressed', muted ? 'false' : 'true');
    if (_el.soundOverlay) {
      if (!muted) {
        _soundOverlayDismissed = true;
        _el.soundOverlay.classList.add('is-hidden');
      } else if (!_soundOverlayDismissed) {
        _el.soundOverlay.classList.remove('is-hidden');
      }
    }
  }

  function syncPlay() {
    var stopped = _el.video.paused || _el.video.ended;
    _el.playIcon.innerHTML    = stopped ? SVG_PLAY : SVG_PAUSE;
    _el.playLabel.textContent = stopped ? 'Continuar' : 'Pausar';
    _el.playBtn.setAttribute('aria-label',   stopped ? 'Continuar reprodução' : 'Pausar vídeo');
    _el.playBtn.setAttribute('aria-pressed', stopped ? 'false' : 'true');
  }

  function _modalIframeId() {
    var formId = (
      window.HonorIntegrations &&
      window.HonorIntegrations.CONFIG &&
      window.HonorIntegrations.CONFIG.ghlFormId
    ) || 'eQoZuhMtktMEHwP0Pxty';
    return 'inline-' + formId;
  }

  /* ── readiness ───────────────────────────────────────────────────────────── */
  function _canOpen() {
    return _ready.video && _ready.form;
  }

  function _tryPendingOpen() {
    if (!_pendingOpen || !_canOpen()) return;
    clearTimeout(_maxWaitTimer);
    _maxWaitTimer = null;
    _pendingOpen = false;
    _openNow();
  }

  function _markVideoReady() {
    _ready.video = true;
    _tryPendingOpen();
  }

  function _markFormReady() {
    if (_ready.form) return;
    _ready.form = true;
    _tryPendingOpen();
  }

  /* Revela o iframe (opacity 0→1) e sinaliza prontidão do formulário. */
  function _revealFormIframe() {
    var iframe = document.getElementById(_modalIframeId());
    if (!iframe || iframe.dataset.honorRevealed === 'true') return;
    iframe.dataset.honorRevealed = 'true';
    iframe.style.opacity = '1';
    _markFormReady();
  }

  /* ── vídeo ───────────────────────────────────────────────────────────────── */
  function _bindVideoReady() {
    if (!_el.video) return;
    if (_el.video.readyState >= 2) { _markVideoReady(); return; }
    _el.video.addEventListener('loadeddata', _markVideoReady, { once: true });
  }

  /* ── formulário ──────────────────────────────────────────────────────────── */
  function _watchGhlPostMessage() {
    var GHL_ORIGIN = 'https://api.leadconnectorhq.com';
    window.addEventListener('message', function (e) {
      if (e.origin !== GHL_ORIGIN) return;
      if (_ready.form) return;
      var iframe = document.getElementById(_modalIframeId());
      if (!iframe || e.source !== iframe.contentWindow) return;
      var isSubmit = (
        (e.data && e.data.type   === 'form:submit') ||
        (e.data && e.data.action === 'formSubmit')  ||
        (typeof e.data === 'string' && e.data.includes('formSubmit'))
      );
      if (isSubmit) return;
      _revealFormIframe();
    });
  }

  /* Fallback: revela 1.5 s após o load do iframe. */
  function _bindFormReady() {
    var iframe = document.getElementById(_modalIframeId());
    if (!iframe || iframe.dataset.honorModalLoadBound === 'true') return;
    if (iframe.dataset.honorRevealed === 'true') { _markFormReady(); return; }
    iframe.dataset.honorModalLoadBound = 'true';
    iframe.addEventListener('load', function () {
      clearTimeout(_iframeLoadTimer);
      _iframeLoadTimer = setTimeout(_revealFormIframe, 1500);
    }, { once: true });
  }

  function _observeFormMount() {
    _bindFormReady();
    var container = document.getElementById('hg-ghl-modal');
    if (!container || _observer) return;
    _observer = new MutationObserver(_bindFormReady);
    _observer.observe(container, { childList: true, subtree: true });
  }

  /* ── open / close ────────────────────────────────────────────────────────── */
  function _openNow() {
    if (_opened) return;
    _opened = true;
    _markSeen();
    _prevFocus = document.activeElement;

    _el.modal.removeAttribute('inert');
    _el.modal.removeAttribute('aria-hidden');
    _el.modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    _soundOverlayDismissed = false;
    if (_el.soundOverlay) _el.soundOverlay.classList.remove('is-hidden');
    _el.video.play().catch(function () {});

    if (window.HonorIntegrations) {
      window.HonorIntegrations.trackAnalytics('vsl_play');
    }

    requestAnimationFrame(function () {
      syncPlay();
      syncSound();
      _el.closeBtn.focus();
    });

    document.addEventListener('keydown', _onKeydown, true);
  }

  function close() {
    if (!_opened) return;
    _opened = false;
    _el.modal.classList.remove('is-open');
    _el.modal.setAttribute('aria-hidden', 'true');
    _el.modal.setAttribute('inert', '');
    document.body.style.overflow = '';
    _el.video.pause();
    document.removeEventListener('keydown', _onKeydown, true);
    if (_prevFocus && typeof _prevFocus.focus === 'function') {
      _prevFocus.focus();
      _prevFocus = null;
    }
  }

  function _onKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    var focusable = getFocusable();
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  /* ── analytics / postMessage de submit GHL ───────────────────────────────── */
  function _initAnalytics() {
    var GHL_ORIGIN = 'https://api.leadconnectorhq.com';
    var GHL_MODAL_ID = 'inline-' + (
      window.HonorIntegrations
        ? window.HonorIntegrations.CONFIG.ghlFormId
        : 'eQoZuhMtktMEHwP0Pxty'
    );

    window.addEventListener('message', function (e) {
      if (e.origin !== GHL_ORIGIN) return;
      var modalIframe = document.getElementById(GHL_MODAL_ID);
      if (!modalIframe) return;
      if (e.source !== modalIframe.contentWindow) return;

      var isSubmit = (
        (e.data && e.data.type   === 'form:submit') ||
        (e.data && e.data.action === 'formSubmit')  ||
        (typeof e.data === 'string' && e.data.includes('formSubmit'))
      );
      if (!isSubmit) return;

      var successEl = document.getElementById('ghl-form-success');
      modalIframe.style.display = 'none';
      if (successEl) successEl.style.display = 'block';

      if (window.HonorIntegrations) {
        window.HonorIntegrations.trackAnalytics('generate_lead', { form: 'ghl' });
      }
    });
  }

  /* ── sessionStorage guard ────────────────────────────────────────────────── */
  var MODAL_KEY = 'ghl_lead_modal_seen_v3';

  function _shouldOpen() {
    try { return sessionStorage.getItem(MODAL_KEY) !== 'true'; } catch (e) { return true; }
  }

  function _markSeen() {
    try { sessionStorage.setItem(MODAL_KEY, 'true'); } catch (e) {}
  }

  /* ── init ────────────────────────────────────────────────────────────────── */
  function init() {
    _el.modal = document.getElementById('hg-modal');
    if (!_el.modal) return;

    _el.modal.setAttribute('inert', '');
    _el.container  = _el.modal.querySelector('.hg-modal-container');
    _el.closeBtn   = document.getElementById('hg-modal-close');
    _el.video      = document.getElementById('hg-modal-video');
    _el.soundBtn   = document.getElementById('hg-modal-sound');
    _el.soundIcon  = document.getElementById('hg-modal-sound-icon');
    _el.soundLabel = document.getElementById('hg-modal-sound-label');
    _el.playBtn    = document.getElementById('hg-modal-play');
    _el.playIcon   = document.getElementById('hg-modal-play-icon');
    _el.playLabel  = document.getElementById('hg-modal-play-label');
    _el.soundOverlay = document.getElementById('hg-modal-sound-overlay');

    _bindVideoReady();
    _observeFormMount();
    _watchGhlPostMessage();

    _el.closeBtn.addEventListener('click', close);
    if (_el.soundOverlay) {
      _el.soundOverlay.addEventListener('click', function () {
        _el.video.muted = false;
        syncSound();
        if (_el.video.paused) _el.video.play().catch(function () {});
      });
    }
    _el.modal.addEventListener('click', function (e) {
      if (e.target === _el.modal) close();
    });

    _el.soundBtn.addEventListener('click', function () {
      _el.video.muted = !_el.video.muted;
      syncSound();
    });
    _el.playBtn.addEventListener('click', function () {
      if (_el.video.paused || _el.video.ended) {
        _el.video.play().catch(function () {});
      } else {
        _el.video.pause();
      }
      syncPlay();
    });

    _el.video.addEventListener('play',         syncPlay);
    _el.video.addEventListener('pause',        syncPlay);
    _el.video.addEventListener('ended',        syncPlay);
    _el.video.addEventListener('volumechange', syncSound);

    _initAnalytics();

    /* Auto-open na carga inicial — só se o utilizador ainda não viu o modal nesta sessão */
    if (_shouldOpen()) {
      _pendingOpen = true;
      _maxWaitTimer = setTimeout(function () {
        if (_pendingOpen) {
          _pendingOpen = false;
          _openNow();
        }
      }, MAX_WAIT_MS);
    }
  }

  /* Botões CTA: scroll suave até ao formulário fixo na secção #contacto */
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-modal-trigger]');
    if (!trigger) return;
    e.preventDefault();
    var target = document.getElementById('contacto');
    if (!target) return;
    var y = target.getBoundingClientRect().top + window.scrollY - 74;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });

  return { init: init };
}());
