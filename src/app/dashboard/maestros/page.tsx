import { TeacherRepository } from '@/modules/maestros/repository/teacher-repo';
import { TeacherGrid } from '@/modules/maestros/components/TeacherGrid';
import { TeacherFormModal } from '@/modules/maestros/components/TeacherFormModal';

import { SemesterRepository } from '@/modules/configuracion/repository/semester-repo';

export const dynamic = 'force-dynamic';

export default async function MaestrosPage() {
    const activeSemester = await SemesterRepository.getActive();
    const currentSemesterName = activeSemester?.name || '2026-1';

    const teachers = await TeacherRepository.getAll(currentSemesterName);

    return (
        <div className="relative min-h-screen w-full overflow-hidden p-6 md:p-10">
            {/* Gradientes y resplandores base (Glassmorphism Environment) */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-accent/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

            <main className="relative z-10 max-w-6xl mx-auto space-y-10">
                {/* Cabecera Premium */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in slide-in-from-top-6 fade-in duration-700">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-accent rounded-full shadow-[0_0_15px_hsl(var(--accent))]" />
                            <h1 className="text-3xl font-black tracking-tighter text-foreground drop-shadow-md uppercase italic">
                                Gestión de Maestros
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm max-w-xl leading-relaxed font-medium">
                            Administración del recurso humano docente. Las tarifas configuradas aquí alimentarán automáticamente el módulo de liquidación de pagos.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-center shadow-[0_0_15px_hsl(var(--accent)/0.1)]">
                            <span className="text-xl font-black italic tracking-tighter text-accent">{teachers.length}</span>
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Totales</span>
                        </div>
                        <TeacherFormModal semester={currentSemesterName} />
                    </div>
                </header>

                {/* Grid Visual de Maestros */}
                <section className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-150 fill-mode-both">
                    <TeacherGrid initialTeachers={teachers} />
                </section>

            </main>
        </div>
    );
}
