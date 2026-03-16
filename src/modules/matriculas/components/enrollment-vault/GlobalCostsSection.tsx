'use client';

import { GlassCard } from '@/ui/components/modules/layout/GlassCard';

interface GlobalCostsSectionProps {
    settings: {
        enrollment_fee: number;
        tshirt_fee: number;
    };
    values: {
        enrollment_fee_enabled: boolean;
        tshirt_quantity: number;
        tshirt_size: string;
        global_observations: string;
        payment_date: string;
        payment_method: string;
        bank_entity: string;
        reference_number: string;
    };
    onChange: (field: string, value: any) => void;
}

export function GlobalCostsSection({ settings, values, onChange }: GlobalCostsSectionProps) {
    const formatCurrency = (val: number) => val.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

    const tshirtSizes = ['N/A', '2', '4', '6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL'];
    const paymentMethods = ['Efectivo', 'Transferencia', 'Nequi/Daviplata', 'Tarjeta Crédito', 'Tarjeta Débito'];

    const showPaymentFields = values.enrollment_fee_enabled || values.tshirt_quantity > 0;

    return (
        <GlassCard className="p-6 border-violet-500/10 relative overflow-hidden group">
            <div className="absolute right-[-5%] top-[-5%] w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10 space-y-6">
                <div>
                    <h3 className="text-[12px] font-black uppercase text-violet-400 tracking-widest drop-shadow-md">Paso 2</h3>
                    <p className="text-2xl font-black mt-1 uppercase tracking-tighter text-white">
                        Costos Globales y Logística
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Columna 1: Inscripción */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-violet-500/30 transition-colors group/item">
                            <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-widest text-violet-300">Cobrar Inscripción</p>
                                <p className="text-[10px] text-white/30 font-bold italic">Valor semestre: {formatCurrency(settings.enrollment_fee)}</p>
                            </div>
                            <button
                                onClick={() => onChange('enrollment_fee_enabled', !values.enrollment_fee_enabled)}
                                className={`w-12 h-6 rounded-full transition-all relative ${values.enrollment_fee_enabled ? 'bg-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.4)]' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${values.enrollment_fee_enabled ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Observaciones Globales</label>
                            <textarea
                                value={values.global_observations}
                                onChange={(e) => onChange('global_observations', e.target.value)}
                                placeholder="Notas adicionales sobre la matrícula..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-violet-500 transition-all min-h-[100px] resize-none"
                            />
                        </div>
                    </div>

                    {/* Columna 2: Camiseta */}
                    <div className="space-y-4">
                        <div className="p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-pink-500/30 transition-colors space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-black uppercase tracking-widest text-pink-400">Camiseta Institucional</p>
                                <p className="text-[10px] text-white/30 font-bold italic">Unidad: {formatCurrency(settings.tshirt_fee)}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Cantidad</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={values.tshirt_quantity}
                                        onChange={(e) => onChange('tshirt_quantity', Number(e.target.value))}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl py-2 px-3 text-white font-mono focus:outline-none focus:border-pink-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Talla</label>
                                    <select
                                        value={values.tshirt_size}
                                        onChange={(e) => onChange('tshirt_size', e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-pink-500 transition-all appearance-none"
                                    >
                                        {tshirtSizes.map(size => (
                                            <option key={size} value={size} className="bg-black">{size}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {values.tshirt_quantity > 0 && (
                                <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-[10px] uppercase font-black text-white/20 tracking-wider">Total Camisetas</span>
                                    <span className="text-sm font-black text-pink-400">{formatCurrency(values.tshirt_quantity * settings.tshirt_fee)}</span>
                                </div>
                            )}
                        </div>

                        {/* Registro de Pago Inmediato (Adicionales) */}
                        {showPaymentFields && (
                            <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Registro de Pago Inmediato</p>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-white/40 font-bold uppercase">Fecha de Pago</label>
                                        <input
                                            type="date"
                                            value={values.payment_date}
                                            onChange={(e) => onChange('payment_date', e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-white/40 font-bold uppercase">Medio de Pago</label>
                                        <select
                                            value={values.payment_method}
                                            onChange={(e) => onChange('payment_method', e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-violet-500"
                                        >
                                            {paymentMethods.map(m => <option key={m} value={m} className="bg-black">{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-white/40 font-bold uppercase">Banco / Entidad</label>
                                        <input
                                            type="text"
                                            value={values.bank_entity}
                                            onChange={(e) => onChange('bank_entity', e.target.value)}
                                            placeholder="Ej: Bancolombia"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-white/40 font-bold uppercase">Referencia</label>
                                        <input
                                            type="text"
                                            value={values.reference_number}
                                            onChange={(e) => onChange('reference_number', e.target.value)}
                                            placeholder="# Transacción"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}
