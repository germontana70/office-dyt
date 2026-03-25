import { google, calendar_v3 } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

// ─── Service Account: multi-path resiliente (igual que drive.ts) ──────────────
const SA_CREDENTIAL_PATHS = [
    path.join(process.cwd(), 'credenciales', 'credenciales_robot.json'),
    path.join(process.cwd(), 'credentials.json'),
    path.join(process.cwd(), 'credenciales_robot.json'),
];

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
     * ─── Service Account Auth (Robot) ─────────────────────────────────────────
     * Lee las credenciales del robot desde credenciales_robot.json con búsqueda
     * multi-path resiliente. Aplica el saneamiento Regex mandatario en la
     * private_key para reparar los saltos de línea literales (\n) que se
     * corrompen al pasar por variables de entorno (el "Muro Criptográfico RSA").
     */
    private static async getAuthClient() {
        if (this.authClient) return this.authClient;

        try {
            // Búsqueda multi-path del archivo de credenciales del Service Account
            let credentialsRaw: string | null = null;
            let foundPath = '';
            for (const candidatePath of SA_CREDENTIAL_PATHS) {
                try {
                    credentialsRaw = await fs.readFile(candidatePath, 'utf-8');
                    foundPath = candidatePath;
                    break;
                } catch {
                    // Continuar con el siguiente path
                }
            }

            if (!credentialsRaw) {
                throw new Error(
                    `No se encontró el archivo de credenciales del Service Account. Rutas intentadas: ${SA_CREDENTIAL_PATHS.join(', ')}`
                );
            }

            const serviceAccountKey = JSON.parse(credentialsRaw);

            // ─── FÓRMULA GANADORA: Saneamiento Regex del Muro Criptográfico RSA ──
            // Los saltos de línea literales \n en .env o JSON se deben normalizar.
            const sanitizedPrivateKey = serviceAccountKey.private_key?.replace(/\\n/g, '\n');

            console.log(`[GOOGLE CALENDAR] Autenticando Service Account desde: ${foundPath}`);
            console.log(`[GOOGLE CALENDAR] Client Email: ${serviceAccountKey.client_email}`);

            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: serviceAccountKey.client_email,
                    private_key: sanitizedPrivateKey,
                },
                scopes: CALENDAR_SCOPES,
            });

            this.authClient = await auth.getClient();
            return this.authClient;
        } catch (error: any) {
            // ─── FAIL-LOUD: Logging detallado para diagnóstico ───────────────────
            console.error('[GOOGLE CALENDAR AUTH ERROR]:', error.message || error);
            throw new Error(`Google Auth Failed: ${error.message || 'Error desconocido al inicializar Service Account'}`);
        }
    }

    /**
     * Fetches events from all configured calendars within a time range.
     * Returns a flattened array of normalized event objects.
     *
     * @param timeMin Start time in ISO format (e.g. 2026-02-26T00:00:00-05:00)
     * @param timeMax End time in ISO format (e.g. 2026-03-25T23:59:59-05:00)
     */
    static async fetchEventsPeriod(timeMin: string, timeMax: string): Promise<RawGoogleEvent[]> {
        const auth = await this.getAuthClient();
        const calendarAPI = google.calendar({ version: 'v3', auth });

        const allEvents: RawGoogleEvent[] = [];

        // Loop through calendars sequentially to avoid hitting rate limits too fast,
        // although Promise.all could be faster. For reliability we will use sequential fetching.
        for (const [calendarName, calendarId] of Object.entries(CALENDAR_IDS)) {
            try {
                const response = await calendarAPI.events.list({
                    calendarId,
                    timeMin,
                    timeMax,
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: 2500, // Should be enough for 1 month
                });

                const items = response.data.items || [];

                for (const item of items) {
                    // Normalize start/end
                    const start = item.start?.dateTime || item.start?.date;
                    const end = item.end?.dateTime || item.end?.date;

                    if (!start || !end || !item.id) continue;

                    allEvents.push({
                        calendarName,
                        id: item.id,
                        summary: item.summary || 'Sin título',
                        description: item.description || '',
                        start,
                        end,
                        creatorEmail: item.creator?.email || '',
                    });
                }
            } catch (error) {
                console.error(`Error fetching events for calendar ${calendarName} (${calendarId}):`, error);
                // Continue fetching other calendars even if one fails
            }
        }

        // Sort chronologically
        allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        return allEvents;
    }
}
