(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.getElementById('motion-toggle');
  let still = reducedMotion.matches, chosen = false, scheduled = false;
  const chapters = [...document.querySelectorAll('[data-story]')].map(element => ({
    element,
    visual: element.querySelector('.story-visual'),
    frame: element.querySelector('iframe'),
    steps: [...element.querySelectorAll('.story-step')],
    cue: element.querySelector('.story-cue'),
    count: element.querySelector('.story-count'),
    bar: element.querySelector('.story-progress span'),
    lastTime: null
  }));
  const clamp = value => Math.min(1, Math.max(0, value));
  function update() {
    scheduled = false;
    const height = innerHeight;
    for (const chapter of chapters) {
      const bounds = chapter.element.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > height + 300) continue;
      const visual = chapter.visual.getBoundingClientRect();
      const focus = innerWidth <= 800
        ? Math.min(height * .87, visual.bottom + Math.max(70, (height - visual.bottom) * .45))
        : height * .56;
      const rects = chapter.steps.map(step => step.getBoundingClientRect());
      let index = rects.findIndex(rect => rect.bottom > focus);
      if (index < 0) index = rects.length - 1;
      const step = chapter.steps[index];
      const progress = clamp((focus - rects[index].top) / rects[index].height);
      const from = Number(step.dataset.from), to = Number(step.dataset.to);
      // Fixed explanatory snapshots replace movement for reduced-motion readers.
      const seconds = Math.round((from + (to - from) * (still ? .8 : progress)) * 30) / 30;
      if (chapter.lastTime !== seconds) {
        chapter.frame.contentWindow?.postMessage({type:'portfolio-seek', seconds}, location.origin);
        chapter.lastTime = seconds;
      }
      chapter.steps.forEach((item, i) => item.classList.toggle('is-active', i === index));
      chapter.cue.textContent = step.dataset.cue;
      chapter.count.textContent = `${index + 1} / ${chapter.steps.length}`;
      chapter.bar.style.width = `${(index + progress) / chapter.steps.length * 100}%`;
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }
  function updateToggle() {
    toggle.hidden = false;
    toggle.setAttribute('aria-pressed', String(still));
    toggle.textContent = still ? 'Still diagrams on · enable animation' : 'Use still diagrams';
    schedule();
  }
  toggle.addEventListener('click', () => { chosen = true; still = !still; updateToggle(); });
  reducedMotion.addEventListener('change', event => {
    if (!chosen) { still = event.matches; updateToggle(); }
  });
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.data?.type !== 'portfolio-ready') return;
    const chapter = chapters.find(item => item.frame.contentWindow === event.source);
    if (chapter) { chapter.lastTime = null; schedule(); }
  });
  chapters.forEach(chapter => chapter.frame.addEventListener('load', () => {
    chapter.lastTime = null;
    schedule();
  }));
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule);
  addEventListener('pageshow', schedule);
  document.fonts?.ready.then(schedule);
  updateToggle();
})();
