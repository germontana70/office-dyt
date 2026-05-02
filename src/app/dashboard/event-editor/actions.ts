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

export async function cancelClassEvent(
    originalCalendarId: string,
    cancelledEventId: string,
    selectedEventIdsToInject: string[],
    cancelReason: string,
    classHeightStr: string
): Promise<{ success: boolean; message: string }> {
    try {
        const { CALENDAR_IDS } = await import('@/core/constants/calendars');
        const cancelledCalendarId = CALENDAR_IDS["CLASES CANCELADAS"];
        if (!cancelledCalendarId) {
            throw new Error("No se encontró el calendario de Clases Canceladas en las constantes.");
        }

        // 1. Fetch the event to cancel
        const cancelledEvent = await EventsEditorService.getEvent(originalCalendarId, cancelledEventId);
        
        // 2. Prepare the cancellation note
        const note = `******CANCELADA - ${classHeightStr.toUpperCase()}******\nMotivo: ${cancelReason}\nReposición - ${classHeightStr} - pendiente de programar\n------------------------------------`;

        // 3. Inject note to other selected events (excluding the one being deleted if it's there)
        const eventsToInject = selectedEventIdsToInject.filter(id => id !== cancelledEventId);
        if (eventsToInject.length > 0) {
            await batchUpdateEventDescriptions(
                originalCalendarId,
                eventsToInject,
                note,
                'END'
            );
        }

        // 4. Create copy in Clases Canceladas
        const newSummary = `Cancelada - ${classHeightStr} - ${cancelledEvent.summary || ''}`;
        const newDescription = cancelledEvent.description ? `${cancelledEvent.description}\n\n${note}` : note;
        
        const copyBody = {
            summary: newSummary,
            description: newDescription,
            start: cancelledEvent.start,
            end: cancelledEvent.end,
            location: cancelledEvent.location,
            // Exclude attendees to avoid notifying them or carrying over RSVPs, and exclude IDs
        };

        await EventsEditorService.insertEvent(cancelledCalendarId, copyBody);

        // 5. Delete the original event
        await EventsEditorService.deleteEvent(originalCalendarId, cancelledEventId);

        return { success: true, message: 'Clase cancelada exitosamente.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function createReposicionEvent(
    originalCalendarId: string,
    baseEventId: string,
    selectedEventIdsToInject: string[],
    targetCalendarId: string,
    date: string,
    startTime: string,
    endTime: string,
    classHeightStr: string
): Promise<{ success: boolean; message: string }> {
    try {
        const { EventsEditorService } = await import('@/infra/services/eventsEditor');
        const baseEvent = await EventsEditorService.getEvent(originalCalendarId, baseEventId);

        const newSummary = `Reposición - ${classHeightStr} - ${baseEvent.summary || ''}`;
        
        const startDateTime = `${date}T${startTime}:00-05:00`;
        const endDateTime = `${date}T${endTime}:00-05:00`;

        // 1. Format the date for the injection note
        const dateObj = new Date(startDateTime);
        const dateFormatted = dateObj.toLocaleString('es-CO', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        const capitalizedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

        const note = `Reposición - ${classHeightStr} - ${capitalizedDate}`;

        // 2. Prepare description for the new Reposición event
        const matchString = `Reposición - ${classHeightStr} - pendiente de programar`;
        let newDescription = baseEvent.description || '';
        
        const parts = newDescription.split(matchString);
        if (parts.length > 1) {
            newDescription = parts[0] + matchString + `\n${note}\n` + parts.slice(1).join(matchString);
        } else {
            newDescription = newDescription ? `${newDescription}\n\n${note}` : note;
        }

        const copyBody = {
            summary: newSummary,
            description: newDescription,
            start: { dateTime: startDateTime, timeZone: 'America/Bogota' },
            end: { dateTime: endDateTime, timeZone: 'America/Bogota' },
            location: baseEvent.location,
        };

        // 3. Create event
        await EventsEditorService.insertEvent(targetCalendarId, copyBody);

        // 4. Inject note to other selected events
        if (selectedEventIdsToInject.length > 0) {
            await batchUpdateEventDescriptions(
                originalCalendarId,
                selectedEventIdsToInject,
                note,
                'AFTER_MATCH',
                matchString
            );
        }

        return { success: true, message: 'Reposición creada y registrada con éxito.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
