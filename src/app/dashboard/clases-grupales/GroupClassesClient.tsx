'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Users, Trash2, BookOpen, Clock, MapPin, Calendar, 
  Trash, ChevronDown, UserPlus, Check, X, Edit, GraduationCap
} from 'lucide-react';
import { 
  createGroupClass, 
  deleteGroupClass, 
  getStudentsInGroup, 
  enrollStudentInGroup, 
  removeStudentFromGroup,
  addGroupProgramName,
  deleteGroupProgramName 
} from '@/app/actions/group-classes';
import { getEnrollmentProgramsForSemester } from '@/app/actions/group-classes-search';

type Tab = 'definition' | 'enrollment';

const EXACT_ROOM_OPTIONS = [
  "SALÓN 201", "SALÓN 202", "SALÓN 203A", "SALÓN 203B",
  "SALÓN 204A -M.A", "SALÓN 204B- J.P", "SALÓN 205-A", 
  "SALÓN 205-B", "SALÓN 205-C", "SALÓN 206", "SALÓN 207", 
  "SALÓN 208", "SALÓN 209", "MASTER GERMÁN", 
  "CLASES VIRTUALES - SALA 1 - Dones y Talentos"
];

export default function GroupClassesClient({ 
  currentSemester, 
  teachers, 
  initialGroupClasses,
  initialProgramNames 
}: { 
  currentSemester: string;
  teachers: any[];
  initialGroupClasses: any[];
  initialProgramNames: { id: string; name: string }[];
}) {
  const toast = {
    success: (msg: string, opts?: any) => alert(msg),
    error: (msg: string, opts?: any) => alert(msg),
    loading: (msg: string) => { console.log(msg); return 'id'; }
  };

  const [activeTab, setActiveTab] = useState<Tab>('definition');
  const [classes, setClasses] = useState(initialGroupClasses);
  
  // Definition Form State
  const [formData, setFormData] = useState({
    name: '',
    teacher_id: '',
    room: '',
    day_of_week: '',
    start_time: '',
    duration_minutes: 60
  });
  const [baseName, setBaseName] = useState('');
  const [groupSuffix, setGroupSuffix] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Program Names Catalog State
  const [programNames, setProgramNames] = useState(initialProgramNames);
  const [newProgramInput, setNewProgramInput] = useState('');
  const [isAddingProgram, setIsAddingProgram] = useState(false);

  // Enrollment State
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [availablePrograms, setAvailablePrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Combobox State
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Click-outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered programs for combobox
  const filteredPrograms = availablePrograms.filter((p: any) =>
    p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.studentDocument?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Load students when a class is selected
  useEffect(() => {
    if (activeTab === 'enrollment' && selectedClassId) {
      loadEnrolledStudents(selectedClassId);
    } else {
      setEnrolledStudents([]);
    }
  }, [selectedClassId, activeTab]);

  // Load available programs for enrollment
  useEffect(() => {
    if (activeTab === 'enrollment') {
      loadAvailablePrograms();
    }
  }, [activeTab]);

  const loadEnrolledStudents = async (classId: string) => {
    setIsLoadingStudents(true);
    try {
      const students = await getStudentsInGroup(classId, currentSemester);
      setEnrolledStudents(students);
    } catch (error) {
      toast.error('Error al cargar lista de estudiantes');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const loadAvailablePrograms = async () => {
    try {
      const programs = await getEnrollmentProgramsForSemester(currentSemester);
      setAvailablePrograms(programs);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseName || !groupSuffix) {
      toast.error('Selecciona el programa base y el sufijo del grupo');
      return;
    }
    const finalName = `${baseName} ${groupSuffix}`;

    setIsSubmitting(true);
    try {
      const res = await createGroupClass({
        ...formData,
        name: finalName,
        semester: currentSemester
      });

      if (res.error) {
        toast.error(res.error);
      } else if (res.data) {
        toast.success('Clase grupal creada con éxito');
        const teacherObj = teachers.find(t => t.id === formData.teacher_id);
        const newClass = {
          ...res.data,
          teachers: teacherObj ? { id: teacherObj.id, name: teacherObj.name, instrument: teacherObj.instrument } : null
        };
        setClasses([...classes, newClass].sort((a, b) => a.name.localeCompare(b.name)));
        setBaseName('');
        setGroupSuffix('');
        setFormData({ name: '', teacher_id: '', room: '', day_of_week: '', start_time: '', duration_minutes: 60 });
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la clase "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    const toastId = toast.loading('Eliminando clase...');
    try {
      const res = await deleteGroupClass(id);
      if (res.error) {
        toast.error(res.error, { id: toastId });
      } else {
        toast.success(`Clase "${name}" eliminada`, { id: toastId });
        setClasses(classes.filter(c => c.id !== id));
        if (selectedClassId === id) setSelectedClassId(null);
      }
    } catch (error) {
      toast.error('Error al eliminar la clase', { id: toastId });
    }
  };

  const handleEnrollStudent = async () => {
    if (!selectedClassId || !selectedProgramId) {
      toast.error('Selecciona un estudiante para matricular');
      return;
    }

    const targetGroup = classes.find(c => c.id === selectedClassId);
    if (!targetGroup) {
      toast.error('Grupo no encontrado');
      return;
    }

    setIsEnrolling(true);
    try {
      // selectedProgramId now holds the enrollmentId
      const res = await enrollStudentInGroup(selectedProgramId, selectedClassId, targetGroup.name);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Estudiante añadido al grupo');
        await loadEnrolledStudents(selectedClassId);
        await loadAvailablePrograms();
        setSelectedProgramId('');
        setSearchTerm('');
      }
    } catch (error) {
      toast.error('Error al añadir estudiante');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleRemoveStudent = async (programId: string, name: string) => {
    if (!confirm(`¿Confirmas que deseas retirar a ${name} de este grupo?`)) return;
    
    try {
      const res = await removeStudentFromGroup(programId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Estudiante retirado del grupo');
        if (selectedClassId) {
          await loadEnrolledStudents(selectedClassId);
          await loadAvailablePrograms();
        }
      }
    } catch (error) {
      toast.error('Error al retirar estudiante');
    }
  };

  const handleAddProgram = async () => {
    if (!newProgramInput.trim()) return;
    setIsAddingProgram(true);
    try {
      const res = await addGroupProgramName(currentSemester, newProgramInput);
      if (res.error) {
        toast.error(res.error);
      } else if (res.data) {
        setProgramNames(prev => [...prev, { id: res.data.id, name: res.data.name }].sort((a, b) => a.name.localeCompare(b.name)));
        setNewProgramInput('');
        toast.success(`"${res.data.name}" añadido al catálogo`);
      }
    } catch (error) {
      toast.error('Error al añadir programa');
    } finally {
      setIsAddingProgram(false);
    }
  };

  const handleDeleteProgram = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}" del catálogo?`)) return;
    try {
      const res = await deleteGroupProgramName(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        setProgramNames(prev => prev.filter(p => p.id !== id));
        if (baseName === name) setBaseName('');
      }
    } catch (error) {
      toast.error('Error al eliminar programa');
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* MAG-STYLE TABS */}
      <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
        <button
          onClick={() => setActiveTab('definition')}
          className={`relative p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 overflow-hidden ${
            activeTab === 'definition'
              ? 'bg-black/80 border-neon-cyan shadow-[0_0_20px_rgba(0,255,255,0.15)] backdrop-blur-xl'
              : 'bg-black/40 border-white/10 text-white/50 hover:bg-black/60 hover:border-white/20 glass-panel'
          }`}
        >
          {activeTab === 'definition' && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-blue" />
          )}
          <BookOpen className={`w-8 h-8 ${activeTab === 'definition' ? 'text-neon-cyan' : 'text-zinc-500'}`} />
          <div className="text-center">
            <h3 className={`font-bold tracking-widest uppercase ${activeTab === 'definition' ? 'text-white' : 'text-zinc-400'}`}>
              Definición
            </h3>
            <p className="text-xs mt-1 opacity-70 text-nowrap">Crear y administrar grupos</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('enrollment')}
          className={`relative p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 overflow-hidden ${
            activeTab === 'enrollment'
              ? 'bg-black/80 border-neon-purple shadow-[0_0_20px_rgba(255,0,255,0.15)] backdrop-blur-xl'
              : 'bg-black/40 border-white/10 text-white/50 hover:bg-black/60 hover:border-white/20 glass-panel'
          }`}
        >
          {activeTab === 'enrollment' && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-purple to-pink-500" />
          )}
          <Users className={`w-8 h-8 ${activeTab === 'enrollment' ? 'text-neon-purple' : 'text-zinc-500'}`} />
          <div className="text-center">
            <h3 className={`font-bold tracking-widest uppercase ${activeTab === 'enrollment' ? 'text-white' : 'text-zinc-400'}`}>
              Matrículas
            </h3>
            <p className="text-xs mt-1 opacity-70 text-nowrap">Añadir estudiantes a grupos</p>
          </div>
        </button>
      </div>

      {/* TAB CONTENT: DEFINITION */}
      {activeTab === 'definition' && (
        <div className="flex flex-col w-full gap-8">
          {/* HORIZONTAL FORM PANEL */}
          <div className="glass-panel p-8 rounded-2xl bg-black/60 backdrop-blur-md border border-neon-cyan/20 w-full">
            <h3 className="text-xl font-bold text-white mb-8 uppercase tracking-wider flex items-center gap-3">
              <Plus className="w-6 h-6 text-neon-cyan" />
              Configuración de Nuevo Grupo
            </h3>
            
            <form onSubmit={handleCreateClass} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                {/* Naming logic grouped */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">Programa Base *</label>
                      <div className="relative">
                        <select
                          required
                          value={baseName}
                          onChange={e => setBaseName(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-lg pl-3 pr-8 py-3 text-white appearance-none focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan transition-all text-sm"
                        >
                          <option value="" className="bg-[#0a0a0a] text-white">Programa...</option>
                          {programNames.map(p => (
                            <option key={p.id} value={p.name} className="bg-[#0a0a0a] text-white">{p.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">Grupo *</label>
                      <div className="relative">
                        <select
                          required
                          value={groupSuffix}
                          onChange={e => setGroupSuffix(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-lg pl-3 pr-8 py-3 text-white appearance-none focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan transition-all text-sm"
                        >
                          <option value="" className="bg-[#0a0a0a] text-white">Sufijo...</option>
                          {['01', '02', '03', '04', '05', '06', '07', '08'].map(g => (
                            <option key={g} value={g} className="bg-[#0a0a0a] text-white">{g}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">Profesor Asignado</label>
                  <div className="relative">
                    <select
                      value={formData.teacher_id}
                      onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan transition-all text-sm"
                    >
                      <option value="" className="bg-[#0a0a0a] text-white">-- Sin Asignar --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id} className="bg-[#0a0a0a] text-white">{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-zinc-500 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Salón
                    </label>
                    <div className="relative">
                        <select
                          value={formData.room}
                          onChange={e => setFormData({ ...formData, room: e.target.value })}
                          className="w-full bg-black/50 border border-white/10 rounded-lg pl-3 pr-8 py-3 text-white appearance-none focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan transition-all text-sm"
                        >
                          <option value="" className="bg-[#0a0a0a] text-white">Salón...</option>
                          {EXACT_ROOM_OPTIONS.map(room => (
                            <option key={room} value={room} className="bg-[#0a0a0a] text-white">
                              {room}
                            </option>
                          ))}
                        </select>
                      <ChevronDown className="absolute right-2 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Día
                    </label>
                    <div className="relative">
                      <select
                        value={formData.day_of_week}
                        onChange={e => setFormData({ ...formData, day_of_week: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 rounded-lg pl-3 pr-8 py-3 text-white appearance-none focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan transition-all text-sm"
                      >
                        <option value="" className="bg-[#0a0a0a] text-white">Día...</option>
                        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => (
                          <option key={d} value={d} className="bg-[#0a0a0a] text-white">{d}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Horario
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan transition-all [color-scheme:dark] text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary/20 border border-primary/50 text-primary font-bold py-3 rounded-lg uppercase tracking-wider hover:bg-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center text-xs"
                  >
                    {isSubmitting ? (
                      <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      'Confirmar'
                    )}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-10 pt-10 border-t border-white/5">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-blue">Catálogo de Programas Base</span>
              </h3>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex gap-2 w-full md:w-1/3">
                  <input
                    type="text"
                    value={newProgramInput}
                    onChange={e => setNewProgramInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddProgram(); } }}
                    placeholder="Ej: Danza Contemporánea"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddProgram}
                    disabled={isAddingProgram || !newProgramInput.trim()}
                    className="bg-primary/20 text-primary border border-primary/50 text-xs font-bold px-4 py-2.5 rounded-lg uppercase tracking-wider hover:bg-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all disabled:opacity-40 whitespace-nowrap"
                  >
                    {isAddingProgram ? (
                      <span className="animate-spin inline-block h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      'Añadir'
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 flex-1">
                  {programNames.length === 0 ? (
                    <p className="text-zinc-600 text-xs italic">Sin programas en el catálogo local.</p>
                  ) : (
                    programNames.map(p => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1.5 bg-black/60 border border-accent/40 backdrop-blur-md text-accent text-xs font-medium tracking-wide px-3 py-1.5 rounded-full hover:border-accent/60 transition-all group"
                      >
                        {p.name}
                        <button
                          type="button"
                          onClick={() => handleDeleteProgram(p.id, p.name)}
                          className="text-white/50 hover:text-red-400 transition-colors ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MAGAZINE STYLE LIST CLASSES */}
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between mb-4 px-4">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-white italic">
                Grupos <span className="text-neon-cyan">Activos</span>
              </h3>
              <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-zinc-400 text-sm">
                Total: <span className="text-white font-bold font-mono">{classes.length}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {classes.length === 0 ? (
                <div className="py-20 text-center glass-panel border-dashed border-white/10 rounded-2xl">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-10 text-white" />
                  <p className="text-zinc-500 font-medium">No se han definido grupos para el semestre {currentSemester}</p>
                </div>
              ) : (
                classes.map((cls) => (
                  <div 
                    key={cls.id} 
                    className="glass-panel group relative flex flex-wrap lg:flex-nowrap items-center w-full bg-black/40 border border-white/10 rounded-2xl p-4 lg:p-6 hover:border-neon-cyan/40 hover:bg-black/60 transition-all gap-4 lg:gap-8"
                  >
                    {/* Column 1: Group Name (Wider) */}
                    <div className="w-full lg:w-1/3 min-w-[250px]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 border border-neon-cyan/30 flex items-center justify-center flex-shrink-0">
                          <Users className="w-6 h-6 text-neon-cyan" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-white tracking-tight leading-tight">
                            {cls.name}
                          </h4>
                          <span className="text-xs uppercase font-bold text-neon-cyan/60 tracking-widest">{currentSemester}</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Teacher */}
                    <div className="w-full md:w-1/2 lg:w-1/4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg border border-white/5 group-hover:bg-primary/10 transition-colors">
                          <GraduationCap className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold">Profesor</span>
                          <span className="text-sm font-medium text-zinc-200">
                            {cls.teachers?.name || '-- No Asignado --'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Location & Time */}
                    <div className="w-full md:w-1/2 lg:flex-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                            <MapPin className="w-4 h-4 text-pink-400" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold">Salón</span>
                            <span className="text-sm font-medium text-zinc-200">{cls.room || '--'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                            <Clock className="w-4 h-4 text-neon-cyan" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-tighter text-zinc-500 font-bold">Horario</span>
                            <span className="text-sm font-medium text-zinc-200">
                              {cls.day_of_week?.slice(0,3)} • {cls.start_time || '--'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 4: Actions */}
                    <div className="w-full lg:w-auto flex justify-end items-center gap-2 pr-2 border-t lg:border-t-0 border-white/5 pt-4 lg:pt-0">
                      <button
                        onClick={() => handleDeleteClass(cls.id, cls.name)}
                        className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                        title="Eliminar grupo"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ENROLLMENT (Also Magazine Style) */}
      {activeTab === 'enrollment' && (
        <div className="flex flex-col w-full gap-8">
          {/* TOP SELECTION BAR */}
          <div className="glass-panel p-6 rounded-2xl bg-black/60 backdrop-blur-md border border-neon-purple/20 w-full">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-shrink-0 flex items-center gap-4 border-r border-white/10 pr-6 mr-2 hidden lg:flex">
                <div className="w-12 h-12 rounded-xl bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-neon-purple" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider italic">Matrícula</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Inscripción en grupo</p>
                </div>
              </div>

              <div className="w-full lg:w-1/3">
                <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold px-1">1. Seleccionar Grupo Destino</label>
                <div className="relative">
                  <select
                    value={selectedClassId || ''}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="w-full bg-black/80 border border-white/10 rounded-xl pl-4 pr-10 py-3.5 text-white appearance-none focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple transition-all font-bold"
                  >
                    <option value="" className="bg-[#0a0a0a]">Seleccionar grupo...</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id} className="bg-[#0a0a0a]">
                        {cls.name} ({cls.teachers?.name || 'S.P.'})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-4 w-5 h-5 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div className="w-full lg:flex-1">
                <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold px-1">2. Estudiante por Matricular</label>
                <div className="flex gap-3">
                  <div className="relative flex-1" ref={comboboxRef}>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => {
                        setSearchTerm(e.target.value);
                        setSelectedProgramId('');
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder="Buscar estudiante por nombre, programa o documento..."
                      disabled={!selectedClassId}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple transition-all text-sm disabled:opacity-40"
                    />
                    <ChevronDown className={`absolute right-3 top-4 w-5 h-5 text-zinc-500 pointer-events-none transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />

                    {/* Searchable Dropdown */}
                    {isDropdownOpen && selectedClassId && (
                      <div className="absolute z-50 w-full mt-2 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-xl max-h-60 overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                        {filteredPrograms.length === 0 ? (
                          <div className="p-4 text-center text-zinc-500 text-sm">
                            {searchTerm ? 'Sin resultados para esta búsqueda' : 'No hay estudiantes sin grupo asignado'}
                          </div>
                        ) : (
                          <ul>
                            {filteredPrograms.map((p: any) => (
                              <li
                                key={p.enrollmentId}
                                onClick={() => {
                                  setSelectedProgramId(p.enrollmentId);
                                  setSearchTerm(`${p.studentName}`);
                                  setIsDropdownOpen(false);
                                }}
                                className={`cursor-pointer px-4 py-3 flex items-center justify-between gap-3 border-b border-white/5 last:border-b-0 transition-all ${
                                  selectedProgramId === p.enrollmentId
                                    ? 'bg-neon-purple/20 text-white'
                                    : 'hover:bg-white/10 text-zinc-300'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm text-white truncate">{p.studentName}</div>
                                  <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                                    <span className="font-mono text-zinc-600">{p.studentDocument}</span>
                                  </div>
                                </div>
                                {selectedProgramId === p.enrollmentId && (
                                  <Check className="w-4 h-4 text-neon-purple flex-shrink-0" />
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleEnrollStudent}
                    disabled={!selectedProgramId || isEnrolling}
                    className="bg-neon-purple text-white px-8 py-3.5 rounded-xl font-black uppercase tracking-tighter hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:scale-100 flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,0,255,0.2)]"
                  >
                    {isEnrolling ? <span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" /> : <UserPlus className="w-5 h-5" />}
                    Vincular
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* LIST ENROLLED STUDENTS PANEL */}
          <div className="w-full">
            {!selectedClassId ? (
              <div className="py-32 text-center glass-panel border-dashed border-white/10 rounded-3xl opacity-40">
                <Plus className="w-20 h-20 mx-auto mb-6 opacity-10" />
                <p className="text-xl font-medium text-zinc-400">Selecciona un grupo destino para gestionar sus inscripciones</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-6">
                  <div className="flex items-center gap-4">
                    <h4 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                      Inscritos en <span className="text-neon-purple">{classes.find(c => c.id === selectedClassId)?.name}</span>
                    </h4>
                    <span className="bg-neon-purple/20 text-neon-purple border border-neon-purple/30 px-4 py-1.5 rounded-full font-black text-lg font-mono">
                      {enrolledStudents.length}
                    </span>
                  </div>
                </div>

                {isLoadingStudents ? (
                  <div className="flex justify-center py-20">
                    <span className="animate-spin h-12 w-12 border-4 border-neon-purple border-t-transparent rounded-full shadow-[0_0_20px_rgba(255,0,255,0.3)]" />
                  </div>
                ) : enrolledStudents.length === 0 ? (
                  <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-5" />
                    <p className="text-zinc-500 font-bold tracking-widest uppercase text-sm">El grupo está vacío actualmente</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {enrolledStudents.map(student => (
                      <div 
                        key={student.programId} 
                        className="glass-panel group relative bg-black/60 border border-white/5 hover:border-neon-purple/40 p-6 rounded-2xl flex flex-col justify-between transition-all overflow-hidden"
                      >
                         <div className="absolute -top-4 -right-4 w-16 h-16 bg-neon-purple/5 blur-2xl group-hover:bg-neon-purple/20 transition-all rounded-full" />
                         
                         <div>
                           <div className="font-black text-white text-xl mb-1 tracking-tight leading-none group-hover:text-neon-purple transition-colors">
                             {student.studentName}
                           </div>
                           <div className="text-neon-purple/60 text-[10px] font-black uppercase tracking-widest mb-4">
                             {student.studentDocument}
                           </div>
                           
                           <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                             <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                             <span className="text-xs text-zinc-400 font-medium truncate">{student.programName}</span>
                           </div>
                         </div>

                         <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                            <button
                              onClick={() => handleRemoveStudent(student.programId, student.studentName)}
                              className="text-white/20 hover:text-red-500 hover:bg-red-500/10 p-2.5 rounded-xl transition-all"
                              title="Retirar del grupo"
                            >
                              <X className="w-5 h-5" />
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
