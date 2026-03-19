import { GlassCard } from "@/ui/components/modules/layout/GlassCard";
import { PremiumButton } from "@/ui/components/modules/buttons/PremiumButton";
import Link from "next/link";
import { GradientText } from "@/ui/components/modules/typography/GradientText";
import { SyncButton } from "./components/SyncButton";
import { CurrentStudentRepository } from '@/modules/matriculas/repository/current-student-repo';
import { TeacherRepository } from '@/modules/maestros/repository/teacher-repo';
import { getActiveSemesterName } from '@/modules/configuracion/actions/set-active-semester';
import { SyncEngineButton } from '@/components/dashboard/SyncEngineButton';

export default async function DashboardPage() {
    const activeSemester = await getActiveSemesterName();
    let studentCount = 0;
    if (activeSemester) {
        const students = await CurrentStudentRepository.getAllBySemester(activeSemester);
        studentCount = students.length;
    }

    const teachers = await TeacherRepository.getAll();
    const activeTeachersCount = teachers.filter(t => t.is_active).length;
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out relative">
            {/* Gradientes locales para profundidad extra */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />


            <div className="flex justify-between items-end">
                <div>
                    <GradientText as="h1" className="text-4xl font-extrabold tracking-tight">
                        Centro de Mandos
                    </GradientText>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Bienvenido al panel principal de Office DYT
                    </p>
                </div>

                <SyncButton />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                <Link href="/dashboard/matriculas" className="block outline-none focus:ring-2 focus:ring-primary/50 rounded-2xl transition-all duration-300">
                    <GlassCard interactive className="group relative overflow-hidden h-full hover:scale-[1.02] transition-transform cursor-pointer">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-primary/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 text-primary">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Matrículas Activas</h3>
                            </div>
                            <div className="mt-6">
                                <span className="text-6xl font-black tracking-tighter text-foreground drop-shadow-sm italic">{studentCount}</span>
                                <p className="text-accent mt-3 font-black flex items-center uppercase tracking-[0.2em] text-[10px]">
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                    En Semestre Activo
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                <Link href="/dashboard/maestros" className="block outline-none focus:ring-2 focus:ring-secondary/50 rounded-2xl transition-all duration-300">
                    <GlassCard interactive className="group relative overflow-hidden h-full hover:scale-[1.02] transition-transform cursor-pointer">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-secondary/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 text-secondary">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Docentes Activos</h3>
                            </div>
                            <div className="mt-6">
                                <span className="text-6xl font-black tracking-tighter text-foreground drop-shadow-sm italic">{activeTeachersCount}</span>
                                <p className="text-primary mt-3 font-black flex items-center uppercase tracking-[0.2em] text-[10px]">
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Plantilla Disponible
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                <SyncEngineButton />

            </div>


        </div>
    );
}
