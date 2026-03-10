// js/ai_extras.js
function storageKey(){
  const p = location.pathname || '/';
  return `np:readpos:${p}`;
}

export function initAIExtras({ notify } = {}){
  initReadPosition({ notify });
  initA11yAuditUI({ notify });
  initTTSAutoPause({ notify });
}

function initReadPosition({ notify } = {}){
  const key = storageKey();

  // 1) Restore once on load
  try{
    const raw = localStorage.getItem(key);
    const y = raw ? Number(raw) : 0;
    const hasHash = !!location.hash;
    const navType = performance.getEntriesByType?.('navigation')?.[0]?.type; // 'navigate' | 'reload' | 'back_forward'
    const isBackForward = navType === 'back_forward';

    if (!hasHash && !isBackForward && Number.isFinite(y) && y > 120){
    setTimeout(() => {
        window.scrollTo(0, y);
        notify?.('AI: повернув до місця читання.', 3500);
    }, 120);
    }
  }catch{}

  // 2) Save (throttled)
  // 3) Optional: clear when user goes to top
    let t = 0;
    window.addEventListener('scroll', () => {
    const y = Math.round(window.scrollY || 0);

    // якщо користувач реально повернувся майже в самий верх — очищаємо
    if (y < 40){
        try{ localStorage.removeItem(key); }catch{}
        return;
    }

    const now = performance.now();
    if (now - t < 500) return;
    t = now;

    try{
        localStorage.setItem(key, String(y));
    }catch{}
    }, { passive: true });
}

function initA11yAuditUI({ notify } = {}){
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#a11y-audit');
    if (!btn) return;

    const results = runMiniAudit();
    renderAudit(results, { notify });
  }, true);
}

function runMiniAudit(){
  const issues = [];
  const isVisible = (el) => !!(el && el.getClientRects && el.getClientRects().length);
  const isAriaHidden = (el) => !!el.closest?.('[aria-hidden="true"]');

  // 1) Images without alt (ignore decorative if aria-hidden or empty alt is allowed by author)
    document.querySelectorAll('img').forEach(img => {
    if (!isVisible(img) || isAriaHidden(img)) return;

    const alt = img.getAttribute('alt');
    if (alt === null){
        issues.push({ type:'img-alt', msg:'Зображення без alt.', el: img });
    }
    });

  // 2) Buttons/links without accessible name
  const clickable = document.querySelectorAll('button, a, [role="button"]');
  clickable.forEach(el => {
    if (!isVisible(el) || isAriaHidden(el)) return;
    if (el.hasAttribute('disabled')) return;
    const label = el.getAttribute('aria-label');
    const labelledby = el.getAttribute('aria-labelledby');
    const text = (el.textContent || '').trim();

    // very rough: if has no text and no aria-label/labelledby -> issue
    if (!text && !label && !labelledby){
      issues.push({ type:'name', msg:'Кнопка/посилання без видимої назви або aria-label.', el });
    }
  });

  // 3) Missing h1
  if (!document.querySelector('h1')){
    issues.push({ type:'h1', msg:'На сторінці немає h1.', el: document.querySelector('#main') || document.body });
  }

  // 4) Small tap targets (rough heuristic: visible and < 36px in either dimension)
  document.querySelectorAll('button, a, .ui-control, [role="button"]').forEach(el => {
    if (!isVisible(el) || isAriaHidden(el)) return;
    if (el.hasAttribute('disabled')) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (r.width < 36 || r.height < 36){
      issues.push({ type:'target', msg:'Замалий інтерактивний елемент (<36px).', el });
    }
  });

  return issues.slice(0, 30); // не захаращуємо
}

function renderAudit(issues, { notify } = {}){
  const box = document.getElementById('a11y-audit-results');
  if (!box) return;

  // очистити попередні підсвітки
  document.querySelectorAll('.a11y-outline-issue').forEach(el => el.classList.remove('a11y-outline-issue'));

  box.hidden = false;

  if (!issues.length){
    box.innerHTML = `<h3>Результат</h3><div>Критичних проблем не знайдено ✅</div>`;
    notify?.('AI: аудит — проблем не знайдено.', 3500);
    return;
  }

  const itemsHtml = issues.map((it, i) => (
    `<li class="audit-item">
      ${escapeHtml(it.msg)}
      <button type="button" class="btn-outline ui-control" data-audit-jump="${i}" style="margin-left:8px;">
        Показати
      </button>
    </li>`
  )).join('');

  box.innerHTML = `
    <h3>Результат: знайдено ${issues.length}</h3>
    <ul>${itemsHtml}</ul>
    <div class="audit-actions">
      <button type="button" class="btn-outline ui-control" data-audit-clear>Очистити підсвітку</button>
    </div>
  `;

  // делегування подій всередині контейнера
  box.onclick = (e) => {
    const jump = e.target.closest('[data-audit-jump]');
    const clear = e.target.closest('[data-audit-clear]');

    if (clear){
      document.querySelectorAll('.a11y-outline-issue').forEach(el => el.classList.remove('a11y-outline-issue'));
      return;
    }

    if (jump){
      const idx = Number(jump.getAttribute('data-audit-jump'));
      const issue = issues[idx];
      if (!issue?.el) return;

      document.querySelectorAll('.a11y-outline-issue').forEach(el => el.classList.remove('a11y-outline-issue'));
      issue.el.classList.add('a11y-outline-issue');

      try{ issue.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }catch{}
      try{
        if (issue.el && typeof issue.el.focus === 'function'){
            if (!issue.el.matches('a[href], button, input, select, textarea, [tabindex]')){
            issue.el.setAttribute('tabindex', '-1');
            }
            issue.el.focus({ preventScroll: true });
        }
        }catch{}
    }
  };

  notify?.(`AI: аудит — знайдено ${issues.length} пункт(ів).`, 4500);
}

function escapeHtml(s){
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function initTTSAutoPause({ notify } = {}){
  if (!('speechSynthesis' in window)) return;

  // Pause on tab hide
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (speechSynthesis.speaking || speechSynthesis.pending)){
      speechSynthesis.cancel();
      notify?.('AI: озвучку зупинено (вкладка неактивна).', 3500);
    }
  });

  // Cancel on active scroll (debounced)
  let scT = 0;
    window.addEventListener('scroll', () => {
    if (!(speechSynthesis.speaking || speechSynthesis.pending)) return;

    window.clearTimeout(scT);
    scT = window.setTimeout(() => {
        if (speechSynthesis.speaking || speechSynthesis.pending){
        speechSynthesis.cancel();
        notify?.('AI: озвучку зупинено під час скролу.', 3500);
        }
    }, 120);
    }, { passive:true });
}
