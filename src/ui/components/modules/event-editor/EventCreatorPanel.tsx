'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { PremiumButton } from '@/ui/components/modules/buttons/PremiumButton';
import { toast } from 'sonner';
import { CalendarPlus, User, MapPin, Music, Save, List, Eye, Settings2 } from 'lucide-react';
import { CALENDAR_IDS } from '@/core/constants/calendars';
import { fetchCreationMetadata, batchCreateEvents } from '@/app/dashboard/event-editor/create-actions';
import { ClassScheduleEntry, TimelineGenerator, RecessWeek } from '@/core/domains/calendar/timeline-generator';

export function EventCreatorPanel() {
    // Metadata from DB
    const [isLoadingMeta, setIsLoadingMeta] = useState(true);
    const [activeSemester, setActiveSemester] = useState('');
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);

    // Form State
    const [studentName, setStudentName] = useState('');
    const [teacherNickname, setTeacherNickname] = useState('');
    const [calendarId, setCalendarId] = useState('');
    const [programName, setProgramName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('08:00');
    const [durationStr, setDurationStr] = useState('60');
    const [totalClasses, setTotalClasses] = useState(16);

    // Recess State
    const [recessWeeks, setRecessWeeks] = useState<RecessWeek[]>([]);
    const [tempRecessStart, setTempRecessStart] = useState('');
    const [tempRecessEnd, setTempRecessEnd] = useState('');
    const [tempRecessDesc, setTempRecessDesc] = useState('');

    // Message Box State
    const [greetingText, setGreetingText] = useState('¡Hola!\n¡Qué alegría saludarte, artista! 🤩 🎻\n\nEn la Escuela de Música y Artes - Dones y Talentos, nos hace muy felices darte la bienvenida a este nuevo ciclo académico.');
    const [rulesText, setRulesText] = useState('📌 ASISTENCIA Y REPOSICIONES\nClases Grupales y Semipersonalizadas: Por su naturaleza colectiva, estas sesiones no cuentan con reposición. ¡Tu presencia es vital para el grupo!\n\nClases Personalizadas: Si necesitas reprogramar, por favor avísanos con 24 horas de antelación vía WhatsApp (+57 313 816 1285).\n\nNota: Si el aviso es posterior, la clase se dictará de forma virtual o recibirás una grabación pedagógica. 📑\nLímite: Se permiten máximo 2 reprogramaciones por semestre o paquete. 😊\n\n📞 COMUNICACIÓN Y CONDUCTA\nCanal Único: Toda coordinación se realiza a través de nuestro WhatsApp institucional de lunes a viernes (9:00 a.m. - 5:30 p.m.). 📱');

    // Engine State
    const [schedulePreview, setSchedulePreview] = useState<ClassScheduleEntry[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        async function loadMeta() {
            const res = await fetchCreationMetadata();
            setIsLoadingMeta(false);
            if (res.error) {
                toast.error('Error al cargar datos', { description: res.error });
            } else {
                setActiveSemester(res.activeSemester || '');
                setStudents(res.students || []);
                setTeachers(res.teachers || []);
                setPrograms(res.programs || []);
            }
        }
        loadMeta();
    }, []);

    const handleAddRecess = () => {
        if (!tempRecessStart || !tempRecessEnd || !tempRecessDesc) return;
        setRecessWeeks([...recessWeeks, { startDate: tempRecessStart, endDate: tempRecessEnd, description: tempRecessDesc }]);
        setTempRecessStart('');
        setTempRecessEnd('');
        setTempRecessDesc('');
    };

    const handleRemoveRecess = (idx: number) => {
        setRecessWeeks(recessWeeks.filter((_, i) => i !== idx));
    };

    const handleCalculate = () => {
        if (!startDate || !startTime || !totalClasses) {
            toast.error('Datos incompletos', { description: 'Faltan datos de programación básicos.' });
            return;
        }

        const schedule = TimelineGenerator.generateSchedule(
            startDate,
            startTime,
            parseInt(durationStr),
            totalClasses,
            recessWeeks
        );
        setSchedulePreview(schedule);
        toast.success('Cronograma Calculado', { description: 'Revisa el preview antes de inyectar a Calendar.' });
    };

    const handleCreateEvents = async () => {
        if (schedulePreview.length === 0) {
            toast.error('Calcula primero', { description: 'Debes calcular el cronograma antes de crear los eventos.' });
            return;
        }
        if (!calendarId || !studentName || !teacherNickname || !programName) {
            toast.error('Campos obligatorios', { description: 'Selecciona estudiante, profesor, salón y programa.' });
            return;
        }

        const calendarName = Object.keys(CALENDAR_IDS).find(key => CALENDAR_IDS[key as keyof typeof CALENDAR_IDS] === calendarId) || 'SALÓN';

        setIsCreating(true);
        const res = await batchCreateEvents({
            calendarId,
            studentName,
            teacherNickname,
            programName,
            calendarName,
            greetingText,
            rulesText,
            schedule: schedulePreview
        });
        setIsCreating(false);

        if (res.error) {
            toast.error('Error Crítico', { description: res.error });
        } else {
            toast.success('¡Creación Exitosa!', { description: res.message });
            setSchedulePreview([]); // Reset after creation
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 duration-700">
            {/* LEFT COLUMN: FORM */}
            <div className="lg:col-span-4 space-y-6">
                <GlassCard className="p-6 border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
                    
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-primary" />
                            Configuración
                        </h2>
                        {isLoadingMeta ? (
                            <span className="text-xs text-white/40 animate-pulse">Cargando...</span>
                        ) : (
                            <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-cyan-400">
                                {activeSemester}
                            </span>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Estudiante */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-white/70 uppercase tracking-wider flex items-center gap-1"><User className="w-3 h-3"/> Estudiante</label>
                            <select 
                                value={studentName} onChange={e => setStudentName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="" className="bg-slate-900">-- Seleccionar --</option>
                                {students.map(s => <option key={s.id} value={s.name} className="bg-slate-900">{s.name}</option>)}
                            </select>
                        </div>

                        {/* Profesor */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-white/70 uppercase tracking-wider flex items-center gap-1"><User className="w-3 h-3"/> Profesor</label>
                            <select 
                                value={teacherNickname} onChange={e => setTeacherNickname(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="" className="bg-slate-900">-- Seleccionar --</option>
                                {teachers.map(t => <option key={t.id} value={t.nickname_1 || t.name} className="bg-slate-900">{t.name} ({t.nickname_1})</option>)}
                            </select>
                        </div>

                        {/* Calendario */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-white/70 uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3"/> Salón (Calendar)</label>
                            <select 
                                value={calendarId} onChange={e => setCalendarId(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="" className="bg-slate-900">-- Seleccionar --</option>
                                {Object.entries(CALENDAR_IDS).map(([name, id]) => (
                                    <option key={id} value={id} className="bg-slate-900">{name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Programa */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-white/70 uppercase tracking-wider flex items-center gap-1"><Music className="w-3 h-3"/> Programa</label>
                            <select 
                                value={programName} onChange={e => setProgramName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="" className="bg-slate-900">-- Seleccionar --</option>
                                {programs.map(p => <option key={p.id} value={p.name} className="bg-slate-900">{p.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-white/70 uppercase">Inicio</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm color-scheme-dark" style={{colorScheme: 'dark'}} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-white/70 uppercase">Hora</label>
                                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm color-scheme-dark" style={{colorScheme: 'dark'}} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-white/70 uppercase">Cant. Clases</label>
                                <input type="number" min="1" value={totalClasses} onChange={e => setTotalClasses(parseInt(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-white/70 uppercase">Duración (min)</label>
                                <input type="number" min="1" value={durationStr} onChange={e => setDurationStr(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Recess Settings */}
                <GlassCard className="p-5 border-white/10 bg-black/40 backdrop-blur-xl">
                    <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider text-orange-400">Recesos (Opcional)</h3>
                    <div className="space-y-3">
                        {recessWeeks.map((r, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/5 p-2 rounded text-xs text-white/80">
                                <span>{r.description} ({r.startDate} a {r.endDate})</span>
                                <button onClick={() => handleRemoveRecess(i)} className="text-red-400 hover:text-red-300">X</button>
                            </div>
                        ))}
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={tempRecessStart} onChange={e => setTempRecessStart(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs" style={{colorScheme: 'dark'}}/>
                            <input type="date" value={tempRecessEnd} onChange={e => setTempRecessEnd(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs" style={{colorScheme: 'dark'}}/>
                            <input type="text" placeholder="Motivo (Ej. Semana Santa)" value={tempRecessDesc} onChange={e => setTempRecessDesc(e.target.value)} className="col-span-2 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs"/>
                            <button onClick={handleAddRecess} className="col-span-2 bg-white/10 hover:bg-white/20 text-white text-xs py-1.5 rounded transition-colors">Añadir Receso</button>
                        </div>
                    </div>
                </GlassCard>

            </div>

            {/* RIGHT COLUMN: PREVIEW & ENGINE */}
            <div className="lg:col-span-8 space-y-6">
                
                <div className="flex items-center justify-end gap-4">
                    <button onClick={handleCalculate} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2">
                        <Eye className="w-5 h-5" /> Calcular Preview
                    </button>
                    <PremiumButton onClick={handleCreateEvents} disabled={schedulePreview.length === 0 || isCreating} className="px-8 bg-gradient-to-r from-accent to-accent/80 border-accent">
                        {isCreating ? 'Inyectando a Calendar...' : <span className="flex items-center gap-2"><Save className="w-5 h-5"/> Generar Eventos</span>}
                    </PremiumButton>
                </div>

                <GlassCard className="p-6 border-white/10 bg-black/40 backdrop-blur-xl">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <List className="w-5 h-5 text-accent" />
                        Vista Previa del Cronograma
                    </h2>
                    
                    {schedulePreview.length === 0 ? (
                        <div className="h-64 flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl text-white/30 italic">
                            Haz clic en "Calcular Preview" para ver las fechas aquí.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-black/60 p-4 rounded-xl font-mono text-sm text-green-400 whitespace-pre overflow-x-auto custom-scrollbar">
                                {TimelineGenerator.formatPlaintextTable(schedulePreview)}
                            </div>
                            
                            <div className="text-xs text-white/50 text-center">
                                * Al generar, este cronograma se inyectará en formato texto plano en Google Calendar, acompañado de un link único de Google Meet.
                            </div>
                        </div>
                    )}
                </GlassCard>

                {/* Text Boxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-5 border-white/10 bg-black/40 backdrop-blur-xl">
                        <h3 className="text-sm font-bold text-white mb-3 uppercase text-primary">Box: Saludo Inicial</h3>
                        <textarea 
                            value={greetingText} onChange={e => setGreetingText(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white/80 text-sm h-48 resize-none focus:ring-1 focus:ring-primary outline-none"
                        />
                    </GlassCard>
                    <GlassCard className="p-5 border-white/10 bg-black/40 backdrop-blur-xl">
                        <h3 className="text-sm font-bold text-white mb-3 uppercase text-primary">Box: Reglamento (Global)</h3>
                        <textarea 
                            value={rulesText} onChange={e => setRulesText(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white/80 text-sm h-48 resize-none focus:ring-1 focus:ring-primary outline-none"
                        />
                    </GlassCard>
                </div>

            </div>
        </div>
    );
}
