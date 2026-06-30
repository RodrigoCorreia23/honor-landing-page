window.HonorVideos = (function () {
  'use strict';

  var SVG_MUTED   = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
  var SVG_UNMUTED = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
  var SVG_PLAY    = '<polygon points="5 3 19 12 5 21 5 3"/>';
  var SVG_PAUSE   = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

  function syncSound(video, btn) {
    var muted  = video.muted;
    var icon   = btn.querySelector('.hg-ctrl-sound-icon');
    var label  = btn.querySelector('.hg-ctrl-sound-label');
    if (icon)  icon.innerHTML    = muted ? SVG_MUTED : SVG_UNMUTED;
    if (label) label.textContent = muted ? 'Habilitar som' : 'Silenciar';
    btn.setAttribute('aria-label',   muted ? 'Habilitar som' : 'Silenciar');
    btn.setAttribute('aria-pressed', muted ? 'false' : 'true');
  }

  function syncPlay(video, btn) {
    var stopped = video.paused || video.ended;
    var virgin  = video.currentTime === 0 && video.paused;
    var icon    = btn.querySelector('.hg-ctrl-play-icon');
    var label   = btn.querySelector('.hg-ctrl-play-label');
    var text    = stopped ? (virgin ? 'Reproduzir' : 'Continuar') : 'Pausar';
    if (icon)  icon.innerHTML    = stopped ? SVG_PLAY : SVG_PAUSE;
    if (label) label.textContent = text;
    btn.setAttribute('aria-label',   stopped ? 'Reproduzir vídeo' : 'Pausar vídeo');
    btn.setAttribute('aria-pressed', stopped ? 'false' : 'true');
  }

  function bindVideo(video) {
    var box      = video.parentElement;
    var soundBtn = box.querySelector('[data-mute-toggle]');
    var playBtn  = box.querySelector('[data-play-toggle]');
    if (!soundBtn || !playBtn) return;

    syncSound(video, soundBtn);
    syncPlay(video, playBtn);

    soundBtn.addEventListener('click', function () {
      video.muted = !video.muted;
      syncSound(video, soundBtn);
    });

    playBtn.addEventListener('click', function () {
      if (video.paused || video.ended) {
        video.play().catch(function () {});
        /* Evento video_play — só dispara se analytics autorizado */
        if (window.HonorIntegrations) {
          window.HonorIntegrations.trackAnalytics('video_play', { label: video.currentSrc || video.src });
        }
      } else {
        video.pause();
      }
      syncPlay(video, playBtn);
    });

    video.addEventListener('click', function () {
      if (!video.paused) { video.pause(); }
      syncPlay(video, playBtn);
    });

    video.addEventListener('play',         function () { syncPlay(video, playBtn); });
    video.addEventListener('pause',        function () { syncPlay(video, playBtn); });
    video.addEventListener('ended',        function () { syncPlay(video, playBtn); });
    video.addEventListener('volumechange', function () { syncSound(video, soundBtn); });
  }

  function init() {
    document.querySelectorAll('[data-video-surface]').forEach(bindVideo);
  }

  return { init: init };
}());
