(() => {
  'use strict';
  const animation = window.portfolioAnimation;
  const toggle = document.getElementById('toggle');
  const restart = document.getElementById('restart');
  const progress = document.getElementById('progress');
  const elapsed = document.getElementById('elapsed');
  const rate = document.getElementById('rate');
  const fullscreen = document.getElementById('fullscreen');
  const errorBox = document.getElementById('player-error');
  let at = 0, playing = false, advancing = false, requested = null, previous = 0, raf = 0, firstPlay = true;
  const format = value => Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0');
  function sync() {
    toggle.textContent = playing ? 'Pause' : (at >= animation.duration ? 'Play again' : 'Play');
    toggle.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
    progress.value = String(at);
    progress.setAttribute('aria-valuetext', format(at) + ' of ' + format(animation.duration));
    elapsed.textContent = format(at) + ' / ' + format(animation.duration);
  }
  function fail(error) {
    playing = false;
    errorBox.hidden = false;
    errorBox.textContent = 'The animation could not be loaded. Reload this page to try again.';
    console.error(error);
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(tick); }
  async function tick(now) {
    raf = 0;
    if (advancing) return;
    advancing = true;
    try {
      if (requested !== null) {
        const target = requested;
        requested = null;
        if (target < at) animation.reset();
        at = target;
        await animation.advance(at);
      } else if (playing) {
        at = Math.min(animation.duration, at + Math.min((now - previous) / 1000, 0.1) * Number(rate.value));
        await animation.advance(at);
        if (at >= animation.duration) playing = false;
      }
      previous = performance.now();
      sync();
    } catch (error) { fail(error); }
    advancing = false;
    if (playing || requested !== null) schedule();
  }
  function pause() { playing = false; sync(); }
  function seekTo(value) {
    requested = Math.max(0, Math.min(animation.duration, value));
    previous = performance.now();
    schedule();
  }
  toggle.addEventListener('click', () => {
    if (firstPlay || at >= animation.duration) seekTo(0);
    firstPlay = false;
    playing = !playing;
    previous = performance.now();
    sync();
    if (playing) schedule();
  });
  restart.addEventListener('click', () => { firstPlay = false; playing = true; seekTo(0); sync(); });
  progress.addEventListener('input', () => { const target = Number(progress.value); firstPlay = false; pause(); seekTo(target); });
  rate.addEventListener('change', () => { previous = performance.now(); });
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) {
      fullscreen.textContent = 'Use “Open larger”';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  addEventListener('message', event => {
    if (event.source === parent && event.origin === location.origin && event.data?.type === 'portfolio-pause') pause();
  });
  addEventListener('resize', () => seekTo(at));
  addEventListener('keydown', event => {
    if (event.target.closest('button,input,select')) return;
    if (event.code === 'Space') { event.preventDefault(); toggle.click(); }
    if (event.key.toLowerCase() === 'r') restart.click();
    if (event.key === 'ArrowRight') { event.preventDefault(); pause(); seekTo(at + 5); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); pause(); seekTo(at - 5); }
  });
  (async () => {
    if (!animation) throw new Error('Animation module unavailable');
    animation.reset();
    at = animation.poster;
    await animation.advance(at);
    sync();
  })().catch(fail);
})();
