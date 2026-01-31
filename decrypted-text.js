/**
 * Decrypted Text Effect
 * Converted from React component to Vanilla JS
 */

class DecryptedText {
    constructor(element, options = {}) {
        this.element = element;
        this.originalText = options.text || element.textContent;
        this.options = Object.assign({
            speed: 50,
            maxIterations: 10,
            sequential: false,
            revealDirection: 'start',
            useOriginalCharsOnly: false,
            characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
            animateInterval: 2000 // Time between animations in ms
        }, options);

        this.displayText = this.originalText;
        this.revealedIndices = new Set();
        this.interval = null;
        this.loopTimer = null;
        this.isScrambling = false;

        this.init();
    }

    init() {
        // Initial start
        this.startAnimation();

        // Loop
        if (this.options.animateInterval > 0) {
            this.loopTimer = setInterval(() => {
                if (!this.isScrambling) {
                    this.startAnimation();
                }
            }, this.options.animateInterval + (this.options.maxIterations * this.options.speed)); // Wait for animation to finish + interval
        }
    }

    getNextIndex(revealedSet) {
        const textLength = this.originalText.length;
        switch (this.options.revealDirection) {
            case 'start':
                return revealedSet.size;
            case 'end':
                return textLength - 1 - revealedSet.size;
            case 'center': {
                const middle = Math.floor(textLength / 2);
                const offset = Math.floor(revealedSet.size / 2);
                const nextIndex = revealedSet.size % 2 === 0 ? middle + offset : middle - offset - 1;

                if (nextIndex >= 0 && nextIndex < textLength && !revealedSet.has(nextIndex)) {
                    return nextIndex;
                }

                for (let i = 0; i < textLength; i++) {
                    if (!revealedSet.has(i)) return i;
                }
                return 0;
            }
            default:
                return revealedSet.size;
        }
    }

    shuffleText(originalText, currentRevealed) {
        if (this.options.useOriginalCharsOnly) {
            const positions = originalText.split('').map((char, i) => ({
                char,
                isSpace: char === ' ',
                index: i,
                isRevealed: currentRevealed.has(i)
            }));

            const nonSpaceChars = positions.filter(p => !p.isSpace && !p.isRevealed).map(p => p.char);

            for (let i = nonSpaceChars.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [nonSpaceChars[i], nonSpaceChars[j]] = [nonSpaceChars[j], nonSpaceChars[i]];
            }

            let charIndex = 0;
            return positions
                .map(p => {
                    if (p.isSpace) return ' ';
                    if (p.isRevealed) return originalText[p.index];
                    return nonSpaceChars[charIndex++];
                })
                .join('');
        } else {
            const availableChars = this.options.characters.split('');
            return originalText
                .split('')
                .map((char, i) => {
                    if (char === ' ') return ' ';
                    if (currentRevealed.has(i)) return originalText[i];
                    return availableChars[Math.floor(Math.random() * availableChars.length)];
                })
                .join('');
        }
    }

    startAnimation() {
        this.isScrambling = true;
        this.revealedIndices = new Set();
        let currentIteration = 0;

        if (this.interval) clearInterval(this.interval);

        this.interval = setInterval(() => {
            if (this.options.sequential) {
                if (this.revealedIndices.size < this.originalText.length) {
                    const nextIndex = this.getNextIndex(this.revealedIndices);
                    this.revealedIndices.add(nextIndex);
                    this.displayText = this.shuffleText(this.originalText, this.revealedIndices);
                    this.updateDOM();
                } else {
                    this.stopAnimation();
                }
            } else {
                this.displayText = this.shuffleText(this.originalText, this.revealedIndices);
                this.updateDOM();
                currentIteration++;
                if (currentIteration >= this.options.maxIterations) {
                    this.stopAnimation();
                }
            }
        }, this.options.speed);
    }

    stopAnimation() {
        clearInterval(this.interval);
        this.isScrambling = false;
        this.displayText = this.originalText;
        this.updateDOM();
    }

    updateDOM() {
        this.element.textContent = this.displayText;
    }
}


// Initialize on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    const samText = document.querySelector('.nav-name');
    if (samText) {
        // Adjust these parameters as needed
        new DecryptedText(samText, {
            speed: 50,
            maxIterations: 12, // slightly longer mix
            animateInterval: 2000, // 2 seconds delay
            characters: 'ABCDXYZ!@#$%^&*', // Customize scramble chars if desired
            sequential: true // Try sequential for a cooler effect, or false for random
        });
    }
});
