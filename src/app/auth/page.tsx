'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/infra/services/auth';
import styles from '@/ui/components/modules/auth.module.css';

export default function AuthPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: signInError } = await authService.signIn(email, password);

            if (signInError) {
                setError(signInError.message === 'Invalid login credentials'
                    ? 'Credenciales de acceso incorrectas'
                    : signInError.message);
                setLoading(false);
            } else {
                router.push('/dashboard');
                router.refresh();
            }
        } catch (err) {
            setError('Ocurrió un error inesperado al intentar ingresar.');
            setLoading(false);
        }
    };

    return (
        <div className={styles.wrapper}>
            <div className={`${styles.loginCard}`}>
                <header className={styles.header}>
                    <h1 className={styles.title}>
                        Office DYT
                    </h1>
                    <p className={styles.subtitle}>SISTEMA ADMINISTRATIVO PREMIUM</p>
                </header>

                <form className={styles.form} onSubmit={handleSignIn}>
                    {error && (
                        <div className={styles.error}>
                            <span role="img" aria-label="error">⚠️</span> {error}
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Correo Electrónico</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="email"
                                className={styles.input}
                                placeholder="tu@donesytalentos.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Contraseña</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="password"
                                className={styles.input}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button className={styles.button} type="submit" disabled={loading}>
                        {loading ? 'Validando Acceso...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <footer className={styles.footer}>
                    <a href="#" className={styles.link}>¿Problemas para ingresar? Contacta a soporte</a>
                </footer>
            </div>
        </div>
    );
}
