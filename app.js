/* All content and media are local. No analytics or external requests. */
'use strict';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = reduceMotion.matches || navigator.connection?.saveData === true;
const autoVideos = [...document.querySelectorAll('video[data-autoplay]')];
const visibleVideos = new Set();
const motionButton = document.querySelector('#motion-toggle');
const hero = document.querySelector('#hero-video');

function loadVideo(video) {
  if (video.dataset.src) {
    const useMobile = window.matchMedia('(max-width: 650px)').matches || navigator.connection?.saveData === true;
    video.src = useMobile && video.dataset.srcMobile ? video.dataset.srcMobile : video.dataset.src;
    delete video.dataset.src;
    video.load();
  }
}
function safePlay(video) { const playing = video.play(); if (playing) playing.catch(() => {}); }
function updateMotionButton() {
  motionButton.innerHTML = motionPaused ? 'Play motion <span aria-hidden="true">▶</span>' : 'Pause motion <span aria-hidden="true">Ⅱ</span>';
  motionButton.setAttribute('aria-pressed', String(motionPaused));
  if (window.DOPPEL_MOTION_PAUSED !== motionPaused) {
    window.DOPPEL_MOTION_PAUSED = motionPaused;
    window.dispatchEvent(new CustomEvent('motionchange', { detail: { paused: motionPaused } }));
  }
}
function syncAutoPlayback() {
  autoVideos.forEach(video => {
    if (!motionPaused && !document.hidden && visibleVideos.has(video) && !video.closest('[hidden]')) { loadVideo(video); safePlay(video); }
    else video.pause();
  });
  updateMotionButton();
}
const videoObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      visibleVideos.add(entry.target);
      // Native gallery controls remain usable when automatic motion is paused.
      // preload=none defers their bytes until playback is requested.
      if (entry.target !== hero) loadVideo(entry.target);
    }
    else visibleVideos.delete(entry.target);
  });
  syncAutoPlayback();
}, { threshold: .18 });
autoVideos.forEach(video => videoObserver.observe(video));
motionButton.addEventListener('click', () => { motionPaused = !motionPaused; syncAutoPlayback(); });
document.addEventListener('visibilitychange', syncAutoPlayback);
reduceMotion.addEventListener('change', event => { motionPaused = event.matches; syncAutoPlayback(); });
document.querySelector('#replay-intro').addEventListener('click', () => {
  loadVideo(hero); hero.currentTime = 0; motionPaused = false; syncAutoPlayback(); safePlay(hero);
});
hero.addEventListener('timeupdate', () => document.querySelector('.hero').classList.toggle('montage', hero.currentTime >= 1));
updateMotionButton();

const posterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    if (entry.target.dataset.poster) entry.target.poster = entry.target.dataset.poster;
    delete entry.target.dataset.poster;
    posterObserver.unobserve(entry.target);
  });
}, { rootMargin: '250px' });
document.querySelectorAll('video[data-poster]').forEach(video => posterObserver.observe(video));

function renderTable(split) {
  const tbody = document.querySelector('#results-table');
  tbody.replaceChildren();
  const rows = window.DOPPEL_METRICS || [];
  let previousDataset = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.classList.toggle('ema-row', row.Method.startsWith('Doppel'));
    tr.classList.toggle('dataset-start', row.Dataset !== previousDataset && previousDataset !== '');
    const peers = rows.filter(peer => peer.Dataset === row.Dataset);
    const cells = [row.Dataset !== previousDataset ? row.Dataset : '', row.Method];
    ['psnr', 'ssim', 'lpips', 'scs_objects'].forEach(metric => cells.push(Number(row[`${split}_${metric}`]).toFixed(3)));
    cells.forEach((value, index) => {
      const td = document.createElement('td'); td.textContent = value;
      if (index >= 2) {
        const metric = ['psnr', 'ssim', 'lpips', 'scs_objects'][index - 2];
        const values = peers.map(peer => Number(peer[`${split}_${metric}`]));
        const best = metric === 'lpips' ? Math.min(...values) : Math.max(...values);
        td.classList.toggle('best', Number(row[`${split}_${metric}`]) === best);
      }
      tr.append(td);
    });
    tbody.append(tr); previousDataset = row.Dataset;
  });
}
document.querySelectorAll('[data-split]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-split]').forEach(other => { const active = other === button; other.classList.toggle('active', active); other.setAttribute('aria-pressed', String(active)); });
  renderTable(button.dataset.split);
}));
renderTable('val');

const navLinks = [...document.querySelectorAll('.topbar nav a')];
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) navLinks.forEach(link => { if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); }); });
}, { rootMargin: '-15% 0px -60% 0px' });
navLinks.forEach(link => sectionObserver.observe(document.querySelector(link.hash)));
