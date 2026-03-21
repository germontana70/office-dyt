import { SemesterRepository } from '@/modules/configuracion/repository/semester-repo';
import { getTeachers } from '@/app/actions/settings';
import { getGroupClassesBySemester, getGroupProgramNames } from '@/app/actions/group-classes';
import GroupClassesClient from './GroupClassesClient';

export default async function ClasesGrupalesPage() {
  const activeSemester = await SemesterRepository.getActive();
  const currentSemesterName = activeSemester?.name || '2026-1';

  const teachers = await getTeachers();
  const initialGroupClasses = await getGroupClassesBySemester(currentSemesterName);
  const initialProgramNames = await getGroupProgramNames(currentSemesterName);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            Clases <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-blue pr-2">Grupales</span>
          </h1>
          <p className="text-zinc-400 mt-2 font-medium">
            Gestión de agrupaciones - Semestre <span className="text-neon-cyan font-bold">{currentSemesterName}</span>
          </p>
        </div>
      </div>

      <GroupClassesClient 
        currentSemester={currentSemesterName} 
        teachers={teachers || []} 
        initialGroupClasses={initialGroupClasses || []} 
        initialProgramNames={initialProgramNames || []}
      />
    </div>
  );
}
