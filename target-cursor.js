class TargetCursor {
    constructor(options = {}) {
        this.options = {
            targetSelector: options.targetSelector || '.cursor-target',
            spinDuration: options.spinDuration || 2,
            hideDefaultCursor: options.hideDefaultCursor !== false,
            hoverDuration: options.hoverDuration || 0.2,
            parallaxOn: options.parallaxOn !== false,
            ...options
        };

        this.cursor = null;
        this.dot = null;
        this.corners = [];
        this.spinTl = null;
        this.isActive = false;
        this.targetCornerPositions = null;
        this.activeTarget = null;
        this.activeStrength = { current: 0 };
        this.resumeTimeout = null;
        this.currentLeaveHandler = null;

        this.constants = {
            borderWidth: 3,
            cornerSize: 12
        };

        if (this.isMobile()) return;

        this.init();
    }

    isMobile() {
        const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
        const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());
        return (hasTouchScreen && isSmallScreen) || isMobileUserAgent;
    }

    createDOM() {
        // Create wrapper
        this.cursor = document.createElement('div');
        this.cursor.className = 'target-cursor-wrapper';

        // Create dot
        this.dot = document.createElement('div');
        this.dot.className = 'target-cursor-dot';
        this.cursor.appendChild(this.dot);

        // Create corners
        const positions = ['tl', 'tr', 'br', 'bl'];
        positions.forEach(pos => {
            const corner = document.createElement('div');
            corner.className = `target-cursor-corner corner-${pos}`;
            this.cursor.appendChild(corner);
            this.corners.push(corner);
        });

        document.body.appendChild(this.cursor);
    }

    init() {
        if (this.options.hideDefaultCursor) {
            document.body.style.cursor = 'none';
        }

        this.createDOM();

        // Initial Position (Center)
        gsap.set(this.cursor, {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            xPercent: -50,
            yPercent: -50
        });

        // Spin Animation
        this.createSpinTimeline();

        // Event Listeners
        window.addEventListener('mousemove', (e) => this.moveCursor(e.clientX, e.clientY));
        window.addEventListener('mouseover', (e) => this.enterHandler(e), { passive: true });
        window.addEventListener('scroll', () => this.scrollHandler(), { passive: true });
        window.addEventListener('mousedown', () => this.mouseDownHandler());
        window.addEventListener('mouseup', () => this.mouseUpHandler());

        // Ticker (always running but checks active state)
        gsap.ticker.add(() => this.tick());
    }

    createSpinTimeline() {
        if (this.spinTl) this.spinTl.kill();
        this.spinTl = gsap.timeline({ repeat: -1 })
            .to(this.cursor, { rotation: '+=360', duration: this.options.spinDuration, ease: 'none' });
    }

    moveCursor(x, y) {
        if (!this.cursor) return;
        gsap.to(this.cursor, {
            x: x,
            y: y,
            duration: 0.1,
            ease: 'power3.out'
        });
    }

    mouseDownHandler() {
        if (!this.dot || !this.cursor) return;
        gsap.to(this.dot, { scale: 0.7, duration: 0.3 });
        gsap.to(this.cursor, { scale: 0.9, duration: 0.2 });
    }

    mouseUpHandler() {
        if (!this.dot || !this.cursor) return;
        gsap.to(this.dot, { scale: 1, duration: 0.3 });
        gsap.to(this.cursor, { scale: 1, duration: 0.2 });
    }

    enterHandler(e) {
        let target = e.target;
        // Check if target or parent matches selector
        while (target && target !== document.body) {
            if (target.matches(this.options.targetSelector)) {
                break;
            }
            target = target.parentElement;
        }

        // If no valid target found or already active on this target
        if (!target || !target.matches(this.options.targetSelector)) return;
        if (this.activeTarget === target) return;

        // Cleanup previous target if exists
        if (this.activeTarget) this.cleanupTarget(this.activeTarget);
        if (this.resumeTimeout) {
            clearTimeout(this.resumeTimeout);
            this.resumeTimeout = null;
        }

        this.activeTarget = target;

        // Kill existing tweens
        this.corners.forEach(corner => gsap.killTweensOf(corner));
        gsap.killTweensOf(this.cursor, 'rotation');
        if (this.spinTl) this.spinTl.pause();
        gsap.set(this.cursor, { rotation: 0 });

        // Calculate Target Positions
        const rect = target.getBoundingClientRect();
        const { borderWidth, cornerSize } = this.constants;

        this.targetCornerPositions = [
            { x: rect.left - borderWidth, y: rect.top - borderWidth },
            { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
            { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
            { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize }
        ];

        this.isActive = true;

        // Animate Strength
        gsap.to(this.activeStrength, {
            current: 1,
            duration: this.options.hoverDuration,
            ease: 'power2.out'
        });

        // Current Cursor Pos
        const cursorX = gsap.getProperty(this.cursor, 'x');
        const cursorY = gsap.getProperty(this.cursor, 'y');

        // Initial snap to approximate relative positions
        this.corners.forEach((corner, i) => {
            gsap.to(corner, {
                x: this.targetCornerPositions[i].x - cursorX,
                y: this.targetCornerPositions[i].y - cursorY,
                duration: 0.2,
                ease: 'power2.out'
            });
        });

        // Show corners
        this.corners.forEach(corner => gsap.to(corner, { opacity: 1, duration: 0.2 }));

        // Setup Leave Handler
        this.currentLeaveHandler = () => this.leaveHandler(target);
        target.addEventListener('mouseleave', this.currentLeaveHandler);
    }

    scrollHandler() {
        if (!this.activeTarget || !this.cursor) return;

        // Check if mouse is still over the target after scroll
        const mouseX = gsap.getProperty(this.cursor, 'x');
        const mouseY = gsap.getProperty(this.cursor, 'y');
        const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);

        const isStillOver = elementUnderMouse && (
            elementUnderMouse === this.activeTarget ||
            this.activeTarget.contains(elementUnderMouse)
        );

        if (!isStillOver) {
            if (this.currentLeaveHandler) this.currentLeaveHandler();
        } else {
            // Re-calculate positions as element moved
            const rect = this.activeTarget.getBoundingClientRect();
            const { borderWidth, cornerSize } = this.constants;
            this.targetCornerPositions = [
                { x: rect.left - borderWidth, y: rect.top - borderWidth },
                { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
                { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
                { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize }
            ];
        }
    }

    leaveHandler(target) {
        this.isActive = false;
        this.targetCornerPositions = null;
        gsap.set(this.activeStrength, { current: 0, overwrite: true });
        this.activeTarget = null;

        // Reset corners to center
        const { cornerSize } = this.constants;
        const positions = [
            { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
            { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
            { x: cornerSize * 0.5, y: cornerSize * 0.5 },
            { x: -cornerSize * 1.5, y: cornerSize * 0.5 }
        ];

        this.corners.forEach((corner, i) => {
            gsap.to(corner, {
                x: positions[i].x,
                y: positions[i].y,
                duration: 0.3,
                ease: 'power3.out',
                overwrite: 'true'
            });
        });

        // Hide corners
        this.corners.forEach(corner => gsap.to(corner, { opacity: 0, duration: 0.2 }));

        // Resume Spin
        this.resumeTimeout = setTimeout(() => {
            if (!this.activeTarget && this.cursor && this.spinTl) {
                const currentRotation = gsap.getProperty(this.cursor, 'rotation');
                const normalizedRotation = currentRotation % 360;

                this.spinTl.kill();
                this.spinTl = gsap.timeline({ repeat: -1 })
                    .to(this.cursor, { rotation: '+=360', duration: this.options.spinDuration, ease: 'none' });

                gsap.to(this.cursor, {
                    rotation: normalizedRotation + 360,
                    duration: this.options.spinDuration * (1 - normalizedRotation / 360),
                    ease: 'none',
                    onComplete: () => {
                        if (this.spinTl) this.spinTl.restart();
                    }
                });
            }
            this.resumeTimeout = null;
        }, 50);

        this.cleanupTarget(target);
    }

    cleanupTarget(target) {
        if (this.currentLeaveHandler) {
            target.removeEventListener('mouseleave', this.currentLeaveHandler);
            this.currentLeaveHandler = null;
        }
    }

    tick() {
        if (!this.isActive || !this.targetCornerPositions || !this.cursor) return;

        const strength = this.activeStrength.current;
        if (strength === 0) return;

        const cursorX = gsap.getProperty(this.cursor, 'x');
        const cursorY = gsap.getProperty(this.cursor, 'y');

        this.corners.forEach((corner, i) => {
            const currentX = gsap.getProperty(corner, 'x');
            const currentY = gsap.getProperty(corner, 'y');

            // The position relative to cursor
            // Target Pos (absolute) - Cursor Pos (absolute) = Relative Vector needed
            const targetX = this.targetCornerPositions[i].x - cursorX;
            const targetY = this.targetCornerPositions[i].y - cursorY;

            const finalX = currentX + (targetX - currentX) * strength;
            const finalY = currentY + (targetY - currentY) * strength;

            const duration = strength >= 0.99 ? (this.options.parallaxOn ? 0.2 : 0) : 0.05;

            gsap.to(corner, {
                x: finalX,
                y: finalY,
                duration: duration,
                ease: duration === 0 ? 'none' : 'power1.out',
                overwrite: 'auto'
            });
        });
    }
}
