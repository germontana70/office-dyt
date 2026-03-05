import styles from './page.module.css';

export default function Home() {
    return (
        <div className={styles.container}>
            <header className={`${styles.header} animate-fade-in`}>
                <div className={styles.tag}>PRÓXIMAMENTE</div>
                <h1 className={styles.title}>
                    Office <span className={styles.accent}>DYT</span>
                </h1>
                <p className={styles.subtitle}>
                    EL FUTURO DE DONES Y TALENTOS COMIENZA AQUÍ
                </p>
            </header>

            <section className={`${styles.card} glass animate-fade-in`} style={{ animationDelay: '0.2s' }}>
                <h2 className={styles.cardTitle}>Iniciando Migración</h2>
                <div className={styles.features}>
                    <div className={styles.featureItem}>
                        <span className={styles.dot}></span>
                        <span>Next.js 14+ Architecture</span>
                    </div>
                    <div className={styles.featureItem}>
                        <span className={styles.dot}></span>
                        <span>Supabase Realtime Sync</span>
                    </div>
                    <div className={styles.featureItem}>
                        <span className={styles.dot}></span>
                        <span>Premium UI/UX</span>
                    </div>
                </div>
                <button className={styles.button}>
                    Explorar Ecosistema
                </button>
            </section>

            <footer className={`${styles.footer} animate-fade-in`} style={{ animationDelay: '0.4s' }}>
                &copy; {new Date().getFullYear()} Dones y Talentos | Premium Systems
            </footer>
        </div>
    );
}
