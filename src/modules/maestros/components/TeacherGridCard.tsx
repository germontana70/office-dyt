import { Teacher } from '../repository/teacher-repo';
import { TeacherFormModal } from './TeacherFormModal';

export function TeacherGridCard({ teacher }: { teacher: Teacher }) {
    const initials = teacher.name
        .split(' ')
        .map(w => w.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <TeacherFormModal
            teacher={teacher}
            trigger={
                <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-5 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all duration-500 cursor-pointer group relative overflow-hidden">
                    {/* Decorative glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    {/* Col 1: Identity — Avatar + Name + Instrument */}
                    <div className="relative z-10 flex items-center gap-4 min-w-0 sm:flex-1">
                        <div className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-tr from-accent/20 to-primary/20 flex items-center justify-center border border-white/10 shadow-inner group-hover:shadow-[0_0_20px_hsl(var(--accent)/0.3)] transition-all duration-500">
                            <span className="text-lg font-black text-accent">{initials}</span>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-black text-foreground uppercase tracking-tight leading-tight">
                                {teacher.name}
                            </h3>
                            <p className="text-xs font-bold text-accent/80 uppercase tracking-widest mt-0.5">
                                {teacher.instrument || 'Sin Especialidad'}
                            </p>
                        </div>
                    </div>

                    {/* Col 2: Tarifa — Prominent */}
                    <div className="relative z-10 flex items-center gap-2 sm:min-w-[140px] sm:justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Tarifa/hr</span>
                        <span className="text-lg font-black text-accent drop-shadow-[0_0_8px_hsl(var(--accent)/0.3)]">
                            {teacher.hourly_rate ? `$${teacher.hourly_rate.toLocaleString()}` : 'Variable'}
                        </span>
                    </div>

                    {/* Col 3: Contact — Phone */}
                    <div className="relative z-10 flex items-center gap-2 sm:min-w-[180px]">
                        <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="font-mono text-sm text-foreground/80">{teacher.phone || 'N/A'}</span>
                    </div>

                    {/* Col 4: Status Badge */}
                    <div className="relative z-10 sm:min-w-[90px] sm:flex sm:justify-end">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${teacher.is_active
                            ? 'bg-accent/10 text-accent border-accent/20 shadow-[0_0_10px_hsl(var(--accent)/0.2)]'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                            }`}>
                            {teacher.is_active ? '● Activo' : '○ Inactivo'}
                        </span>
                    </div>
                </div>
            }
        />
    );
}
