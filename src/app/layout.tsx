import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import '@/ui/styles/globals.css';
import { ThemeProvider } from '@/ui/providers/ThemeProvider';
import { Toaster } from 'sonner';

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
        <html lang="es" suppressHydrationWarning>
            <body className={`${inter.className} ${outfit.variable} antialiased bg-background text-foreground transition-colors duration-300`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                    <Toaster position="top-right" richColors closeButton />
                </ThemeProvider>
            </body>
        </html>
    );
}
