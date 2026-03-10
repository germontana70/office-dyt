import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { ScheduleClassModal } from '@/modules/programacion/components/ScheduleClassModal';
import { TeacherRepository } from '@/modules/maestros/repository/teacher-repo';
import { StudentRepository } from '@/modules/matriculas/repository/student-repo';
import { CalendarEventRepository } from '@/modules/programacion/repository/calendar-event-repo';
import { getActiveSemesterName } from '@/modules/configuracion/actions/set-active-semester';
import { TimetableDashboard } from '@/modules/programacion/components/TimetableDashboard';

export const dynamic = 'force-dynamic';

export default async function ProgramacionPage() {
    const teachers = await TeacherRepository.getAll();
    const rawStudents = await StudentRepository.getActiveBasic();

    // Map to the expected type for the Modal
    const students = rawStudents.map(s => ({
        id: s.id,
        full_name: `${s.first_name} ${s.last_name}`
    }));

    // Fetch Schedule Data
    const activeSemesterName = await getActiveSemesterName();
    const allEvents = activeSemesterName ? await CalendarEventRepository.getBySemester(activeSemesterName) : [];
    return (
        <div className="relative min-h-screen w-full overflow-hidden p-6 md:p-10">
            {/* Gradientes y resplandores base (Glassmorphism Environment) */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-accent/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

            <main className="relative z-10 max-w-7xl mx-auto space-y-8 flex flex-col h-[calc(100vh-8rem)]">

                {/* Cabecera Premium */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in slide-in-from-top-6 fade-in duration-700 flex-shrink-0">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-accent rounded-full shadow-[0_0_15px_hsl(var(--accent))]" />
                            <h1 className="text-3xl font-black tracking-tighter text-foreground drop-shadow-md uppercase italic">
                                Programación de Clases
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm max-w-xl leading-relaxed font-medium">
                            Cerebro logístico de la escuela. Panel general para visualización de espacios, asignación de docentes y gestión de aulas.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <ScheduleClassModal teachers={teachers} students={students} />
                    </div>
                </header>

                {/* Dashboard Dividido */}
                <TimetableDashboard events={allEvents} teachers={teachers} students={students} />
            </main>
        </div>
    );
}
