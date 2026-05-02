'use client';

import { useState } from 'react';
import { CALENDAR_IDS } from '@/core/constants/calendars';
import { searchCalendarEvents, batchUpdateEventDescriptions, batchUpdateEventTitles, InsertionPoint } from '@/app/dashboard/event-editor/actions';
import { GlassCard } from '@/ui/components/modules/layout/GlassCard';
import { PremiumButton } from '@/ui/components/modules/buttons/PremiumButton';
import { toast } from 'sonner';
import { Calendar, Search, AlignLeft, Edit3, CheckSquare, Square, RefreshCw, Type, Save } from 'lucide-react';

const cleanHTML = (html: string) => {
    if (!html) return "";
    let text = html.replace(/<br\s*[\/]?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<[^>]*>?/gm, '');
    text = text.replace(/&nbsp;/gi, ' ');
    text = text.replace(/&amp;/gi, '&');
    text = text.replace(/&lt;/gi, '<');
    text = text.replace(/&gt;/gi, '>');
    text = text.replace(/&quot;/gi, '"');
    text = text.replace(/&#39;/gi, "'");
    return text.trim();
};

export function EventEditorView() {
    const [calendarId, setCalendarId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [isSearching, setIsSearching] = useState(false);
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());

    const [textToInsert, setTextToInsert] = useState('');
    const [insertionPoint, setInsertionPoint] = useState<InsertionPoint>('END');
    const [matchString, setMatchString] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // New State for Title Editing
    const [editorMode, setEditorMode] = useState<'INJECT' | 'RENAME'>('INJECT');
    const [newTitles, setNewTitles] = useState<Record<string, string>>({});
    const [isRenaming, setIsRenaming] = useState(false);

    const handleSearch = async () => {
        if (!calendarId || !startDate || !endDate) {
            toast.error('Campos incompletos', { description: 'Selecciona un calendario y rango de fechas.' });
            return;
        }

        setIsSearching(true);
        // Normalize dates to ISO string with timezone (using start of day / end of day)
        const timeMin = new Date(`${startDate}T00:00:00-05:00`).toISOString();
        const timeMax = new Date(`${endDate}T23:59:59-05:00`).toISOString();

        const { data, error } = await searchCalendarEvents(calendarId, timeMin, timeMax, searchQuery);
        
        setIsSearching(false);

        if (error) {
            toast.error('Error al buscar', { description: error });
        } else if (data) {
            setEvents(data);
            setSelectedEventIds(new Set(data.map(e => e.id)));
            if (data.length === 0) {
                toast.info('Sin resultados', { description: 'No se encontraron eventos en este periodo.' });
            } else {
                toast.success(`${data.length} eventos encontrados`);
            }
        }
    };

    const handleToggleSelectAll = () => {
        if (selectedEventIds.size === events.length) {
            setSelectedEventIds(new Set());
        } else {
            setSelectedEventIds(new Set(events.map(e => e.id)));
        }
    };

    const handleToggleEvent = (id: string) => {
        const next = new Set(selectedEventIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedEventIds(next);
    };

    const handleBatchUpdate = async () => {
        if (selectedEventIds.size === 0) {
            toast.error('Sin selección', { description: 'Selecciona al menos un evento.' });
            return;
        }
        if (!textToInsert.trim()) {
            toast.error('Texto vacío', { description: 'Escribe el texto que deseas inyectar.' });
            return;
        }

        setIsUpdating(true);
        const { success, errors } = await batchUpdateEventDescriptions(
            calendarId,
            Array.from(selectedEventIds),
            textToInsert,
            insertionPoint,
            matchString
        );
        setIsUpdating(false);

        if (success > 0) {
            toast.success(`Éxito: ${success} eventos actualizados`, {
                description: 'Los cambios se han aplicado sin notificar a los invitados.'
            });
            // Clear selections so we don't accidentally run it again
            setSelectedEventIds(new Set());
            setTextToInsert('');
        }
        
        if (errors && errors.length > 0) {
            toast.error(`Hubo ${errors.length} errores`, {
                description: errors[0] // show first error
            });
            console.error('Batch update errors:', errors);
        }
    };

    const handleTitleChange = (id: string, value: string) => {
        setNewTitles(prev => ({ ...prev, [id]: value }));
    };

    const handleBatchRename = async () => {
        const updates = Object.entries(newTitles)
            .filter(([id, title]) => title.trim() !== '')
            .map(([eventId, newTitle]) => ({ eventId, newTitle }));

        if (updates.length === 0) {
            toast.error('Sin cambios', { description: 'No has ingresado ningún título nuevo.' });
            return;
        }

        setIsRenaming(true);
        const { success, errors } = await batchUpdateEventTitles(calendarId, updates);
        setIsRenaming(false);

        if (success > 0) {
            toast.success(`Éxito: ${success} títulos actualizados`, {
                description: 'Los cambios se han aplicado silenciosamente.'
            });
            setNewTitles({});
            // Refresh events to show new titles
            handleSearch();
        }

        if (errors && errors.length > 0) {
            toast.error(`Hubo ${errors.length} errores`, { description: errors[0] });
            console.error('Batch rename errors:', errors);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* SEARCH PANEL */}
            <GlassCard className="p-6 border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/80" />
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    Fase 1: Búsqueda Selectiva
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/70">Calendario Objetivo</label>
                        <select
                            value={calendarId}
                            onChange={e => setCalendarId(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
                        >
                            <option value="" className="bg-slate-900">-- Selecciona un recurso --</option>
                            {Object.entries(CALENDAR_IDS).map(([name, id]) => (
                                <option key={id} value={id} className="bg-slate-900">{name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/70">Fecha Inicio</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all color-scheme-dark"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/70">Fecha Fin</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all color-scheme-dark"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/70">Título (Opcional)</label>
                        <input
                            type="text"
                            placeholder="Ej. Clase Piano"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <PremiumButton
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="w-full md:w-auto px-8"
                    >
                        {isSearching ? (
                            <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Buscando...</span>
                        ) : (
                            <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Ejecutar Búsqueda</span>
                        )}
                    </PremiumButton>
                </div>
            </GlassCard>

            {/* RESULTS & INJECTION PANEL */}
            {events.length > 0 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
                    
                    {/* MODE TABS */}
                    <div className="flex justify-center">
                        <div className="inline-flex bg-white/5 border border-white/10 p-1 rounded-2xl">
                            <button
                                onClick={() => setEditorMode('INJECT')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                                    editorMode === 'INJECT'
                                        ? 'bg-accent/20 text-accent shadow-[0_0_15px_hsl(var(--accent)/0.2)]'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Edit3 className="w-4 h-4" />
                                Inyección de Notas
                            </button>
                            <button
                                onClick={() => setEditorMode('RENAME')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                                    editorMode === 'RENAME'
                                        ? 'bg-primary/20 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.2)]'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Type className="w-4 h-4" />
                                Renombrado Masivo
                            </button>
                        </div>
                    </div>

                    {editorMode === 'INJECT' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Event List (2/3 width) */}
                            <GlassCard className="p-6 border-white/10 bg-black/40 backdrop-blur-xl lg:col-span-2">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <AlignLeft className="w-5 h-5 text-primary" />
                                        Eventos Seleccionados ({selectedEventIds.size}/{events.length})
                                    </h2>
                                    <button
                                        onClick={handleToggleSelectAll}
                                        className="text-sm text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-2"
                                    >
                                        {selectedEventIds.size === events.length ? (
                                            <><CheckSquare className="w-4 h-4" /> Deseleccionar Todos</>
                                        ) : (
                                            <><Square className="w-4 h-4" /> Seleccionar Todos</>
                                        )}
                                    </button>
                                </div>
                                
                                <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                    {events.map((event) => {
                                        const isSelected = selectedEventIds.has(event.id);
                                        const dateStr = new Date(event.start).toLocaleString('es-CO', { 
                                            weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' 
                                        });
                                        
                                        return (
                                            <div 
                                                key={event.id}
                                                onClick={() => handleToggleEvent(event.id)}
                                                className={`p-5 rounded-xl border transition-all cursor-pointer group flex gap-4 ${
                                                    isSelected 
                                                        ? 'bg-primary/10 border-primary/30 shadow-[0_4px_12px_hsl(var(--primary)/0.1)]' 
                                                        : 'bg-white/5 border-white/5 hover:border-white/20'
                                                }`}
                                            >
                                                <div className="pt-1">
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-primary" />
                                                    ) : (
                                                        <Square className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-white font-semibold truncate text-base">{event.summary}</h3>
                                                    <p className="text-sm text-white/50 capitalize mt-1 mb-3">{dateStr}</p>
                                                    <div className="text-sm text-white/60 bg-black/40 p-4 rounded-xl max-h-40 overflow-y-auto custom-scrollbar italic whitespace-pre-wrap">
                                                        {event.description ? cleanHTML(event.description) : "Sin notas adicionales."}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </GlassCard>

                            {/* Injection Engine (1/3 width) */}
                            <GlassCard className="p-6 border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden h-fit sticky top-6">
                                <div className="absolute top-0 right-0 w-1 h-full bg-accent/80" />
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Edit3 className="w-5 h-5 text-accent" />
                                    Motor de Inyección
                                </h2>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white/70">Texto a Insertar</label>
                                        <textarea
                                            value={textToInsert}
                                            onChange={e => setTextToInsert(e.target.value)}
                                            placeholder="Ej. NOTA: Esta clase ha sido remarcada por auditoría..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all min-h-[160px] resize-y"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white/70">Punto de Inserción</label>
                                        <select
                                            value={insertionPoint}
                                            onChange={e => setInsertionPoint(e.target.value as InsertionPoint)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent transition-all appearance-none"
                                        >
                                            <option value="END" className="bg-slate-900">Al final de las notas (Recomendado)</option>
                                            <option value="START" className="bg-slate-900">Al principio de las notas</option>
                                            <option value="AFTER_MATCH" className="bg-slate-900">Después de una frase específica</option>
                                            <option value="BEFORE_MATCH" className="bg-slate-900">Antes de una frase específica</option>
                                        </select>
                                    </div>

                                    {(insertionPoint === 'AFTER_MATCH' || insertionPoint === 'BEFORE_MATCH') && (
                                        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
                                            <label className="text-sm font-medium text-white/70">Frase exacta a buscar</label>
                                            <input
                                                type="text"
                                                value={matchString}
                                                onChange={e => setMatchString(e.target.value)}
                                                placeholder="Ej. --- FIN DEL REPORTE ---"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                            />
                                        </div>
                                    )}

                                    <div className="pt-4">
                                        <PremiumButton
                                            onClick={handleBatchUpdate}
                                            disabled={isUpdating || selectedEventIds.size === 0}
                                            className="w-full bg-gradient-to-r from-accent/80 to-accent shadow-[0_0_20px_hsl(var(--accent)/0.3)] border-accent/50"
                                        >
                                            {isUpdating ? (
                                                <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Inyectando Texto...</span>
                                            ) : (
                                                <span className="flex items-center gap-2"><Edit3 className="w-4 h-4" /> Ejecutar Actualización ({selectedEventIds.size})</span>
                                            )}
                                        </PremiumButton>
                                        <p className="text-center text-xs text-white/40 mt-3">
                                            Esta acción actualizará silenciosamente Google Calendar sin notificar a los asistentes.
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    ) : (
                        <GlassCard className="p-0 border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Type className="w-5 h-5 text-primary" />
                                    Edición de Títulos
                                </h2>
                                <PremiumButton 
                                    onClick={handleBatchRename}
                                    disabled={isRenaming || Object.keys(newTitles).filter(k => newTitles[k].trim() !== '').length === 0}
                                    className="py-2 px-6"
                                >
                                    {isRenaming ? (
                                        <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Guardando...</span>
                                    ) : (
                                        <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Ejecutar Cambios</span>
                                    )}
                                </PremiumButton>
                            </div>
                            
                            <div className="w-full overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10 text-white/70 text-sm font-medium">
                                            <th className="p-4 pl-6 w-1/2">Título Original en Calendar</th>
                                            <th className="p-4 pr-6 w-1/2">Nuevo Título (Dejar en blanco para omitir)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {events.map((event) => {
                                            const dateStr = new Date(event.start).toLocaleString('es-CO', { 
                                                month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' 
                                            });
                                            return (
                                                <tr key={event.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="p-4 pl-6 align-top">
                                                        <div className="text-white font-medium">{event.summary}</div>
                                                        <div className="text-xs text-white/40 mt-1 capitalize">{dateStr}</div>
                                                    </td>
                                                    <td className="p-4 pr-6 align-top">
                                                        <input
                                                            type="text"
                                                            value={newTitles[event.id] || ''}
                                                            onChange={(e) => handleTitleChange(event.id, e.target.value)}
                                                            placeholder="Escribe el nuevo título aquí..."
                                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary transition-all group-hover:bg-black/50"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="p-4 border-t border-white/10 bg-black/20 text-center">
                                <p className="text-xs text-white/40">
                                    Los cambios se guardarán directamente en Google Calendar. Solo se actualizarán los eventos que tengan un nuevo título escrito.
                                </p>
                            </div>
                        </GlassCard>
                    )}
                </div>
            )}
        </div>
    );
}
