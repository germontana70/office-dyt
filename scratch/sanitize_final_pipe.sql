DO $$ 
BEGIN
    -- 1. Limpieza en la Tabla de Maestros (Teachers)
    UPDATE teachers SET name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 
        '|üs', 'ÁS'), 
        '|ë', 'É'), 
        '|Ì', 'Í'), 
        '|ì', 'í'), 
        '|æ', 'Ñ'),
        '|í', 'í');

    -- 2. Limpieza en la Tabla de Clases Grupales (Nombres y Horarios)
    UPDATE dyt_group_classes SET 
        name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 
            '|Ô', 'Ó'), 
            '|Ì', 'Í'), 
            '|Í', 'Á'), 
            '|í', 'í'),
            '|ë', 'É'),
        day_of_week = REPLACE(day_of_week, '|Í', 'Á');

    -- 3. Limpieza específica de términos 'SALÓN'
    UPDATE dyt_group_classes SET name = REPLACE(name, 'SAL|ÔN', 'SALÓN');
END $$;
