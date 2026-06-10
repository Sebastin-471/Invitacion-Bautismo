/**
 * Baptism Invitation — Cinematic Controller
 * Handles scene transitions, bokeh particles, auto-play, and navigation.
 */

(function () {
    'use strict';

    // ===========================
    // CONFIG
    // ===========================
    const CONFIG = {
        totalScenes: 6,
        sceneDurations: [6000, 10000, 8000, 8000, 8000, 10000], // ms per scene
        transitionDuration: 1500,
        bokehCount: 35,
        autoPlayEnabled: true,
    };

    // ===========================
    // STATE
    // ===========================
    let currentScene = 0;
    let isTransitioning = false;
    let autoPlayTimer = null;
    let isPlaying = false;
    let audioContext = null;

    // ===========================
    // DOM REFERENCES
    // ===========================
    const preloader = document.getElementById('preloader');
    const playOverlay = document.getElementById('play-overlay');
    const playBtn = document.getElementById('play-btn');
    const bokehCanvas = document.getElementById('bokeh-canvas');
    const ctx = bokehCanvas.getContext('2d');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const sceneDots = document.querySelectorAll('.scene-dot');
    const scenes = document.querySelectorAll('.scene');
    const navPrev = document.getElementById('nav-prev');
    const navNext = document.getElementById('nav-next');

    // ===========================
    // PRELOADER
    // ===========================
    function initPreloader() {
        const fill = document.querySelector('.preloader-fill');
        let progress = 0;

        const images = document.querySelectorAll('img');
        let loaded = 0;
        const total = images.length || 1;

        function updateProgress() {
            loaded++;
            progress = Math.min((loaded / total) * 100, 100);
            fill.style.width = progress + '%';
            if (loaded >= total) {
                setTimeout(finishPreloader, 600);
            }
        }

        if (images.length === 0) {
            fill.style.width = '100%';
            setTimeout(finishPreloader, 800);
            return;
        }

        images.forEach(img => {
            if (img.complete) {
                updateProgress();
            } else {
                img.addEventListener('load', updateProgress);
                img.addEventListener('error', updateProgress);
            }
        });

        // Fallback timeout
        setTimeout(() => {
            if (progress < 100) {
                fill.style.width = '100%';
                setTimeout(finishPreloader, 400);
            }
        }, 5000);
    }

    function finishPreloader() {
        preloader.classList.add('hidden');
    }

    // ===========================
    // BOKEH PARTICLES
    // ===========================
    const particles = [];

    class BokehParticle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * bokehCanvas.width;
            this.y = Math.random() * bokehCanvas.height;
            this.radius = Math.random() * 4 + 1;
            this.baseOpacity = Math.random() * 0.25 + 0.05;
            this.opacity = this.baseOpacity;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = -Math.random() * 0.4 - 0.1;
            this.pulseSpeed = Math.random() * 0.02 + 0.005;
            this.pulsePhase = Math.random() * Math.PI * 2;
            this.hue = Math.random() > 0.6 ? 42 : 48; // golden hues
            this.saturation = Math.random() * 20 + 40;
            this.lightness = Math.random() * 20 + 75;
        }

        update(time) {
            this.x += this.vx;
            this.y += this.vy;
            this.opacity = this.baseOpacity + Math.sin(time * this.pulseSpeed + this.pulsePhase) * 0.1;

            // Wrap around
            if (this.y < -10) this.y = bokehCanvas.height + 10;
            if (this.x < -10) this.x = bokehCanvas.width + 10;
            if (this.x > bokehCanvas.width + 10) this.x = -10;
        }

        draw() {
            ctx.beginPath();
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.radius
            );
            gradient.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${this.opacity})`);
            gradient.addColorStop(0.5, `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${this.opacity * 0.5})`);
            gradient.addColorStop(1, `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, 0)`);
            ctx.fillStyle = gradient;
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function resizeCanvas() {
        bokehCanvas.width = window.innerWidth;
        bokehCanvas.height = window.innerHeight;
    }

    function initBokeh() {
        resizeCanvas();
        for (let i = 0; i < CONFIG.bokehCount; i++) {
            particles.push(new BokehParticle());
        }
    }

    let animFrame;
    function animateBokeh(time) {
        ctx.clearRect(0, 0, bokehCanvas.width, bokehCanvas.height);
        particles.forEach(p => {
            p.update(time);
            p.draw();
        });
        animFrame = requestAnimationFrame(animateBokeh);
    }

    // ===========================
    // SCENE MANAGEMENT
    // ===========================
    function showScene(index, direction = 'next') {
        if (index < 0 || index >= CONFIG.totalScenes || isTransitioning) return;
        if (index === currentScene && scenes[currentScene].classList.contains('active')) return;

        isTransitioning = true;

        // Hide current scene
        const currentEl = scenes[currentScene];
        if (currentEl) {
            currentEl.classList.remove('active');
            // Reset fade elements in old scene
            currentEl.querySelectorAll('.fade-element').forEach(el => {
                el.classList.remove('visible');
            });
        }

        currentScene = index;

        // Show new scene
        const nextEl = scenes[currentScene];
        setTimeout(() => {
            nextEl.classList.add('active');
            animateFadeElements(nextEl);
            isTransitioning = false;
        }, CONFIG.transitionDuration / 2);

        // Update UI
        updateProgress();
        updateDots();
        updateNavArrows();
    }

    function animateFadeElements(sceneEl) {
        const elements = sceneEl.querySelectorAll('.fade-element');
        elements.forEach(el => {
            const delay = parseInt(el.dataset.delay) || 0;
            setTimeout(() => {
                el.classList.add('visible');
            }, delay);
        });
    }

    function updateProgress() {
        const pct = ((currentScene + 1) / CONFIG.totalScenes) * 100;
        progressBar.style.setProperty('--progress', pct + '%');
    }

    function updateDots() {
        sceneDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentScene);
        });
    }

    function updateNavArrows() {
        navPrev.classList.toggle('visible', currentScene > 0);
        navNext.classList.toggle('visible', currentScene < CONFIG.totalScenes - 1);
    }

    // ===========================
    // AUTO-PLAY
    // ===========================
    function startAutoPlay() {
        stopAutoPlay();
        if (!CONFIG.autoPlayEnabled) return;

        const duration = CONFIG.sceneDurations[currentScene] || 7000;
        autoPlayTimer = setTimeout(() => {
            if (currentScene < CONFIG.totalScenes - 1) {
                showScene(currentScene + 1, 'next');
                startAutoPlay();
            }
        }, duration);
    }

    function stopAutoPlay() {
        if (autoPlayTimer) {
            clearTimeout(autoPlayTimer);
            autoPlayTimer = null;
        }
    }



    // ===========================
    // START INVITATION
    // ===========================
    function startInvitation() {
        playOverlay.classList.add('hidden');
        progressContainer.classList.add('visible');
        isPlaying = true;

        // Show first scene
        showScene(0);
        startAutoPlay();

        // Start bokeh animation
        requestAnimationFrame(animateBokeh);
    }

    // ===========================
    // EVENT LISTENERS
    // ===========================
    function initEventListeners() {
        // Play button
        playBtn.addEventListener('click', startInvitation);
        playOverlay.addEventListener('click', startInvitation);

        // Navigation arrows
        navPrev.addEventListener('click', () => {
            stopAutoPlay();
            showScene(currentScene - 1, 'prev');
            startAutoPlay();
        });

        navNext.addEventListener('click', () => {
            stopAutoPlay();
            showScene(currentScene + 1, 'next');
            startAutoPlay();
        });

        // Scene dots
        sceneDots.forEach(dot => {
            dot.addEventListener('click', () => {
                const target = parseInt(dot.dataset.scene) - 1;
                stopAutoPlay();
                showScene(target);
                startAutoPlay();
            });
        });


        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!isPlaying) {
                if (e.key === 'Enter' || e.key === ' ') {
                    startInvitation();
                }
                return;
            }

            if (e.key === 'ArrowRight' || e.key === ' ') {
                stopAutoPlay();
                showScene(currentScene + 1, 'next');
                startAutoPlay();
            } else if (e.key === 'ArrowLeft') {
                stopAutoPlay();
                showScene(currentScene - 1, 'prev');
                startAutoPlay();
            }
        });

        // Touch swipe support
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!isPlaying) return;

            const dx = e.changedTouches[0].screenX - touchStartX;
            const dy = e.changedTouches[0].screenY - touchStartY;

            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
                stopAutoPlay();
                if (dx < 0) {
                    showScene(currentScene + 1, 'next');
                } else {
                    showScene(currentScene - 1, 'prev');
                }
                startAutoPlay();
            }
        }, { passive: true });

        // Resize handler
        window.addEventListener('resize', () => {
            resizeCanvas();
        });
    }

    // ===========================
    // INIT
    // ===========================
    function init() {
        initPreloader();
        initBokeh();
        initEventListeners();
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
