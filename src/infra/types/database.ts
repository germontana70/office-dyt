export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            students: {
                Row: {
                    id: string
                    document_number: string
                    document_type: string | null
                    first_name: string
                    last_name: string
                    email: string | null
                    phone: string | null
                    semester: string
                    is_active: boolean | null
                    programs: Json | null
                    payments: Json | null
                    created_at: string | null
                    updated_at: string | null
                    form_response_id: string | null
                }
                Insert: {
                    id?: string
                    document_number: string
                    document_type?: string | null
                    first_name: string
                    last_name: string
                    email?: string | null
                    phone?: string | null
                    semester: string
                    is_active?: boolean | null
                    programs?: Json | null
                    payments?: Json | null
                    created_at?: string | null
                    updated_at?: string | null
                    form_response_id?: string | null
                }
                Update: {
                    id?: string
                    document_number?: string
                    document_type?: string | null
                    first_name?: string
                    last_name?: string
                    email?: string | null
                    phone?: string | null
                    semester?: string
                    is_active?: boolean | null
                    programs?: Json | null
                    payments?: Json | null
                    created_at?: string | null
                    updated_at?: string | null
                    form_response_id?: string | null
                }
                Relationships: []
            }
            form_responses: {
                Row: {
                    id: string
                    document_number: string
                    first_name: string
                    last_name: string
                    email: string
                    semester: string
                    row_hash: string | null
                    raw_data: Json | null
                    synced_to_students: boolean | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    document_number: string
                    first_name: string
                    last_name: string
                    email: string
                    semester: string
                    row_hash?: string | null
                    raw_data?: Json | null
                    synced_to_students?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    document_number?: string
                    first_name?: string
                    last_name?: string
                    email?: string
                    semester?: string
                    row_hash?: string | null
                    raw_data?: Json | null
                    synced_to_students?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            Tabla_Verdad_Estudiantes: {
                Row: {
                    id: string
                    numero_de_identificacion: string | null
                    nombres_del_estudiante: string | null
                    apellidos_del_estudiante: string | null
                    email: string | null
                    celular_del_papa: string | null
                    celular_de_la_mama: string | null
                }
                Insert: {
                    id?: string
                    numero_de_identificacion?: string | null
                    nombres_del_estudiante?: string | null
                    apellidos_del_estudiante?: string | null
                    email?: string | null
                    celular_del_papa?: string | null
                    celular_de_la_mama?: string | null
                }
                Update: {
                    id?: string
                    numero_de_identificacion?: string | null
                    nombres_del_estudiante?: string | null
                    apellidos_del_estudiante?: string | null
                    email?: string | null
                    celular_del_papa?: string | null
                    celular_de_la_mama?: string | null
                }
                Relationships: []
            }
        }
    }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
