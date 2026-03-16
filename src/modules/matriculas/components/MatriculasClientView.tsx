"use client";

import { useState } from 'react';
import { StudentSearchSelect } from './StudentSearchSelect';
import { EnrollmentAuditCard } from './EnrollmentAuditCard';
import { getEnrollmentAudit } from '@/app/actions/migration';
import { CurrentStudent } from '../models/student.schema';
import { SequentialNavigator } from './SequentialNavigator';

interface MatriculasClientViewProps {
    students: CurrentStudent[];
    semester: string;
}

export function MatriculasClientView({ students, semester }: MatriculasClientViewProps) {
    const [auditData, setAuditData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<CurrentStudent | null>(null);

    const handleStudentSelect = async (student: CurrentStudent) => {
        setSelectedStudent(student);
        setLoading(true);
        try {
            const data = await getEnrollmentAudit(student.id || '', semester);
            setAuditData(data);
        } catch (error) {
            console.error('Error fetching audit:', error);
        } finally {
            setLoading(false);
        }
    };

    const currentIndex = selectedStudent ? students.findIndex(s => s.id === selectedStudent.id) : -1;

    const handlePrev = () => {
        if (currentIndex > 0) {
            const prev = students[currentIndex - 1];
            handleStudentSelect(prev);
        }
    };

    const handleNext = () => {
        if (currentIndex >= 0 && currentIndex < students.length - 1) {
            const next = students[currentIndex + 1];
            handleStudentSelect(next);
        }
    };

    return (
        <div className="space-y-6">
            <StudentSearchSelect 
                students={students} 
                onSelect={handleStudentSelect} 
                onSearchFocus={() => {
                    setAuditData(null);
                    setSelectedStudent(null);
                }}
            />

            {loading && (
                <div className="w-full h-32 flex flex-col items-center justify-center gap-4 animate-pulse">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Auditando Bóveda...</p>
                </div>
            )}

            {!loading && auditData && selectedStudent && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-end">
                        <SequentialNavigator 
                            currentIndex={currentIndex}
                            total={students.length}
                            onPrev={handlePrev}
                            onNext={handleNext}
                        />
                    </div>
                    <EnrollmentAuditCard enrollment={auditData} />
                </div>
            )}

            {!loading && !auditData && searchTermActive() && (
                 <div className="p-10 border-2 border-dashed border-white/10 rounded-[32px] text-center bg-[#0a0a0a]">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/40">No hay registros en la nueva bóveda para este alumno</p>
                 </div>
            )}
        </div>
    );

    function searchTermActive() {
        // Simple logic for UI state
        return auditData === null && loading === false;
    }
}
