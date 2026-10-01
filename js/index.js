document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

    // render lucide icons once the deferred library is ready
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // theme toggle: explicit choice overrides the system preference
    const isDark = () => {
        const forced = root.getAttribute('data-theme');
        if (forced) return forced === 'dark';
        return systemDark.matches;
    };

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const next = isDark() ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            // storage can throw in private mode, the toggle still works for this visit
            try {
                localStorage.setItem('theme', next);
            } catch (err) {
                /* ignore */
            }
        });
    }

    // highlight the nav link of the section currently in view
    const navLinks = [...document.querySelectorAll('.nav-link')];
    const nav = document.querySelector('.nav');
    const sections = navLinks
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

    const setActive = (id) => {
        navLinks.forEach((link) => {
            const on = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('is-active', on);
            if (on) {
                link.setAttribute('aria-current', 'true');
                // keep the active pill visible on narrow screens without moving the page
                if (nav) {
                    const left = link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2;
                    nav.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? 'auto' : 'smooth' });
                }
            } else {
                link.removeAttribute('aria-current');
            }
        });
    };

    if ('IntersectionObserver' in window && sections.length) {
        const visible = new Set();
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
            if (!visible.size) {
                setActive(null);
                return;
            }
            // topmost visible section wins
            const top = [...visible].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
            setActive(top.id);
        }, { rootMargin: '-80px 0px -55% 0px' });
        sections.forEach((s) => io.observe(s));
    }

    // archive category filter
    const filters = [...document.querySelectorAll('.filter')];
    const cards = [...document.querySelectorAll('.a-card')];

    const applyFilter = (cat) => {
        filters.forEach((f) => {
            const on = f.dataset.filter === cat;
            f.classList.toggle('is-active', on);
            f.setAttribute('aria-pressed', String(on));
        });
        cards.forEach((c) => {
            c.hidden = cat !== 'all' && c.dataset.cat !== cat;
        });
    };

    filters.forEach((f) => f.addEventListener('click', () => applyFilter(f.dataset.filter)));

    // in-page jumps reveal hidden archive cards and flash the target
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        const id = link.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;

        if (target.classList.contains('a-card') && target.hidden) {
            applyFilter('all');
        }

        if (target.matches('.a-card, .feature, .t-item')) {
            target.classList.remove('jump-target');
            void target.offsetWidth;
            target.classList.add('jump-target');
            window.setTimeout(() => target.classList.remove('jump-target'), 2200);
        }
    });

    // stack tiles: one floating tooltip shared by every tile
    const tip = document.getElementById('stack-tip');
    const tiles = [...document.querySelectorAll('.tile')];
    let tipOwner = null;
    let shownAt = 0;

    const hideTip = () => {
        if (!tip) return;
        tip.hidden = true;
        if (tipOwner) tipOwner.classList.remove('is-tip');
        tipOwner = null;
    };

    const showTip = (tile) => {
        if (!tip) return;
        if (tipOwner && tipOwner !== tile) tipOwner.classList.remove('is-tip');
        tipOwner = tile;
        tile.classList.add('is-tip');
        tip.querySelector('.tip-name').textContent = tile.dataset.name;
        tip.querySelector('.tip-level').textContent = tile.dataset.level;
        tip.querySelector('.tip-use').textContent = tile.dataset.use;
        tip.hidden = false;
        shownAt = Date.now();

        // place above the tile, flip below when there is no room, clamp to the viewport
        const r = tile.getBoundingClientRect();
        const w = tip.offsetWidth;
        const h = tip.offsetHeight;
        const margin = 8;
        let left = r.left + r.width / 2 - w / 2;
        left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
        let top = r.top - h - 10;
        const below = top < 64;
        if (below) top = r.bottom + 10;
        tip.classList.toggle('below', below);
        tip.style.left = `${left}px`;
        tip.style.top = `${top}px`;
        tip.style.setProperty('--arrow-x', `${r.left + r.width / 2 - left}px`);
    };

    tiles.forEach((tile) => {
        tile.addEventListener('mouseenter', () => showTip(tile));
        tile.addEventListener('mouseleave', () => {
            if (document.activeElement !== tile) hideTip();
        });
        tile.addEventListener('focus', () => showTip(tile));
        tile.addEventListener('blur', hideTip);
        // touch screens have no hover, so a tap toggles the tooltip
        tile.addEventListener('click', () => {
            // focus already opened it during this tap, so keep it open
            if (tipOwner === tile && !tip.hidden && Date.now() - shownAt > 400) hideTip();
            else showTip(tile);
        });
    });

    window.addEventListener('scroll', hideTip, { passive: true });
    window.addEventListener('resize', hideTip);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideTip();
    });

    // switch between icon tiles and the detailed list
    const stackToggle = document.getElementById('stack-toggle');
    const stackTiles = document.getElementById('stack-tiles');
    const stackList = document.getElementById('stack-list');
    if (stackToggle && stackTiles && stackList) {
        stackToggle.addEventListener('click', () => {
            const open = stackToggle.getAttribute('aria-expanded') !== 'true';
            stackToggle.setAttribute('aria-expanded', String(open));
            stackList.hidden = !open;
            stackTiles.hidden = open;
            stackToggle.querySelector('span').textContent = open ? '아이콘으로 보기' : '전체 스택 자세히 보기';
            hideTip();
            if (!open) {
                document.getElementById('stack').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
            }
        });
    }

    // certificate lightbox built on the native dialog element
    const box = document.getElementById('lightbox');
    if (box && typeof box.showModal === 'function') {
        const img = box.querySelector('img');
        document.querySelectorAll('[data-lightbox]').forEach((btn) => {
            btn.addEventListener('click', () => {
                img.src = btn.dataset.lightbox;
                box.showModal();
            });
        });
        box.querySelector('.lightbox-close').addEventListener('click', () => box.close());
        // clicking the backdrop closes the dialog
        box.addEventListener('click', (e) => {
            if (e.target === box) box.close();
        });
    } else {
        // fallback: open the image directly
        document.querySelectorAll('[data-lightbox]').forEach((btn) => {
            btn.addEventListener('click', () => window.open(btn.dataset.lightbox, '_blank', 'noopener'));
        });
    }
});
