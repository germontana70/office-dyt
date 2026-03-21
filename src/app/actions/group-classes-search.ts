'use server';

import { CurrentStudentRepository } from '@/modules/matriculas/repository/current-student-repo';

export async function getEnrollmentProgramsForSemester(semester: string) {
  try {
    const students = await CurrentStudentRepository.getAllBySemester(semester);
    
    // Map to the shape expected by GroupClassesClient searchable combobox
    return students.map((student) => ({
      enrollmentId: student.id, // using the primary student ID as the reference point
      studentId: student.id,
      studentName: `${student.first_name} ${student.last_name}`,
      studentDocument: student.document_number || 'N/A',
    })).sort((a, b) => a.studentName.localeCompare(b.studentName));
  } catch (error) {
    console.error('Error in getEnrollmentProgramsForSemester:', error);
    return [];
  }
}
