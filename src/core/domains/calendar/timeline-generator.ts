export interface RecessWeek {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    description: string;
}

export interface ClassScheduleEntry {
    index: number;
    title: string;
    dateISO: string;
    dateDisplay: string;
    dayDisplay: string;
    startTimeDisplay: string;
    endTimeDisplay: string;
    isRecess: boolean;
    recessDescription?: string;
    startTimeISO: string; // Complete ISO timestamp for Calendar API
    endTimeISO: string;   // Complete ISO timestamp for Calendar API
}

/**
 * Motor de Cálculo Temporal para el Editor de Eventos.
 * Genera el cronograma de clases saltando semanas de receso.
 */
export class TimelineGenerator {
    
    /**
     * Calcula la lista de eventos basados en un patrón semanal.
     */
    static generateSchedule(
        firstClassDateStr: string, // format YYYY-MM-DD
        startTimeStr: string, // format HH:MM
        durationMinutes: number,
        totalClasses: number,
        recessWeeks: RecessWeek[]
    ): ClassScheduleEntry[] {
        const schedule: ClassScheduleEntry[] = [];
        
        let currentDate = new Date(`${firstClassDateStr}T${startTimeStr}:00-05:00`);
        let classCount = 0;
        let attemptCount = 0; // fallback to prevent infinite loops

        while (classCount < totalClasses && attemptCount < 100) {
            attemptCount++;
            
            const currentYYYYMMDD = currentDate.toISOString().split('T')[0];
            
            // Check if current date falls within any recess week
            const matchedRecess = recessWeeks.find(recess => {
                return currentYYYYMMDD >= recess.startDate && currentYYYYMMDD <= recess.endDate;
            });

            const dayName = new Intl.DateTimeFormat('es-CO', { weekday: 'long', timeZone: 'America/Bogota' }).format(currentDate);
            const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            
            const startDateObj = new Date(currentDate);
            const endDateObj = new Date(currentDate.getTime() + durationMinutes * 60000);
            
            const formatTime = (d: Date) => {
                return new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'America/Bogota'
                }).format(d);
            };

            if (matchedRecess) {
                // Es un receso, se inserta como visual pero NO cuenta como clase
                schedule.push({
                    index: 0, // 0 signifies it's not a numbered class
                    title: matchedRecess.description.toUpperCase(),
                    dateISO: currentYYYYMMDD,
                    dateDisplay: currentYYYYMMDD,
                    dayDisplay: capitalizedDay,
                    startTimeDisplay: formatTime(startDateObj),
                    endTimeDisplay: formatTime(endDateObj),
                    isRecess: true,
                    recessDescription: matchedRecess.description,
                    startTimeISO: startDateObj.toISOString(),
                    endTimeISO: endDateObj.toISOString(),
                });
            } else {
                classCount++;
                schedule.push({
                    index: classCount,
                    title: `Clase ${classCount.toString().padStart(2, '0')}`,
                    dateISO: currentYYYYMMDD,
                    dateDisplay: currentYYYYMMDD,
                    dayDisplay: capitalizedDay,
                    startTimeDisplay: formatTime(startDateObj),
                    endTimeDisplay: formatTime(endDateObj),
                    isRecess: false,
                    startTimeISO: startDateObj.toISOString(),
                    endTimeISO: endDateObj.toISOString(),
                });
            }

            // Advance exactly 7 days
            currentDate.setDate(currentDate.getDate() + 7);
        }

        return schedule;
    }

    /**
     * Genera la tabla en texto plano para inyectar en la descripción de Google Calendar.
     */
    static formatPlaintextTable(schedule: ClassScheduleEntry[]): string {
        let table = "🗓 TU CALENDARIO COMPLETO DE CLASES\n";
        table += "=================================================================\n\n";
        
        // Headers
        table += "#   CLASE       FECHA        DÍA        HORA\n";
        table += "-----------------------------------------------------------------\n";

        schedule.forEach(entry => {
            if (entry.isRecess) {
                const numSpace = " ".repeat(4);
                // "8   SEMANA SANTA 2026-04-04 Sábado   8:00 AM A 9:00 AM" (example approx)
                table += `${numSpace}${entry.title.padEnd(14, ' ')}${entry.dateDisplay}  ${entry.dayDisplay.padEnd(9, ' ')}  ${entry.startTimeDisplay} A ${entry.endTimeDisplay}\n`;
            } else {
                const numStr = entry.index.toString().padEnd(3, ' ');
                table += `${numStr} ${entry.title.padEnd(11, ' ')} ${entry.dateDisplay}   ${entry.dayDisplay.padEnd(9, ' ')} ${entry.startTimeDisplay} A ${entry.endTimeDisplay}\n`;
            }
        });

        table += "=================================================================\n";
        return table;
    }
}
