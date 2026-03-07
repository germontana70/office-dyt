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
            teachers: {
                Row: {
                    id: string
                    name: string
                    email: string | null
                    phone: string | null
                    instrument: string | null
                    is_active: boolean | null
                    hourly_rate: number | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    email?: string | null
                    phone?: string | null
                    instrument?: string | null
                    is_active?: boolean | null
                    hourly_rate?: number | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string | null
                    phone?: string | null
                    instrument?: string | null
                    is_active?: boolean | null
                    hourly_rate?: number | null
                    created_at?: string | null
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    id: string
                    updated_at: string | null
                    username: string | null
                    full_name: string | null
                    avatar_url: string | null
                    website: string | null
                    role: string | null
                    instrument: string | null
                    phone: string | null
                    phone_alt: string | null
                    address: string | null
                    id_number: string | null
                    birth_date: string | null
                    nequi: string | null
                    daviplata: string | null
                    email: string | null
                    notes: string | null
                }
                Insert: {
                    id: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    role?: string | null
                    instrument?: string | null
                    phone?: string | null
                    phone_alt?: string | null
                    address?: string | null
                    id_number?: string | null
                    birth_date?: string | null
                    nequi?: string | null
                    daviplata?: string | null
                    email?: string | null
                    notes?: string | null
                }
                Update: {
                    id?: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    role?: string | null
                    instrument?: string | null
                    phone?: string | null
                    phone_alt?: string | null
                    address?: string | null
                    id_number?: string | null
                    birth_date?: string | null
                    nequi?: string | null
                    daviplata?: string | null
                    email?: string | null
                    notes?: string | null
                }
                Relationships: []
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
