// Set current year
document.getElementById('year').textContent = new Date().getFullYear();

// Navbar Scroll Effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Sliding Nav Tab Logic
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const slider = document.getElementById('nav-tab-slider');
    const wrapper = document.querySelector('.nav-tab-wrapper');

    if (!slider || !wrapper) return;

    function moveSlider(element) {
        if (!element) {
            slider.style.opacity = '0';
            return;
        }

        // Calculate position relative to the wrapper
        const wrapperRect = wrapper.getBoundingClientRect();
        const rect = element.getBoundingClientRect();

        const left = rect.left - wrapperRect.left;

        slider.style.width = `${rect.width}px`;
        slider.style.left = `${left}px`;
        slider.style.opacity = '1';
    }

    // Initialize on active link
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) {
        // Wait a tick for layout
        setTimeout(() => moveSlider(activeLink), 100);
    }

    navLinks.forEach(link => {
        link.addEventListener('mouseenter', (e) => {
            moveSlider(e.target);
        });

        // Optional: Reset to active link on mouseleave of the container
        // If you want it to act like a "hover pill" that disappears, remove this.
        // If you want it to snap back to the "current section", keep this logic.
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            moveSlider(e.target);
        });
    });

    wrapper.addEventListener('mouseleave', () => {
        const active = document.querySelector('.nav-link.active');
        if (active) {
            moveSlider(active);
        } else {
            slider.style.opacity = '0';
        }
    });

    // Scrollspy with IntersectionObserver
    const sections = ['hero', 'about', 'skills', 'projects', 'certifications', 'journey', 'contact'];
    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -60% 0px', // Trigger when section is near top/center
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;

                // Remove active class from all
                navLinks.forEach(link => link.classList.remove('active'));

                // Add to current
                const activeLink = document.querySelector(`.nav-link[href="#${id}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                    moveSlider(activeLink);
                }
            }
        });
    }, observerOptions);

    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) observer.observe(section);
    });
});

// Initialize ElectricBorder on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Electric Border for About Me Image
    const aboutImageFrame = document.querySelector('.about-image-wrapper .image-frame');
    if (aboutImageFrame && typeof ElectricBorder !== 'undefined') {
        new ElectricBorder(aboutImageFrame, {
            color: '#7df9ff', // Cyan-ish electric color
            speed: 1,
            chaos: 0.12,
            borderRadius: 16
        });

        // Ensure image frame has correct positioning context
        aboutImageFrame.style.position = 'relative';
        aboutImageFrame.style.zIndex = '1';
    }

    // Initialize Target Cursor
    if (typeof TargetCursor !== 'undefined') {
        new TargetCursor({
            // Target all interactive elements
            targetSelector: 'a, button, .project-card, .skill-card, .image-frame, .menu-toggle',
            spinDuration: 4, // Slower spin for elegance
            hideDefaultCursor: false, // Show default arrow as requested
            hoverDuration: 0.2,
            parallaxOn: true
        });
    }
});

// Mobile Menu Toggle
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.getElementById('nav-links');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('open');
    });
});

// Certifications Carousel Logic
document.addEventListener('DOMContentLoaded', () => {
    const track = document.querySelector('.cert-track');
    const cards = document.querySelectorAll('.cert-card');
    const prevBtn = document.querySelector('.nav-arrow.prev');
    const nextBtn = document.querySelector('.nav-arrow.next');
    const indicatorsContainer = document.querySelector('.cert-indicators');

    if (!track || cards.length === 0) return;

    // Create Indicators
    cards.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('cert-dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
            scrollToCard(index);
        });
        indicatorsContainer.appendChild(dot);
    });

    const dots = document.querySelectorAll('.cert-dot');

    // Scroll Functions
    const scrollToCard = (index) => {
        const cardWidth = cards[0].offsetWidth + 32; // width + gap (approx)
        // More precise way:
        const targetCard = cards[index];
        const scrollLeft = targetCard.offsetLeft - (track.offsetWidth / 2) + (targetCard.offsetWidth / 2);

        track.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });
    };

    const updateActiveDot = () => {
        const center = track.scrollLeft + (track.offsetWidth / 2);
        let closestIndex = 0;
        let minDistance = Infinity;

        cards.forEach((card, index) => {
            const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
            const distance = Math.abs(center - cardCenter);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[closestIndex]) dots[closestIndex].classList.add('active');
    };

    // Event Listeners
    prevBtn.addEventListener('click', () => {
        const cardWidth = cards[0].offsetWidth + 32; // 32 is gap: 2rem
        track.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
        const cardWidth = cards[0].offsetWidth + 32;
        track.scrollBy({ left: cardWidth, behavior: 'smooth' });
    });

    track.addEventListener('scroll', () => {
        // Debounce slightly for performance if needed, but modern browsers handle this okay
        window.requestAnimationFrame(updateActiveDot);
    });


    // --- Lightbox Functionality (Hybrid) ---
    const modal = document.getElementById('cert-modal');
    const modalImg = document.getElementById('modal-img');
    const closeBtn = document.querySelector('.modal-close');

    // We target ALL .btn-view, but only preventDefault for those with 'lightbox-trigger' class
    const viewButtons = document.querySelectorAll('.btn-view');

    if (modal && modalImg && closeBtn) {
        // Open Modal
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Check if this button is supposed to open the lightbox
                if (btn.classList.contains('lightbox-trigger') || btn.getAttribute('href') === '#') {
                    e.preventDefault(); // Stop link navigation

                    // Find the image in the same card
                    const card = e.target.closest('.cert-card');
                    const img = card.querySelector('.cert-img');

                    if (img && img.src) {
                        modalImg.src = img.src;
                        modal.classList.add('active');
                        modal.setAttribute('aria-hidden', 'false');
                        document.body.style.overflow = 'hidden'; // Disable scroll
                    }
                }
                // If not a lightbox trigger, let the <a> tag work normally (open link)
            });
        });

        // Close Modal Function
        const closeModal = () => {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = ''; // Enable scroll
            setTimeout(() => { modalImg.src = ''; }, 300); // Clear src after transition
        };

        // Close on X click
        closeBtn.addEventListener('click', closeModal);

        // Close on Outside Click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close on Escape Key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    // Scroll Reveal Animation
    const revealElements = document.querySelectorAll('.reveal');

    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target); // Animate only once
                }
            });
        }, {
            root: null,
            threshold: 0.15, // Trigger when 15% visible
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    }
});


/* True Focus Animation Logic */
class TrueFocus {
    constructor(element, options = {}) {
        this.element = element;
        this.words = element.innerText.trim().split(' ');
        this.options = Object.assign({
            animationDuration: 0.5,
            pauseBetweenAnimations: 1,
            blurAmount: 5,
            borderColor: 'green',
            glowColor: 'rgba(0, 255, 0, 0.6)'
        }, options);

        this.currentIndex = 0;
        this.isActive = false; // Start inactive until visible? Or always active. User script implies auto-run.
        this.init();
    }

    init() {
        // Clear element and build DOM
        this.element.innerHTML = '';
        this.container = document.createElement('div');
        this.container.className = 'focus-container';

        // Create words
        this.wordSpans = this.words.map((word, index) => {
            const span = document.createElement('span');
            span.textContent = word;
            span.className = 'focus-word';
            span.style.filter = `blur(${this.options.blurAmount}px)`;
            this.container.appendChild(span);
            return span;
        });

        // Create frame
        this.frame = document.createElement('div');
        this.frame.className = 'focus-frame';
        this.frame.style.setProperty('--border-color', this.options.borderColor);
        this.frame.style.setProperty('--glow-color', this.options.glowColor);

        this.frame.innerHTML = `
            <span class="corner top-left"></span>
            <span class="corner top-right"></span>
            <span class="corner bottom-left"></span>
            <span class="corner bottom-right"></span>
        `;
        this.container.appendChild(this.frame);
        this.element.appendChild(this.container);

        // Resize observer to handle layout changes
        const resizeObserver = new ResizeObserver(() => this.updateFrame());
        resizeObserver.observe(this.element);

        // Intersection Observer to start/stop animation when visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.start();
                } else {
                    this.stop();
                }
            });
        }, { threshold: 0.5 });
        observer.observe(this.element);
    }

    start() {
        if (this.interval) return;
        this.updateFocus(); // Initial update
        this.interval = setInterval(() => {
            this.currentIndex = (this.currentIndex + 1) % this.words.length;
            this.updateFocus();
        }, (this.options.animationDuration + this.options.pauseBetweenAnimations) * 1000);
    }

    stop() {
        clearInterval(this.interval);
        this.interval = null;
    }

    updateFocus() {
        // Update words blur
        this.wordSpans.forEach((span, index) => {
            if (index === this.currentIndex) {
                span.classList.add('active');
                span.style.filter = 'blur(0px)';
            } else {
                span.classList.remove('active');
                span.style.filter = `blur(${this.options.blurAmount}px)`;
            }
        });

        this.updateFrame();
    }

    updateFrame() {
        const activeSpan = this.wordSpans[this.currentIndex];
        if (!activeSpan) return;

        const containerRect = this.container.getBoundingClientRect();
        const wordRect = activeSpan.getBoundingClientRect();

        this.frame.style.width = `${wordRect.width}px`;
        this.frame.style.height = `${wordRect.height}px`;
        this.frame.style.transform = `translate(${wordRect.left - containerRect.left}px, ${wordRect.top - containerRect.top}px)`;
        this.frame.classList.add('visible');
    }
}

// Initialize TrueFocus on specific sections
document.addEventListener('DOMContentLoaded', () => {
    // Select styling targets: "About Me", "Technical Skills", "Certifications", "Featured Projects", "My Journey", "Beyond Code"
    // Using simple selectors based on ID or content if needed.
    // IDs: #about, #skills, #certifications, #projects, #journey, #beyond

    // Helper to find titles within sections
    const ids = ['about', 'skills', 'certifications', 'projects', 'journey', 'beyond'];

    ids.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            const title = section.querySelector('.section-title');
            if (title) {
                // Initialize effect with requested green colors
                new TrueFocus(title, {
                    borderColor: '#00ff00', // vibrant green
                    glowColor: 'rgba(0, 255, 0, 0.6)',
                    animationDuration: 0.5,
                    pauseBetweenAnimations: 1
                });
            }
        }
    });
});



// Contact Form Handling
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.contact-form');
    const successMessage = document.querySelector('.success-message');
    const submitBtn = document.querySelector('.btn-submit');

    if (form && successMessage && submitBtn) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = 'Sending...';
            submitBtn.disabled = true;

            const formData = new FormData(form);

            fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
                .then(response => {
                    if (response.ok) {
                        form.style.display = 'none';
                        successMessage.style.display = 'flex';
                        form.reset();
                    } else {
                        alert("Oops! There was a problem submitting your form");
                        submitBtn.innerText = originalBtnText;
                        submitBtn.disabled = false;
                    }
                })
                .catch(error => {
                    alert("Oops! There was a problem submitting your form");
                    submitBtn.innerText = originalBtnText;
                    submitBtn.disabled = false;
                });
        });
    }
});
