'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

export const ParticleBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Evitar errores de hidratación
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let shootingStars: ShootingStar[] = [];

        // Colores de marca exactos con alta vibrancia
        const colors = {
            dark: {
                primary: '#BF00FF', // Morado Vibrante
                accent: '#00EDFF',  // Cyan Neón
                star: '#FFFFFF'
            },
            light: {
                primary: '#4a154b', // Morado Ciruela Profundo
                accent: '#008b8b',  // Cyan Oscuro
                star: '#4a154b'
            }
        };

        const activeTheme = resolvedTheme === 'dark' ? colors.dark : colors.light;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);
        };

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            color: string;

            constructor() {
                this.x = Math.random() * window.innerWidth;
                this.y = Math.random() * window.innerHeight;
                this.size = Math.random() * 1.8 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.5;
                this.speedY = (Math.random() - 0.5) * 0.5;
                this.color = Math.random() > 0.4 ? activeTheme.primary : activeTheme.accent;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > window.innerWidth) this.x = 0;
                else if (this.x < 0) this.x = window.innerWidth;
                if (this.y > window.innerHeight) this.y = 0;
                else if (this.y < 0) this.y = window.innerHeight;
            }

            draw() {
                if (!ctx) return;
                ctx.save();
                ctx.globalAlpha = resolvedTheme === 'dark' ? 0.7 : 0.6;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class ShootingStar {
            x: number;
            y: number;
            length: number;
            speed: number;
            active: boolean;

            constructor() {
                this.x = Math.random() * window.innerWidth;
                this.y = Math.random() * (window.innerHeight / 2);
                this.length = Math.random() * 80 + 30;
                this.speed = Math.random() * 15 + 10;
                this.active = Math.random() > 0.95; // Rare trigger
            }

            reset() {
                this.x = Math.random() * window.innerWidth;
                this.y = Math.random() * (window.innerHeight / 2);
                this.length = Math.random() * 80 + 30;
                this.speed = Math.random() * 15 + 10;
                this.active = false;
            }

            update() {
                if (!this.active) {
                    if (Math.random() > 0.995) this.active = true;
                    return;
                }

                this.x += this.speed;
                this.y += this.speed / 2;

                if (this.x > window.innerWidth || this.y > window.innerHeight) {
                    this.reset();
                }
            }

            draw() {
                if (!this.active || !ctx) return;
                ctx.save();
                ctx.globalAlpha = resolvedTheme === 'dark' ? 0.4 : 0.2;
                ctx.strokeStyle = activeTheme.star;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - this.length, this.y - this.length / 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        const init = () => {
            particles = [];
            shootingStars = [];
            const nodeCount = Math.floor((window.innerWidth * window.innerHeight) / 10000);
            for (let i = 0; i < Math.min(nodeCount, 120); i++) {
                particles.push(new Particle());
            }
            for (let i = 0; i < 3; i++) {
                shootingStars.push(new ShootingStar());
            }
        };

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            // Nodos y líneas
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();

                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.save();
                        ctx.globalAlpha = (resolvedTheme === 'dark' ? 0.3 : 0.15) * (1 - distance / 150);
                        ctx.strokeStyle = activeTheme.accent;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }

            // Estrellas fugaces
            shootingStars.forEach(star => {
                star.update();
                star.draw();
            });

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
    }, [theme, resolvedTheme, mounted]);

    if (!mounted) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 -z-10 w-full h-full pointer-events-none"
            aria-hidden="true"
        />
    );
};
