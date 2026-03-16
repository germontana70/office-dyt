"use client";

/**
 * @module SyncEngineButton
 * @description Premium Neon-Glass UI for Google Sheets → Supabase synchronization.
 * @layer UI (Presentation)
 * @version 1.0.0
 *
 * Triggers the syncGoogleSheetToStudents Server Action and displays
 * detailed results with animated states.
 */

import { useState } from 'react';
import { syncGoogleSheetToStudents, type SyncResult } from '@/app/actions/syncActions';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';

export function SyncEngineButton() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SyncResult | null>(null);

    const handleSync = async () => {
        if (!confirm(
            '⚠️ SINCRONIZACIÓN DE GOOGLE SHEETS\n\n' +
            'Esta acción descargará los datos del formulario de inscripción del semestre activo ' +
            'y los sincronizará con la tabla de estudiantes.\n\n' +
            '• Los estudiantes nuevos serán creados.\n' +
            '• Los existentes (mismo documento + semestre) serán actualizados.\n\n' +
            '¿Desea continuar?'
        )) {
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const syncResult = await syncGoogleSheetToStudents();
            setResult(syncResult);
        } catch (error) {
            console.error('Sync error:', error);
            setResult({
                success: false,
                fetched: 0,
                upserted: 0,
                skipped: 0,
                errors: [`Error crítico: ${(error as Error).message}`],
                semester: 'N/A',
                timestamp: new Date().toISOString(),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <GlassCard className="p-6 border-white/10 bg-black/60 backdrop-blur-md relative overflow-hidden group">
            {/* Neon glow background effect */}
            <div className="absolute right-[-10%] top-[-10%] w-[350px] h-[350px] bg-cyan-500/8 rounded-full blur-[100px] pointer-events-none group-hover:scale-125 group-hover:bg-cyan-400/12 transition-all duration-1000" />
            <div className="absolute left-[-5%] bottom-[-5%] w-[200px] h-[200px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />

            <div className="relative z-10 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                        loading 
                            ? 'bg-cyan-500/30 text-cyan-300 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                            : 'bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    }`}>
                        <svg className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black uppercase text-cyan-400/80 tracking-[0.2em]">Motor de Sincronización</h3>
                        <p className="text-xl font-black mt-0.5 uppercase tracking-tighter text-slate-800 dark:text-white">
                            Google Sheets → Supabase
                        </p>
                    </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 dark:text-white/40 leading-relaxed font-medium">
                    Descarga el formulario de inscripción del <span className="text-cyan-400 font-bold">semestre activo</span> desde Google Sheets,
                    aplica las reglas de sanitización de SIA 2.0, y sincroniza los datos con la tabla de estudiantes 
                    usando <span className="text-cyan-400/80 font-semibold">UPSERT</span> por número de documento.
                </p>

                {/* Action Button */}
                <div className="pt-2">
                    <button
                        id="sync-engine-btn"
                        onClick={handleSync}
                        disabled={loading}
                        className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-300 active:scale-95 ${
                            loading
                                ? 'bg-white/5 text-cyan-300/40 cursor-not-allowed border border-cyan-500/10'
                                : 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-lg shadow-cyan-900/30 hover:shadow-cyan-700/40 border border-cyan-400/20'
                        }`}
                    >
                        {loading ? (
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 border-2 border-cyan-400/20 border-t-cyan-300 rounded-full animate-spin" />
                                <span>SINCRONIZANDO DATOS...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                                <span>SINCRONIZAR GOOGLE SHEETS</span>
                            </div>
                        )}
                    </button>
                </div>

                {/* Results Panel */}
                {result && (
                    <div className={`mt-4 p-4 rounded-xl border transition-all duration-500 animate-in fade-in slide-in-from-top-2 ${
                        result.success
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-red-500/10 border-red-500/20'
                    }`}>
                        {/* Status Header */}
                        <div className="flex items-center gap-2 mb-3">
                            {result.success ? (
                                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            <p className={`text-[10px] font-black uppercase tracking-wider ${
                                result.success ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                                {result.success ? 'Sincronización Exitosa' : 'Error en Sincronización'}
                            </p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="text-center p-2 rounded-lg bg-slate-100 dark:bg-white/5">
                                <p className="text-lg font-black text-slate-800 dark:text-white">{result.fetched}</p>
                                <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-white/40 font-bold">Descargados</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-emerald-500/10 dark:bg-white/5">
                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{result.upserted}</p>
                                <p className="text-[9px] uppercase tracking-wider text-emerald-600/70 dark:text-white/40 font-bold">Sincronizados</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-amber-500/10 dark:bg-white/5">
                                <p className="text-lg font-black text-amber-600 dark:text-amber-400">{result.skipped}</p>
                                <p className="text-[9px] uppercase tracking-wider text-amber-600/70 dark:text-white/40 font-bold">Omitidos</p>
                            </div>
                        </div>

                        {/* Semester Info */}
                        <p className="text-[10px] text-slate-400 dark:text-white/30 font-medium">
                            Semestre: <span className="text-cyan-600 dark:text-cyan-400/80 font-bold">{result.semester}</span>
                            {' · '}
                            {new Date(result.timestamp).toLocaleString('es-CO')}
                        </p>

                        {/* Error Details */}
                        {result.errors.length > 0 && (
                            <div className="mt-3 space-y-1 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                <p className="text-[10px] font-black uppercase tracking-wider text-white/30 mb-1">
                                    Detalle ({result.errors.length}):
                                </p>
                                {result.errors.map((err, i) => (
                                    <p key={i} className="text-[10px] text-amber-400/70 font-mono leading-tight">
                                        • {err}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </GlassCard>
    );
}
