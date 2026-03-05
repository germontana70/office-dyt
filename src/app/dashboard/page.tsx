import { createClient } from '@/infra/services/server';
import { redirect } from 'next/navigation';
import { dataService } from '@/infra/services/data';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/auth');
    }

    // Obtener datos iniciales para el "Wow Factor" en el Dashboard
    let studentCount = 0;
    let teacherCount = 0;
    let userRole = 'Invitado';

    try {
        const [students, teachers, profile] = await Promise.all([
            dataService.getStudents(),
            dataService.getTeachers(),
            dataService.getProfile(user.id).catch(() => null)
        ]);

        studentCount = students.length;
        teacherCount = teachers.length;
        userRole = profile?.role || 'Personal';
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', marginInline: 'auto' }} className="animate-fade-in">
            {/* Cabecera Premium */}
            <div style={{ marginBottom: '4rem', textAlign: 'center' }}>
                <h1 className="accent" style={{ fontSize: '3.5rem', fontFamily: 'var(--font-outfit)', background: 'linear-gradient(135deg, #fff 0%, hsl(var(--primary)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Dashboard <span style={{ color: 'white', WebkitTextFillColor: 'white' }}>DYT</span>
                </h1>
                <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.5rem', letterSpacing: '0.1rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    SISTEMA ADMINISTRATIVO PREMIUM | {userRole}
                </p>
            </div>

            {/* Grid de Estadísticas con Glassmorphism */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
                <div className="glass" style={{ padding: '2.5rem', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', marginBottom: '1rem', letterSpacing: '0.1rem' }}>ESTUDIANTES ACTIVOS</h3>
                    <p style={{ fontSize: '4rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', background: 'linear-gradient(135deg, #fff, hsl(var(--primary)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {studentCount}
                    </p>
                    <div style={{ height: '2px', width: '40px', background: 'hsl(var(--primary))', margin: '1.5rem auto 0', borderRadius: '4px' }} />
                </div>

                <div className="glass" style={{ padding: '2.5rem', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', marginBottom: '1rem', letterSpacing: '0.1rem' }}>DOCENTES ASIGNADOS</h3>
                    <p style={{ fontSize: '4rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', background: 'linear-gradient(135deg, #fff, hsl(var(--secondary)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {teacherCount}
                    </p>
                    <div style={{ height: '2px', width: '40px', background: 'hsl(var(--secondary))', margin: '1.5rem auto 0', borderRadius: '4px' }} />
                </div>
            </div>

            {/* Acciones Rápidas */}
            <div style={{ marginTop: '4rem', display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                <a href="/dashboard/payments" className="glass shimmer" style={{
                    padding: '1.5rem 3rem',
                    borderRadius: '16px',
                    textDecoration: 'none',
                    color: 'white',
                    fontWeight: 700,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer'
                }}>
                    <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-outfit)', letterSpacing: '0.05rem' }}>LIQUIDACIÓN PAGOS</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5, letterSpacing: '0.1rem', textTransform: 'uppercase' }}>Periodo Actual</span>
                </a>
            </div>

            {/* Próximos Módulos */}
            <div className="glass" style={{ marginTop: '4rem', padding: '2.5rem', border: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', letterSpacing: '0.05rem' }}>
                    SISTEMA DE GESTIÓN ACADÉMICA | CONECTADO COMO {user.email}
                </p>
            </div>
        </div>
    );
}
