-- Fix encodings in students
UPDATE students SET document_type = REPLACE(document_type, 'C├®dula de Ciudadan├¡a', 'Cédula de Ciudadanía');
UPDATE students SET document_type = REPLACE(document_type, 'C├®dula', 'Cédula');

UPDATE students SET first_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(first_name, '├í', 'á'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├▒', 'ñ'), '├ü', 'Á'), '├ë', 'É'), '├ì', 'Í'), '├ô', 'Ó'), '├Ü', 'Ú'), '├æ', 'Ñ');

UPDATE students SET last_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(last_name, '├í', 'á'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├▒', 'ñ'), '├ü', 'Á'), '├ë', 'É'), '├ì', 'Í'), '├ô', 'Ó'), '├Ü', 'Ú'), '├æ', 'Ñ');

UPDATE dyt_enrollment_programs SET program_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(program_name, '├í', 'á'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├▒', 'ñ'), '├ü', 'Á'), '├ë', 'É'), '├ì', 'Í'), '├ô', 'Ó'), '├Ü', 'Ú'), '├æ', 'Ñ');

UPDATE dyt_program_prices SET program_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(program_name, '├í', 'á'), '├®', 'é'), '├¡', 'í'), '├│', 'ó'), '├║', 'ú'), '├▒', 'ñ'), '├ü', 'Á'), '├ë', 'É'), '├ì', 'Í'), '├ô', 'Ó'), '├Ü', 'Ú'), '├æ', 'Ñ');

-- Storage Bucket & Policy
INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-photos', 'student-photos', true) 
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access for student-photos" ON storage.objects;
    CREATE POLICY "Public Access for student-photos" 
    ON storage.objects FOR SELECT 
    TO public 
    USING (bucket_id = 'student-photos');
END $$;
