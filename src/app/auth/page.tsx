'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/infra/services/auth';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { PremiumButton } from '@/ui/components/modules/buttons/PremiumButton';
import { ParticleBackground } from '@/ui/components/modules/layout/ParticleBackground';
import Image from 'next/image';
import { toast } from 'sonner';

export default function AuthPage() {
    const router = useRouter();
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [otpMode, setOtpMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (otpMode) {
                const { error: verifyError } = await authService.verifyOtp(email, otp);
                if (verifyError) {
                    setError('Código incorrecto o expirado.');
                } else {
                    router.push('/auth/update-password');
                }
            } else if (isRecoveryMode) {
                const { error: resetError } = await authService.resetPassword(email);
                if (resetError) {
                    setError(resetError.message);
                } else {
                    toast.success('Código enviado', {
                        description: 'Revisa tu bandeja de entrada para ver el código de 6 dígitos.'
                    });
                    setOtpMode(true);
                }
            } else {
                const { error: signInError } = await authService.signIn(email, password);

                if (signInError) {
                    setError(signInError.message === 'Invalid login credentials'
                        ? 'Credenciales de acceso incorrectas'
                        : signInError.message);
                } else {
                    router.push('/dashboard');
                    router.refresh();
                }
            }
        } catch (err) {
            setError('Ocurrió un error inesperado. Por favor, inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
            {/* Cinematic Particle Background */}
            <ParticleBackground />

            {/* Light ambient glows */}
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
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                {otpMode ? 'Verificar Identidad' : (isRecoveryMode ? 'Recuperar Acceso' : 'Sistema Premium')}
                            </h1>
                            <p className="text-sm text-white/50">
                                {otpMode ? 'Ingresa el código seguro enviado a tu correo.' : (isRecoveryMode ? 'Te enviaremos un código de seguridad para restablecer tu contraseña.' : 'Acceso exclusivo para administración.')}
                            </p>
                        </div>
                    </header>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium flex items-center gap-3">
                                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {!otpMode ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white/70">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@donesytalentos.com"
                                            required
                                            disabled={loading}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium"
                                        />
                                    </div>

                                    {!isRecoveryMode && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-medium text-white/70">Contraseña secreta</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsRecoveryMode(true);
                                                        setError(null);
                                                    }}
                                                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                                >
                                                    ¿Olvidaste tu contraseña?
                                                </button>
                                            </div>
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
                                    )}
                                </>
                            ) : (
                                <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-500">
                                    <label className="text-sm font-medium text-white/70">Código de 6 dígitos</label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="123456"
                                        required
                                        disabled={loading}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium tracking-widest"
                                    />
                                    <p className="text-xs text-white/50 text-center pt-2">
                                        Revisa tu bandeja de entrada en Mailpit
                                    </p>
                                </div>
                            )}
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
                                    Procesando...
                                </span>
                            ) : (
                                otpMode ? "Verificar Código" : (isRecoveryMode ? "Enviar Código" : "Ingresar a Central")
                            )}
                        </PremiumButton>

                        {(isRecoveryMode || otpMode) && (
                            <div className="mt-4 text-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsRecoveryMode(false);
                                        setOtpMode(false);
                                        setOtp('');
                                        setError(null);
                                    }}
                                    className="text-sm font-medium text-white/60 hover:text-white transition-colors"
                                >
                                    Volver al inicio de sesión
                                </button>
                            </div>
                        )}
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-secondary/70">
                            Protocolo seguro conectado a Engine DYT
                        </p>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
