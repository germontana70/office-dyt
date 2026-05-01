'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/infra/services/auth';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { PremiumButton } from '@/ui/components/modules/buttons/PremiumButton';
import { ParticleBackground } from '@/ui/components/modules/layout/ParticleBackground';
import Image from 'next/image';
import { toast } from 'sonner';

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await authService.updatePassword(password);

            if (updateError) {
                setError(updateError.message);
                setLoading(false);
            } else {
                toast.success('¡Contraseña actualizada con éxito!', {
                    description: 'Tu nueva contraseña ha sido guardada.',
                });
                router.push('/dashboard');
                router.refresh();
            }
        } catch (err) {
            setError('Ocurrió un error inesperado al intentar actualizar la contraseña.');
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
            <ParticleBackground />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

            <div className="relative z-10 w-full max-w-md p-6 animate-in zoom-in-95 fade-in duration-700">
                <GlassCard className="p-8 sm:p-10 border-white/5 bg-black/40 backdrop-blur-2xl shadow-[0_8px_32px_0_hsl(var(--primary)/0.15)] ring-1 ring-white/10">
                    <header className="flex flex-col items-center text-center space-y-6 mb-8">
                        <div className="relative w-48 h-16">
                            <Image
                                src="/logos/dyt-logo-dark.png"
                                alt="Dones y Talentos"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight text-white">Actualizar Contraseña</h1>
                            <p className="text-sm text-white/50">
                                Ingresa tu nueva contraseña para acceder.
                            </p>
                        </div>
                    </header>

                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium flex items-center gap-3">
                                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium tracking-widest"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium tracking-widest"
                                />
                            </div>
                        </div>

                        <PremiumButton
                            type="submit"
                            disabled={loading}
                            variant="primary"
                            className="w-full shadow-[0_0_20px_hsl(var(--primary)/0.4)] h-12 text-base font-semibold"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Guardando...
                                </span>
                            ) : (
                                "Guardar Nueva Contraseña"
                            )}
                        </PremiumButton>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}
