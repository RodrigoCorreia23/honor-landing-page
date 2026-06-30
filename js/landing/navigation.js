window.HonorNavigation = {
  init() {
    document.querySelectorAll('[data-scroll-link]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const id = link.getAttribute('data-target');
        const target = id ? document.getElementById(id) : null;
        if (!target) return;

        /* Evento cta_click para cliques que levam à secção de contacto */
        if (id === 'contacto' && window.HonorIntegrations) {
          window.HonorIntegrations.trackAnalytics('cta_click', {
            label: link.textContent.trim().replace(/→$/, '').trim()
          });
        }

        const y = target.getBoundingClientRect().top + window.scrollY - 74;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  }
};
