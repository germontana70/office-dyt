'use client';

import { useState, useMemo, useEffect } from 'react';
import { getRawTableData, AllowedTable } from '@/app/actions/db-explorer';
import { ArrowDownAZ, ArrowUpZA, Loader2, AlertTriangle, Table as TableIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TABLES: AllowedTable[] = [
  'students',
  'Tabla_Verdad_Estudiantes',
  'form_responses',
  'dyt_enrollments',
  'dyt_enrollment_programs',
  'dyt_payment_plans',
  'dyt_transactions',
  'dyt_global_settings',
  'dyt_program_prices'
];

type SortConfig = {
  key: string | null;
  direction: 'asc' | 'desc';
};

export function DBExplorerClient() {
  const [selectedTable, setSelectedTable] = useState<AllowedTable>('students');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Pagination
  const [page, setPage] = useState(1);
  const limit = 50;

  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });

  // Column Selector (Pre-Render)
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);

  // Fetch Data
  const fetchData = async (tableName: AllowedTable, targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRawTableData(tableName, targetPage, limit);
      if (!result.success) {
        setError(result.error || 'Error desconocido');
        setData([]);
      } else {
        const rawData = result.data || [];
        setData(rawData);
        setTotalCount(result.totalCount || 0);

        // Analyze columns if first time or table changed
        if (rawData.length > 0) {
          const keys = Object.keys(rawData[0]);
          setAllColumns(keys);
          
          if (tableName !== selectedTable || allColumns.length === 0) {
             if (keys.length > 8) {
                // Select only first 8 columns by default to prevent overflow
                setSelectedColumns(new Set(keys.slice(0, 8)));
                setIsColumnSelectorOpen(true);
             } else {
                setSelectedColumns(new Set(keys));
                setIsColumnSelectorOpen(false);
             }
          }
        } else {
          setAllColumns([]);
          setSelectedColumns(new Set());
          setIsColumnSelectorOpen(false);
        }
      }
    } catch (err: any) {
      setError(`Crash en el cliente: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset page & sort when table changes
    setPage(1);
    setSortConfig({ key: null, direction: 'asc' });
    fetchData(selectedTable, 1);
  }, [selectedTable]);

  // Handle Fetch Pagination
  const handlePageChange = (newPage: number) => {
     setPage(newPage);
     fetchData(selectedTable, newPage);
  }

  // Handle Sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      if (a[sortConfig.key!] < b[sortConfig.key!]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key!] > b[sortConfig.key!]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const handleToggleColumn = (colName: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(colName)) {
      newSelected.delete(colName);
    } else {
      newSelected.add(colName);
    }
    setSelectedColumns(newSelected);
  };

  // Helper to format Cell Data
  const formatCellData = (value: any) => {
    if (value === null || value === undefined) return <span className="text-white/30 italic">NULL</span>;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      
      {/* Target Table Selector (Neon-Glass) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
         <div className="flex items-center gap-3">
             <div className="p-2 rounded-lg bg-primary/20 text-primary">
                 <TableIcon className="w-5 h-5" />
             </div>
             <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1">Tabla a Auditar</label>
                <select 
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value as AllowedTable)}
                    className="bg-transparent text-white font-mono text-lg focus:outline-none focus:ring-0 cursor-pointer"
                >
                    {TABLES.map(t => (
                        <option key={t} value={t} className="bg-black text-white">{t}</option>
                    ))}
                </select>
             </div>
         </div>
         <div className="text-right">
             <div className="text-sm text-white/50 uppercase tracking-widest text-xs">Registros</div>
             <div className="font-mono text-xl">{loading ? '...' : totalCount}</div>
         </div>
      </div>

      {/* Fail-Loud Error Boundary */}
      {error && (
        <div className="p-6 rounded-xl bg-red-950/40 border border-red-500/50 backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-3 text-red-400 mb-2">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
                <h3 className="text-lg font-bold tracking-widest uppercase">¡Excepción Detectada!</h3>
            </div>
            <p className="font-mono text-red-300 break-words text-sm ml-9">{error}</p>
        </div>
      )}

      {/* Conditional Column Selector Panel */}
      {!error && allColumns.length > 8 && (
          <div className="p-4 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
              >
                 <div>
                    <h3 className="text-sm uppercase tracking-widest text-white/70 font-semibold">Selector de Columnas (Pre-Render)</h3>
                    <p className="text-xs text-white/40 mt-1">
                        La grilla contiene {allColumns.length} columnas. Mostrando {selectedColumns.size}.
                    </p>
                 </div>
                 <button className="text-xs px-3 py-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors">
                     {isColumnSelectorOpen ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                 </button>
              </div>
              
              {isColumnSelectorOpen && (
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                     {allColumns.map(col => (
                         <label key={col} className="flex items-center gap-2 cursor-pointer group">
                             <input 
                                type="checkbox" 
                                checked={selectedColumns.has(col)} 
                                onChange={() => handleToggleColumn(col)} 
                                className="hidden"
                             />
                             <div className={cn(
                                 "w-4 h-4 rounded border flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                                 selectedColumns.has(col) ? "bg-primary border-primary" : "border-white/20 bg-white/5 group-hover:border-white/40"
                             )}>
                                 {selectedColumns.has(col) && <div className="w-2 h-2 bg-black rounded-sm" />}
                             </div>
                             <span className={cn(
                                 "text-sm font-mono truncate",
                                 selectedColumns.has(col) ? "text-white" : "text-white/40"
                             )}>{col}</span>
                         </label>
                     ))}
                  </div>
              )}
          </div>
      )}

      {/* Grid-Hack Wrapper for the Data Table */}
      {!error && (
        <div className="grid grid-cols-1">
             <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md overflow-x-auto overflow-y-auto max-h-[600px] shadow-2xl relative">
                  {loading && (
                      <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      </div>
                  )}

                  <table className="w-full text-sm text-left table-auto border-collapse whitespace-nowrap">
                      <thead className="text-xs uppercase bg-[#0a0a0a] text-white/70 sticky top-0 z-10 shadow-md">
                          <tr>
                              <th className="px-3 py-2 border-b border-r border-white/10 w-10 text-center text-white/30">#</th>
                              {allColumns.filter(c => selectedColumns.has(c)).map(col => (
                                  <th 
                                    key={col} 
                                    className="px-3 py-2 border-b border-r border-white/10 cursor-pointer hover:bg-white/5 transition-colors group select-none"
                                    onClick={() => handleSort(col)}
                                  >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono tracking-wider">{col}</span>
                                        <span className="text-primary/50 group-hover:text-primary transition-colors flex-shrink-0">
                                            {sortConfig.key === col ? (
                                                sortConfig.direction === 'asc' ? <ArrowUpZA className="w-3.5 h-3.5" /> : <ArrowDownAZ className="w-3.5 h-3.5" />
                                            ) : (
                                                <div className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50"><ArrowUpZA className="w-3.5 h-3.5" /></div>
                                            )}
                                        </span>
                                      </div>
                                  </th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-xs">
                          {sortedData.length === 0 && !loading ? (
                              <tr>
                                  <td colSpan={selectedColumns.size + 1} className="px-6 py-8 text-center text-white/30 italic">
                                      La tabla está vacía.
                                  </td>
                              </tr>
                          ) : (
                              sortedData.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                                      <td className="px-3 py-2 border-r border-white/10 text-center text-white/30 bg-black/20">
                                          {(page - 1) * limit + idx + 1}
                                      </td>
                                      {allColumns.filter(c => selectedColumns.has(c)).map(col => (
                                          <td key={col} className="px-3 py-2 border-r border-white/10 truncate max-w-[300px]" title={String(row[col])}>
                                              {formatCellData(row[col])}
                                          </td>
                                      ))}
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
             </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!error && totalCount > limit && (
          <div className="flex items-center justify-between border-t border-white/10 pt-4 px-2">
              <div className="text-sm text-white/40">
                  Mostrando {(page - 1) * limit + 1} al Math.min(page * limit, totalCount) de <span className="text-white font-mono">{totalCount}</span>
              </div>
              <div className="flex items-center gap-2">
                  <button 
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
                  >
                      Anterior
                  </button>
                  <span className="text-sm font-mono text-white/70 px-2">
                      {page} / {totalPages}
                  </span>
                  <button 
                      onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
                  >
                      Siguiente
                  </button>
              </div>
          </div>
      )}

    </div>
  );
}
