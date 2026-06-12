import { SemesterRepository } from '@/modules/configuracion/repository/semester-repo';

export async function getActiveSemesterName(): Promise<string> {
    try {
        const activeSemester = await SemesterRepository.getActive();
        if (activeSemester?.name) {
            return activeSemester.name;
        }
    } catch (error) {
        console.error('[SemesterHelper] Error fetching active semester:', error);
    }
    
    // Fallback in case there is no active semester defined
    return '2026-1'; 
}
