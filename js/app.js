import { NEWS } from './news-data.js';
import { renderNews, setNewsFilter, setNewsQuery } from './news/render.js';
import { initNav } from './ui/nav.js';
import { initBackToTop } from './ui/back-to-top.js';
import { initA11yPanel } from './a11y/panel.js';
import { initTTS } from './a11y/tts.js';
import { initAIAdapt } from './ai/adapt.js';
import { initAIExtras } from './ai_extras.js';

function ready(fn){
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once:true });
  else fn();
}

ready(() => {
  const tts = initTTS();
  const a11y = initA11yPanel({ tts });

  const ai = initAIAdapt({ a11y });
  initAIExtras({ notify: ai?.notify });


  // --- Ticker render (headlines) ---
  function renderTicker(items){
    const track = document.getElementById('ticker-track');
    if (!track) return;

    const headlines = (Array.isArray(items) ? items : [])
      .slice(0, 10)          // 10 найсвіжіших (бо на початку)
      .map(n => n?.title)
      .filter(Boolean);

    if (!headlines.length){
      track.innerHTML = '';
      return;
    }

    const htmlOnce = headlines.map(t => `
      <div class="ticker-item" role="listitem">
        <span class="ticker-dot" aria-hidden="true">•</span>
        <span>${t}</span>
      </div>
    `).join('');

    // Дублюємо для безшовного “бігу”
    track.innerHTML = htmlOnce + htmlOnce;
  }

  // Render cards into #cards
  const mount = document.getElementById('cards');
  if (mount) renderNews(mount, NEWS);

  // Render ticker right after initial render
  renderTicker(NEWS);

  // Filters + burger menu
  initNav({
    onFilter: (filter) => setNewsFilter(filter)
  });

  initBackToTop();

  // Hero TTS
  const heroBtn = document.getElementById('hero-tts');
  const heroArticle = document.getElementById('hero-article');
  if (heroBtn && heroArticle){
    heroBtn.addEventListener('click', () => {
      const h1 = heroArticle.querySelector('h1');
      const meta = heroArticle.querySelector('.meta');
      const text = [
        (h1?.innerText || '').trim(),
        (meta?.innerText || '').trim()
      ].filter(Boolean).join('. ');
      if (text) tts.speak(text);
    });
  }

  // Search + trending
  const search = document.getElementById('news-search');
  if (search){
    search.addEventListener('input', () => setNewsQuery(search.value));
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-trend]');
    if (!b) return;
    const q = b.getAttribute('data-trend') || '';
    if (search) search.value = q;
    setNewsQuery(q);
  });

  // Quick actions
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-qa]');
    if (!b) return;

    const qa = b.getAttribute('data-qa');

  if (qa === 'readable'){
    const st = a11y.getState();
    a11y.setState({ userLevel: Math.max(st.userLevel ?? 0, 2), measureGlobal: true });

  }else if (qa === 'contrast'){
    a11y.setState({ theme: 'high-contrast' });

  }else if (qa === 'tts'){
      const firstCard = document.querySelector('#cards [data-news-item]');
      if (!firstCard) return;

    const title =
      firstCard.querySelector('h3 a, h3')?.innerText?.trim() || '';
    const excerpt =
      firstCard.querySelector('.card-body p.measure, .card-body p')?.innerText?.trim() || '';
    const date =
      firstCard.querySelector('time')?.innerText?.trim()
    || firstCard.querySelector('time')?.getAttribute('datetime')?.trim()
    || '';

    const text = [title, excerpt, date].filter(Boolean).join('. ');
      if (text) tts.toggle(text);
    }
  });
});
