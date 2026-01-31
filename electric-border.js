class ElectricBorder {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            color: options.color || '#5227FF',
            speed: options.speed || 1,
            chaos: options.chaos || 0.12,
            borderRadius: options.borderRadius || 24,
            ...options
        };

        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.time = 0;
        this.lastFrameTime = 0;

        // Simplex/Perlin Noise Helpers
        this.perm = new Uint8Array(512);
        this.grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
        this.seed(0);

        this.init();
    }

    seed(seed) {
        for (let i = 0; i < 256; i++) this.perm[i] = i;
        // Simple shuffle
        for (let i = 0; i < 256; i++) {
            let r = Math.floor(Math.random() * 256);
            let t = this.perm[i];
            this.perm[i] = this.perm[r];
            this.perm[r] = t;
        }
        for (let i = 0; i < 256; i++) this.perm[i + 256] = this.perm[i];
    }

    // Quick pseudo-random noise port
    random(x) {
        return (Math.sin(x * 12.9898) * 43758.5453) % 1;
    }

    noise2D(x, y) {
        // Simple value noise implementation for the effect
        const i = Math.floor(x);
        const j = Math.floor(y);
        const fx = x - i;
        const fy = y - j;

        const a = this.random(i + j * 57);
        const b = this.random(i + 1 + j * 57);
        const c = this.random(i + (j + 1) * 57);
        const d = this.random(i + 1 + (j + 1) * 57);

        const ux = fx * fx * (3.0 - 2.0 * fx);
        const uy = fy * fy * (3.0 - 2.0 * fy);

        return a * (1 - ux) * (1 - uy) +
            b * ux * (1 - uy) +
            c * (1 - ux) * uy +
            d * ux * uy;
    }

    octavedNoise(x, octaves, lacunarity, gain, baseAmplitude, baseFrequency, time, seed, baseFlatness) {
        let y = 0;
        let amplitude = baseAmplitude;
        let frequency = baseFrequency;

        for (let i = 0; i < octaves; i++) {
            let octaveAmplitude = amplitude;
            if (i === 0) octaveAmplitude *= baseFlatness;

            y += octaveAmplitude * this.noise2D(frequency * x + seed * 100, time * frequency * 0.3);
            frequency *= lacunarity;
            amplitude *= gain;
        }

        return y;
    }

    getCornerPoint(centerX, centerY, radius, startAngle, arcLength, progress) {
        const angle = startAngle + progress * arcLength;
        return {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        };
    }

    getRoundedRectPoint(t, left, top, width, height, radius) {
        const straightWidth = width - 2 * radius;
        const straightHeight = height - 2 * radius;
        const cornerArc = (Math.PI * radius) / 2;
        const totalPerimeter = 2 * straightWidth + 2 * straightHeight + 4 * cornerArc;
        const distance = t * totalPerimeter;

        let accumulated = 0;

        // Top edge
        if (distance <= accumulated + straightWidth) {
            const progress = (distance - accumulated) / straightWidth;
            return { x: left + radius + progress * straightWidth, y: top };
        }
        accumulated += straightWidth;

        // Top-right corner
        if (distance <= accumulated + cornerArc) {
            const progress = (distance - accumulated) / cornerArc;
            return this.getCornerPoint(left + width - radius, top + radius, radius, -Math.PI / 2, Math.PI / 2, progress);
        }
        accumulated += cornerArc;

        // Right edge
        if (distance <= accumulated + straightHeight) {
            const progress = (distance - accumulated) / straightHeight;
            return { x: left + width, y: top + radius + progress * straightHeight };
        }
        accumulated += straightHeight;

        // Bottom-right corner
        if (distance <= accumulated + cornerArc) {
            const progress = (distance - accumulated) / cornerArc;
            return this.getCornerPoint(left + width - radius, top + height - radius, radius, 0, Math.PI / 2, progress);
        }
        accumulated += cornerArc;

        // Bottom edge
        if (distance <= accumulated + straightWidth) {
            const progress = (distance - accumulated) / straightWidth;
            return { x: left + width - radius - progress * straightWidth, y: top + height };
        }
        accumulated += straightWidth;

        // Bottom-left corner
        if (distance <= accumulated + cornerArc) {
            const progress = (distance - accumulated) / cornerArc;
            return this.getCornerPoint(left + radius, top + height - radius, radius, Math.PI / 2, Math.PI / 2, progress);
        }
        accumulated += cornerArc;

        // Left edge
        if (distance <= accumulated + straightHeight) {
            const progress = (distance - accumulated) / straightHeight;
            return { x: left, y: top + height - radius - progress * straightHeight };
        }
        accumulated += straightHeight;

        // Top-left corner
        const progress = (distance - accumulated) / cornerArc;
        return this.getCornerPoint(left + radius, top + radius, radius, Math.PI, Math.PI / 2, progress);
    }

    init() {
        // Create DOM structure
        this.container.classList.add('electric-border');
        this.container.style.setProperty('--electric-border-color', this.options.color);
        this.container.style.borderRadius = `${this.options.borderRadius}px`;

        // Canvas Container
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'eb-canvas-container';

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'eb-canvas';
        canvasContainer.appendChild(this.canvas);

        // Layers
        const layers = document.createElement('div');
        layers.className = 'eb-layers';
        layers.innerHTML = `
            <div class="eb-glow-1"></div>
            <div class="eb-glow-2"></div>
            <div class="eb-background-glow"></div>
        `;

        // We assume the container already has content, but we need to wrap it specifically 
        // to match the structure if we were building from scratch. 
        // However, for applying to an existing element (like an image frame), 
        // we can just prepend/append these absolute helpers.

        this.container.insertBefore(layers, this.container.firstChild);
        this.container.insertBefore(canvasContainer, this.container.firstChild);

        this.ctx = this.canvas.getContext('2d');

        // Start Loop
        this.lastFrameTime = performance.now();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate(this.lastFrameTime);
    }

    resize() {
        if (!this.canvas || !this.container) return;

        // Settings from React code
        const borderOffset = 60;
        const rect = this.container.getBoundingClientRect();
        const width = rect.width + borderOffset * 2;
        const height = rect.height + borderOffset * 2;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        this.ctx.scale(dpr, dpr);

        this.width = width;
        this.height = height;
    }

    animate(currentTime) {
        if (!this.canvas || !this.ctx) return;

        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.time += deltaTime * this.options.speed;
        this.lastFrameTime = currentTime;

        // Clear
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.scale(dpr, dpr);

        this.ctx.strokeStyle = this.options.color;
        this.ctx.lineWidth = 1;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Config
        const displacement = 60; // scale
        const borderOffset = 60;

        // Calculate drawing dimensions
        const borderWidth = this.width - 2 * borderOffset;
        const borderHeight = this.height - 2 * borderOffset;

        // Safe radius
        const maxRadius = Math.min(borderWidth, borderHeight) / 2;
        const radius = Math.min(this.options.borderRadius, maxRadius);

        const approximatePerimeter = 2 * (borderWidth + borderHeight) + 2 * Math.PI * radius;
        const sampleCount = Math.floor(approximatePerimeter / 2);

        this.ctx.beginPath();

        // Hardcoded noise params from original
        const octaves = 10;
        const lacunarity = 1.6;
        const gain = 0.7;
        const amplitude = this.options.chaos;
        const frequency = 10;
        const baseFlatness = 0;

        for (let i = 0; i <= sampleCount; i++) {
            const progress = i / sampleCount;
            const point = this.getRoundedRectPoint(progress, borderOffset, borderOffset, borderWidth, borderHeight, radius);

            const xNoise = this.octavedNoise(
                progress * 8, octaves, lacunarity, gain, amplitude, frequency, this.time, 0, baseFlatness
            );

            const yNoise = this.octavedNoise(
                progress * 8, octaves, lacunarity, gain, amplitude, frequency, this.time, 1, baseFlatness
            );

            const dx = point.x + xNoise * displacement;
            const dy = point.y + yNoise * displacement;

            if (i === 0) this.ctx.moveTo(dx, dy);
            else this.ctx.lineTo(dx, dy);
        }

        this.ctx.closePath();
        this.ctx.stroke();

        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }
}
