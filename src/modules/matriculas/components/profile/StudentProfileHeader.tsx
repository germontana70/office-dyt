'use client';

import Image from 'next/image';
import { CurrentStudent } from '../../models/student.schema';
import { useMemo } from 'react';

// Si no hay foto en Zod todavía, podemos asumir photo_url opcional o fallback temporal
interface StudentProfileHeaderProps {
    student: CurrentStudent & { photo_url?: string | null };
}

export function StudentProfileHeader({ student }: StudentProfileHeaderProps) {

    // Cálculo de la edad
    const computedAge = useMemo(() => {
        if (student.age) return student.age; // Si ya venía de DB
        if (!student.birth_date) return 'Desconocida';

        // Cálculo fallback si solo hay birth_date
        const bDate = new Date(student.birth_date);
        if (isNaN(bDate.getTime())) return 'Desconocida';

        const today = new Date();
        let age = today.getFullYear() - bDate.getFullYear();
        const m = today.getMonth() - bDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
            age--;
        }
        return age;
    }, [student]);

    return (
        <div className="relative overflow-hidden rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl p-6 sm:p-8 animate-in slide-in-from-top-4 fade-in duration-700">
            {/* Brillo decorativo superior */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/80 to-transparent opacity-60" />

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">

                {/* Avatar Circular interactivo */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 group cursor-pointer group rounded-full p-[2px] bg-gradient-to-br from-primary via-purple-500 to-secondary hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)] transition-all duration-300">
                    <div className="absolute inset-[2px] rounded-full bg-black/80 overflow-hidden">
                        {student.photo_url ? (
                            <Image
                                src={student.photo_url}
                                alt={`${student.first_name}`}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                                sizes="(max-width: 128px) 100vw, 128px"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/30 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Overlay Upload Foto */}
                    <div className="absolute inset-[2px] rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                        <svg className="w-6 h-6 mb-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[10px] uppercase font-bold tracking-wider">Cambiar</span>
                    </div>
                </div>

                {/* Data de Cabecera */}
                <div className="flex-1 space-y-3 pt-2">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 drop-shadow-md pb-1">
                            {student.first_name} {student.last_name}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1">
                            <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium font-mono border border-white/5">
                                Doc: {student.document_number}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary-foreground text-xs font-semibold border border-primary/30 shadow-[0_0_10px_hsl(var(--primary)/0.2)]">
                                Edo: {student.enrollment_status}
                            </span>
                        </div>
                    </div>

                    <p className="text-secondary/80 text-sm max-w-xl font-medium tracking-wide">
                        Edad Calculada: <span className="text-white ml-1">{computedAge} años</span>  • ID Sistema: [{student.id?.split('-')[0]}]
                    </p>
                </div>

            </div>
        </div>
    );
}
