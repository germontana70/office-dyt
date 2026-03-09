'use client';

import { CurrentStudent } from '../../models/student.schema';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';

interface PersonalDataTabProps {
    student: CurrentStudent;
}

export function PersonalDataTab({ student }: PersonalDataTabProps) {
    // Simulación de campos de salud
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* SECCIÓN 1: Datos Biológicos / Salud */}
            <GlassCard className="p-6 border-white/5 bg-black/40">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/20 rounded-lg shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                        <span className="text-xl">🏥</span>
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-wide">Datos Vitales y Salud</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-white/10">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest pl-1">Fecha de Nacimiento</label>
                        <input
                            type="date"
                            defaultValue={student.birth_date ? new Date(student.birth_date).toISOString().split('T')[0] : ''}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/50 uppercase tracking-widest pl-1">Género</label>
                        <select
                            defaultValue={student.gender || ""}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium"
                        >
                            <option value="">Seleccione...</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                </div>

                {/* Emergencia */}
                <div className="pt-6">
                    <h3 className="text-sm font-semibold text-primary mb-4 uppercase tracking-widest">Contacto de Emergencia</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Nombre Completo"
                            defaultValue={student.guardian_name || ''}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium"
                        />
                        <input
                            type="tel"
                            placeholder="Teléfono"
                            defaultValue={student.guardian_phone || ''}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium"
                        />
                        <input
                            type="text"
                            placeholder="Parentesco"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium"
                        />
                    </div>
                </div>
            </GlassCard>

            {/* SECCIÓN 2: Contrato */}
            <GlassCard className="p-6 border-white/5 bg-black/40">
                <label className="block text-sm font-semibold text-white/70 mb-2">
                    📝 Número de Contrato
                </label>
                <input
                    type="text"
                    placeholder="Ej. CTR-2026-001"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:ring-2 focus:ring-secondary focus:bg-white/10 transition-all font-mono tracking-widest"
                />
            </GlassCard>

            {/* SECCIÓN 3: Zona de Peligro */}
            <GlassCard className="p-6 border-destructive/20 bg-destructive/5 relative overflow-hidden group">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-destructive to-transparent opacity-50" />

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold text-destructive mb-2 flex items-center gap-2">
                            <span className="text-2xl">⚠️</span> Zona de Peligro
                        </h3>
                        <p className="text-sm text-destructive/80 font-medium max-w-xl">
                            Eliminar a este estudiante borrará definitivamente todos sus registros académicos y financieros del semestre en curso ({student.semester_enrolled}).
                        </p>
                    </div>

                    <button className="px-6 py-3 shrink-0 rounded-xl bg-destructive hover:bg-destructive/80 text-white font-bold tracking-wide shadow-[0_0_20px_hsl(var(--destructive)/0.5)] transition-all uppercase text-sm">
                        Eliminar Definitivamente
                    </button>
                </div>
            </GlassCard>

        </div>
    );
}
