/* One synchronized video per comparison; original clip IDs stay unchanged. */
(() => {
  'use strict';
  const records = window.DOPPEL_COMPARISONS || [];
  const dataset = document.querySelector('#comparison-dataset');
  const split = document.querySelector('#comparison-split');
  const gallery = document.querySelector('#comparison-gallery');
  const mobile = matchMedia('(max-width: 650px)');
  const names = {droid: 'DROID', robomind: 'RoboMIND', bridge: 'Bridge'};
  const oodContext = {droid: 'Fully new environment', robomind: 'New objects', bridge: 'New kitchen'};
  const params = new URLSearchParams(location.search);
  const linked = records.find(r => r.id === params.get('clip'));
  dataset.value = linked?.dataset || (Object.hasOwn(names, params.get('dataset')) ? params.get('dataset') : 'droid');
  split.value = linked?.split || (params.get('split') === 'val' ? 'val' : 'ood');
  let players = new Map();
  let galleryPaused = false;

  function assetName() { return mobile.matches ? 'comparison_stacked' : 'comparison'; }
  function load(video) {
    const state = players.get(video);
    if (!state) return;
    const source = `${state.record.directory}/${assetName()}`;
    video.poster = `${source}_poster.jpg`;
    if (video.getAttribute('src') === `${source}.mp4`) return;
    video.src = `${source}.mp4`;
    video.preload = 'metadata';
    video.load();
    video.playbackRate = .5;
  }
  function sync(video) {
    const state = players.get(video);
    if (!state) return;
    if (!state.visible || document.hidden) { video.pause(); return; }
    if (state.manual) return;
    if (galleryPaused) video.pause();
    else { load(video); video.play().catch(() => {}); }
  }
  const preloadObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        load(entry.target);
        preloadObserver.unobserve(entry.target);
      }
    });
  }, {rootMargin: '200px'});
  const playbackObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const state = players.get(entry.target);
      if (!state) return;
      state.visible = entry.isIntersecting;
      sync(entry.target);
    });
  }, {threshold: .25});

  function card(record) {
    const article = document.createElement('article');
    article.className = 'comparison-card';
    article.id = `comparison-${record.id}`;
    article.dataset.clip = record.id;
    article.innerHTML = `
      <div class="comparison-stage"><video controls muted loop playsinline preload="none"></video></div>
      <p class="comparison-status" role="status"></p>`;
    const status = article.querySelector('.comparison-status');
    const video = article.querySelector('video');
    video.muted = true;
    video.setAttribute('aria-label', `${record.id}: ${record.title}. Ground truth, Action-only, and Doppel.`);
    const state = {record, visible: false, manual: false};
    players.set(video, state);
    ['pointerdown', 'keydown'].forEach(event => video.addEventListener(event, () => { state.manual = true; load(video); }));
    video.addEventListener('error', () => { status.textContent = 'This clip could not load. Please reload the page.'; });
    preloadObserver.observe(video);
    playbackObserver.observe(video);
    return article;
  }
  function render(updateURL = false) {
    preloadObserver.disconnect();
    playbackObserver.disconnect();
    players.forEach((state, video) => { video.pause(); video.removeAttribute('src'); video.load(); });
    players = new Map();
    const selected = records.filter(r => r.dataset === dataset.value && r.split === split.value);
    gallery.replaceChildren(...selected.map(card));
    const label = `${selected.length} examples · ${names[dataset.value]} · ${split.value === 'ood' ? 'OOD' : 'Validation'}`;
    document.querySelector('#comparison-count').textContent = label;
    document.querySelector('#comparison-context').textContent = split.value === 'val' ? 'Trajectory generalization' : oodContext[dataset.value];
    gallery.setAttribute('aria-label', label);
    if (updateURL) {
      const url = new URL(location.href);
      url.searchParams.delete('clip');
      url.searchParams.set('dataset', dataset.value);
      url.searchParams.set('split', split.value);
      url.hash = 'comparisons';
      history.replaceState(null, '', url);
    }
  }
  dataset.addEventListener('change', () => render(true));
  split.addEventListener('change', () => render(true));
  window.addEventListener('motionchange', event => {
    galleryPaused = event.detail.paused;
    players.forEach((state, video) => {
      if (event.detail.paused) video.pause();
      else { state.manual = false; sync(video); }
    });
  });
  document.addEventListener('visibilitychange', () => players.forEach((state, video) => sync(video)));
  mobile.addEventListener('change', () => players.forEach((state, video) => {
    if (!video.hasAttribute('src')) return;
    const time = video.currentTime;
    const playing = !video.paused;
    video.pause();
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = time;
      if (playing && state.visible && !document.hidden) video.play().catch(() => {});
    }, {once: true});
    load(video);
  }));
  render();
  if (linked) requestAnimationFrame(() => document.getElementById(`comparison-${linked.id}`).scrollIntoView({behavior: 'instant', block: 'start'}));
})();
