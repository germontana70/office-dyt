


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."auto_create_student_from_form"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    _existing_student uuid;
    _raw jsonb;
    _birth_date date;
    _age int;
    _normalized_doc text;
BEGIN
    -- Only process if not already synced
    IF NEW.synced_to_students = true THEN
        RETURN NEW;
    END IF;

    -- Normalize document number: remove dots, spaces, dashes
    _normalized_doc := regexp_replace(COALESCE(NEW.document_number, ''), '[.\s\-]', '', 'g');

    -- Check if student already exists by normalized document_number in same semester
    SELECT id INTO _existing_student
    FROM public.students
    WHERE regexp_replace(COALESCE(document_number, ''), '[.\s\-]', '', 'g') = _normalized_doc
      AND semester = NEW.semester
      AND is_active = true
    LIMIT 1;

    -- If student already exists, mark form_response as synced and return
    IF _existing_student IS NOT NULL THEN
        UPDATE public.form_responses 
        SET synced_to_students = true, synced_at = now()
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    -- Also check by email as fallback  
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
        SELECT id INTO _existing_student
        FROM public.students
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
          AND semester = NEW.semester
          AND is_active = true
        LIMIT 1;
        
        IF _existing_student IS NOT NULL THEN
            UPDATE public.form_responses 
            SET synced_to_students = true, synced_at = now()
            WHERE id = NEW.id;
            RETURN NEW;
        END IF;
    END IF;

    -- Extract data from raw_data JSONB
    _raw := COALESCE(NEW.raw_data, '{}'::jsonb);
    
    -- Parse birth_date from raw_data
    BEGIN
        _birth_date := to_date(
            _raw->>'Fecha de nacimiento', 
            'DD/MM/YYYY'
        );
    EXCEPTION WHEN OTHERS THEN
        _birth_date := NEW.birth_date;
    END;
    
    -- Parse age
    BEGIN
        _age := (_raw->>'Edad')::int;
    EXCEPTION WHEN OTHERS THEN
        _age := NEW.age;
    END;

    -- Create the student record (now form_response exists, FK will work)
    INSERT INTO public.students (
        semester,
        form_response_id,
        first_name,
        last_name,
        document_type,
        document_number,
        document_expedition_place,
        gender,
        birth_date,
        age,
        phone,
        address,
        neighborhood,
        email,
        current_grade,
        current_school,
        blood_type,
        rh_factor,
        health_insurance,
        father_info,
        mother_info,
        guardian_info_detailed,
        programs,
        is_active,
        enrollment_date,
        created_at,
        updated_at
    ) VALUES (
        NEW.semester,
        NEW.id,
        UPPER(TRIM(NEW.first_name)),
        UPPER(TRIM(NEW.last_name)),
        COALESCE(NEW.document_type, _raw->>'Tipo de documento de identificaci├│n'),
        _normalized_doc,
        COALESCE(NEW.document_expedition_place, _raw->>'Lugar de Expedici├│n del documento'),
        COALESCE(NEW.gender, _raw->>'G├®nero'),
        _birth_date,
        _age,
        COALESCE(NEW.phone, _raw->>'N├║mero de Celular (Estudiante)', _raw->>'Tel├®fono de contacto'),
        COALESCE(NEW.address, _raw->>'Direcci├│n de su residencia'),
        COALESCE(NEW.neighborhood, _raw->>'Barrio'),
        NEW.email,
        COALESCE(NEW.current_grade, _raw->>'Grado escolar actual'),
        COALESCE(NEW.current_school, _raw->>'Nombre de la Instituci├│n educativa actual.'),
        COALESCE(NEW.blood_type, _raw->>'Grupo Sangu├¡neo'),
        COALESCE(NEW.rh_factor, _raw->>'FACTOR RH'),
        COALESCE(NEW.health_insurance, _raw->>'Nombre de la EPS o Medicina Prepagada'),
        jsonb_build_object(
            'full_name', COALESCE(_raw->>'Nombre completo del padre', ''),
            'mobile', COALESCE(_raw->>'Celular del Pap├í', ''),
            'email', COALESCE(_raw->>'Email del pap├í', ''),
            'document_type', COALESCE(_raw->>'Tipo de Documento Padre', ''),
            'document_number', COALESCE(_raw->>'N├║mero de Documento del Pap├í', '')
        ),
        jsonb_build_object(
            'full_name', COALESCE(_raw->>'Nombre completo de la mam├í', ''),
            'mobile', COALESCE(_raw->>'Celular de la mam├í', ''),
            'email', COALESCE(_raw->>'Email de la mam├í', ''),
            'document_type', COALESCE(_raw->>'Tipo de Documento Madre', ''),
            'document_number', COALESCE(_raw->>'N├║mero de Documento de la Mam├í', '')
        ),
        jsonb_build_object(
            'full_name', COALESCE(_raw->>'Nombre completo del acudiente', ''),
            'phone', COALESCE(_raw->>'Tel├®fono del acudiente', ''),
            'email', COALESCE(_raw->>'Email del acudiente', '')
        ),
        CASE 
            WHEN _raw->>'Programa o Curso' IS NOT NULL THEN
                jsonb_build_array(jsonb_build_object(
                    'name', _raw->>'Programa o Curso',
                    'instrument', COALESCE(_raw->>'Instrumento', ''),
                    'preferred_day', COALESCE(_raw->>'D├¡a que prefiere para sus clases', ''),
                    'preferred_time', COALESCE(_raw->>'Franja horaria preferida', '')
                ))
            ELSE '[]'::jsonb
        END,
        true,
        CURRENT_DATE,
        now(),
        now()
    );

    -- Mark form_response as synced
    UPDATE public.form_responses 
    SET synced_to_students = true, synced_at = now()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_create_student_from_form"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_create_student_from_form"() IS 'Automatically creates a student record when a new form_response is inserted. 
Prevents duplicates by checking document_number + semester. 
Extracts family info from raw_data JSONB field.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_group_events_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_group_events_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_semester_config_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_semester_config_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Produccion-Backup-23012026" (
    "id" "uuid",
    "semester" "text",
    "form_response_id" "uuid",
    "first_name" "text",
    "last_name" "text",
    "document_type" "text",
    "document_number" "text",
    "document_expedition_place" "text",
    "gender" "text",
    "birth_date" "date",
    "age" integer,
    "phone" "text",
    "address" "text",
    "neighborhood" "text",
    "email" "text",
    "current_grade" "text",
    "current_school" "text",
    "blood_type" "text",
    "rh_factor" "text",
    "health_insurance" "text",
    "parent_names" "text",
    "parent_phones" "text",
    "parent_emails" "text",
    "guardian_info" "text",
    "photo_url" "text",
    "programs" "jsonb",
    "payments" "jsonb",
    "registration_fee" numeric(10,2),
    "monthly_payment" numeric(10,2),
    "discount_percentage" numeric(5,2),
    "total_discount" numeric(10,2),
    "installments" "jsonb",
    "is_active" boolean,
    "enrollment_date" "date",
    "last_payment_date" "date",
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "father_info" "jsonb",
    "mother_info" "jsonb",
    "guardian_info_detailed" "jsonb",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "emergency_contact_relationship" "text",
    "medications" "text",
    "allergies" "text",
    "special_conditions" "text"
);


ALTER TABLE "public"."Produccion-Backup-23012026" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Tabla_Verdad_Estudiantes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "_origin_sheet" "text" NOT NULL,
    "_row_index" integer,
    "_imported_at" timestamp with time zone DEFAULT "now"(),
    "marca_temporal" "text",
    "categoria_del_estudiante" "text",
    "nombres_del_estudiante" "text",
    "apellidos_del_estudiante" "text",
    "tipo_de_documento_de_identificacion" "text",
    "numero_de_identificacion" "text",
    "lugar_de_expedicion_del_documento" "text",
    "genero" "text",
    "fecha_de_nacimiento" "text",
    "edad" "text",
    "telefono_de_contacto" "text",
    "direccion_de_su_residencia" "text",
    "barrio" "text",
    "email" "text",
    "grado_escolar_actual" "text",
    "nombre_de_la_institucion_educativa_actual" "text",
    "grupo_sanguineo" "text",
    "factor_rh" "text",
    "nombre_de_la_eps_o_medicina_prepagada" "text",
    "programas_de_iniciacion_musical" "text",
    "programa_o_curso" "text",
    "programa_que_va_a_estudiar_ahora" "text",
    "sede_donde_tomara_las_clases" "text",
    "dia_que_prefiere_para_sus_clases_los_lunes_la_escuela_no_opera" "text",
    "franja_horaria_preferida" "text",
    "horario_sugerido" "text",
    "nombre_completo_del_padre" "text",
    "telefono_fijo_del_papa" "text",
    "celular_del_papa" "text",
    "email_del_papa" "text",
    "tipo_de_documento" "text",
    "numero_de_documento_del_papa" "text",
    "nombre_completo_de_la_mama" "text",
    "telefono_fijo_de_la_mama" "text",
    "celular_de_la_mama" "text",
    "email_de_la_mama" "text",
    "tipo_de_documento_2" "text",
    "numero_de_documento_de_la_mama" "text",
    "nombre_completo_del_acudiente" "text",
    "telefono_del_acudiente" "text",
    "direccion_del_acudiente" "text",
    "email_del_acudiente" "text",
    "tipo_de_documento_del_acudiente" "text",
    "numero_de_documento_del_acudiente" "text",
    "programa" "text",
    "valor_matricula" "text",
    "forma_de_pago" "text",
    "inscripcion" "text",
    "notas_financieras" "text",
    "foto" "text",
    "valor_camiseta" "text",
    "docente_asignado" "text",
    "talla_camiseta" "text",
    "dia_de_clase_3" "text",
    "horario_2" "text",
    "horario_3" "text",
    "dia_de_clase" "text",
    "dia_de_clase_2" "text",
    "observaciones_del_programa" "text",
    "horario" "text",
    "fecha_inicio_p5" "text",
    "observaciones_del_programa_p8" "text",
    "fecha_inicio" "text",
    "dia_de_clase_2_p2" "text",
    "dia_de_clase_3_p4" "text",
    "horario_3_p2" "text",
    "horario_2_p6" "text",
    "observaciones_del_programa_p6" "text",
    "horario_2_p7" "text",
    "horario_p8" "text",
    "docente_asignado_p2" "text",
    "docente_asignado_p8" "text",
    "dia_de_clase_2_p7" "text",
    "dia_de_clase_p4" "text",
    "dia_de_clase_3_p6" "text",
    "dia_de_clase_p5" "text",
    "dia_de_clase_2_p4" "text",
    "dia_de_clase_3_p3" "text",
    "horario_2_p8" "text",
    "docente_asignado_p7" "text",
    "dia_de_clase_p3" "text",
    "horario_3_p7" "text",
    "docente_asignado_p3" "text",
    "forma_de_pago_p4" "text",
    "fecha_inicio_p7" "text",
    "fecha_inicio_p4" "text",
    "horario_p2" "text",
    "observaciones_del_programa_p3" "text",
    "forma_de_pago_p7" "text",
    "fecha_inicio_p6" "text",
    "programa_p4" "text",
    "valor_matricula_p5" "text",
    "horario_3_p3" "text",
    "horario_p7" "text",
    "dia_de_clase_p8" "text",
    "horario_2_p3" "text",
    "forma_de_pago_p8" "text",
    "fecha_inicio_p8" "text",
    "docente_asignado_p6" "text",
    "horario_p4" "text",
    "dia_de_clase_2_p6" "text",
    "docente_asignado_p5" "text",
    "programa_p7" "text",
    "horario_3_p6" "text",
    "horario_2_p4" "text",
    "dia_de_clase_3_p5" "text",
    "valor_matricula_p3" "text",
    "horario_p3" "text",
    "fecha_inicio_p3" "text",
    "valor_matricula_p7" "text",
    "programa_p5" "text",
    "horario_p6" "text",
    "programa_p8" "text",
    "horario_3_p5" "text",
    "dia_de_clase_3_p8" "text",
    "valor_matricula_p6" "text",
    "programa_p6" "text",
    "valor_matricula_p4" "text",
    "observaciones_del_programa_p7" "text",
    "forma_de_pago_p5" "text",
    "horario_3_p8" "text",
    "dia_de_clase_2_p3" "text",
    "observaciones_del_programa_p2" "text",
    "horario_p5" "text",
    "dia_de_clase_3_p7" "text",
    "valor_matricula_p2" "text",
    "dia_de_clase_p6" "text",
    "programa_p2" "text",
    "forma_de_pago_p2" "text",
    "horario_2_p5" "text",
    "dia_de_clase_2_p5" "text",
    "horario_2_p2" "text",
    "docente_asignado_p4" "text",
    "dia_de_clase_p7" "text",
    "observaciones_del_programa_p4" "text",
    "forma_de_pago_p3" "text",
    "fecha_inicio_p2" "text",
    "horario_3_p4" "text",
    "valor_matricula_p8" "text",
    "programa_p3" "text",
    "dia_de_clase_2_p8" "text",
    "dia_de_clase_p2" "text",
    "dia_de_clase_3_p2" "text",
    "forma_de_pago_p6" "text",
    "observaciones_del_programa_p5" "text",
    "ultima_actualizacion" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."Tabla_Verdad_Estudiantes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_email" "text" NOT NULL,
    "action" "text" NOT NULL,
    "details" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" bigint,
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "feedback" "text",
    "grade" numeric(5,2),
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "assignments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'approved'::"text"])))
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid",
    "program_name" "text" NOT NULL,
    "class_number" integer,
    "teacher_name" "text",
    "google_event_id" "text" NOT NULL,
    "google_calendar_id" "text" NOT NULL,
    "event_link" "text",
    "meet_link" "text",
    "has_meet" boolean DEFAULT false,
    "event_date" timestamp with time zone NOT NULL,
    "event_end_time" timestamp with time zone NOT NULL,
    "day_of_week" "text",
    "status" "text" DEFAULT 'scheduled'::"text",
    "student_email_sent" boolean DEFAULT false,
    "student_confirmed" boolean DEFAULT false,
    "notes" "text",
    "welcome_message_included" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "semester" "text" NOT NULL
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_events" IS 'Tracks all class events synchronized with Google Calendar, including Meet links and student confirmations';



CREATE TABLE IF NOT EXISTS "public"."class_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "teacher_email" "text" NOT NULL,
    "student_name" "text" NOT NULL,
    "program_name" "text" NOT NULL,
    "class_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "attendance_status" "text",
    "topic" "text",
    "observations" "text",
    "calendar_event_id" "uuid",
    "methodology" "text",
    "shared_resources" "text",
    "homework" "text",
    "class_number" integer,
    CONSTRAINT "class_logs_attendance_status_check" CHECK (("attendance_status" = ANY (ARRAY['Asistio'::"text", 'Excusa'::"text", 'Falla'::"text", 'No Programada'::"text", 'Falla Docente'::"text"])))
);


ALTER TABLE "public"."class_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "class_log_id" "uuid",
    "drive_file_id" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "mime_type" "text",
    "file_size" bigint,
    "view_link" "text",
    "download_link" "text",
    "uploaded_by" "text"
);


ALTER TABLE "public"."class_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2),
    "schedule" "jsonb",
    "sync_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dyt_enrollment_programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "program_name" "text" NOT NULL,
    "instrument_id" "uuid",
    "teacher_id" "uuid",
    "number_of_classes" integer DEFAULT 0,
    "agreed_price" numeric(15,2) DEFAULT 0,
    "day_1" "text",
    "time_1" "text",
    "day_2" "text",
    "time_2" "text",
    "day_3" "text",
    "time_3" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "group_class_id" "uuid",
    "room_1" "text",
    "duration_1" "text",
    "room_2" "text",
    "duration_2" "text",
    "room_3" "text",
    "duration_3" "text"
);


ALTER TABLE "public"."dyt_enrollment_programs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."dyt_enrollment_programs"."group_class_id" IS 'Reference to an existing group class in group_classes table';



CREATE TABLE IF NOT EXISTS "public"."dyt_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "semester" "text" NOT NULL,
    "enrollment_fee_enabled" boolean DEFAULT true,
    "enrollment_fee_value" numeric(15,2) DEFAULT 0,
    "tshirt_quantity" integer DEFAULT 0,
    "tshirt_size" "text",
    "tshirt_unit_price" numeric(15,2) DEFAULT 0,
    "global_observations" "text",
    "total_calculated" numeric(15,2) DEFAULT 0,
    "status" "text" DEFAULT 'Activa'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "program_name" "text"
);


ALTER TABLE "public"."dyt_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dyt_global_settings" (
    "semester" "text" NOT NULL,
    "enrollment_fee" numeric DEFAULT 0 NOT NULL,
    "tshirt_fee" numeric DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dyt_global_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dyt_group_classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "semester" "text" NOT NULL,
    "name" "text" NOT NULL,
    "teacher_id" "uuid",
    "room" "text",
    "day_of_week" "text",
    "start_time" "text",
    "duration_minutes" integer
);


ALTER TABLE "public"."dyt_group_classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dyt_group_program_names" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "semester" "text" NOT NULL
);


ALTER TABLE "public"."dyt_group_program_names" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dyt_instruments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dyt_instruments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dyt_payment_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "payment_type" "text",
    "total_to_pay" numeric(15,2) DEFAULT 0,
    "number_of_installments" integer DEFAULT 1,
    "start_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "base_amount" numeric DEFAULT 0,
    "enrollment_fee" numeric DEFAULT 0,
    "uniform_fee" numeric DEFAULT 0,
    "total_amount" numeric DEFAULT 0,
    "plan_type" "text" DEFAULT 'cuotas'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "needs_audit" boolean DEFAULT false,
    "installments_details" "jsonb" DEFAULT '[]'::"jsonb",
    "discount_percentage" numeric DEFAULT 0,
    CONSTRAINT "dyt_payment_plans_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['Contado'::"text", 'Financiado'::"text"])))
);


ALTER TABLE "public"."dyt_payment_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dyt_program_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_name" "text" NOT NULL,
    "semester" "text" NOT NULL,
    "cash_price" numeric NOT NULL,
    "increment_percentage" numeric DEFAULT 0,
    "installments" "jsonb" DEFAULT '{"count": 1, "amount": 0}'::"jsonb",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "total_classes" integer DEFAULT 16
);


ALTER TABLE "public"."dyt_program_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dyt_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "payment_date" "date" DEFAULT CURRENT_DATE,
    "amount_paid" numeric(15,2) NOT NULL,
    "payment_method" "text",
    "bank_entity" "text",
    "reference_number" "text",
    "concept" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dyt_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_tracking" (
    "id" bigint NOT NULL,
    "student_id" bigint,
    "total_tuition" numeric(10,2) DEFAULT 0,
    "payment_method" "text",
    "registration_amount" numeric(10,2) DEFAULT 0,
    "registration_paid" boolean DEFAULT false,
    "tshirt_amount" numeric(10,2) DEFAULT 0,
    "tshirt_paid" boolean DEFAULT false,
    "tshirt_size" "text",
    "installment_1_amount" numeric(10,2) DEFAULT 0,
    "installment_1_paid" boolean DEFAULT false,
    "installment_1_due" "date",
    "installment_2_amount" numeric(10,2) DEFAULT 0,
    "installment_2_paid" boolean DEFAULT false,
    "installment_2_due" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "programs" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."financial_tracking" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."financial_tracking_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."financial_tracking_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."financial_tracking_id_seq" OWNED BY "public"."financial_tracking"."id";



CREATE TABLE IF NOT EXISTS "public"."form_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "semester" "text" NOT NULL,
    "timestamp" timestamp without time zone,
    "student_category" "text",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "document_type" "text",
    "document_number" "text" NOT NULL,
    "document_expedition_place" "text",
    "gender" "text",
    "birth_date" "date",
    "age" integer,
    "phone" "text",
    "address" "text",
    "neighborhood" "text",
    "email" "text" NOT NULL,
    "current_grade" "text",
    "current_school" "text",
    "blood_type" "text",
    "rh_factor" "text",
    "health_insurance" "text",
    "music_initiation_programs" "text",
    "program_or_course" "text",
    "program_to_study_now" "text",
    "campus" "text",
    "preferred_day" "text",
    "preferred_time_slot" "text",
    "suggested_schedule" "text",
    "father_full_name" "text",
    "father_landline" "text",
    "father_mobile" "text",
    "father_email" "text",
    "father_document_type" "text",
    "father_document_number" "text",
    "mother_full_name" "text",
    "mother_landline" "text",
    "mother_mobile" "text",
    "mother_email" "text",
    "mother_document_type" "text",
    "mother_document_number" "text",
    "guardian_full_name" "text",
    "guardian_phone" "text",
    "guardian_address" "text",
    "guardian_email" "text",
    "guardian_document_type" "text",
    "guardian_document_number" "text",
    "row_hash" "text",
    "synced_to_students" boolean DEFAULT false,
    "synced_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "raw_data" "jsonb"
);


ALTER TABLE "public"."form_responses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."form_responses"."raw_data" IS 'Complete raw JSON data from Google Form - Allows flexible schema evolution';



CREATE TABLE IF NOT EXISTS "public"."global_configurations" (
    "id" bigint NOT NULL,
    "config_key" "text" NOT NULL,
    "config_value" "text",
    "data_type" "text" DEFAULT 'string'::"text",
    "description" "text",
    "category" "text",
    "is_sensitive" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sheets_row_id" integer,
    "last_synced_at" timestamp with time zone
);


ALTER TABLE "public"."global_configurations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."global_configurations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."global_configurations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."global_configurations_id_seq" OWNED BY "public"."global_configurations"."id";



CREATE TABLE IF NOT EXISTS "public"."group_calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "event_date" timestamp with time zone NOT NULL,
    "event_end_time" timestamp with time zone NOT NULL,
    "day_of_week" "text",
    "google_event_id" "text",
    "google_calendar_id" "text",
    "event_link" "text",
    "meet_link" "text",
    "status" "text" DEFAULT 'scheduled'::"text",
    "notes" "text",
    "semester" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."group_calendar_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "group_code" "text",
    "teacher_id" "uuid",
    "teacher_name" "text",
    "schedule_day" "text" NOT NULL,
    "schedule_time" "text" NOT NULL,
    "duration_minutes" integer DEFAULT 60,
    "classroom" "text",
    "start_date" "date",
    "end_date" "date",
    "semester" "text" DEFAULT '2026-1'::"text",
    "calendar_series_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."group_classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "student_id" "uuid" NOT NULL,
    "student_name" "text",
    "student_email" "text",
    "enrolled_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."group_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historical_records" (
    "id" bigint NOT NULL,
    "semester" "text" NOT NULL,
    "year" integer NOT NULL,
    "period" integer NOT NULL,
    "student_document" "text",
    "student_name" "text",
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."historical_records" OWNER TO "postgres";


ALTER TABLE "public"."historical_records" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."historical_records_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."historical_students" (
    "id" bigint NOT NULL,
    "semester" "text" NOT NULL,
    "academic_year" integer,
    "semester_period" integer,
    "student_code" "text",
    "student_id_number" "text",
    "student_name" "text",
    "student_lastname" "text",
    "document_type" "text",
    "document_number" "text",
    "gender" "text",
    "birth_date" "date",
    "age" integer,
    "phone" "text",
    "address" "text",
    "neighborhood" "text",
    "guardian_name" "text",
    "guardian_phone" "text",
    "guardian_email" "text",
    "enrolled" boolean DEFAULT false,
    "enrollment_date" "date",
    "category" "text",
    "programs" "jsonb" DEFAULT '[]'::"jsonb",
    "financial_data" "jsonb" DEFAULT '{}'::"jsonb",
    "raw_data" "jsonb",
    "imported_at" timestamp with time zone DEFAULT "now"(),
    "source_file" "text"
);


ALTER TABLE "public"."historical_students" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."historical_students_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."historical_students_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."historical_students_id_seq" OWNED BY "public"."historical_students"."id";



CREATE TABLE IF NOT EXISTS "public"."materials" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" bigint,
    "title" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_configurations" (
    "id" bigint NOT NULL,
    "academic_year" "text" NOT NULL,
    "program_name" "text" NOT NULL,
    "cash_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "installment_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "num_installments" integer DEFAULT 2,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sheets_row_id" integer,
    "last_synced_at" timestamp with time zone
);


ALTER TABLE "public"."price_configurations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."price_configurations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."price_configurations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."price_configurations_id_seq" OWNED BY "public"."price_configurations"."id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "website" "text",
    "role" "text" DEFAULT 'estudiante'::"text",
    "instrument" "text",
    "phone" "text",
    "phone_alt" "text",
    "address" "text",
    "id_number" "text",
    "birth_date" "date",
    "nequi" "text",
    "daviplata" "text",
    "bank_1_name" "text",
    "bank_1_account_type" "text",
    "bank_1_account_number" "text",
    "bank_1_account_holder" "text",
    "bank_1_holder_id" "text",
    "bank_2_name" "text",
    "bank_2_account_type" "text",
    "bank_2_account_number" "text",
    "bank_2_account_holder" "text",
    "bank_2_holder_id" "text",
    "notes" "text",
    "email" "text",
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "semester" "text" NOT NULL,
    "year" integer NOT NULL,
    "program_name" "text" NOT NULL,
    "cash_price" integer NOT NULL,
    "installments" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "increment_percentage" numeric(5,2) DEFAULT 5.0,
    "total_financed" numeric DEFAULT 0
);


ALTER TABLE "public"."program_prices" OWNER TO "postgres";


COMMENT ON TABLE "public"."program_prices" IS 'Program pricing by semester with auto-calculated installments';



COMMENT ON COLUMN "public"."program_prices"."installments" IS 'Auto-calculated installment prices in JSONB format';



CREATE TABLE IF NOT EXISTS "public"."semester_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "semester" "text" NOT NULL,
    "installment_percentage" numeric(5,2) DEFAULT 5.40,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."semester_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."semester_config" IS 'Global configuration per semester (installment %, etc.)';



COMMENT ON COLUMN "public"."semester_config"."installment_percentage" IS 'Percentage increment applied to cash price for installment calculation';



CREATE TABLE IF NOT EXISTS "public"."semesters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "is_active" boolean DEFAULT false,
    "sheet_id" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "sheet_url" "text"
);


ALTER TABLE "public"."semesters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "semester" "text" NOT NULL,
    "form_response_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "document_type" "text",
    "document_number" "text" NOT NULL,
    "document_expedition_place" "text",
    "gender" "text",
    "birth_date" "date",
    "age" integer,
    "phone" "text",
    "address" "text",
    "neighborhood" "text",
    "email" "text",
    "current_grade" "text",
    "current_school" "text",
    "blood_type" "text",
    "rh_factor" "text",
    "health_insurance" "text",
    "parent_names" "text",
    "parent_phones" "text",
    "parent_emails" "text",
    "guardian_info" "text",
    "photo_url" "text",
    "programs" "jsonb" DEFAULT '[]'::"jsonb",
    "payments" "jsonb" DEFAULT '[]'::"jsonb",
    "registration_fee" numeric(10,2) DEFAULT 0,
    "monthly_payment" numeric(10,2) DEFAULT 0,
    "discount_percentage" numeric(5,2) DEFAULT 0,
    "total_discount" numeric(10,2) DEFAULT 0,
    "installments" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "enrollment_date" "date" DEFAULT CURRENT_DATE,
    "last_payment_date" "date",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "father_info" "jsonb" DEFAULT '{}'::"jsonb",
    "mother_info" "jsonb" DEFAULT '{}'::"jsonb",
    "guardian_info_detailed" "jsonb" DEFAULT '{}'::"jsonb",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "emergency_contact_relationship" "text",
    "medications" "text",
    "allergies" "text",
    "special_conditions" "text",
    "contract_number" "text",
    "financial_notes" "text" DEFAULT ''::"text",
    "inscription_value" integer DEFAULT 0,
    "shirt_value" integer DEFAULT 0,
    "shirt_size" "text" DEFAULT ''::"text",
    "medical_info" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."students" OWNER TO "postgres";


COMMENT ON COLUMN "public"."students"."father_info" IS 'Informaci├│n del padre en formato JSONB: {full_name, landline, mobile, email, document_type, document_number, phone}';



COMMENT ON COLUMN "public"."students"."mother_info" IS 'Informaci├│n de la madre en formato JSONB: {full_name, landline, mobile, email, document_type, document_number, phone}';



COMMENT ON COLUMN "public"."students"."guardian_info_detailed" IS 'Informaci├│n del acudiente en formato JSONB: {full_name, phone, address, email, document_type, document_number}';



COMMENT ON COLUMN "public"."students"."emergency_contact_name" IS 'Nombre del contacto de emergencia';



COMMENT ON COLUMN "public"."students"."emergency_contact_phone" IS 'Tel├®fono del contacto de emergencia';



COMMENT ON COLUMN "public"."students"."emergency_contact_relationship" IS 'Relaci├│n con el contacto de emergencia (ej: T├¡o, Hermano, etc.)';



COMMENT ON COLUMN "public"."students"."medications" IS 'Medicamentos que toma el estudiante regularmente';



COMMENT ON COLUMN "public"."students"."allergies" IS 'Alergias conocidas del estudiante';



COMMENT ON COLUMN "public"."students"."special_conditions" IS 'Condiciones especiales de salud o requerimientos';



CREATE TABLE IF NOT EXISTS "public"."students_archive" (
    "id" "uuid" NOT NULL,
    "semester" "text" NOT NULL,
    "form_response_id" "uuid",
    "first_name" "text",
    "last_name" "text",
    "document_type" "text",
    "document_number" "text",
    "email" "text",
    "programs" "jsonb",
    "payments" "jsonb",
    "archived_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."students_archive" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_metadata" (
    "table_name" "text" NOT NULL,
    "last_sync_at" timestamp with time zone,
    "last_success_at" timestamp with time zone,
    "last_error_at" timestamp with time zone,
    "last_error_message" "text",
    "last_sheets_hash" "text",
    "dirty_count" integer DEFAULT 0,
    "total_syncs" integer DEFAULT 0,
    "failed_syncs" integer DEFAULT 0,
    "rows_synced" integer DEFAULT 0,
    "sync_enabled" boolean DEFAULT true,
    "sync_interval_seconds" integer DEFAULT 5,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sync_metadata" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teachers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "instrument" "text",
    "email" "text",
    "email_secondary" "text",
    "phone" "text",
    "landline" "text",
    "address" "text",
    "document_number" "text",
    "birth_date" "date",
    "rut_url" "text",
    "cv_url" "text",
    "nequi" "text",
    "daviplata" "text",
    "bank_details" "jsonb" DEFAULT '[]'::"jsonb",
    "observations" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "hourly_rate" numeric DEFAULT 0,
    "bank_account" "text" DEFAULT ''::"text",
    "nickname_1" "text" DEFAULT ''::"text",
    "nickname_2" "text" DEFAULT ''::"text"
);


ALTER TABLE "public"."teachers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'operator'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_roles" IS 'User access control (admin vs operator)';



ALTER TABLE ONLY "public"."financial_tracking" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."financial_tracking_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."global_configurations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."global_configurations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."historical_students" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."historical_students_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."price_configurations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."price_configurations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Tabla_Verdad_Estudiantes"
    ADD CONSTRAINT "Tabla_Verdad_Estudiantes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_google_event_id_key" UNIQUE ("google_event_id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_logs"
    ADD CONSTRAINT "class_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_logs"
    ADD CONSTRAINT "class_logs_teacher_email_student_name_program_name_class_da_key" UNIQUE ("teacher_email", "student_name", "program_name", "class_date");



ALTER TABLE ONLY "public"."class_resources"
    ADD CONSTRAINT "class_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dyt_enrollment_programs"
    ADD CONSTRAINT "dyt_enrollment_programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dyt_enrollments"
    ADD CONSTRAINT "dyt_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dyt_enrollments"
    ADD CONSTRAINT "dyt_enrollments_student_semester_key" UNIQUE ("student_id", "semester");



ALTER TABLE ONLY "public"."dyt_global_settings"
    ADD CONSTRAINT "dyt_global_settings_pkey" PRIMARY KEY ("semester");



ALTER TABLE ONLY "public"."dyt_group_classes"
    ADD CONSTRAINT "dyt_group_classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dyt_group_classes"
    ADD CONSTRAINT "dyt_group_classes_semester_name_key" UNIQUE ("semester", "name");



ALTER TABLE ONLY "public"."dyt_group_program_names"
    ADD CONSTRAINT "dyt_group_program_names_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dyt_group_program_names"
    ADD CONSTRAINT "dyt_group_program_names_semester_name_key" UNIQUE ("semester", "name");



ALTER TABLE ONLY "public"."dyt_instruments"
    ADD CONSTRAINT "dyt_instruments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."dyt_instruments"
    ADD CONSTRAINT "dyt_instruments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dyt_payment_plans"
    ADD CONSTRAINT "dyt_payment_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dyt_program_prices"
    ADD CONSTRAINT "dyt_program_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dyt_transactions"
    ADD CONSTRAINT "dyt_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_tracking"
    ADD CONSTRAINT "financial_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_tracking"
    ADD CONSTRAINT "financial_tracking_student_id_key" UNIQUE ("student_id");



ALTER TABLE ONLY "public"."form_responses"
    ADD CONSTRAINT "form_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_configurations"
    ADD CONSTRAINT "global_configurations_config_key_key" UNIQUE ("config_key");



ALTER TABLE ONLY "public"."global_configurations"
    ADD CONSTRAINT "global_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_calendar_events"
    ADD CONSTRAINT "group_calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_classes"
    ADD CONSTRAINT "group_classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_enrollments"
    ADD CONSTRAINT "group_enrollments_group_id_student_id_key" UNIQUE ("group_id", "student_id");



ALTER TABLE ONLY "public"."group_enrollments"
    ADD CONSTRAINT "group_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historical_records"
    ADD CONSTRAINT "historical_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historical_students"
    ADD CONSTRAINT "historical_students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historical_students"
    ADD CONSTRAINT "idx_semester_student" UNIQUE ("semester", "document_number");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_configurations"
    ADD CONSTRAINT "price_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."program_prices"
    ADD CONSTRAINT "program_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_prices"
    ADD CONSTRAINT "program_prices_semester_program_name_key" UNIQUE ("semester", "program_name");



ALTER TABLE ONLY "public"."semester_config"
    ADD CONSTRAINT "semester_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."semester_config"
    ADD CONSTRAINT "semester_config_semester_key" UNIQUE ("semester");



ALTER TABLE ONLY "public"."semesters"
    ADD CONSTRAINT "semesters_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."semesters"
    ADD CONSTRAINT "semesters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students_archive"
    ADD CONSTRAINT "students_archive_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_metadata"
    ADD CONSTRAINT "sync_metadata_pkey" PRIMARY KEY ("table_name");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dyt_program_prices"
    ADD CONSTRAINT "unique_program_per_semester" UNIQUE ("program_name", "semester");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "unique_student_per_semester" UNIQUE ("semester", "document_number");



COMMENT ON CONSTRAINT "unique_student_per_semester" ON "public"."students" IS 'Prevents duplicate students: one document_number per semester only';



ALTER TABLE ONLY "public"."price_configurations"
    ADD CONSTRAINT "unique_year_program" UNIQUE ("academic_year", "program_name");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_assignments_status" ON "public"."assignments" USING "btree" ("status");



CREATE INDEX "idx_assignments_student_id" ON "public"."assignments" USING "btree" ("student_id");



CREATE INDEX "idx_assignments_submitted_at" ON "public"."assignments" USING "btree" ("submitted_at" DESC);



CREATE INDEX "idx_assignments_teacher_id" ON "public"."assignments" USING "btree" ("teacher_id");



CREATE INDEX "idx_calendar_events_event_date" ON "public"."calendar_events" USING "btree" ("event_date");



CREATE INDEX "idx_calendar_events_google_id" ON "public"."calendar_events" USING "btree" ("google_event_id");



CREATE INDEX "idx_calendar_events_semester" ON "public"."calendar_events" USING "btree" ("semester");



CREATE INDEX "idx_calendar_events_status" ON "public"."calendar_events" USING "btree" ("status");



CREATE INDEX "idx_calendar_events_student_id" ON "public"."calendar_events" USING "btree" ("student_id");



CREATE INDEX "idx_calendar_events_student_upcoming" ON "public"."calendar_events" USING "btree" ("student_id", "event_date") WHERE ("status" = 'scheduled'::"text");



CREATE INDEX "idx_class_resources_file_id" ON "public"."class_resources" USING "btree" ("drive_file_id");



CREATE INDEX "idx_class_resources_log" ON "public"."class_resources" USING "btree" ("class_log_id");



CREATE INDEX "idx_global_config_category" ON "public"."global_configurations" USING "btree" ("category");



CREATE INDEX "idx_global_config_key" ON "public"."global_configurations" USING "btree" ("config_key");



CREATE INDEX "idx_group_cal_events_group" ON "public"."group_calendar_events" USING "btree" ("group_id");



CREATE INDEX "idx_group_cal_events_semester" ON "public"."group_calendar_events" USING "btree" ("semester");



CREATE INDEX "idx_group_classes_semester" ON "public"."group_classes" USING "btree" ("semester");



CREATE INDEX "idx_group_enrollments_student" ON "public"."group_enrollments" USING "btree" ("student_id");



CREATE INDEX "idx_historical_document" ON "public"."historical_students" USING "btree" ("document_number");



CREATE INDEX "idx_historical_enrolled" ON "public"."historical_students" USING "btree" ("enrolled") WHERE ("enrolled" = true);



CREATE INDEX "idx_historical_financial_gin" ON "public"."historical_students" USING "gin" ("financial_data");



CREATE INDEX "idx_historical_name" ON "public"."historical_students" USING "btree" ("student_name", "student_lastname");



CREATE INDEX "idx_historical_programs_gin" ON "public"."historical_students" USING "gin" ("programs");



CREATE INDEX "idx_historical_semester" ON "public"."historical_students" USING "btree" ("semester");



CREATE INDEX "idx_historical_year" ON "public"."historical_students" USING "btree" ("academic_year", "semester_period");



CREATE INDEX "idx_materials_created_at" ON "public"."materials" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_materials_student_id" ON "public"."materials" USING "btree" ("student_id");



CREATE INDEX "idx_materials_teacher_id" ON "public"."materials" USING "btree" ("teacher_id");



CREATE INDEX "idx_prices_academic_year" ON "public"."price_configurations" USING "btree" ("academic_year");



CREATE INDEX "idx_prices_active" ON "public"."price_configurations" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_profiles_id_number" ON "public"."profiles" USING "btree" ("id_number");



CREATE INDEX "idx_profiles_instrument" ON "public"."profiles" USING "btree" ("instrument");



CREATE INDEX "idx_profiles_phone" ON "public"."profiles" USING "btree" ("phone");



CREATE INDEX "idx_program_prices_program" ON "public"."program_prices" USING "btree" ("program_name");



CREATE INDEX "idx_program_prices_semester" ON "public"."program_prices" USING "btree" ("semester");



CREATE INDEX "idx_students_father_info" ON "public"."students" USING "gin" ("father_info");



CREATE INDEX "idx_students_guardian_info" ON "public"."students" USING "gin" ("guardian_info_detailed");



CREATE INDEX "idx_students_mother_info" ON "public"."students" USING "gin" ("mother_info");



CREATE INDEX "idx_teachers_active" ON "public"."teachers" USING "btree" ("is_active");



CREATE INDEX "idx_teachers_name" ON "public"."teachers" USING "btree" ("name");



CREATE OR REPLACE TRIGGER "trigger_auto_create_student" AFTER INSERT ON "public"."form_responses" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_student_from_form"();



CREATE OR REPLACE TRIGGER "trigger_update_group_events_timestamp" BEFORE UPDATE ON "public"."group_calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_group_events_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_program_prices" BEFORE UPDATE ON "public"."program_prices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_semester_config" BEFORE UPDATE ON "public"."semester_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_semester_config_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_roles" BEFORE UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_group_classes_updated_at" BEFORE UPDATE ON "public"."group_classes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teachers_updated_at" BEFORE UPDATE ON "public"."teachers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_resources"
    ADD CONSTRAINT "class_resources_class_log_id_fkey" FOREIGN KEY ("class_log_id") REFERENCES "public"."class_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dyt_enrollment_programs"
    ADD CONSTRAINT "dyt_enrollment_programs_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."dyt_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dyt_enrollment_programs"
    ADD CONSTRAINT "dyt_enrollment_programs_group_class_id_fkey" FOREIGN KEY ("group_class_id") REFERENCES "public"."dyt_group_classes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dyt_enrollment_programs"
    ADD CONSTRAINT "dyt_enrollment_programs_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "public"."dyt_instruments"("id");



ALTER TABLE ONLY "public"."dyt_group_classes"
    ADD CONSTRAINT "dyt_group_classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id");



ALTER TABLE ONLY "public"."dyt_payment_plans"
    ADD CONSTRAINT "dyt_payment_plans_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."dyt_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dyt_transactions"
    ADD CONSTRAINT "dyt_transactions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."dyt_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_calendar_events"
    ADD CONSTRAINT "group_calendar_events_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group_classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_classes"
    ADD CONSTRAINT "group_classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."group_enrollments"
    ADD CONSTRAINT "group_enrollments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group_classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_form_response_id_fkey" FOREIGN KEY ("form_response_id") REFERENCES "public"."form_responses"("id");



CREATE POLICY "Admin can manage financial data" ON "public"."financial_tracking" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'operador'::"text"]))))));



CREATE POLICY "Admin can modify configs" ON "public"."global_configurations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can modify historical data" ON "public"."historical_students" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can modify prices" ON "public"."price_configurations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can modify sync metadata" ON "public"."sync_metadata" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read all roles" ON "public"."user_roles" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view activity logs" ON "public"."activity_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow authenticated read access" ON "public"."Tabla_Verdad_Estudiantes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anon delete group_calendar_events" ON "public"."group_calendar_events" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Anon insert group_calendar_events" ON "public"."group_calendar_events" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon select group_calendar_events" ON "public"."group_calendar_events" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon update group_calendar_events" ON "public"."group_calendar_events" FOR UPDATE TO "anon" USING (true);



CREATE POLICY "Auth users delete group_calendar_events" ON "public"."group_calendar_events" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Auth users insert group_calendar_events" ON "public"."group_calendar_events" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Auth users read group_calendar_events" ON "public"."group_calendar_events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can DELETE dyt_group_program_names" ON "public"."dyt_group_program_names" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can INSERT dyt_group_program_names" ON "public"."dyt_group_program_names" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can SELECT dyt_group_program_names" ON "public"."dyt_group_program_names" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read calendar_events" ON "public"."calendar_events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Configs visible to authenticated users" ON "public"."global_configurations" FOR SELECT TO "authenticated" USING ((("is_sensitive" = false) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Courses are viewable by everyone" ON "public"."courses" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable all access for service role" ON "public"."Tabla_Verdad_Estudiantes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for service role" ON "public"."calendar_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Enable delete for authenticated users only" ON "public"."dyt_group_classes" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable full access for anon users" ON "public"."calendar_events" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Enable full access for authenticated users" ON "public"."calendar_events" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."activity_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."class_resources" FOR INSERT WITH CHECK ((("auth"."role"() = 'anon'::"text") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."calendar_events" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."class_logs" FOR INSERT WITH CHECK ((("auth"."role"() = 'anon'::"text") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."dyt_group_classes" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."dyt_group_classes" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."teachers" FOR SELECT USING (true);



CREATE POLICY "Enable read access for anon" ON "public"."Tabla_Verdad_Estudiantes" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable select for authenticated users" ON "public"."class_resources" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."dyt_group_classes" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable write access for authenticated users" ON "public"."teachers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Gesti├│n completa enrollment_programs" ON "public"."dyt_enrollment_programs" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Gesti├│n completa enrollments" ON "public"."dyt_enrollments" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Gesti├│n completa payment_plans" ON "public"."dyt_payment_plans" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Gesti├│n completa transactions" ON "public"."dyt_transactions" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Gesti├│n total instrumentos" ON "public"."dyt_instruments" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Gesti├│n total settings" ON "public"."dyt_global_settings" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Historical data visible to authenticated users" ON "public"."historical_students" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Only teachers can modify courses" ON "public"."courses" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'teacher'::"text"))));



CREATE POLICY "Permitir todas las operaciones" ON "public"."dyt_program_prices" USING (true) WITH CHECK (true);



CREATE POLICY "Prices visible to all authenticated users" ON "public"."price_configurations" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."Produccion-Backup-23012026" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Service role full access group_calendar_events" ON "public"."group_calendar_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to calendar_events" ON "public"."calendar_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."Produccion-Backup-23012026" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."Tabla_Verdad_Estudiantes" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."activity_logs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."assignments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."calendar_events" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."class_logs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."class_resources" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."courses" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."dyt_enrollment_programs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."dyt_enrollments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."dyt_global_settings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."dyt_group_classes" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."dyt_group_program_names" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."dyt_instruments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."dyt_payment_plans" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."dyt_program_prices" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."dyt_transactions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."financial_tracking" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."form_responses" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."global_configurations" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."group_calendar_events" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."group_classes" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."group_enrollments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."historical_records" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."historical_students" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."materials" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."price_configurations" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."profiles" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."program_prices" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."semester_config" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."semesters" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."students" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."students_archive" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."sync_metadata" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."teachers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Solo usuarios autenticados" ON "public"."user_roles" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Students can create assignments" ON "public"."assignments" FOR INSERT WITH CHECK ((("auth"."uid"() = "student_id") AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'student'::"text")))));



CREATE POLICY "Students can view assigned materials" ON "public"."materials" FOR SELECT USING (("auth"."uid"() = "student_id"));



CREATE POLICY "Students can view own assignments" ON "public"."assignments" FOR SELECT USING (("auth"."uid"() = "student_id"));



CREATE POLICY "Students can view teacher profiles" ON "public"."profiles" FOR SELECT USING (("role" = 'teacher'::"text"));



CREATE POLICY "Sync metadata visible to authenticated users" ON "public"."sync_metadata" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."Tabla_Verdad_Estudiantes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Teachers can create materials" ON "public"."materials" FOR INSERT WITH CHECK ((("auth"."uid"() = "teacher_id") AND ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'teacher'::"text")))));



CREATE POLICY "Teachers can delete own materials" ON "public"."materials" FOR DELETE USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can update assignments" ON "public"."assignments" FOR UPDATE USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can view own logs" ON "public"."class_logs" FOR SELECT USING ((("teacher_email" = ("auth"."uid"())::"text") OR ("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'anon'::"text")));



CREATE POLICY "Teachers can view own materials" ON "public"."materials" FOR SELECT USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can view student assignments" ON "public"."assignments" FOR SELECT USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can read own role" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dyt_enrollment_programs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dyt_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dyt_global_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dyt_group_classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dyt_group_program_names" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dyt_instruments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dyt_payment_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dyt_program_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dyt_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."global_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_calendar_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."historical_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."historical_students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."program_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."semester_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."semesters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students_archive" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_metadata" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teachers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."auto_create_student_from_form"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_create_student_from_form"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_student_from_form"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_group_events_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_group_events_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_group_events_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_semester_config_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_semester_config_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_semester_config_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."Produccion-Backup-23012026" TO "anon";
GRANT ALL ON TABLE "public"."Produccion-Backup-23012026" TO "authenticated";
GRANT ALL ON TABLE "public"."Produccion-Backup-23012026" TO "service_role";



GRANT ALL ON TABLE "public"."Tabla_Verdad_Estudiantes" TO "anon";
GRANT ALL ON TABLE "public"."Tabla_Verdad_Estudiantes" TO "authenticated";
GRANT ALL ON TABLE "public"."Tabla_Verdad_Estudiantes" TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."class_logs" TO "anon";
GRANT ALL ON TABLE "public"."class_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."class_logs" TO "service_role";



GRANT ALL ON TABLE "public"."class_resources" TO "anon";
GRANT ALL ON TABLE "public"."class_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."class_resources" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."dyt_enrollment_programs" TO "anon";
GRANT ALL ON TABLE "public"."dyt_enrollment_programs" TO "authenticated";
GRANT ALL ON TABLE "public"."dyt_enrollment_programs" TO "service_role";



GRANT ALL ON TABLE "public"."dyt_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."dyt_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."dyt_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."dyt_global_settings" TO "anon";
GRANT ALL ON TABLE "public"."dyt_global_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."dyt_global_settings" TO "service_role";



GRANT ALL ON TABLE "public"."dyt_group_classes" TO "anon";
GRANT ALL ON TABLE "public"."dyt_group_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."dyt_group_classes" TO "service_role";



GRANT ALL ON TABLE "public"."dyt_group_program_names" TO "anon";
GRANT ALL ON TABLE "public"."dyt_group_program_names" TO "authenticated";
GRANT ALL ON TABLE "public"."dyt_group_program_names" TO "service_role";



GRANT ALL ON TABLE "public"."dyt_instruments" TO "anon";
GRANT ALL ON TABLE "public"."dyt_instruments" TO "authenticated";
GRANT ALL ON TABLE "public"."dyt_instruments" TO "service_role";



GRANT ALL ON TABLE "public"."dyt_payment_plans" TO "anon";
GRANT ALL ON TABLE "public"."dyt_payment_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."dyt_payment_plans" TO "service_role";



GRANT ALL ON TABLE "public"."dyt_program_prices" TO "anon";
GRANT ALL ON TABLE "public"."dyt_program_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."dyt_program_prices" TO "service_role";



GRANT ALL ON TABLE "public"."dyt_transactions" TO "anon";
GRANT ALL ON TABLE "public"."dyt_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."dyt_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."financial_tracking" TO "anon";
GRANT ALL ON TABLE "public"."financial_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_tracking" TO "service_role";



GRANT ALL ON SEQUENCE "public"."financial_tracking_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."financial_tracking_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."financial_tracking_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."form_responses" TO "anon";
GRANT ALL ON TABLE "public"."form_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."form_responses" TO "service_role";



GRANT ALL ON TABLE "public"."global_configurations" TO "anon";
GRANT ALL ON TABLE "public"."global_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."global_configurations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."global_configurations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."global_configurations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."global_configurations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."group_calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."group_calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."group_calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."group_classes" TO "anon";
GRANT ALL ON TABLE "public"."group_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."group_classes" TO "service_role";



GRANT ALL ON TABLE "public"."group_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."group_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."group_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."historical_records" TO "anon";
GRANT ALL ON TABLE "public"."historical_records" TO "authenticated";
GRANT ALL ON TABLE "public"."historical_records" TO "service_role";



GRANT ALL ON SEQUENCE "public"."historical_records_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."historical_records_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."historical_records_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."historical_students" TO "anon";
GRANT ALL ON TABLE "public"."historical_students" TO "authenticated";
GRANT ALL ON TABLE "public"."historical_students" TO "service_role";



GRANT ALL ON SEQUENCE "public"."historical_students_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."historical_students_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."historical_students_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."materials" TO "anon";
GRANT ALL ON TABLE "public"."materials" TO "authenticated";
GRANT ALL ON TABLE "public"."materials" TO "service_role";



GRANT ALL ON TABLE "public"."price_configurations" TO "anon";
GRANT ALL ON TABLE "public"."price_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."price_configurations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."price_configurations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."price_configurations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."price_configurations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."program_prices" TO "anon";
GRANT ALL ON TABLE "public"."program_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."program_prices" TO "service_role";



GRANT ALL ON TABLE "public"."semester_config" TO "anon";
GRANT ALL ON TABLE "public"."semester_config" TO "authenticated";
GRANT ALL ON TABLE "public"."semester_config" TO "service_role";



GRANT ALL ON TABLE "public"."semesters" TO "anon";
GRANT ALL ON TABLE "public"."semesters" TO "authenticated";
GRANT ALL ON TABLE "public"."semesters" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."students_archive" TO "anon";
GRANT ALL ON TABLE "public"."students_archive" TO "authenticated";
GRANT ALL ON TABLE "public"."students_archive" TO "service_role";



GRANT ALL ON TABLE "public"."sync_metadata" TO "anon";
GRANT ALL ON TABLE "public"."sync_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."teachers" TO "anon";
GRANT ALL ON TABLE "public"."teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."teachers" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































