'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

export const ParticleBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { theme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            colorIndex: number; // 0 for primary (Plum), 1 for accent (Cyan)

            constructor() {
                this.x = Math.random() * canvas!.width;
                this.y = Math.random() * canvas!.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.3;
                this.speedY = (Math.random() - 0.5) * 0.3;
                this.colorIndex = Math.random() > 0.4 ? 0 : 1;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > canvas!.width) this.x = 0;
                else if (this.x < 0) this.x = canvas!.width;
                if (this.y > canvas!.height) this.y = 0;
                else if (this.y < 0) this.y = canvas!.height;
            }

            draw() {
                if (!ctx) return;

                // Color dynamically based on theme
                const isDark = theme === 'dark';

                if (isDark) {
                    ctx.fillStyle = this.colorIndex === 0
                        ? `hsla(var(--primary) / 0.15)`
                        : `hsla(var(--accent) / 0.3)`;
                } else {
                    ctx.fillStyle = this.colorIndex === 0
                        ? `hsla(var(--primary) / 0.08)`
                        : `hsla(var(--foreground) / 0.05)`;
                }

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const init = () => {
            particles = [];
            const nodeCount = Math.floor((window.innerWidth * window.innerHeight) / 10000);
            for (let i = 0; i < Math.min(nodeCount, 200); i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();

                // HUD lines
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 120) {
                        ctx.beginPath();
                        const isDark = theme === 'dark';
                        const opacity = (isDark ? 0.15 : 0.05) - distance / 800;
                        ctx.strokeStyle = `hsla(var(--accent) / ${opacity > 0 ? opacity : 0})`;
                        ctx.lineWidth = 0.4;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        resize();
        window.addEventListener('resize', resize);
        init();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme]); // Re-init on theme change

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[-2] pointer-events-none opacity-60"
            aria-hidden="true"
        />
    );
};

