
-- Fallback SQL: Asignar precio temporal al mayor huérfano
UPDATE dyt_enrollment_programs 
SET agreed_price = 1884000 -- Precio de referencia (ajustar si es necesario)
WHERE agreed_price = 0 
  AND program_name = 'DANZAS 02';
     