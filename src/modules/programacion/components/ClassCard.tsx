import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { LegacyCalendarEvent } from '@/modules/programacion/repository/calendar-event-repo';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
    event: LegacyCalendarEvent;
    studentName?: string; // Optional since legacy might just use ID
}

export function ClassCard({ event, studentName }: Props) {
    const startTime = event.event_date ? format(new Date(event.event_date), 'HH:mm') : '--:--';
    const endTime = event.event_end_time ? format(new Date(event.event_end_time), 'HH:mm') : '--:--';

    return (
        <GlassCard className="p-4 border-l-4 border-l-accent relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            {/* Resplandor hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex justify-between items-start mb-3 relative z-10">
                <div>
                    <h4 className="text-sm font-black text-foreground uppercase tracking-widest truncate max-w-[180px]">
                        {studentName || 'Estudiante L.'}
                    </h4>
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest italic">
                        {event.program_name || 'Clase Regular'}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[11px] font-black text-foreground font-mono bg-white/5 px-2 py-1 rounded border border-white/5">
                        {startTime} - {endTime}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">
                        {event.status === 'scheduled' ? 'Confirmada' : event.status}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-4 relative z-10">
                <div className="w-5 h-5 rounded bg-primary/20 border border-primary/50 flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground truncate">
                    {event.teacher_name}
                </span>
            </div>
            {event.notes && (
                <p className="mt-3 text-[10px] text-muted-foreground/80 leading-relaxed border-t border-white/5 pt-2 relative z-10 truncate">
                    {event.notes}
                </p>
            )}
        </GlassCard>
    );
}
