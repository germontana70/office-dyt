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

        // Colores de marca exactos
        const colors = {
            dark: {
                primary: '#BF00FF', // Morado Vibrante
                accent: '#00EDFF',  // Cyan Neón
                line: 'rgba(0, 237, 255, 0.15)'
            },
            light: {
                primary: '#4a154b', // Morado Ciruela Profundo (Más oscuro para contraste)
                accent: '#008b8b',  // Cyan Oscuro (Para contraste en blanco)
                line: 'rgba(74, 21, 75, 0.1)'
            }
        };

        const activeTheme = resolvedTheme === 'dark' ? colors.dark : colors.light;

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
            color: string;

            constructor() {
                this.x = Math.random() * canvas!.width;
                this.y = Math.random() * canvas!.height;
                this.size = Math.random() * 1.5 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.4;
                this.speedY = (Math.random() - 0.5) * 0.4;

                // Distribución de colores de marca
                this.color = Math.random() > 0.3 ? activeTheme.primary : activeTheme.accent;
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
                ctx.fillStyle = this.color;
                ctx.globalAlpha = resolvedTheme === 'dark' ? 0.4 : 0.5; // Aumento de opacidad en light mode
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const init = () => {
            particles = [];
            const nodeCount = Math.floor((window.innerWidth * window.innerHeight) / 12000);
            for (let i = 0; i < Math.min(nodeCount, 150); i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();

                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.globalAlpha = (resolvedTheme === 'dark' ? 0.2 : 0.1) * (1 - distance / 150);
                        ctx.strokeStyle = activeTheme.accent;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1; // Reset alpha
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
            className="fixed inset-0 z-[-2] pointer-events-none"
            aria-hidden="true"
        />
    );
};

