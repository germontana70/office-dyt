import { DBExplorerClient } from "./DBExplorerClient";

export const metadata = {
    title: "Panóptico Global BD | Auditoría",
    description: "Visor de datos crudos (RAW) de la base de datos de Office DYT",
};

export default function DBExplorerPage() {
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-black tracking-widest uppercase text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    Panóptico Global de Base de Datos
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    Explorador de solo lectura (RAW Data) para auditoría de tablas y diagnóstico de integridad.
                </p>
            </header>
            
            <DBExplorerClient />
        </div>
    );
}
