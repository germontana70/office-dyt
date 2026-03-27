import { google, calendar_v3 } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

// ─── OAuth2 Authentication (Bypass Service Account Restrictions) ──────────────
const CREDENTIALS_PATH = path.join(process.cwd(), 'google-credentials', 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'google-credentials', 'token.json');

const CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
];

// Extracted from legacy SIA 2.0
const CALENDAR_IDS: Record<string, string> = {
    "SALÓN 201": "c_r0uj5cebh514i56g3nkasput5k@group.calendar.google.com",
    "SALÓN 202": "c_5r7ujkaspdc61r0g6ruooe1p7s@group.calendar.google.com",
    "SALÓN 203A": "c_hlucr39r25519v48fu1ok9a12c@group.calendar.google.com",
    "SALÓN 203B": "c_got3fo3i6ohbrl4somnojfctfo@group.calendar.google.com",
    "SALÓN 204A - M.A": "c_fadbeb72eae27855721f968c0f08e40f0af5034245adc89095a2091060fc2cc1@group.calendar.google.com",
    "SALÓN 204B - J.P": "c_42c5d9n1c037h1imocbpckdojo@group.calendar.google.com",
    "SALÓN 205-A": "c_8p15h65ic3e2p3ne3pilep1qbk@group.calendar.google.com",
    "SALÓN 205-B": "c_onaa8lbur8n012pn73j9l5skpg@group.calendar.google.com",
    "SALÓN 205-C": "c_63a805c0219cdb5dd309a0b81a0c8475245d4e817e68de1cb6428652d10a9c20@group.calendar.google.com",
    "SALÓN 206": "c_2al0etl8ju1hd867h29h8q6r2k@group.calendar.google.com",
    "SALÓN 207": "c_mc4r96dgkpca5i2vdbmbm6eggs@group.calendar.google.com",
    "SALÓN 208": "c_8u05iusbid5gilsrcn55fjepbs@group.calendar.google.com",
    "SALÓN 209": "c_apk6uglssrktievhpk1ealho9k@group.calendar.google.com",
    "GIMNASIO": "1a478eeef17d68d804a8ae61aad748113138918b020d0c86298f4bc0f9ce1ebc@group.calendar.google.com",
    "CLASES VIRTUALES - SALA 1": "donesytalentos.org_cik30npi37ti2gio9cg1ill990@group.calendar.google.com"
};

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
    private static async getAuthClient() {
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
