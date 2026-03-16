"use client";

import { useState, useTransition } from 'react';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { upsertGlobalSettings } from '@/app/actions/settings';

interface GlobalSettingsCardProps {
    initialSettings: {
        semester: string;
        enrollment_fee: number;
        tshirt_fee: number;
    } | null;
    currentSemester: string;
}

export function GlobalSettingsCard({ initialSettings, currentSemester }: GlobalSettingsCardProps) {
    const [isPending, startTransition] = useTransition();
    const [settings, setSettings] = useState({
        enrollment_fee: initialSettings?.enrollment_fee || 0,
        tshirt_fee: initialSettings?.tshirt_fee || 0
    });
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSave = () => {
        startTransition(async () => {
            const result = await upsertGlobalSettings({
                semester: currentSemester,
                ...settings
            });
            if (result.success) {
                setMessage({ type: 'success', text: 'Costos globales guardados con éxito.' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Error al guardar.' });
            }
        });
    };

    return (
        <GlassCard className="p-8 border-violet-500/20 bg-violet-500/5 h-full relative overflow-hidden group">
            <div className="absolute right-[-5%] top-[-5%] w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10 space-y-6">
                <div>
                    <h3 className="text-[12px] font-black uppercase text-violet-400 tracking-widest drop-shadow-md">Costos Adicionales</h3>
                    <p className="text-3xl font-black mt-2 uppercase tracking-tighter drop-shadow-lg text-white">
                        Inscripción y Camiseta
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Inscripción ({currentSemester})</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500/50 font-bold">$</span>
                            <input
                                type="number"
                                value={settings.enrollment_fee}
                                onChange={(e) => setSettings(prev => ({ ...prev, enrollment_fee: Number(e.target.value) }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-8 pr-3 text-white font-mono focus:outline-none focus:border-violet-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Camiseta / Uniforme</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500/50 font-bold">$</span>
                            <input
                                type="number"
                                value={settings.tshirt_fee}
                                onChange={(e) => setSettings(prev => ({ ...prev, tshirt_fee: Number(e.target.value) }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-8 pr-3 text-white font-mono focus:outline-none focus:border-violet-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                        {message && (
                            <p className={`text-xs font-bold ${message.type === 'success' ? 'text-green-400' : 'text-red-400'} animate-pulse`}>
                                {message.text}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="px-6 py-2 bg-violet-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-violet-500 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isPending ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </GlassCard>
    );
}
