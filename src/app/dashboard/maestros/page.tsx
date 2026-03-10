import { TeacherRepository } from '@/modules/maestros/repository/teacher-repo';
import { TeacherGridCard } from '@/modules/maestros/components/TeacherGridCard';
import { CreateTeacherModal } from '@/modules/maestros/components/CreateTeacherModal';

export const dynamic = 'force-dynamic';

export default async function MaestrosPage() {
    const teachers = await TeacherRepository.getAll();

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
                        <CreateTeacherModal />
                    </div>
                </header>

                {/* Grid Visual de Maestros */}
                <section className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-150 fill-mode-both">
                    {teachers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 border border-white/5 bg-black/20 backdrop-blur-md rounded-3xl group">
                            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_hsl(var(--accent)/0.2)]">
                                <svg className="w-10 h-10 text-accent/50 group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-widest text-muted-foreground mb-2">No hay maestros registrados</h3>
                            <p className="text-sm text-muted-foreground/50 font-medium">Usa el botón superior para dar de alta al primer docente.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {teachers.map(teacher => (
                                <TeacherGridCard key={teacher.id} teacher={teacher} />
                            ))}
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
}
