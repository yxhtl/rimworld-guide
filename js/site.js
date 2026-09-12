(function () {
  'use strict';

  const VERSION = 'RimWorld 1.6.x';
  const CHECKED_ON = '2026-09-12';
  const UPDATE_LOG = 'https://steamcommunity.com/app/294100/announcements/';
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  const fileName = location.pathname.split('/').pop().replace('.html', '') || 'index';
  const key = fileName.replace(/^rimworld-guide-/, '');
  const guides = {
    'getting-started': {
      zh: '开局与前七天', en: 'Crashlanded start and week one',
      sources: [['RimWorld Wiki：Basics', 'https://rimworldwiki.com/wiki/Basics'], ['RimWorld Wiki：Quickstart guides', 'https://rimworldwiki.com/wiki/Quickstart_Guides']]
    },
    work: {
      zh: '工作优先级', en: 'Work priorities',
      sources: [['RimWorld Wiki：Work', 'https://rimworldwiki.com/wiki/Work'], ['RimWorld Wiki：Basics', 'https://rimworldwiki.com/wiki/Basics']]
    },
    temperature: {
      zh: '温度、食物与冷藏', en: 'Temperature, food, and refrigeration',
      sources: [['RimWorld Wiki：Temperature', 'https://rimworldwiki.com/wiki/Temperature']]
    },
    power: {
      zh: '电力系统', en: 'Power system',
      sources: [['RimWorld Wiki：Power', 'https://rimworldwiki.com/wiki/Power']]
    },
    combat: {
      zh: '战斗与基地防御', en: 'Combat and base defense',
      sources: [['RimWorld Wiki：Combat', 'https://rimworldwiki.com/wiki/Combat'], ['RimWorld Wiki：Colony building', 'https://rimworldwiki.com/wiki/Colony_Building_Guide']]
    },
    research: {
      zh: '研究路线', en: 'Research priorities',
      sources: [['RimWorld Wiki：Research', 'https://rimworldwiki.com/wiki/Research']]
    },
    wealth: {
      zh: '财富控制', en: 'Wealth management',
      sources: [['RimWorld Wiki：Wealth', 'https://rimworldwiki.com/wiki/Wealth']]
    },
    mood: {
      zh: '心情与精神状态', en: 'Mood and mental state',
      sources: [['RimWorld Wiki：Mood', 'https://rimworldwiki.com/wiki/Mood']]
    },
    medical: {
      zh: '医疗与伤病处理', en: 'Medical care and health',
      sources: [['RimWorld Wiki：Health', 'https://rimworldwiki.com/wiki/Health']]
    },
    trade: {
      zh: '贸易与扩张', en: 'Trade and expansion',
      sources: [['RimWorld Wiki：Trading', 'https://rimworldwiki.com/wiki/Trading']]
    }
  };

  function track(name, parameters) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, Object.assign({
      content_language: isEnglish ? 'en' : 'zh-CN',
      content_key: guides[key] ? key : 'other'
    }, parameters));
  }

  function addEvidencePanel() {
    const guide = guides[key];
    const main = document.querySelector('main');
    const breadcrumb = main && main.querySelector('.breadcrumb');
    if (!guide || !main || !breadcrumb) return;

    const sourceItems = guide.sources.map(([label, href]) =>
      `<li><a data-source-link href="${href}" target="_blank" rel="noopener noreferrer">${label}</a></li>`
    ).join('');
    const pageLabel = isEnglish ? guide.en : guide.zh;
    const panel = document.createElement('aside');
    panel.className = 'evidence-panel';
    panel.setAttribute('aria-label', isEnglish ? 'Guide update and sources' : '攻略版本与来源');
    panel.innerHTML = isEnglish
      ? `<strong>Evidence note · ${pageLabel}</strong><p>Applies to <a data-source-link href="${UPDATE_LOG}" target="_blank" rel="noopener noreferrer">${VERSION}</a>. Last checked: <time datetime="${CHECKED_ON}">${CHECKED_ON}</time>. Recommendations are editorial decisions built from the references below, not a claim of personal playtesting.</p><ul>${sourceItems}</ul><p class="source-disclosure"><a href="sources.html">How this site checks sources →</a></p>`
      : `<strong>证据说明 · ${pageLabel}</strong><p>适用版本：<a data-source-link href="${UPDATE_LOG}" target="_blank" rel="noopener noreferrer">${VERSION}</a>；最后核对：<time datetime="${CHECKED_ON}">${CHECKED_ON}</time>。文中的取舍建议基于下列资料整理，不冒充个人实测。</p><ul>${sourceItems}</ul><p class="source-disclosure"><a href="sources.html">查看本站来源与核对方法 →</a></p>`;
    breadcrumb.insertAdjacentElement('afterend', panel);
  }

  function bindEvents() {
    track('guide_view');
    const firedDepths = new Set();
    const onScroll = function () {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const percentage = Math.round((window.scrollY / scrollable) * 100);
      [50, 90].forEach(function (depth) {
        if (percentage >= depth && !firedDepths.has(depth)) {
          firedDepths.add(depth);
          track('guide_scroll_depth', { percent_scrolled: depth });
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    document.addEventListener('click', function (event) {
      const link = event.target.closest('a');
      if (!link) return;
      if (link.matches('.page-toc a')) track('guide_toc_click', { link_text: link.textContent.trim().slice(0, 80) });
      if (link.matches('.lang-switcher a, .lang-link a')) track('guide_language_switch', { destination_language: link.href.includes('/en/') ? 'en' : 'zh-CN' });
      if (link.hasAttribute('data-source-link')) track('guide_source_click', { source_host: new URL(link.href).hostname });
    });
  }

  addEvidencePanel();
  bindEvents();
})();
