'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ProgramPrice } from '@/core/schemas/pricing';
import { updatePricingVault } from '@/app/actions/pricing';

const roundUp10k = (val: number) => Math.ceil(val / 10000) * 10000;

const calculatePreview = (cash_price: number, increment_percentage: number) => {
    if (cash_price <= 0) return '';
    
    // Misión 1: Total Diferido (Redondeo 10k)
    const realTotal = roundUp10k(cash_price * (1 + (increment_percentage / 100)));
    
    // Misión 2: Cuotas "Espejo y Residuo" (Escalable a 6 para preview)
    const n = 6;
    const monthlyInstallment = roundUp10k(realTotal / n);
    const sumOfFirst5 = monthlyInstallment * (n - 1);
    const finalInstallment = realTotal - sumOfFirst5;

    const formatCurrency = (val: number) => val.toLocaleString('es-CO', { 
        style: 'currency', 
        currency: 'COP', 
        maximumFractionDigits: 0 
    });

    return `Vista Previa (6 Cuotas): 5 de ${formatCurrency(monthlyInstallment)} y 1 de ${formatCurrency(finalInstallment)} (Total: ${formatCurrency(realTotal)})`;
};

const calculateFinancedTotal = (cash_price: number, increment_percentage: number) => {
    if (cash_price <= 0) return 0;
    // Misión 1: Total Diferido (Redondeo 10k)
    return roundUp10k(cash_price * (1 + (increment_percentage / 100)));
};

interface PricingTableProps {
    prices: ProgramPrice[];
    semester: string;
}

export function PricingTable({ prices, semester }: PricingTableProps) {
    const router = useRouter();
    const [localPrices, setLocalPrices] = useState<ProgramPrice[]>(prices);
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleAddProgram = () => {
        setLocalPrices([
            ...localPrices,
            {
                id: `temp-${Date.now()}`, // Temporary ID sanitized on server
                semester: semester,
                program_name: '',
                cash_price: 0,
                increment_percentage: 0, // ✅ Configurar el % específico de este programa en la Bóveda
            }
        ]);
    };

    const handleFieldChange = (index: number, field: keyof ProgramPrice, value: string | number) => {
        const newPrices = [...localPrices];
        newPrices[index] = { ...newPrices[index], [field]: value };
        setLocalPrices(newPrices);
    };

    const handleRemoveProgram = (index: number) => {
        const newPrices = [...localPrices];
        newPrices.splice(index, 1);
        setLocalPrices(newPrices);
    };

    const handleSave = () => {
        // Validacion super basica
        if (localPrices.some(p => !p.program_name.trim())) {
            setMessage({ type: 'error', text: 'Todos los programas deben tener un nombre válido.' });
            return;
        }

        startTransition(async () => {
            const result = await updatePricingVault(localPrices, semester);
            if (result.success) {
                setMessage({ type: 'success', text: 'Bóveda de precios sincronizada y cuotas re-calculadas con éxito.' });
                router.refresh();
                setTimeout(() => setMessage(null), 4000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Fallo desconocido al guardar.' });
            }
        });
    };

    if (!localPrices || localPrices.length === 0) {
        return (
            <div className="glass p-8 rounded-[24px] border border-white/10 bg-black/40 backdrop-blur-xl text-center">
                <p className="text-white/50 mb-4">No se encontraron configuraciones de precios para el semestre {semester}.</p>
                <button
                    onClick={handleAddProgram}
                    className="px-6 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl font-bold uppercase tracking-widest hover:bg-primary/30 transition-colors"
                >
                    + Comenzar Bóveda
                </button>
            </div>
        );
    }

    return (
        <div className="glass rounded-[24px] border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-black/20">
                <div>
                    <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-pink-500 uppercase tracking-tighter">
                        Bóveda de Precios - {semester}
                    </h2>
                    <p className="text-sm text-white/50 mt-1">El Motor Financiero calculará el JSONB de diferidos automáticamente al guardar.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-white/70">
                        {localPrices.length} Registros Activos
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="px-6 py-2 bg-primary text-black border border-primary rounded-xl font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? (
                            <>
                                <span className="animate-spin text-xl leading-none">⚙️</span> Procesando...
                            </>
                        ) : (
                            <>
                                <span>💾</span> GUARDAR CAMBIOS Y CALCULAR
                            </>
                        )}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-4 text-sm font-bold text-center border-b border-white/10 transition-colors ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto no-scrollbar">
                <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl">
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-widest text-primary/70">
                            <th className="p-4 font-black">Programa Académico</th>
                            <th className="p-4 font-black w-1/4">Valor Contado</th>
                            <th className="p-4 font-black w-1/4">% Incremento (Cuotas)</th>
                            <th className="p-4 font-black w-1/4">Total Financiado (Redondeado)</th>
                            <th className="p-4 font-black text-center w-24">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {localPrices.map((price, idx) => (
                            <tr key={price.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4 font-medium text-white/90">
                                    <input
                                        type="text"
                                        value={price.program_name}
                                        onChange={(e) => handleFieldChange(idx, 'program_name', e.target.value)}
                                        placeholder="Ej. Técnico en Música..."
                                        className="w-full bg-transparent border-b border-white/10 focus:border-primary py-2 text-white font-medium focus:outline-none transition-colors"
                                    />
                                </td>
                                <td className="p-4">
                                    <div className="relative group/input">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 font-bold">$</span>
                                        <input
                                            type="number"
                                            value={price.cash_price}
                                            onChange={(e) => handleFieldChange(idx, 'cash_price', Number(e.target.value))}
                                            className="w-full bg-black/40 border border-white/10 group-hover/input:border-primary/50 group-hover/input:bg-black/60 rounded-xl py-3 pl-8 pr-3 text-white font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-lg tracking-tight"
                                        />
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="relative group/input">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={price.increment_percentage}
                                            onChange={(e) => handleFieldChange(idx, 'increment_percentage', Number(e.target.value))}
                                            className="w-full bg-black/40 border border-white/10 group-hover/input:border-primary/50 group-hover/input:bg-black/60 rounded-xl py-3 pl-3 pr-8 text-white font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-lg tracking-tight text-right text-pink-400"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-500/50 font-bold">%</span>
                                    </div>
                                    {price.cash_price > 0 && (
                                        <p className="text-[10px] text-pink-400/70 mt-2 font-medium leading-tight">
                                            {calculatePreview(price.cash_price, price.increment_percentage)}
                                        </p>
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-lg tracking-tight">
                                        {calculateFinancedTotal(price.cash_price, price.increment_percentage).toLocaleString('es-CO', {
                                            style: 'currency',
                                            currency: 'COP',
                                            maximumFractionDigits: 0
                                        })}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => handleRemoveProgram(idx)}
                                        className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Eliminar registro"
                                    >
                                        <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-4 bg-white/5 border-t border-white/10 flex justify-between items-center">
                <button
                    onClick={handleAddProgram}
                    className="px-4 py-2 bg-white/10 text-white/80 border border-white/20 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/20 transition-colors flex items-center gap-2"
                >
                    <span className="text-primary text-xl leading-none">+</span> Añadir Programa
                </button>
                <div className="text-[10px] text-white/30 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Edita con precaución. Cualquier cambio impactará las matrículas futuras.
                </div>
            </div>
        </div>
    );
}
