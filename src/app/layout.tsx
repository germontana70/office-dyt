import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import '@/ui/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
    title: 'Office DYT | Dones y Talentos',
    description: 'Sistema administrativo premium para la academia Dones y Talentos.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" className={`${inter.variable} ${outfit.variable}`}>
            <body className="body-style">
                <main className="main-container">
                    {children}
                </main>
            </body>
        </html>
    );
}
