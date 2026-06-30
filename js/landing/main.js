document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-current-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
  window.HonorNavigation.init();
  window.HonorAnimations.init();
  window.HonorVideos.init();
  if (window.HonorIntegrations) {
    window.HonorIntegrations.loadGhlContainer('hg-ghl-inline', 'page-' + window.HonorIntegrations.CONFIG.ghlFormId);
    window.HonorIntegrations.loadGhlContainer('hg-ghl-modal', 'inline-' + window.HonorIntegrations.CONFIG.ghlFormId);
  }
  window.HonorModal.init();
});
