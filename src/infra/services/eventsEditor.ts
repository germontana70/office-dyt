import { google } from 'googleapis';
import { GoogleCalendarService } from './googleCalendarService';

export interface EditorGoogleEvent {
    id: string;
    summary: string;
    description: string;
    start: string;
    end: string;
    calendarId: string;
}

export class EventsEditorService {
    /**
     * Busca eventos específicos en un calendario dentro de un rango de fechas.
     * Soporta búsqueda por título (query).
     */
    static async searchEvents(calendarId: string, timeMin: string, timeMax: string, query: string): Promise<EditorGoogleEvent[]> {
        const auth = await GoogleCalendarService.getAuthClient();
        const calendarAPI = google.calendar({ version: 'v3', auth });

        try {
            const response = await calendarAPI.events.list({
                calendarId,
                timeMin,
                timeMax,
                q: query || undefined, // Google Calendar API natively supports querying by text
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 2500,
            });

            const items = response.data.items || [];
            
            return items.map(item => ({
                id: item.id || '',
                summary: item.summary || 'Sin título',
                description: item.description || '',
                start: item.start?.dateTime || item.start?.date || '',
                end: item.end?.dateTime || item.end?.date || '',
                calendarId
            })).filter(item => item.id !== '');

        } catch (error: any) {
            console.error(`[EVENTS EDITOR] Error buscando eventos en ${calendarId}:`, error.message);
            throw new Error(`Error buscando eventos: ${error.message}`);
        }
    }

    /**
     * Actualiza la descripción (notas) de un evento.
     * Importante: sendUpdates: 'none' evita que se envíen correos de notificación a los invitados.
     */
    static async updateEventDescription(calendarId: string, eventId: string, newDescription: string): Promise<void> {
        const auth = await GoogleCalendarService.getAuthClient();
        const calendarAPI = google.calendar({ version: 'v3', auth });

        try {
            await calendarAPI.events.patch({
                calendarId,
                eventId,
                sendUpdates: 'none', // Critical: no notifications
                requestBody: {
                    description: newDescription
                }
            });
            console.log(`[EVENTS EDITOR] Evento ${eventId} actualizado exitosamente.`);
        } catch (error: any) {
            console.error(`[EVENTS EDITOR] Error actualizando evento ${eventId}:`, error.message);
            throw new Error(`Error actualizando evento: ${error.message}`);
        }
    }
    static async updateEventTitle(calendarId: string, eventId: string, newTitle: string): Promise<void> {
        const auth = await GoogleCalendarService.getAuthClient();
        const calendarAPI = google.calendar({ version: 'v3', auth });

        try {
            await calendarAPI.events.patch({
                calendarId,
                eventId,
                sendUpdates: 'none', // Critical: no notifications
                requestBody: {
                    summary: newTitle
                }
            });
            console.log(`[EVENTS EDITOR] Título del evento ${eventId} actualizado exitosamente.`);
        } catch (error: any) {
            console.error(`[EVENTS EDITOR] Error actualizando título del evento ${eventId}:`, error.message);
            throw new Error(`Error actualizando título del evento: ${error.message}`);
        }
    }

    static async getEvent(calendarId: string, eventId: string): Promise<any> {
        const auth = await GoogleCalendarService.getAuthClient();
        const calendarAPI = google.calendar({ version: 'v3', auth });
        
        try {
            const res = await calendarAPI.events.get({ calendarId, eventId });
            return res.data;
        } catch (error: any) {
            throw new Error(`Error obteniendo el evento: ${error.message}`);
        }
    }

    static async insertEvent(calendarId: string, eventBody: any): Promise<any> {
        const auth = await GoogleCalendarService.getAuthClient();
        const calendarAPI = google.calendar({ version: 'v3', auth });

        try {
            const res = await calendarAPI.events.insert({
                calendarId,
                requestBody: eventBody
            });
            return res.data;
        } catch (error: any) {
            throw new Error(`Error creando el evento copiado: ${error.message}`);
        }
    }

    static async deleteEvent(calendarId: string, eventId: string): Promise<void> {
        const auth = await GoogleCalendarService.getAuthClient();
        const calendarAPI = google.calendar({ version: 'v3', auth });

        try {
            await calendarAPI.events.delete({
                calendarId,
                eventId,
                sendUpdates: 'none'
            });
        } catch (error: any) {
            throw new Error(`Error eliminando el evento original: ${error.message}`);
        }
    }
}
