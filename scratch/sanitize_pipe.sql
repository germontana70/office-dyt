DO $$ 
BEGIN
    -- Limpieza en Clases Grupales (Nombres, Días y Salones)
    UPDATE dyt_group_classes SET 
        name = REPLACE(REPLACE(REPLACE(REPLACE(name, '|Ô', 'Ó'), '|æ', 'Ñ'), '|Ì', 'Í'), '|Í', 'Á'),
        day_of_week = REPLACE(day_of_week, '|Í', 'Á'); -- Corrige 'Sábado'

    -- Limpieza en Maestros
    UPDATE teachers SET 
        name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, '|æ', 'Ñ'), '|Ì', 'Í'), '|ë', 'Í'), '|í', 'í'), '|Í', 'Á');

    -- Limpieza específica del término 'SALÓN' si está hardcoded en la data
    UPDATE dyt_group_classes SET name = REPLACE(name, 'SAL|ÔN', 'SALÓN');
END $$;
