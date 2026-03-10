import { Teacher } from '../repository/teacher-repo';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';

export function TeacherGridCard({ teacher }: { teacher: Teacher }) {
    return (
        <GlassCard interactive className="p-6 border-white/5 bg-black/30 dark:bg-black/40 backdrop-blur-xl group hover:border-accent/30 transition-all duration-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-125" />

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-accent/20 to-primary/20 flex items-center justify-center border border-white/10 shadow-inner group-hover:shadow-[0_0_15px_hsl(var(--accent)/0.3)] transition-all">
                            <span className="text-xl font-bold text-accent">
                                {teacher.full_name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${teacher.is_active
                                ? 'bg-accent/10 text-accent border-accent/20 shadow-[0_0_10px_hsl(var(--accent)/0.2)]'
                                : 'bg-destructive/10 text-destructive border-destructive/20'
                            }`}>
                            {teacher.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>

                    <h3 className="text-xl font-black text-foreground uppercase tracking-tighter drop-shadow-sm mb-1">{teacher.full_name}</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                        {teacher.specialty || 'Sin Especialidad'}
                    </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            Contacto
                        </span>
                        <span className="font-mono text-foreground">{teacher.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Tarifa/hr
                        </span>
                        <span className="font-black text-accent drop-shadow-[0_0_8px_hsl(var(--accent)/0.3)]">
                            {teacher.hourly_rate ? `$${teacher.hourly_rate.toLocaleString()}` : 'Variable'}
                        </span>
                    </div>
                </div>

            </div>
        </GlassCard>
    );
}
