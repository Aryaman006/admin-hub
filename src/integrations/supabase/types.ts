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
       admins: {
         Row: {
           id: string
           user_id: string
           created_at: string
         }
         Insert: {
           id?: string
           user_id: string
           created_at?: string
         }
         Update: {
           id?: string
           user_id?: string
           created_at?: string
         }
       }
       users: {
         Row: {
           id: string
           email: string
           name: string | null
           avatar_url: string | null
           subscription_status: string | null
           yogic_points: number
           watch_time: number
           is_blocked: boolean
           created_at: string
         }
         Insert: {
           id?: string
           email: string
           name?: string | null
           avatar_url?: string | null
           subscription_status?: string | null
           yogic_points?: number
           watch_time?: number
           is_blocked?: boolean
           created_at?: string
         }
         Update: {
           id?: string
           email?: string
           name?: string | null
           avatar_url?: string | null
           subscription_status?: string | null
           yogic_points?: number
           watch_time?: number
           is_blocked?: boolean
           created_at?: string
         }
       }
       categories: {
         Row: {
           id: string
           name: string
           description: string | null
           thumbnail_url: string | null
           is_featured: boolean
           created_at: string
         }
         Insert: {
           id?: string
           name: string
           description?: string | null
           thumbnail_url?: string | null
           is_featured?: boolean
           created_at?: string
         }
         Update: {
           id?: string
           name?: string
           description?: string | null
           thumbnail_url?: string | null
           is_featured?: boolean
           created_at?: string
         }
       }
       videos: {
         Row: {
           id: string
           title: string
           description: string | null
           category_id: string | null
           is_premium: boolean
           duration: number
           yogic_points: number
           thumbnail_url: string | null
           video_url: string | null
           views: number
           watch_time: number
           completion_count: number
           is_published: boolean
           created_at: string
         }
         Insert: {
           id?: string
           title: string
           description?: string | null
           category_id?: string | null
           is_premium?: boolean
           duration?: number
           yogic_points?: number
           thumbnail_url?: string | null
           video_url?: string | null
           views?: number
           watch_time?: number
           completion_count?: number
           is_published?: boolean
           created_at?: string
         }
         Update: {
           id?: string
           title?: string
           description?: string | null
           category_id?: string | null
           is_premium?: boolean
           duration?: number
           yogic_points?: number
           thumbnail_url?: string | null
           video_url?: string | null
           views?: number
           watch_time?: number
           completion_count?: number
           is_published?: boolean
           created_at?: string
         }
       }
       live_classes: {
         Row: {
           id: string
           title: string
           description: string | null
           instructor_name: string
           scheduled_at: string
           is_premium: boolean
           stream_url: string | null
           registrations: number
           attendance: number
           created_at: string
         }
         Insert: {
           id?: string
           title: string
           description?: string | null
           instructor_name: string
           scheduled_at: string
           is_premium?: boolean
           stream_url?: string | null
           registrations?: number
           attendance?: number
           created_at?: string
         }
         Update: {
           id?: string
           title?: string
           description?: string | null
           instructor_name?: string
           scheduled_at?: string
           is_premium?: boolean
           stream_url?: string | null
           registrations?: number
           attendance?: number
           created_at?: string
         }
       }
       payments: {
         Row: {
           id: string
           user_id: string
           amount: number
           gst: number
           status: string
           subscription_id: string | null
           created_at: string
         }
         Insert: {
           id?: string
           user_id: string
           amount: number
           gst?: number
           status?: string
           subscription_id?: string | null
           created_at?: string
         }
         Update: {
           id?: string
           user_id?: string
           amount?: number
           gst?: number
           status?: string
           subscription_id?: string | null
           created_at?: string
         }
       }
       subscriptions: {
         Row: {
           id: string
           user_id: string
           plan_name: string
           status: string
           starts_at: string
           ends_at: string | null
           created_at: string
         }
         Insert: {
           id?: string
           user_id: string
           plan_name: string
           status?: string
           starts_at?: string
           ends_at?: string | null
           created_at?: string
         }
         Update: {
           id?: string
           user_id?: string
           plan_name?: string
           status?: string
           starts_at?: string
           ends_at?: string | null
           created_at?: string
         }
       }
       coupons: {
         Row: {
           id: string
           code: string
           discount_type: string
           discount_value: number
           expires_at: string | null
           usage_limit: number | null
           usage_count: number
           is_active: boolean
           created_at: string
         }
         Insert: {
           id?: string
           code: string
           discount_type: string
           discount_value: number
           expires_at?: string | null
           usage_limit?: number | null
           usage_count?: number
           is_active?: boolean
           created_at?: string
         }
         Update: {
           id?: string
           code?: string
           discount_type?: string
           discount_value?: number
           expires_at?: string | null
           usage_limit?: number | null
           usage_count?: number
           is_active?: boolean
           created_at?: string
         }
       }
     }
     Views: {
       [_ in never]: never
     }
     Functions: {
       [_ in never]: never
     }
     Enums: {
       [_ in never]: never
     }
   }
 }