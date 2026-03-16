"use client";

import { useState } from 'react';
import { migrateSiaToDyt } from '@/app/actions/migration';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';

export function MigrationCard() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleMigrate = async () => {
        if (!confirm('¿Estás seguro de iniciar la migración? Esto creará registros en las nuevas tablas dyt_ a partir de los datos actuales de SIA 2.0 (Semestre 2026-1). No se migrarán datos financieros.')) {
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            const result = await migrateSiaToDyt();
            if (result.success) {
                setStatus({ message: result.message || 'Migración exitosa', type: 'success' });
            } else {
                setStatus({ message: result.error || 'Error desconocido', type: 'error' });
            }
        } catch (error) {
            console.error('Migration error:', error);
            setStatus({ message: 'Error crítico en el proceso de migración', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <GlassCard className="p-6 border-white/10 bg-black/60 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute right-[-5%] top-[-5%] w-[300px] h-[300px] bg-red-500/5 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-[12px] font-black uppercase text-red-400 tracking-widest">Zona de Peligro</h3>
                        <p className="text-xl font-black mt-1 uppercase tracking-tighter text-slate-800 dark:text-white">
                            Migración SIA 2.0
                        </p>
                    </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-white/40 leading-relaxed font-medium">
                    Esta herramienta extrae la estructura académica de los estudiantes matriculados en SIA 2.0 para el semestre <span className="text-slate-800 dark:text-white font-bold">2026-1</span> y la inyecta en la nueva Bóveda Transaccional. <br/>
                    <span className="text-red-400/80 font-bold italic">No se migrarán pagos ni planes de precios.</span>
                </p>

                <div className="pt-2">
                    <button
                        onClick={handleMigrate}
                        disabled={loading}
                        className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 ${
                            loading 
                            ? 'bg-white/10 text-white/20 cursor-not-allowed opacity-70' 
                            : 'bg-red-600 text-white hover:bg-red-500 shadow-red-900/40'
                        }`}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                <span>MIGRANDO DATOS TÁCTICOS...</span>
                            </div>
                        ) : 'INICIAR MIGRACIÓN TÁCTICA'}
                    </button>
                </div>

                {status && (
                    <div className={`mt-4 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 ${
                        status.type === 'success' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                        <div className="flex items-center gap-2">
                            {status.type === 'success' ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            <p className="text-[10px] font-black uppercase tracking-wider">{status.message}</p>
                        </div>
                    </div>
                )}
            </div>
        </GlassCard>
    );
}
