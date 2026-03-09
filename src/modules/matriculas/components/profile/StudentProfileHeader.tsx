'use client';

import Image from 'next/image';
import { CurrentStudent } from '../../models/student.schema';
import { useMemo, useTransition, useRef } from 'react';
import { uploadStudentPhoto } from '../../actions/upload-student-photo';

// Si no hay foto en Zod todavía, podemos asumir photo_url opcional o fallback temporal
interface StudentProfileHeaderProps {
    student: CurrentStudent & { photo_url?: string | null };
}

export function StudentProfileHeader({ student }: StudentProfileHeaderProps) {
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !student.id) return;

        const formData = new FormData();
        formData.append('photo', file);

        startTransition(async () => {
            const res = await uploadStudentPhoto(student.id!, formData);
            if (res?.error) {
                console.error("Error subiendo foto:", res.error);
                alert(res.error);
            }
        });
    };

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

                {/* Avatar Rectangular interactivo - Orchestra Gold */}
                <div
                    className="relative w-28 sm:w-36 aspect-[3/4] shrink-0 group cursor-pointer rounded-2xl p-[2px] bg-gradient-to-br from-primary via-primary/40 to-primary/80 hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all duration-500"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {/* ... (input logic unchanged) ... */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                        disabled={isPending}
                    />

                    <div className="absolute inset-[2px] rounded-[14px] bg-card/90 overflow-hidden">
                        {isPending ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-black/60 text-primary z-20 absolute inset-0 rounded-[14px] backdrop-blur-sm">
                                <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Subiendo...</span>
                            </div>
                        ) : null}

                        {student.photo_url ? (
                            <Image
                                src={student.photo_url}
                                alt={`${student.first_name}`}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/40">
                                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Overlay Upload Foto - Orchestra Style */}
                    <div className="absolute inset-[2px] rounded-[14px] bg-primary/20 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center text-primary-foreground backdrop-blur-md">
                        <div className="p-2 bg-primary/20 rounded-full mb-2">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-black/40 px-2 py-1 rounded">Cambiar</span>
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tighter uppercase leading-none italic decoration-primary/50 underline-offset-8">
                            {student.first_name} {student.last_name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold rounded-full uppercase tracking-widest shadow-[0_0_10px_hsl(var(--primary)/0.1)]">
                                UOC: {student.document_number}
                            </span>
                            <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold rounded-full uppercase tracking-widest">
                                Estado: Activo
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground group">
                            <span className="text-primary group-hover:scale-110 transition-transform">📅</span>
                            <span className="font-semibold text-foreground">Edad Calculada:</span>
                            <span className="px-2 py-0.5 bg-primary/5 rounded font-bold text-primary">{computedAge} años</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground group">
                            <span className="text-primary group-hover:scale-110 transition-transform">🆔</span>
                            <span className="font-semibold text-foreground">ID Sistema:</span>
                            <code className="text-[10px] bg-primary/10 px-2 py-0.5 rounded text-primary font-mono border border-primary/5">
                                [{student.id?.slice(0, 8)}]
                            </code>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
