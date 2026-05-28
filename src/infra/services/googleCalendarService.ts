import { google, calendar_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';

// ─── Service Account Robot (Patrón unificado con Drive/Sheets/Muestras) ──────
const CREDENTIALS_PATH = path.join(process.cwd(), 'credenciales', 'credenciales_robot.json');

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
     * ─── Service Account Auth (Robot DYT) ───────────────────────────────────
     * Usa credenciales_robot.json — mismo patrón de drive.ts y muestras.ts.
     * Los calendarios deben estar compartidos con dyt-drive-robot@office-dyt.iam.gserviceaccount.com
     */
    public static async getAuthClient() {
        if (this.authClient) return this.authClient;

        try {
            console.log('[GOOGLE CALENDAR] Inicializando Service Account Robot...');

            if (!fs.existsSync(CREDENTIALS_PATH)) {
                throw new Error(`Credenciales no encontradas en: ${CREDENTIALS_PATH}`);
            }

            const credentialsData = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
            const credentials = JSON.parse(credentialsData);

            if (!credentials.private_key || !credentials.client_email) {
                throw new Error(`El archivo credenciales_robot.json está vacío o mal configurado.`);
            }

            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: credentials.client_email,
                    private_key: credentials.private_key.replace(/\\n/g, '\n'),
                },
                scopes: CALENDAR_SCOPES,
            });

            this.authClient = await auth.getClient();
            console.log(`[GOOGLE CALENDAR] ✅ Robot autenticado como: ${credentials.client_email}`);
            return this.authClient;
        } catch (error: any) {
            console.error('[GOOGLE CALENDAR AUTH ERROR]:', error.message || error);
            throw new Error(`Google Auth Failed: ${error.message || 'Error cargando credenciales del Robot. Verifica credenciales/credenciales_robot.json.'}`);
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
