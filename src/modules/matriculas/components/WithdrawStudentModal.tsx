'use client';

import { useState } from 'react';
import { CurrentStudent } from '../models/student.schema';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { withdrawStudent } from '../actions/withdraw-student';

interface WithdrawStudentModalProps {
    students: CurrentStudent[];
}

export function WithdrawStudentModal({ students }: WithdrawStudentModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filtrar solo los estudiantes activos para retirar
    const activeStudents = students.filter(s => s.enrollment_status === 'Activo');

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId) return;

        setIsSubmitting(true);
        const res = await withdrawStudent(selectedStudentId, reason);
        setIsSubmitting(false);

        if (res.error) {
            alert(res.error);
        } else {
            // Toast mock o UX
            setIsOpen(false);
            setSelectedStudentId('');
            setReason('');
        }
    };

    return (
        <>
            {/* Trigger Card (Mismo estilo que antes) */}
            <GlassCard
                onClick={() => setIsOpen(true)}
                className="p-5 flex items-center justify-between group hover:border-destructive/50 cursor-pointer transition-all duration-300"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-destructive/10 text-destructive group-hover:bg-destructive/20 group-hover:shadow-[0_0_20px_hsl(var(--destructive)/0.3)] transition-all">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <span className="font-bold text-foreground/90 group-hover:text-destructive transition-colors uppercase tracking-widest text-[11px]">Retirar del Semestre</span>
                </div>
                <span className="text-destructive/70 group-hover:translate-x-1 transition-transform">→</span>
            </GlassCard>

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <GlassCard className="w-full max-w-md p-6 border-destructive/20 bg-black/80 relative shadow-[0_0_50px_hsl(var(--destructive)/0.15)] animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-destructive to-transparent opacity-50" />

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black uppercase tracking-widest text-destructive drop-shadow-md">
                                Retirar Estudiante
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-muted-foreground hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleWithdraw} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                    Seleccionar Estudiante Activo
                                </label>
                                <select
                                    required
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-destructive focus:border-destructive/50 transition-all font-bold appearance-none cursor-pointer"
                                    disabled={isSubmitting}
                                >
                                    <option value="" className="bg-background">Buscar por nombre o documento...</option>
                                    {activeStudents.map(s => (
                                        <option key={s.id} value={s.id} className="bg-background">
                                            {s.first_name} {s.last_name} ({s.document_number})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                    Motivo del Retiro (Opcional)
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Falta de pago, no asistió, problemas médicos..."
                                    rows={3}
                                    className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-destructive focus:border-destructive/50 transition-all font-medium resize-none shadow-inner"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedStudentId || isSubmitting}
                                    className="flex-1 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-destructive-foreground bg-destructive/80 hover:bg-destructive shadow-[0_0_20px_hsl(var(--destructive)/0.5)] border border-destructive rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            <span>Procesando</span>
                                        </>
                                    ) : (
                                        'Confirmar Retiro'
                                    )}
                                </button>
                            </div>
                        </form>

                    </GlassCard>
                </div>
            )}
        </>
    );
}
