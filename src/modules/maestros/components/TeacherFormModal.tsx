'use client';

import { useState, useTransition } from 'react';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { PremiumButton } from '@/ui/components/modules/buttons/PremiumButton';
import { createTeacher } from '../actions/create-teacher';
import { updateTeacher } from '../actions/update-teacher';
import { Teacher } from '../repository/teacher-repo';

interface Props {
    teacher?: Teacher;
    trigger?: React.ReactNode;
}

export function TeacherFormModal({ teacher, trigger }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const isEdit = !!teacher;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const form = e.currentTarget;
        const formData = new FormData(form);

        startTransition(async () => {
            const res = isEdit
                ? await updateTeacher(teacher.id, formData)
                : await createTeacher(formData);

            if (res.error) {
                setError(res.error);
            } else {
                setIsOpen(false);
                if (!isEdit) form.reset();
            }
        });
    };

    return (
        <>
            {trigger ? (
                <div onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} className="cursor-pointer h-full w-full relative">
                    <div className="absolute inset-0 z-20" />
                    {trigger}
                </div>
            ) : (
                <PremiumButton
                    onClick={() => setIsOpen(true)}
                    variant="primary"
                    className="shadow-[0_0_20px_hsl(var(--accent)/0.5)] bg-accent hover:bg-accent/80 text-accent-foreground border-accent whitespace-nowrap"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Maestro
                </PremiumButton>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <GlassCard className="w-full max-w-3xl p-8 border-accent/20 bg-black/95 relative shadow-[0_0_50px_hsl(var(--accent)/0.15)] animate-in zoom-in-95 duration-300 my-8">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-widest text-accent drop-shadow-md italic">
                                {isEdit ? `Editar Maestro` : 'Registrar Maestro'}
                            </h2>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                className="text-muted-foreground hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Nombre Completo *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        defaultValue={teacher?.name}
                                        required
                                        disabled={isPending}
                                        placeholder="Ej. Andrés García"
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold placeholder:font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Especialidad / Instrumento
                                    </label>
                                    <input
                                        type="text"
                                        name="instrument"
                                        defaultValue={teacher?.instrument || ''}
                                        disabled={isPending}
                                        placeholder="Ej. Piano Clásico"
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        defaultValue={teacher?.email || ''}
                                        disabled={isPending}
                                        placeholder="correo@ejemplo.com"
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Teléfono / Contacto
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        defaultValue={teacher?.phone || ''}
                                        disabled={isPending}
                                        placeholder="+57 300..."
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-medium font-mono tracking-tight"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Documento de Identidad
                                    </label>
                                    <input
                                        type="text"
                                        name="document_number"
                                        defaultValue={teacher?.document_number || ''}
                                        disabled={isPending}
                                        placeholder="CC o NIT"
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                        Dirección
                                    </label>
                                    <input
                                        type="text"
                                        name="address"
                                        defaultValue={teacher?.address || ''}
                                        disabled={isPending}
                                        placeholder="Ej. Calle 123 #45-67"
                                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-border/50">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Financiero y Pagos</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                            Tarifa por Hora (Opcional)
                                        </label>
                                        <input
                                            type="number"
                                            name="hourly_rate"
                                            defaultValue={teacher?.hourly_rate || ''}
                                            min="0"
                                            step="1000"
                                            disabled={isPending}
                                            placeholder="Ej. 25000"
                                            className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold font-mono tracking-tighter"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                            Cuenta Bancaria (Pagos)
                                        </label>
                                        <input
                                            type="text"
                                            name="bank_account"
                                            defaultValue={teacher?.bank_account || ''}
                                            disabled={isPending}
                                            placeholder="Ej. Bancolombia Ahorros 123..."
                                            className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-border/50">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Sistema y Calendar</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                            Nickname 1 (Calendar)
                                        </label>
                                        <input
                                            type="text"
                                            name="nickname_1"
                                            defaultValue={teacher?.nickname_1 || ''}
                                            disabled={isPending}
                                            placeholder="Ej. ANDRES_G"
                                            className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                            Nickname 2 (Alternativo)
                                        </label>
                                        <input
                                            type="text"
                                            name="nickname_2"
                                            defaultValue={teacher?.nickname_2 || ''}
                                            disabled={isPending}
                                            placeholder="Ej. AG"
                                            className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && <p className="text-xs font-bold text-destructive animate-in slide-in-from-top-2">{error}</p>}

                            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                    disabled={isPending}
                                    className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-accent-foreground bg-accent/80 hover:bg-accent shadow-[0_0_20px_hsl(var(--accent)/0.5)] border border-accent/50 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
                                >
                                    {isPending ? (
                                        <>
                                            <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            <span>Guardando</span>
                                        </>
                                    ) : (
                                        isEdit ? 'Actualizar Maestro' : 'Crear Maestro'
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
