'use server';

import { EventsEditorService, EditorGoogleEvent } from '@/infra/services/eventsEditor';

export async function searchCalendarEvents(calendarId: string, timeMin: string, timeMax: string, query: string): Promise<{ data?: EditorGoogleEvent[], error?: string }> {
    try {
        const events = await EventsEditorService.searchEvents(calendarId, timeMin, timeMax, query);
        return { data: events };
    } catch (error: any) {
        return { error: error.message };
    }
}

export type InsertionPoint = 'START' | 'END' | 'AFTER_MATCH' | 'BEFORE_MATCH';

export async function batchUpdateEventDescriptions(
    calendarId: string, 
    eventIds: string[], 
    textToInsert: string, 
    insertionPoint: InsertionPoint,
    matchString?: string
): Promise<{ success: number, errors: string[] }> {
    
    let success = 0;
    const errors: string[] = [];

    // First, fetch the current description for all selected events
    // To do this efficiently without a mass 'get', we could rely on the client passing the current descriptions,
    // or we fetch them all again. Passing from client is riskier due to staleness, but fetching is slower.
    // For now, let's fetch each event to ensure we append safely, or we could pass the current known description.
    // However, google.calendar.events.patch requires the new full description. We need the current one.
    // Let's implement fetching inside the loop.
    
    const { google } = await import('googleapis');
    const { GoogleCalendarService } = await import('@/infra/services/googleCalendarService');
    const auth = await GoogleCalendarService.getAuthClient();
    const calendarAPI = google.calendar({ version: 'v3', auth });

    for (const eventId of eventIds) {
        try {
            // 1. Get current event to read its description
            const eventRes = await calendarAPI.events.get({ calendarId, eventId });
            const currentDesc = eventRes.data.description || '';

            // 2. Compute new description
            let newDesc = currentDesc;
            
            if (insertionPoint === 'START') {
                newDesc = `${textToInsert}\n\n${currentDesc}`;
            } else if (insertionPoint === 'END') {
                newDesc = `${currentDesc}\n\n${textToInsert}`;
            } else if (insertionPoint === 'AFTER_MATCH' && matchString) {
                const parts = currentDesc.split(matchString);
                if (parts.length > 1) {
                    // Insert right after the first match
                    newDesc = parts[0] + matchString + `\n${textToInsert}\n` + parts.slice(1).join(matchString);
                } else {
                    // If no match, append to end
                    newDesc = `${currentDesc}\n\n${textToInsert}`;
                }
            } else if (insertionPoint === 'BEFORE_MATCH' && matchString) {
                const parts = currentDesc.split(matchString);
                if (parts.length > 1) {
                    // Insert right before the first match
                    newDesc = parts[0] + `\n${textToInsert}\n` + matchString + parts.slice(1).join(matchString);
                } else {
                    // If no match, prepend
                    newDesc = `${textToInsert}\n\n${currentDesc}`;
                }
            }

            // 3. Patch event
            await EventsEditorService.updateEventDescription(calendarId, eventId, newDesc);
            success++;
        } catch (error: any) {
            errors.push(`Error en evento ${eventId}: ${error.message}`);
        }
    }

    return { success, errors };
}

export async function batchUpdateEventTitles(
    calendarId: string,
    updates: { eventId: string; newTitle: string }[]
): Promise<{ success: number; errors: string[] }> {
    let success = 0;
    const errors: string[] = [];

    for (const update of updates) {
        if (!update.newTitle || update.newTitle.trim() === '') continue; // Skip empty titles

        try {
            await EventsEditorService.updateEventTitle(calendarId, update.eventId, update.newTitle);
            success++;
        } catch (error: any) {
            errors.push(`Error en evento ${update.eventId}: ${error.message}`);
        }
    }

    return { success, errors };
}
