DO $$ 
DECLARE
    t_row RECORD;
BEGIN
    -- 1. Limpieza Maestra en Profesores
    UPDATE teachers SET name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 
        '├í', 'á'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├ö', 'Ó'), '├æ', 'Ñ');
    
    -- 2. Limpieza Maestra en Clases Grupales
    UPDATE dyt_group_classes SET name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 
        '├í', 'á'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├ö', 'Ó'), '├æ', 'Ñ');

    -- 3. Limpieza de Horarios y Salones
    UPDATE dyt_group_classes SET day_of_week = REPLACE(REPLACE(day_of_week, 'S├¡bado', 'Sábado'), 'Mi├®rcoles', 'Miércoles');
    
    -- 4. Caso específico SALÓN
    UPDATE dyt_group_classes SET name = REPLACE(name, 'SAL├öN', 'SALÓN');
END $$;
