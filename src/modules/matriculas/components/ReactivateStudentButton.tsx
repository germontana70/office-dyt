'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import { reactivateStudent } from '../actions/reactivate-student';

interface ReactivateStudentButtonProps {
    studentId: string;
    studentName: string;
}

export function ReactivateStudentButton({ studentId, studentName }: ReactivateStudentButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleReactivate = async () => {
        const confirmed = confirm(
            `¿Confirmas la reactivación de la matrícula de ${studentName} en el semestre activo?`
        );
        if (!confirmed) return;

        setIsLoading(true);
        const res = await reactivateStudent(studentId);
        setIsLoading(false);

        if (res.error) {
            toast.error(`Error al reactivar: ${res.error}`);
        } else {
            toast.success(`Matrícula de ${studentName} reactivada exitosamente`);
            router.refresh();
        }
    };

    return (
        <button
            onClick={handleReactivate}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest
                       text-emerald-400 bg-emerald-500/10 border border-emerald-500/30
                       hover:bg-emerald-500/20 hover:border-emerald-500/50
                       shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-300 active:scale-[0.97]"
        >
            {isLoading ? (
                <>
                    <div className="w-3 h-3 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                    <span>Reactivando...</span>
                </>
            ) : (
                <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Reactivar Matrícula</span>
                </>
            )}
        </button>
    );
}
