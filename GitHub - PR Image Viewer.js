// ==UserScript==
// @name         PR Image Viewer
// @namespace    https://github.com/nurullahakin
// @version      2026-11-04
// @description  Click an image in the GitHub PR description to open it in a viewer with prev/next and keyboard navigation.
// @author       Nurullah Akın
// @match        https://github.com/*/*/pull/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const BODY_SELECTORS = [
    '.js-command-palette-pull-body .comment-body', // classic PR conversation page
    '[data-testid="issue-body"] .markdown-body',   // newer React views
  ];

  const SWIPE_MIN = 60; // px of horizontal drag needed to go prev/next

  // Single-headed arrow cursors shown while a swipe is armed, pointing where you're going
  // (drag left → next → right arrow; drag right → prev → left arrow). Fallback: resize cursors.
  const arrowCursor = (path, fallback) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="${path}" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 16, ${fallback}`;
  };
  const CURSOR_LEFT = arrowCursor('M3 16 L14 5 L14 11.5 L29 11.5 L29 20.5 L14 20.5 L14 27 Z', 'w-resize');
  const CURSOR_RIGHT = arrowCursor('M29 16 L18 5 L18 11.5 L3 11.5 L3 20.5 L18 20.5 L18 27 Z', 'e-resize');

  // ---------- styles ----------
  const style = document.createElement('style');
  style.textContent = `
  .prig-body-img{cursor:zoom-in}
  .prig-lb{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.5);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);display:flex;flex-direction:column;color:#fff;font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.4)}
  .prig-top{position:relative;display:flex;align-items:center;gap:8px;padding:8px 12px}
  .prig-stage img{box-shadow:0 8px 40px rgba(0,0,0,.45);border-radius:4px}
  .prig-count{position:absolute;left:50%;top:70%;transform:translate(-50%,-50%);padding:4px 12px;border-radius:999px;background:rgba(0,0,0,.5);font-weight:600;font-variant-numeric:tabular-nums;pointer-events:none}
  .prig-cap{flex:1;opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .prig-btn{background:rgba(255,255,255,.12);color:#fff;border:0;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:13px;text-decoration:none}
  .prig-btn:hover{background:rgba(255,255,255,.25);color:#fff;text-decoration:none}
  .prig-stage{flex:1;overflow:visible;display:flex;align-items:center;justify-content:center;min-height:0;padding-bottom:52px}
  .prig-stage img{max-width:calc(100vw - 140px);max-height:100%;object-fit:contain;user-select:none}
  .prig-stage.prig-multi{padding-bottom:0}
  .prig-stage.prig-zoom{overflow:auto;scrollbar-width:none;align-items:flex-start;justify-content:flex-start;padding:96px 144px}
  .prig-stage.prig-zoom::-webkit-scrollbar{display:none}
  .prig-stage.prig-zoom img{max-width:none;max-height:none;flex:none;margin:auto;cursor:grab}
  .prig-stage.prig-multi img{cursor:grab}
  .prig-stage.prig-drag img{cursor:grabbing}
  .prig-lb.prig-swipe-l,.prig-lb.prig-swipe-l *{cursor:${CURSOR_RIGHT} !important}
  .prig-lb.prig-swipe-r,.prig-lb.prig-swipe-r *{cursor:${CURSOR_LEFT} !important}
  .prig-nav{position:fixed;top:50%;transform:translateY(-50%);width:52px;height:80px;font-size:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;line-height:1;padding:0 0 6px}
  .prig-prev{left:8px}.prig-next{right:8px}
  .prig-strip{flex:none;display:flex;gap:8px;justify-content:safe center;overflow-x:auto;padding:10px 12px 14px;scrollbar-width:thin}
  .prig-thumb{flex:none;height:64px;padding:0;border:2px solid transparent;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden;cursor:pointer;opacity:.5;transition:opacity .12s,border-color .12s}
  .prig-thumb:hover{opacity:.85}
  .prig-thumb.prig-active{opacity:1;border-color:#fff}
  .prig-thumb img{display:block;height:100%;max-width:120px;object-fit:cover;pointer-events:none}
  `;
  document.head.appendChild(style);

  // ---------- helpers ----------
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k === 'class') n.className = v;
      else n.setAttribute(k, v);
    }
    n.append(...kids);
    return n;
  };

  const findBody = (node) => {
    for (const s of BODY_SELECTORS) {
      const b = node.closest(s);
      if (b) return b;
    }
    return null;
  };

  const isViewable = (img) => {
    if (img.matches('.emoji, .avatar, g-emoji img')) return false;
    const src = img.currentSrc || img.src || '';
    return !!src && !/shields\.io|badge/i.test(src);
  };

  // Full-size URL: GitHub wraps images in an <a> pointing at the original.
  const fullSrc = (img) => {
    const href = img.closest('a[href]')?.getAttribute('href');
    if (href && /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)|user-images|user-attachments|githubusercontent/i.test(href)) return href;
    return img.currentSrc || img.src;
  };

  // ---------- viewer ----------
  let lb = null, lb_move = null, lb_up = null;

  function openViewer(items, start) {
    closeViewer();
    let idx = start;

    const count = el('span', { class: 'prig-count' });
    const cap = el('span', { class: 'prig-cap' });
    const openLink = el('a', { class: 'prig-btn', target: '_blank', rel: 'noopener noreferrer', title: 'Open original' }, 'Open ↗');
    const closeBtn = el('button', { class: 'prig-btn', title: 'Close (Esc)', onclick: closeViewer }, '✕');
    const big = el('img', { alt: '' });
    const stage = el('div', { class: 'prig-stage' }, big);

    // Zoom: mouse wheel over the stage, anchored at the cursor. Zooming back out to fit size exits zoom.
    // While zoomed, drag to pan.
    let fitW = 0;
    const unzoom = () => { stage.classList.remove('prig-zoom'); big.style.width = ''; };
    let drag = null;

    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomed = stage.classList.contains('prig-zoom');
      const r = big.getBoundingClientRect();
      if (!r.width) return;
      if (!zoomed) fitW = r.width;

      const maxW = Math.max(big.naturalWidth * 4, fitW * 8);
      const w = Math.min(maxW, r.width * Math.exp(-e.deltaY * 0.0015));
      if (w <= fitW) { if (zoomed) unzoom(); return; }

      const clamp01 = (v) => Math.min(1, Math.max(0, v));
      const fx = clamp01((e.clientX - r.left) / r.width);
      const fy = clamp01((e.clientY - r.top) / r.height);
      const h = w * (r.height / r.width);

      big.style.width = `${w}px`;
      stage.classList.add('prig-zoom');
      // keep the point under the cursor fixed (measured after layout, so stage padding is accounted for)
      const z = big.getBoundingClientRect();
      stage.scrollLeft += z.left + fx * w - e.clientX;
      stage.scrollTop += z.top + fy * h - e.clientY;
    }, { passive: false });

    // Drag: pans when zoomed; otherwise a horizontal swipe goes to prev/next.
    let moved = false;
    big.addEventListener('mousedown', (e) => {
      const zoomed = stage.classList.contains('prig-zoom');
      if (e.button !== 0 || (!zoomed && items.length < 2)) return;
      e.preventDefault();
      moved = false;
      drag = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop, zoomed };
      stage.classList.add('prig-drag');
    });
    // 'l' / 'r' when the drag would trigger a swipe on release, '' otherwise
    const swipeDir = (dx, dy) =>
      Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'l' : 'r') : '';
    const showSwipe = (dir) => {
      lb.classList.toggle('prig-swipe-l', dir === 'l');
      lb.classList.toggle('prig-swipe-r', dir === 'r');
    };

    lb_move = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (drag.zoomed) {
        stage.scrollLeft = drag.sl - dx;
        stage.scrollTop = drag.st - dy;
      } else {
        showSwipe(swipeDir(dx, dy));
      }
    };
    lb_up = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      stage.classList.remove('prig-drag');
      showSwipe('');
      if (d.zoomed) return;
      const dir = swipeDir(e.clientX - d.x, e.clientY - d.y);
      if (dir) go(dir === 'l' ? idx + 1 : idx - 1);
    };
    window.addEventListener('mousemove', lb_move);
    window.addEventListener('mouseup', lb_up);

    // don't close when clicking the image, or when a drag that started on it ends on the backdrop
    big.addEventListener('click', (e) => { e.stopPropagation(); moved = false; });
    stage.addEventListener('click', (e) => {
      if (moved) { moved = false; return; }
      if (e.target === stage) closeViewer();
    });

    lb = el('div', { class: 'prig-lb', role: 'dialog', 'aria-modal': 'true' },
      el('div', { class: 'prig-top' }, count, cap, openLink, closeBtn), stage);

    // Thumbnail gallery at the bottom (multiple images only); click to switch.
    const thumbs = items.length > 1
      ? items.map((it, i) => el('button', { class: 'prig-thumb', title: it.alt || `Image ${i + 1}`, onclick: () => go(i) },
          el('img', { src: it.thumb, alt: '', draggable: 'false' })))
      : [];

    if (items.length > 1) {
      stage.classList.add('prig-multi');
      const strip = el('div', { class: 'prig-strip' }, ...thumbs);
      // vertical wheel scrolls the strip horizontally
      strip.addEventListener('wheel', (e) => {
        if (!e.deltaY || strip.scrollWidth <= strip.clientWidth) return;
        e.preventDefault();
        strip.scrollLeft += e.deltaY;
      }, { passive: false });
      lb.append(
        strip,
        el('button', { class: 'prig-btn prig-nav prig-prev', title: 'Previous (←)', onclick: () => go(idx - 1) }, '‹'),
        el('button', { class: 'prig-btn prig-nav prig-next', title: 'Next (→)', onclick: () => go(idx + 1) }, '›'),
      );
    }

    function go(i) {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      unzoom();
      stage.scrollTo(0, 0);
      big.src = it.thumb;              // already loaded on the page → instant
      if (it.full !== it.thumb) {      // swap to full size once loaded
        const pre = new Image();
        pre.onload = () => { if (items[idx] === it) big.src = it.full; };
        pre.src = it.full;
      }
      openLink.href = it.full;
      count.textContent = `${idx + 1} / ${items.length}`;
      cap.textContent = it.alt || '';
      thumbs.forEach((t, i) => t.classList.toggle('prig-active', i === idx));
      thumbs[idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    lb._key = (e) => {
      if (e.key === 'Escape') closeViewer();
      else if (e.key === 'ArrowLeft') go(idx - 1);
      else if (e.key === 'ArrowRight') go(idx + 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(items.length - 1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('keydown', lb._key, true);
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(lb);
    go(idx);
  }

  function closeViewer() {
    if (!lb) return;
    document.removeEventListener('keydown', lb._key, true);
    window.removeEventListener('mousemove', lb_move);
    window.removeEventListener('mouseup', lb_up);
    lb.remove();
    lb = null;
    document.documentElement.style.overflow = '';
  }

  // ---------- hook clicks ----------
  // One delegated listener: works across GitHub's Turbo navigation and body re-renders.
  // Ctrl/Cmd/Shift/middle click keeps GitHub's default open-in-new-tab.
  document.addEventListener('click', (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const img = e.target.closest?.('img');
    if (!img || !isViewable(img)) return;
    const body = findBody(img);
    if (!body) return;

    const imgs = [...body.querySelectorAll('img')].filter(isViewable);
    const start = imgs.indexOf(img);
    if (start < 0) return;

    e.preventDefault();
    e.stopPropagation();
    openViewer(imgs.map((i) => ({ thumb: i.currentSrc || i.src, full: fullSrc(i), alt: i.alt })), start);
  }, true);

  // Zoom-in cursor on viewable images in the PR body.
  document.addEventListener('mouseover', (e) => {
    const img = e.target.closest?.('img');
    if (img && !img.classList.contains('prig-body-img') && isViewable(img) && findBody(img)) {
      img.classList.add('prig-body-img');
    }
  });
})();
