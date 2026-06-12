'use server';

import { createClient } from '@/infra/services/server';
import { SemesterRepository } from '@/modules/configuracion/repository/semester-repo';
import { GoogleCalendarService } from '@/infra/services/googleCalendarService';
import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { ClassScheduleEntry, TimelineGenerator } from '@/core/domains/calendar/timeline-generator';

export async function fetchCreationMetadata() {
    try {
        const supabase = await createClient();
        
        // 1. Get Active Semester
        const activeSemester = await SemesterRepository.getActive();
        if (!activeSemester) {
            return { error: 'No hay un semestre activo configurado en el sistema.' };
        }

        // 2. Fetch Enrolled Students for Active Semester ONLY
        const { data: enrollments, error: enrollmentsError } = await supabase
            .from('dyt_enrollments')
            .select(`
                id,
                student_id,
                students ( id, first_name, last_name, document_number )
            `)
            .eq('semester', activeSemester.name)
            .eq('status', 'active');

        if (enrollmentsError) throw enrollmentsError;

        // Unique students (just in case they have multiple enrollments)
        const studentsMap = new Map();
        enrollments?.forEach((e: any) => {
            if (e.students) {
                const s = e.students;
                studentsMap.set(s.id, {
                    id: s.id,
                    name: `${s.first_name} ${s.last_name}`,
                    doc: s.document_number
                });
            }
        });
        const activeStudents = Array.from(studentsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        // 3. Fetch Teachers
        const { data: teachers, error: teachersError } = await supabase
            .from('teachers')
            .select('id, name, nickname_1, nickname_2')
            .order('name');
        
        if (teachersError) throw teachersError;

        // 4. Fetch Programs (Instruments)
        const { data: programs, error: programsError } = await supabase
            .from('dyt_instruments')
            .select('id, name')
            .order('name');
            
        if (programsError) throw programsError;

        return {
            success: true,
            activeSemester: activeSemester.name,
            students: activeStudents,
            teachers: teachers || [],
            programs: programs || []
        };
    } catch (error: any) {
        console.error('[fetchCreationMetadata] Error:', error);
        return { error: `Error interno: ${error.message}` };
    }
}

export interface BatchCreatePayload {
    calendarId: string;
    studentName: string;
    teacherNickname: string;
    programName: string;
    calendarName: string; // for title e.g., "SALÓN 201"
    greetingText: string;
    rulesText: string;
    schedule: ClassScheduleEntry[];
}

export async function batchCreateEvents(payload: BatchCreatePayload) {
    try {
        const auth = await GoogleCalendarService.getAuthClient();
        const calendarAPI = google.calendar({ version: 'v3', auth });

        const { calendarId, studentName, teacherNickname, programName, calendarName, greetingText, rulesText, schedule } = payload;

        // 1. Generate Plaintext Table for description
        const plainTextTable = TimelineGenerator.formatPlaintextTable(schedule);
        
        // Helper: Construct full body description
        const constructDescription = (meetLink: string | null) => {
            let body = `${greetingText}\n\n`;
            if (meetLink) {
                body += `🎥 Unirse a Google Meet: ${meetLink}\n\n`;
            }
            body += `${plainTextTable}\n\n`;
            body += `${rulesText}`;
            return body;
        };

        // 2. Identify the first actual class (to generate the Meet link)
        const firstActualClass = schedule.find(s => !s.isRecess);
        if (!firstActualClass) {
            return { error: "No hay clases programadas, solo recesos." };
        }

        let hangoutLink = null;
        const createdEventsInfo = [];

        // 3. CREATE EVENT 1 (With ConferenceData to get Meet Link)
        const requestId = uuidv4();
        const event1Title = `${calendarName} - ${teacherNickname.toUpperCase()} - ${studentName.toUpperCase()} - ${firstActualClass.title}`;
        
        const event1BodyPre = constructDescription(null); // will be updated immediately

        console.log(`[Google Calendar] Creando ${firstActualClass.title} y solicitando link Meet...`);
        const res1 = await calendarAPI.events.insert({
            calendarId,
            conferenceDataVersion: 1, // REQUIRED for meet link
            requestBody: {
                summary: event1Title,
                description: event1BodyPre,
                start: { dateTime: firstActualClass.startTimeISO, timeZone: 'America/Bogota' },
                end: { dateTime: firstActualClass.endTimeISO, timeZone: 'America/Bogota' },
                conferenceData: {
                    createRequest: {
                        requestId: requestId,
                        conferenceSolutionKey: { type: "hangoutsMeet" }
                    }
                }
            }
        });

        hangoutLink = res1.data.hangoutLink || null;
        const event1Id = res1.data.id;
        
        if (!hangoutLink) {
            console.warn("[Google Calendar] API no devolvió hangoutLink. Verifica permisos del Calendar.");
        } else {
            // Update Event 1 with the exact link in its body
            const finalBody = constructDescription(hangoutLink);
            await calendarAPI.events.patch({
                calendarId,
                eventId: event1Id as string,
                requestBody: { description: finalBody }
            });
        }
        
        createdEventsInfo.push({ title: event1Title, id: event1Id, date: firstActualClass.dateDisplay });

        // 4. Create the rest of the events
        const otherClasses = schedule.filter(s => s.index !== firstActualClass.index && !s.isRecess);
        const finalBodyAll = constructDescription(hangoutLink);

        for (const cls of otherClasses) {
            const title = `${calendarName} - ${teacherNickname.toUpperCase()} - ${studentName.toUpperCase()} - ${cls.title}`;
            console.log(`[Google Calendar] Creando ${cls.title}...`);
            
            const res = await calendarAPI.events.insert({
                calendarId,
                requestBody: {
                    summary: title,
                    description: finalBodyAll,
                    start: { dateTime: cls.startTimeISO, timeZone: 'America/Bogota' },
                    end: { dateTime: cls.endTimeISO, timeZone: 'America/Bogota' },
                    // We don't request a new conference, we just put the link in the description
                }
            });
            
            createdEventsInfo.push({ title, id: res.data.id, date: cls.dateDisplay });
            // Sleep slightly to respect rate limits
            await new Promise(r => setTimeout(r, 200));
        }

        return { 
            success: true, 
            message: `¡${createdEventsInfo.length} clases creadas exitosamente!`,
            meetLink: hangoutLink
        };

    } catch (error: any) {
        console.error('[batchCreateEvents] Error:', error);
        return { error: `Error al crear eventos: ${error.message || 'Desconocido'}` };
    }
}
