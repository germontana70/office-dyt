'use client';

import { useTransition } from 'react';
import { CurrentStudent } from '../../models/student.schema';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { useDebouncedCallback } from 'use-debounce';
import { updateStudentFinances } from '../../actions/update-student-finances';

interface FinancialTabProps {
    student: CurrentStudent;
}

export function FinancialTab({ student }: FinancialTabProps) {
    const [isPending, startTransition] = useTransition();

    const debouncedSave = useDebouncedCallback((field: string, value: string | number | null) => {
        if (!student.id) return;
        startTransition(async () => {
            const res = await updateStudentFinances(student.id!, { [field]: value });
            if (res?.error) {
                console.error('Error auto-saving finances:', res.error);
            }
        });
    }, 500);

    // Helper functions for format
    const formatMoneyToNumber = (value: string): number | null => {
        const cleanVal = value.replace(/[^0-9]/g, '');
        return cleanVal ? parseInt(cleanVal, 10) : null;
    };

    const formatNumberToMoney = (value: number | null | undefined): string => {
        if (value === null || value === undefined) return '';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    // Arrays
    const paymentMethods = ["Mensualidad", "Contado", "Crédito", "Acuerdo Especial", "Beca"];
    const shirtSizes = ["S", "M", "L", "XL", "4", "6", "8", "10", "12", "14", "16"];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* TARJETA 1: Costos Adicionales (Globales) */}
            <GlassCard className="p-6 border-white/5 bg-black/30 dark:bg-black/40 backdrop-blur-xl relative overflow-hidden group">
                {isPending && (
                    <div className="absolute top-4 right-6 flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full border border-accent/20 animate-pulse z-10">
                        <div className="w-2 h-2 bg-accent rounded-full neon-pulse" />
                        <span className="text-[10px] text-accent font-black uppercase tracking-widest">Sincronizando</span>
                    </div>
                )}

                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-primary/20 rounded-xl border border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
                        <span className="text-xl">👕</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground tracking-tight uppercase">Costos Adicionales</h2>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Inscripción, dotación y uniformes</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Inscripción */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Valor Inscripción</label>
                        <input
                            type="text"
                            placeholder="$ 0"
                            defaultValue={formatNumberToMoney(student.enrollment_fee)}
                            onChange={(e) => debouncedSave('enrollment_fee', formatMoneyToNumber(e.target.value))}
                            onBlur={(e) => { e.target.value = formatNumberToMoney(formatMoneyToNumber(e.target.value)); }}
                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-mono font-bold hover:bg-background"
                        />
                    </div>

                    {/* Valor Camiseta */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Valor Camiseta</label>
                        <input
                            type="text"
                            placeholder="$ 0"
                            defaultValue={formatNumberToMoney(student.shirt_fee)}
                            onChange={(e) => debouncedSave('shirt_fee', formatMoneyToNumber(e.target.value))}
                            onBlur={(e) => { e.target.value = formatNumberToMoney(formatMoneyToNumber(e.target.value)); }}
                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-mono font-bold hover:bg-background"
                        />
                    </div>

                    {/* Talla Camiseta */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Talla</label>
                        <select
                            defaultValue={student.shirt_size || ""}
                            onChange={(e) => debouncedSave('shirt_size', e.target.value)}
                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none cursor-pointer hover:bg-background"
                        >
                            <option value="" className="bg-background">Seleccionar Talla...</option>
                            {shirtSizes.map(s => <option key={s} value={s} className="bg-background">{s}</option>)}
                        </select>
                    </div>
                </div>

                {/* Notas Financieras */}
                <div className="mt-8 space-y-2 border-t border-border pt-6">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Observaciones / Notas Financieras</label>
                    <textarea
                        placeholder="Novedades de pagos, facturación de prendas, etc."
                        defaultValue={student.financial_notes || ""}
                        onChange={(e) => debouncedSave('financial_notes', e.target.value)}
                        rows={3}
                        className="w-full bg-background/50 border border-border rounded-xl px-4 py-4 text-foreground placeholder:text-muted-foreground/30 focus:ring-2 focus:ring-primary focus:border-primary/50 transition-all font-medium resize-none shadow-inner"
                    />
                </div>
            </GlassCard>

            {/* TARJETA 2: Gestión Financiera Profesional */}
            <GlassCard className="p-6 border-white/5 bg-black/30 dark:bg-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20 shadow-[0_0_20px_hsl(var(--accent)/0.2)]">
                        <span className="text-xl">💰</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground tracking-tight uppercase">Gestión Financiera Profesional</h2>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Cobros, descuentos y fechas pactadas</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Forma de Pago */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Forma de Pago</label>
                        <select
                            defaultValue={student.payment_method || ""}
                            onChange={(e) => debouncedSave('payment_method', e.target.value)}
                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold appearance-none cursor-pointer hover:bg-background"
                        >
                            <option value="" className="bg-background">Seleccionar Forma...</option>
                            {paymentMethods.map(m => <option key={m} value={m} className="bg-background">{m}</option>)}
                        </select>
                    </div>

                    {/* Descuento */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Descuento Beca / Comercial (%)</label>
                        <div className="relative group">
                            <input
                                type="number"
                                placeholder="0"
                                min="0" max="100"
                                defaultValue={student.discount_percentage || ""}
                                onChange={(e) => debouncedSave('discount_percentage', parseInt(e.target.value, 10))}
                                className="w-full bg-background/50 border border-border rounded-xl pl-12 pr-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-mono font-bold hover:bg-background"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black">
                                %
                            </div>
                        </div>
                    </div>

                    {/* Fecha de Pago */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Fecha de Facturación</label>
                        <input
                            type="date"
                            defaultValue={student.payment_start_date ? new Date(student.payment_start_date).toISOString().split('T')[0] : ""}
                            onChange={(e) => debouncedSave('payment_start_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent focus:border-accent/50 transition-all font-bold hover:bg-background appearance-none color-scheme-dark"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>
                </div>

                {/* Bloque TOTAL A FACTURAR */}
                <div className="mt-10 p-6 rounded-2xl border-2 border-accent/30 bg-accent/5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_hsl(var(--accent)/0.1)] relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-accent/10 rounded-full blur-[50px] pointer-events-none group-hover:scale-150 transition-transform duration-700" />

                    <div>
                        <h3 className="text-xl font-black uppercase text-accent tracking-widest drop-shadow-md">Total a Facturar</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Valor base pactado para la cuota principal</p>
                    </div>

                    <div className="w-full md:w-1/3 relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50 font-black text-2xl z-10">$</div>
                        <input
                            type="text"
                            placeholder="0"
                            defaultValue={formatNumberToMoney(student.tuition_fee)?.replace('$\xa0', '').replace('$', '').trim()}
                            onChange={(e) => debouncedSave('tuition_fee', formatMoneyToNumber(e.target.value))}
                            onBlur={(e) => { e.target.value = formatNumberToMoney(formatMoneyToNumber(e.target.value))?.replace('$\xa0', '').replace('$', '').trim() || ''; }}
                            className="w-full bg-black/40 backdrop-blur-sm border-2 border-accent/50 rounded-xl pl-10 pr-4 py-4 text-foreground focus:ring-2 focus:ring-accent focus:outline-none transition-all font-mono font-black text-3xl tracking-tighter shadow-inner hover:bg-black/60 relative z-0"
                        />
                    </div>
                </div>

            </GlassCard>

        </div>
    );
}
