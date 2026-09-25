(() => {
  'use strict';
  if (!new URLSearchParams(location.search).has('scroll')) {
    const script = document.createElement('script');
    script.src = 'player.js';
    document.body.append(script);
    return;
  }
  document.querySelector('.playback').hidden = true;
  document.documentElement.classList.add('scroll-embed');
  const animation = window.portfolioAnimation;
  let target = animation.poster, busy = false, pending = false;
  async function render() {
    if (busy) return;
    busy = true;
    try {
      while (pending) {
        pending = false;
        if (animation.scrollTo) animation.scrollTo(target);
        else await animation.advance(target);
      }
    } catch (error) {
      const box = document.getElementById('player-error');
      box.hidden = false;
      box.textContent = 'Diagram unavailable. The adjacent steps describe this part of the design.';
      console.error(error);
    } finally { busy = false; }
  }
  function seek(value) {
    if (!Number.isFinite(value)) return;
    target = Math.max(0, Math.min(animation.duration, value));
    pending = true;
    render();
  }
  addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin) return;
    if (event.data?.type === 'portfolio-seek') seek(event.data.seconds);
  });
  addEventListener('resize', () => seek(target));
  animation.reset();
  seek(target);
  parent.postMessage({type:'portfolio-ready'}, location.origin);
})();
