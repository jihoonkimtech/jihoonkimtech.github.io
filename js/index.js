document.addEventListener('DOMContentLoaded', () => {

    // tell the head-side failsafe that the main script is alive
    window.__introBooted = true;

    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (window.lucide) {
        lucide.createIcons();
    }

    // dark mode toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = root.classList.toggle('dark');
            try {
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
            } catch (err) {
                // private mode or blocked storage: keep the toggle working anyway
            }
        });
    }

    // highlight the current section in the sticky nav while scrolling
    const navLinks = document.querySelectorAll('.nav-link');
    const trackedSections = document.querySelectorAll('main section[id]');

    if (navLinks.length && trackedSections.length) {
        const navScroller = navLinks[0].parentElement;
        let activeId = null;

        // scroll the nav pill into view horizontally only, never the page
        const revealLink = (link) => {
            if (!navScroller) return;
            const target = link.offsetLeft - (navScroller.clientWidth - link.offsetWidth) / 2;
            const max = navScroller.scrollWidth - navScroller.clientWidth;
            navScroller.scrollTo({
                left: Math.max(0, Math.min(target, max)),
                behavior: prefersReducedMotion ? 'auto' : 'smooth'
            });
        };

        const setActiveLink = (id) => {
            if (id === activeId) return;
            activeId = id;
            navLinks.forEach((link) => {
                const isActive = link.getAttribute('href') === `#${id}`;
                link.classList.toggle('bg-orange-500', isActive);
                link.classList.toggle('text-white', isActive);
                link.classList.toggle('text-gray-600', !isActive);
                link.classList.toggle('dark:text-stone-300', !isActive);
                link.classList.toggle('hover:bg-orange-100', !isActive);
                link.classList.toggle('dark:hover:bg-orange-900/30', !isActive);
                link.classList.toggle('hover:text-orange-600', !isActive);
                link.classList.toggle('dark:hover:text-orange-300', !isActive);
                if (isActive) {
                    link.setAttribute('aria-current', 'true');
                    revealLink(link);
                } else {
                    link.removeAttribute('aria-current');
                }
            });
        };

        // keep a live set so the topmost visible section always wins
        const visible = new Set();

        const sectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        visible.add(entry.target);
                    } else {
                        visible.delete(entry.target);
                    }
                });

                if (!visible.size) return;

                const topmost = [...visible].reduce((best, node) =>
                    node.getBoundingClientRect().top < best.getBoundingClientRect().top ? node : best
                );
                setActiveLink(topmost.id);
            },
            { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
        );

        trackedSections.forEach((section) => sectionObserver.observe(section));
    }

    // paint a blurred copy of each thumbnail behind its letterbox bars
    document.querySelectorAll('.thumb').forEach((box) => {
        const img = box.querySelector('img');
        if (!img) return;

        const applyBackdrop = () => {
            const src = img.currentSrc || img.src;
            if (src) box.style.setProperty('--thumb-src', `url("${src}")`);
        };

        // lazy images resolve later, so wait for load unless already decoded
        if (img.complete && img.naturalWidth) {
            applyBackdrop();
        } else {
            img.addEventListener('load', applyBackdrop, { once: true });
        }
    });

    const overlay = document.getElementById('intro-overlay');
    const cardContainer = document.getElementById('card-container');
    const card = document.getElementById('business-card');
    const glare = document.getElementById('card-glare');

    // release the scroll lock and retire the overlay for good
    const dismissOverlay = () => {
        root.classList.remove('intro-ready');
        if (overlay) {
            overlay.setAttribute('aria-hidden', 'true');
            overlay.removeAttribute('tabindex');
        }
    };

    // nothing to do if the overlay markup is missing
    if (!overlay || !root.classList.contains('intro-ready')) {
        dismissOverlay();
        return;
    }

    let isEntering = false;
    let isAnimFinished = false; // unlocked once the drop-in animation settles
    let tiltFrame = null;

    overlay.focus({ preventScroll: true });

    // remove class when drop animation ends
    if (card) {
        card.addEventListener('animationend', (e) => {
            if (e.animationName === 'dropIn') {
                card.classList.remove('card-drop-in');
                isAnimFinished = true;
            }
        });
        // belt and braces: unlock tilt even if animationend never fires
        window.setTimeout(() => {
            card.classList.remove('card-drop-in');
            isAnimFinished = true;
        }, 1200);
    }

    // track mouse for 3d tilt
    // touch devices simply never fire mousemove, so no capability gate is needed
    if (cardContainer && card) {
        overlay.addEventListener('mousemove', (e) => {
            if (!isAnimFinished || isEntering) return;

            const clientX = e.clientX;
            const clientY = e.clientY;

            // coalesce into one paint per frame
            if (tiltFrame) return;
            tiltFrame = window.requestAnimationFrame(() => {
                tiltFrame = null;

                const rect = cardContainer.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const mouseX = clientX - centerX;
                const mouseY = clientY - centerY;

                const rotateX = -(mouseY / (rect.height / 2)) * 15;
                const rotateY = (mouseX / (rect.width / 2)) * 15;

                card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

                if (glare) {
                    const glareX = (mouseX / rect.width) * 100 + 50;
                    const glareY = (mouseY / rect.height) * 100 + 50;
                    glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.4) 0%, transparent 60%)`;
                    glare.style.opacity = '1';
                }
            });
        });

        // reset rotation when mouse leaves
        overlay.addEventListener('mouseleave', () => {
            if (!isAnimFinished || isEntering) return;
            card.style.transform = 'rotateX(0deg) rotateY(0deg)';
            card.style.transition = 'transform 0.5s ease-out';

            if (glare) {
                glare.style.opacity = '0';
                glare.style.transition = 'opacity 0.5s ease-out';
            }
        });

        // fast response on re-enter
        overlay.addEventListener('mouseenter', () => {
            if (!isAnimFinished || isEntering) return;
            card.style.transition = 'transform 0.1s ease-out';
            if (glare) glare.style.transition = 'opacity 0.1s ease-out';
        });
    }

    // handle entering the site
    const enterSite = () => {
        if (isEntering) return;
        isEntering = true;

        if (tiltFrame) {
            window.cancelAnimationFrame(tiltFrame);
            tiltFrame = null;
        }

        if (card) {
            card.style.transition = 'none'; // clear transition to prevent conflicts
            card.classList.add('card-zoom-out');
        }

        overlay.style.opacity = '0';

        window.setTimeout(() => {
            dismissOverlay();

            if (window.lucide) {
                lucide.createIcons();
            }
        }, 800);
    };

    overlay.addEventListener('click', enterSite);

    // keyboard equivalents: enter, space, or escape
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Escape') {
            e.preventDefault();
            enterSite();
        }
    });

    // never leave the page locked if the tab is restored mid-transition
    window.addEventListener('pageshow', () => {
        if (isEntering) dismissOverlay();
    });
});