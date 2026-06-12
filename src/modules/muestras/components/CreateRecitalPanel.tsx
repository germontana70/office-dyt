'use client';

import { useState, useTransition } from 'react';
import { createRecital } from '@/app/actions/muestras';
import { toast } from 'sonner';
import { CalendarPlus, Loader2 } from 'lucide-react';

interface Props {
    semester: string;
    onCreated: (recital: { id: string; name: string; start_time: string }) => void;
}

export function CreateRecitalPanel({ semester, onCreated }: Props) {
    const [name, setName] = useState(`Muestra Artística ${semester}`);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('18:00');
    const [location, setLocation] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleCreate = () => {
        if (!name.trim() || !date) {
            toast.warning('El nombre y la fecha son obligatorios.');
            return;
        }
        const startTime = `${date}T${time}:00`;
        startTransition(async () => {
            const res = await createRecital(name, startTime, semester, location || undefined);
            if (res.success && res.recital) {
                toast.success(`Recital "${res.recital.name}" creado exitosamente`);
                onCreated(res.recital);
            } else {
                toast.error(res.error ?? 'Error al crear el recital');
            }
        });
    };

    return (
        <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20">
                    <CalendarPlus className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Nuevo Recital</h3>
            </div>

            <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Recital</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={`Ej: Muestra Artística ${semester}`}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hora de inicio</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sede (opcional)</label>
                    <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Ej: Auditorio Principal"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                </div>
            </div>

            <button
                onClick={handleCreate}
                disabled={isPending || !name.trim() || !date}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_hsl(var(--primary)/0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>
                    : <><CalendarPlus className="w-4 h-4" /> Crear Recital</>}
            </button>
        </div>
    );
}
