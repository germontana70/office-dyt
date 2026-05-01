import { google, calendar_v3 } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

// ─── OAuth2 Authentication (Bypass Service Account Restrictions) ──────────────
const CREDENTIALS_PATH = path.join(process.cwd(), 'google-credentials', 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'google-credentials', 'token.json');

const CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
];

import { CALENDAR_IDS } from '@/core/constants/calendars';

export interface RawGoogleEvent {
    calendarName: string;
    id: string;
    summary: string;
    description: string;
    start: string; // ISO string
    end: string;   // ISO string
    creatorEmail: string;
}

export class GoogleCalendarService {
    private static authClient: any = null;

    /**
     * ─── User-Delegated OAuth2 Auth (Admin Bypass) ──────────────────────────
     * Lee credenciales y token delegados para bypass del bloqueo de Workspace.
     */
    public static async getAuthClient() {
        if (this.authClient) return this.authClient;

        try {
            console.log('[GOOGLE CALENDAR] Inicializando OAuth2 Delegado...');
            
            const credentialsRaw = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
            const credentials = JSON.parse(credentialsRaw);
            const keys = credentials.installed || credentials.web;
            
            const oAuth2Client = new google.auth.OAuth2(
                keys.client_id,
                keys.client_secret,
                keys.redirect_uris[0]
            );

            // Carga del token generado manualmente
            const tokenRaw = await fs.readFile(TOKEN_PATH, 'utf-8');
            const token = JSON.parse(tokenRaw);
            oAuth2Client.setCredentials(token);

            // Refresco automático de token está soportado si contiene refresh_token
            oAuth2Client.on('tokens', (tokens) => {
                if (tokens.refresh_token) {
                    console.log('[GOOGLE CALENDAR] Refrescando OAuth2 Token...');
                    // In a production app, we would write these back to token.json
                    token.access_token = tokens.access_token;
                    token.refresh_token = tokens.refresh_token;
                    token.expiry_date = tokens.expiry_date;
                    fs.writeFile(TOKEN_PATH, JSON.stringify(token)).catch(console.error);
                }
            });

            this.authClient = oAuth2Client;
            return this.authClient;
        } catch (error: any) {
            console.error('[GOOGLE CALENDAR AUTH ERROR]:', error.message || error);
            throw new Error(`Google Auth Failed: ${error.message || 'Error cargando credenciales OAuth2. Verifica google-credentials/token.json.'}`);
        }
    }

    static async fetchEventsPeriod(timeMin: string, timeMax: string): Promise<RawGoogleEvent[]> {
        const auth = await this.getAuthClient();
        const calendarAPI = google.calendar({ version: 'v3', auth });

        const allEvents: RawGoogleEvent[] = [];

        // Obtener la lista de calendarios disponibles en la cuenta
        let availableCalendars: calendar_v3.Schema$CalendarListEntry[] = [];
        try {
            const calendarListRes = await calendarAPI.calendarList.list();
            availableCalendars = calendarListRes.data.items || [];
        } catch (error: any) {
            console.error('[GOOGLE CALENDAR API ERROR] Error obteniendo calendarList:', error.message);
            throw new Error(`Error obteniendo calendarios: ${error.message}`);
        }

        // --- [INVENTARIO ADMIN OAUTH2] ---
        console.log('--- [INVENTARIO ADMIN OAUTH2] ---');
        console.log(`Calendarios detectados: ${availableCalendars.length}`);
        if (availableCalendars.length > 0) {
            availableCalendars.forEach(cal => {
                console.log(`[RECURSO OAUTH2] Nombre: ${cal.summary} | ID: ${cal.id}`);
            });
        }
        console.log('------------------------------');

        // BLACKLIST de calendarios que NO deben sincronizarse
        // (no contienen clases individuales pagables)
        const BLACKLIST_KEYWORDS = [
            'grupo conex',
            'gimnasio',
            'pendientes',
            'semana de receso',
            'ministraciones',
            'servicios castellana',
            'modelo norte',
            'archivo',
        ];

        for (const calendar of availableCalendars) {
            const summary = calendar.summary || '';
            const normalizedSummary = summary.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

            // Excluir si cae en la blacklist
            const isBlocked = BLACKLIST_KEYWORDS.some(kw => normalizedSummary.includes(kw));
            // Excluir el calendario personal del usuario (email como ID)
            const isPersonalCalendar = (calendar.id || '').includes('@') && !calendar.id?.includes('group.calendar');
            if (isBlocked || isPersonalCalendar) continue;

            console.log('[SYNC ENGINE] ✅ Calendario aprobado:', summary);

            if (!calendar.id) {
                console.warn(`[GOOGLE CALENDAR API] Calendario sin ID: ${summary}`);
                continue;
            }

            try {
                const response = await calendarAPI.events.list({
                    calendarId: calendar.id as string,
                    timeMin,
                    timeMax,
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: 2500, // Should be enough for 1 month
                });

                const items = response.data.items || [];
                console.log(`[SYNC ENGINE] Eventos encontrados en ${summary}:`, items.length);

                for (const item of items) {
                    // Normalize start/end
                    const start = item.start?.dateTime || item.start?.date;
                    const end = item.end?.dateTime || item.end?.date;

                    if (!start || !end || !item.id) continue;

                    allEvents.push({
                        calendarName: summary, // Pasamos el summary real a nuestro parser
                        id: item.id,
                        summary: item.summary || 'Sin título',
                        description: item.description || '',
                        start,
                        end,
                        creatorEmail: item.creator?.email || '',
                    });
                }
            } catch (error: any) {
                console.error(`Error fetching events for calendar ${summary} (${calendar.id}):`, error.message);
                throw error; // Fail-loud if events.list fails
            }
        }

        // Sort chronologically
        allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        return allEvents;
    }
}
