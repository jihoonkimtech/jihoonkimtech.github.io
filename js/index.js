document.addEventListener('DOMContentLoaded', () => {

    if (window.lucide) {
        lucide.createIcons();
    }

    // dark mode toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    // highlight the current section in the sticky nav while scrolling
    const navLinks = document.querySelectorAll('.nav-link');
    const trackedSections = document.querySelectorAll('main section[id]');

    if (navLinks.length && trackedSections.length) {
        const setActiveLink = (id) => {
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
                    link.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        };

        const sectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveLink(entry.target.id);
                    }
                });
            },
            { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
        );

        trackedSections.forEach((section) => sectionObserver.observe(section));
    }

    const overlay = document.getElementById('intro-overlay');
    const cardContainer = document.getElementById('card-container');
    const card = document.getElementById('business-card');
    const glare = document.getElementById('card-glare');
    
    let isEntering = false;
    let isAnimFinished = false; // check drop animation status

    // lock background scroll
    document.body.style.overflow = 'hidden';

    // remove class when drop animation ends
    if (card) {
        card.addEventListener('animationend', (e) => {
            if (e.animationName === 'dropIn') {
                card.classList.remove('card-drop-in');
                isAnimFinished = true;
            }
        });
    }

    // track mouse for 3d tilt
    overlay.addEventListener('mousemove', (e) => {
        if (!isAnimFinished || isEntering || !cardContainer || overlay.classList.contains('hidden')) return;

        const rect = cardContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;

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

    // reset rotation when mouse leaves
    overlay.addEventListener('mouseleave', () => {
        if (!isAnimFinished || isEntering || !card) return;
        card.style.transform = 'rotateX(0deg) rotateY(0deg)';
        card.style.transition = 'transform 0.5s ease-out';
        
        if (glare) {
            glare.style.opacity = '0';
            glare.style.transition = 'opacity 0.5s ease-out';
        }
    });
    
    // fast response on re-enter
    overlay.addEventListener('mouseenter', () => {
        if (!isAnimFinished || isEntering || !card) return;
        card.style.transition = 'transform 0.1s ease-out';
        if (glare) glare.style.transition = 'opacity 0.1s ease-out';
    });

    // handle click to enter site
    overlay.addEventListener('click', () => {
        if (isEntering) return;
        isEntering = true;

        if (card) {
            card.style.transition = 'none'; // clear transition to prevent conflicts
            card.classList.add('card-zoom-out');
        }
        
        overlay.style.opacity = '0';
        
        setTimeout(() => {
            overlay.classList.add('hidden');
            document.body.style.overflow = 'auto';
            
            if (window.lucide) {
                lucide.createIcons();
            }
        }, 800);
    });
});