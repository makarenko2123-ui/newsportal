export function initNav({ onFilter } = {}){
  const desktop = document.getElementById('nav-filters');
  const mobile = document.getElementById('mobile-menu');
  const burger = document.getElementById('menu-toggle');

  function setActive(container, filter){
    if (!container) return;

    container.querySelectorAll('[data-filter]').forEach(a => {
      const isActive = a.getAttribute('data-filter') === filter;
      a.classList.toggle('active', isActive);

      if (a.tagName === 'BUTTON') {
        a.setAttribute('aria-pressed', String(isActive));
        a.removeAttribute('aria-current');
      } else {
        if (isActive) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
        a.removeAttribute('aria-pressed');
      }
    });
  }

  function applyFilter(filter){
    setActive(desktop, filter);
    setActive(mobile, filter);
    onFilter?.(filter);
  }

  function onClick(e){
    const a = e.target.closest('[data-filter]');
    if (!a) return;
    if (a.tagName === 'A') e.preventDefault();
    const filter = a.getAttribute('data-filter') || 'all';
    applyFilter(filter);

    // close mobile menu after selection
    if (mobile && burger && !mobile.hidden){
      mobile.hidden = true;
      burger.setAttribute('aria-expanded', 'false');
    }
  }

  desktop?.addEventListener('click', onClick);
  mobile?.addEventListener('click', onClick);

  // Burger toggle
  if (burger && mobile){
    burger.addEventListener('click', () => {
      const expanded = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!expanded));
      mobile.hidden = expanded;
    });

    // Esc closes mobile menu
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!mobile.hidden){
        mobile.hidden = true;
        burger.setAttribute('aria-expanded', 'false');
        burger.focus();
      }
    });
  }

  // Initial
  applyFilter('all');
}
