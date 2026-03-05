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
            }
            students: {
                Row: {
                    id: string
                    first_name: string
                    last_name: string
                    document_number: string
                    email: string | null
                    phone: string | null
                    semester: string
                    is_active: boolean | null
                    programs: Json | null
                    enrollment_date: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    first_name: string
                    last_name: string
                    document_number: string
                    email?: string | null
                    phone?: string | null
                    semester: string
                    is_active?: boolean | null
                    programs?: Json | null
                    enrollment_date?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    first_name?: string
                    last_name?: string
                    document_number?: string
                    email?: string | null
                    phone?: string | null
                    semester?: string
                    is_active?: boolean | null
                    programs?: Json | null
                    enrollment_date?: string | null
                    created_at?: string | null
                }
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
            }
        }
    }
}
