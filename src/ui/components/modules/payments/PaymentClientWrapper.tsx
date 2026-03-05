'use client';

import { useState } from 'react';
import { TeacherPaymentInfo } from '@/infra/services/payments';
import { reportService } from '@/infra/services/reports';

interface Props {
    initialPayments: TeacherPaymentInfo[];
    startDate: string;
    endDate: string;
}

export default function PaymentClientWrapper({ initialPayments, startDate, endDate }: Props) {
    const [payments, setPayments] = useState(initialPayments);
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherPaymentInfo | null>(null);

    const handleRateChange = (idx: number, newRate: number) => {
        const updated = [...payments];
        updated[idx].hourlyRate = newRate;
        updated[idx].totalPayment = updated[idx].totalHours * newRate;
        setPayments(updated);
    };

    return (
        <div className="animate-fade-in">
            {/* Header con Filtros (Visual por ahora) */}
            <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="accent" style={{ fontSize: '2.5rem', fontFamily: 'var(--font-outfit)', background: 'linear-gradient(135deg, #fff 0%, hsl(var(--secondary)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Liquidación <span style={{ color: 'white', WebkitTextFillColor: 'white' }}>Docentes</span>
                    </h1>
                    <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.5rem', letterSpacing: '0.1rem', fontWeight: 600 }}>
                        PERIODO: {startDate} — {endDate}
                    </p>
                </div>

                <button className="glass" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                    FILTRAR FECHAS
                </button>
            </div>

            {/* Listado Principal */}
            <div className="glass" style={{ border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '24px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1rem' }}>
                        <tr>
                            <th style={{ padding: '1.5rem 2rem' }}>PROFESOR</th>
                            <th style={{ padding: '1.5rem' }}>HORAS</th>
                            <th style={{ padding: '1.5rem' }}>TARIFA / H</th>
                            <th style={{ padding: '1.5rem' }}>VALOR TOTAL (COP)</th>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.95rem' }}>
                        {payments.map((p, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.2s ease' }} className="row-hover">
                                <td style={{ padding: '1.5rem 2rem', fontWeight: 600 }}>{p.teacherName}</td>
                                <td style={{ padding: '1.5rem' }}>{p.totalHours} h</td>
                                <td style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        $
                                        <input
                                            type="number"
                                            value={p.hourlyRate}
                                            onChange={(e) => handleRateChange(idx, Number(e.target.value))}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: 'white',
                                                padding: '0.4rem',
                                                borderRadius: '8px',
                                                width: '100px',
                                                fontFamily: 'inherit',
                                                fontSize: 'inherit'
                                            }}
                                        />
                                    </div>
                                </td>
                                <td style={{ padding: '1.5rem', fontWeight: 700, color: 'hsl(var(--secondary))' }}>
                                    $ {p.totalPayment.toLocaleString()}
                                </td>
                                <td style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>
                                    <button
                                        onClick={() => setSelectedTeacher(p)}
                                        style={{ background: 'none', border: 'none', color: 'white', opacity: 0.6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'underline' }}>
                                        Ver Detalle
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Detalle (Glassmorphism Modal) */}
            {selectedTeacher && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div className="glass" style={{ maxWidth: '800px', width: '100%', maxHeight: '80vh', overflowY: 'auto', background: 'rgba(20, 20, 20, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '32px', padding: '3rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-outfit)' }}>{selectedTeacher.teacherName}</h2>
                                <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>Detalle de clases capturadas</p>
                                <button
                                    onClick={() => reportService.generateTeacherPDF(selectedTeacher, startDate, endDate)}
                                    className="btn-premium"
                                    style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', fontSize: '0.8rem' }}
                                >
                                    DESCARGAR REPORTE PDF
                                </button>
                            </div>
                            <button onClick={() => setSelectedTeacher(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '12px', cursor: 'pointer' }}>CERRAR</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                                <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>HORAS TOTALES</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedTeacher.totalHours} h</p>
                            </div>
                            <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                                <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>A PAGAR</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--secondary))' }}>$ {selectedTeacher.totalPayment.toLocaleString()}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {selectedTeacher.sessions.map((s, i) => (
                                <div key={i} style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.program_name}</p>
                                        <p style={{ fontSize: '0.75rem', opacity: 0.4 }}>{new Date(s.event_date).toLocaleDateString()} — {s.status}</p>
                                    </div>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.status === 'scheduled' ? 'hsl(var(--secondary))' : 'rgba(255,255,255,0.1)' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
