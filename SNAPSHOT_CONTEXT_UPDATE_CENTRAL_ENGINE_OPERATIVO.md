# 📊 SNAPSHOT: Motor Central Operativo
**Fecha:** 2026-03-17 | **Sprint:** Acople Total SIA 2.0 + Doble Persistencia + Búsqueda Híbrida

---

## 🏗️ Arquitectura Implementada

### Motor de Sync — Doble Persistencia
El motor `syncGoogleSheetToStudents` en `syncActions.ts` ahora escribe atómicamente en **dos destinos**:

| Destino | Tabla | Llave de Conflicto | Comportamiento en Fallo |
|---------|-------|--------------------|------------------------|
| Semestre Activo | `students` | `semester,document_number` | Bloqueante (retorna error) |
| Tabla de Verdad | `Tabla_Verdad_Estudiantes` | `numero_de_identificacion` | **Silencioso** (Regla de Oro) |

### Funciones de Sanitización SIA 2.0 (re-exportadas)
| Función | Propósito | Paridad Python |
|---------|-----------|----------------|
| `cleanDocumentNumber` | Elimina `.` y `,` del doc | `supabase_student_repo.py:327` |
| `toUpperOrEmpty` | MAYÚSCULAS normalizadas | `supabase_student_repo.py:334` |
| `convertBirthDate` | 6 formatos de fecha → ISO | `supabase_student_repo.py:285` |
| `buildFamilyMember` | Agrupación JSONB familiar | `supabase_student_repo.py:338` |
| `buildTruthTableRecord` | Mapeo de columnas SIA español | **NUEVO en este sprint** |

### Motor de Búsqueda Híbrida
```
Búsqueda("JAIMES")
  ├── Paso 1: students (semestre activo)
  │     ├── Match → source: "current" (badge violeta)
  │     └── Sin match → continúa
  └── Paso 2: Tabla_Verdad_Estudiantes
        └── Match → source: "historical" (badge cyan + Modal Reintegro)
```

### Flujo de Reintegro
1. Usuario busca apellido → aparece resultado con badge **◈ HISTÓRICO**
2. Click → Modal Neon-Glass de confirmación
3. Confirmación → `reintegrateStudentFromHistory(truthTableId)`:
   - Lee de `Tabla_Verdad_Estudiantes`
   - Aplica sanitizaciones SIA 2.0
   - Inserta con `semester = activo`
4. Automáticamente se selecciona el alumno reintegrado → `source: 'current'`

### Panel de Datos Vitales (StudentVitalsPanel)
Aparece al seleccionar cualquier estudiante. Tres bloques GlassCard:
- **Ficha Personal**: documento, contacto, dirección
- **Ficha Médica**: grupo sanguíneo + RH + EPS (badge rojo)
- **Ficha Familiar**: Padre (violeta), Madre (rosa), Acudiente (cyan)

---

## 📁 Archivos Modificados / Creados

| Archivo | Cambio |
|---------|--------|
| `syncActions.ts` | + `buildTruthTableRecord` + doble upsert + exports sanitizadores |
| `students.ts` | Reescrito: `searchStudentsHybrid` + `searchStudents` alias |
| `reintegrate.ts` | **NUEVO**: Server Action de clonado histórico → semestre activo |
| `StudentPicker.tsx` | Reescrito: badges fuente, modal reintegro Neon-Glass |
| `StudentVitalsPanel.tsx` | **NUEVO**: Panel de datos vitales 3 secciones GlassCard |
| `EnrollmentForm.tsx` | Integración StudentVitalsPanel + tipado HybridSearchResult |

---

## ✅ Reglas de Producción Activas
- **Regla de Oro**: Fallo en `Tabla_Verdad_Estudiantes` = log de warning + flujo principal intacto
- **No renombrar columnas**: Columnas en español de la Tabla de Verdad son inmutables
- **Semestre estricto**: `reintegrateStudentFromHistory` siempre usa el semestre activo al momento del call
- **NFD Normalize**: Búsqueda y matching sin importar acentos

---

## 🎯 Próximos Pasos
- Habilitar la edición de abonos desde la ficha de matrícula relacional
- Implementar instrumentos musicales específicos por programa en `dyt_enrollment_programs`
