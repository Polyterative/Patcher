export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.0.2 (a4e00ff)"
  }
  public: {
    Tables: {
      api_key_usage_monthly: {
        Row: {
          key_id: string
          month: string
          updated_at: string
          used: number
        }
        Insert: {
          key_id: string
          month: string
          updated_at?: string
          used?: number
        }
        Update: {
          key_id?: string
          month?: string
          updated_at?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_monthly_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          label: string | null
          last_used_at: string | null
          monthly_quota_override: number | null
          per_minute_quota_override: number | null
          profile_id: string
          revoked_at: string | null
          rotated_at: string | null
          tier_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          label?: string | null
          last_used_at?: string | null
          monthly_quota_override?: number | null
          per_minute_quota_override?: number | null
          profile_id: string
          revoked_at?: string | null
          rotated_at?: string | null
          tier_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string | null
          last_used_at?: string | null
          monthly_quota_override?: number | null
          per_minute_quota_override?: number | null
          profile_id?: string
          revoked_at?: string | null
          rotated_at?: string | null
          tier_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_tier_code_fkey"
            columns: ["tier_code"]
            isOneToOne: false
            referencedRelation: "api_tiers"
            referencedColumns: ["code"]
          },
        ]
      }
      api_tiers: {
        Row: {
          code: string
          created_at: string
          description: string
          monthly_quota: number
          per_minute_quota: number
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          monthly_quota: number
          per_minute_quota: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          monthly_quota?: number
          per_minute_quota?: number
        }
        Relationships: []
      }
      comments: {
        Row: {
          authorId: string
          content: string
          created: string
          entityId: number
          entityType: number
          id: number
          updated: string
        }
        Insert: {
          authorId?: string
          content?: string
          created?: string
          entityId: number
          entityType: number
          id?: number
          updated?: string
        }
        Update: {
          authorId?: string
          content?: string
          created?: string
          entityId?: number
          entityType?: number
          id?: number
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_authorId_fkey"
            columns: ["authorId"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments_duplicate: {
        Row: {
          authorId: string
          content: string
          created: string
          entityId: number
          entityType: number
          id: number
          moduleId: number | null
          updated: string
        }
        Insert: {
          authorId?: string
          content?: string
          created?: string
          entityId: number
          entityType: number
          id?: number
          moduleId?: number | null
          updated?: string
        }
        Update: {
          authorId?: string
          content?: string
          created?: string
          entityId?: number
          entityType?: number
          id?: number
          moduleId?: number | null
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_duplicate_authorId_fkey"
            columns: ["authorId"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_duplicate_moduleId_fkey"
            columns: ["moduleId"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_duplicate_moduleId_fkey"
            columns: ["moduleId"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_duplicate_moduleId_fkey"
            columns: ["moduleId"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_duplicate_moduleId_fkey"
            columns: ["moduleId"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
        ]
      }
      listing_media: {
        Row: {
          created_at: string
          id: string
          kind: string
          listing_id: string
          mime_type: string
          position: number
          storage_path: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          listing_id: string
          mime_type: string
          position: number
          storage_path: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          listing_id?: string
          mime_type?: string
          position?: number
          storage_path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturer_claims: {
        Row: {
          admin_note: string | null
          claimant_id: string
          created: string
          decided_at: string | null
          decided_by: string | null
          id: number
          manufacturer_id: number
          proof_note: string
          status: string
          updated: string
        }
        Insert: {
          admin_note?: string | null
          claimant_id: string
          created?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: number
          manufacturer_id: number
          proof_note: string
          status?: string
          updated?: string
        }
        Update: {
          admin_note?: string | null
          claimant_id?: string
          created?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: number
          manufacturer_id?: number
          proof_note?: string
          status?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturer_claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturer_claims_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturer_claims_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          adminUser: string | null
          description: string | null
          id: number
          logo: string | null
          name: string | null
          social_links: Json | null
          tagline: string | null
          verified_at: string | null
          verified_by: string | null
          websiteURL: string | null
        }
        Insert: {
          adminUser?: string | null
          description?: string | null
          id?: number
          logo?: string | null
          name?: string | null
          social_links?: Json | null
          tagline?: string | null
          verified_at?: string | null
          verified_by?: string | null
          websiteURL?: string | null
        }
        Update: {
          adminUser?: string | null
          description?: string | null
          id?: number
          logo?: string | null
          name?: string | null
          social_links?: Json | null
          tagline?: string | null
          verified_at?: string | null
          verified_by?: string | null
          websiteURL?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manufacturers_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_availability_tags: {
        Row: {
          module_id: number
          set_at: string
          set_by: string
          tag: string
        }
        Insert: {
          module_id: number
          set_at?: string
          set_by: string
          tag: string
        }
        Update: {
          module_id?: number
          set_at?: string
          set_by?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_availability_tags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_availability_tags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_availability_tags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
          {
            foreignKeyName: "module_availability_tags_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          asking_price_amount_minor: number
          asking_price_currency: string
          condition: string
          created_at: string
          description: string | null
          expires_at: string | null
          external_link: string | null
          id: string
          moduleid: number
          open_to_offers: boolean
          public_id: string
          seller_profileid: string
          shipping_notes: string | null
          shipping_options: string[]
          ships_from_country: string
          status: string
          title_override: string | null
          updated_at: string
        }
        Insert: {
          asking_price_amount_minor: number
          asking_price_currency: string
          condition: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          external_link?: string | null
          id?: string
          moduleid: number
          open_to_offers?: boolean
          public_id?: string
          seller_profileid: string
          shipping_notes?: string | null
          shipping_options?: string[]
          ships_from_country: string
          status?: string
          title_override?: string | null
          updated_at?: string
        }
        Update: {
          asking_price_amount_minor?: number
          asking_price_currency?: string
          condition?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          external_link?: string | null
          id?: string
          moduleid?: number
          open_to_offers?: boolean
          public_id?: string
          seller_profileid?: string
          shipping_notes?: string | null
          shipping_options?: string[]
          ships_from_country?: string
          status?: string
          title_override?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
          {
            foreignKeyName: "marketplace_listings_seller_profileid_fkey"
            columns: ["seller_profileid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_collection_entries: {
        Row: {
          collection_id: number
          created: string
          id: number
          module_id: number
          note: string | null
          ordinal: number
          updated: string
        }
        Insert: {
          collection_id: number
          created?: string
          id?: number
          module_id: number
          note?: string | null
          ordinal: number
          updated?: string
        }
        Update: {
          collection_id?: number
          created?: string
          id?: number
          module_id?: number
          note?: string | null
          ordinal?: number
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_collection_entries_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "module_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_collection_entries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_collection_entries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_collection_entries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_collection_entries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
        ]
      }
      module_collections: {
        Row: {
          authorid: string
          created: string
          description: string | null
          id: number
          image: string | null
          name: string
          public: boolean
          public_id: string
          updated: string
        }
        Insert: {
          authorid: string
          created?: string
          description?: string | null
          id?: number
          image?: string | null
          name: string
          public?: boolean
          public_id?: string
          updated?: string
        }
        Update: {
          authorid?: string
          created?: string
          description?: string | null
          id?: number
          image?: string | null
          name?: string
          public?: boolean
          public_id?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_collections_authorid_fkey"
            columns: ["authorid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_flags: {
        Row: {
          category: string
          created_at: string
          id: number
          module_id: number
          note: string | null
          resolved: boolean
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: never
          module_id: number
          note?: string | null
          resolved?: boolean
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: never
          module_id?: number
          note?: string | null
          resolved?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_flags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_flags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_flags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_flags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
        ]
      }
      user_module_acquisitions: {
        Row: {
          acquired_at: string
          created_at: string
          currency: "EUR" | "USD" | null
          id: number
          moduleid: number
          note: string | null
          price_amount_minor: number | null
          profileid: string
          source: "unknown" | "new" | "used" | "gift" | "trade" | "marketplace" | "other"
          updated_at: string
        }
        Insert: {
          acquired_at?: string
          created_at?: string
          currency?: "EUR" | "USD" | null
          id?: number
          moduleid: number
          note?: string | null
          price_amount_minor?: number | null
          profileid: string
          source?: "unknown" | "new" | "used" | "gift" | "trade" | "marketplace" | "other"
          updated_at?: string
        }
        Update: {
          acquired_at?: string
          created_at?: string
          currency?: "EUR" | "USD" | null
          id?: number
          moduleid?: number
          note?: string | null
          price_amount_minor?: number | null
          profileid?: string
          source?: "unknown" | "new" | "used" | "gift" | "trade" | "marketplace" | "other"
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_acquisitions_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_acquisitions_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
          {
            foreignKeyName: "user_module_acquisitions_profileid_fkey"
            columns: ["profileid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_ins: {
        Row: {
          authorid: string | null
          id: number
          isApproved: boolean
          isAudio: boolean | null
          isDCC: boolean | null
          isVOCT: boolean | null
          max: number | null
          min: number | null
          moduleid: number
          name: string
        }
        Insert: {
          authorid?: string | null
          id?: number
          isApproved?: boolean
          isAudio?: boolean | null
          isDCC?: boolean | null
          isVOCT?: boolean | null
          max?: number | null
          min?: number | null
          moduleid: number
          name: string
        }
        Update: {
          authorid?: string | null
          id?: number
          isApproved?: boolean
          isAudio?: boolean | null
          isDCC?: boolean | null
          isVOCT?: boolean | null
          max?: number | null
          min?: number | null
          moduleid?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_ins_authorid_fkey"
            columns: ["authorid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleINs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleINs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleINs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleINs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
        ]
      }
      module_outs: {
        Row: {
          authorid: string | null
          id: number
          isApproved: boolean
          isAudio: boolean | null
          isDCC: boolean | null
          isVOCT: boolean | null
          max: number | null
          min: number | null
          moduleid: number
          name: string | null
        }
        Insert: {
          authorid?: string | null
          id?: number
          isApproved?: boolean
          isAudio?: boolean | null
          isDCC?: boolean | null
          isVOCT?: boolean | null
          max?: number | null
          min?: number | null
          moduleid: number
          name?: string | null
        }
        Update: {
          authorid?: string | null
          id?: number
          isApproved?: boolean
          isAudio?: boolean | null
          isDCC?: boolean | null
          isVOCT?: boolean | null
          max?: number | null
          min?: number | null
          moduleid?: number
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_outs_authorid_fkey"
            columns: ["authorid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleOUTs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleOUTs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleOUTs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleOUTs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
        ]
      }
      module_panels: {
        Row: {
          color: number | null
          created: string | null
          description: string
          filename: string
          id: number
          isApproved: boolean
          moduleid: number
          updated: string | null
        }
        Insert: {
          color?: number | null
          created?: string | null
          description?: string
          filename: string
          id?: number
          isApproved?: boolean
          moduleid: number
          updated?: string | null
        }
        Update: {
          color?: number | null
          created?: string | null
          description?: string
          filename?: string
          id?: number
          isApproved?: boolean
          moduleid?: number
          updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_panels_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_panels_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_panels_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_panels_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
        ]
      }
      module_price_snapshots: {
        Row: {
          availability: string
          created_at: string
          currency: string | null
          id: number
          listing_id: number
          observed_at: string
          price_amount_minor: number | null
          raw_meta: Json
          source: string
        }
        Insert: {
          availability?: string
          created_at?: string
          currency?: string | null
          id?: number
          listing_id: number
          observed_at?: string
          price_amount_minor?: number | null
          raw_meta?: Json
          source?: string
        }
        Update: {
          availability?: string
          created_at?: string
          currency?: string | null
          id?: number
          listing_id?: number
          observed_at?: string
          price_amount_minor?: number | null
          raw_meta?: Json
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_price_snapshots_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "module_store_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      module_store_listings: {
        Row: {
          active: boolean
          created_at: string
          external_handle: string | null
          external_product_id: string | null
          failure_count: number
          id: number
          last_checked_at: string | null
          last_error: string | null
          last_raw_meta: Json | null
          last_success_at: string | null
          module_id: number
          next_check_at: string
          product_url: string
          store_id: number
          updated_at: string
          verification_status: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          external_handle?: string | null
          external_product_id?: string | null
          failure_count?: number
          id?: number
          last_checked_at?: string | null
          last_error?: string | null
          last_raw_meta?: Json | null
          last_success_at?: string | null
          module_id: number
          next_check_at?: string
          product_url: string
          store_id: number
          updated_at?: string
          verification_status?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          external_handle?: string | null
          external_product_id?: string | null
          failure_count?: number
          id?: number
          last_checked_at?: string | null
          last_error?: string | null
          last_raw_meta?: Json | null
          last_success_at?: string | null
          module_id?: number
          next_check_at?: string
          product_url?: string
          store_id?: number
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_store_listings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_store_listings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_store_listings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_store_listings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
          {
            foreignKeyName: "module_store_listings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      module_tags: {
        Row: {
          id: number
          moduleid: number
          tagid: number
        }
        Insert: {
          id?: number
          moduleid: number
          tagid: number
        }
        Update: {
          id?: number
          moduleid?: number
          tagid?: number
        }
        Relationships: [
          {
            foreignKeyName: "module_tags_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_tags_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_tags_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_tags_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
          {
            foreignKeyName: "module_tags_tagid_fkey"
            columns: ["tagid"]
            isOneToOne: false
            referencedRelation: "api_v1_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_tags_tagid_fkey"
            columns: ["tagid"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          additional: Json
          created: string
          depth: number | null
          depthMax: number | null
          description: string | null
          hp: number
          id: number
          isApproved: boolean
          isComplete: boolean
          isDIY: boolean
          manualURL: string | null
          manufacturerId: number
          name: string
          powerNeg12: number | null
          powerPos12: number | null
          powerPos5: number | null
          public: boolean
          res1: number | null
          res2: number | null
          standard: number
          store_url: string | null
          submitter: string | null
          switches: Json
          updated: string
          weight: number | null
        }
        Insert: {
          additional?: Json
          created?: string
          depth?: number | null
          depthMax?: number | null
          description?: string | null
          hp: number
          id?: number
          isApproved?: boolean
          isComplete?: boolean
          isDIY?: boolean
          manualURL?: string | null
          manufacturerId: number
          name: string
          powerNeg12?: number | null
          powerPos12?: number | null
          powerPos5?: number | null
          public?: boolean
          res1?: number | null
          res2?: number | null
          standard?: number
          store_url?: string | null
          submitter?: string | null
          switches?: Json
          updated?: string
          weight?: number | null
        }
        Update: {
          additional?: Json
          created?: string
          depth?: number | null
          depthMax?: number | null
          description?: string | null
          hp?: number
          id?: number
          isApproved?: boolean
          isComplete?: boolean
          isDIY?: boolean
          manualURL?: string | null
          manufacturerId?: number
          name?: string
          powerNeg12?: number | null
          powerPos12?: number | null
          powerPos5?: number | null
          public?: boolean
          res1?: number | null
          res2?: number | null
          standard?: number
          store_url?: string | null
          submitter?: string | null
          switches?: Json
          updated?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_manufacturerId_fkey"
            columns: ["manufacturerId"]
            isOneToOne: false
            referencedRelation: "api_v1_manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_manufacturerId_fkey"
            columns: ["manufacturerId"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_manufacturerId_fkey"
            columns: ["manufacturerId"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["manufacturer_id"]
          },
          {
            foreignKeyName: "modules_standard_fkey"
            columns: ["standard"]
            isOneToOne: false
            referencedRelation: "api_v1_standards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_standard_fkey"
            columns: ["standard"]
            isOneToOne: false
            referencedRelation: "standards"
            referencedColumns: ["id"]
          },
        ]
      }
      patch_connections: {
        Row: {
          a: number
          b: number
          instance_id_a: number | null
          instance_id_b: number | null
          notes: string | null
          ordinal: number
          patchid: number
        }
        Insert: {
          a: number
          b: number
          instance_id_a?: number | null
          instance_id_b?: number | null
          notes?: string | null
          ordinal: number
          patchid: number
        }
        Update: {
          a?: number
          b?: number
          instance_id_a?: number | null
          instance_id_b?: number | null
          notes?: string | null
          ordinal?: number
          patchid?: number
        }
        Relationships: [
          {
            foreignKeyName: "patch_connections_a_fkey"
            columns: ["a"]
            isOneToOne: false
            referencedRelation: "api_v1_module_outs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patch_connections_a_fkey"
            columns: ["a"]
            isOneToOne: false
            referencedRelation: "module_outs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patch_connections_b_fkey"
            columns: ["b"]
            isOneToOne: false
            referencedRelation: "api_v1_module_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patch_connections_b_fkey"
            columns: ["b"]
            isOneToOne: false
            referencedRelation: "module_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patch_connections_instance_id_a_fkey"
            columns: ["instance_id_a"]
            isOneToOne: false
            referencedRelation: "patch_module_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patch_connections_instance_id_b_fkey"
            columns: ["instance_id_b"]
            isOneToOne: false
            referencedRelation: "patch_module_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patch_connections_patchid_fkey"
            columns: ["patchid"]
            isOneToOne: false
            referencedRelation: "patches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patch_connections_patchid_fkey"
            columns: ["patchid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["patchid"]
          },
        ]
      }
      patch_module_instances: {
        Row: {
          id: number
          instance_label: string | null
          module_id: number
          patch_id: number
        }
        Insert: {
          id?: never
          instance_label?: string | null
          module_id: number
          patch_id: number
        }
        Update: {
          id?: never
          instance_label?: string | null
          module_id?: number
          patch_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "patch_module_instances_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patch_module_instances_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patch_module_instances_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patch_module_instances_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
          {
            foreignKeyName: "patch_module_instances_patch_id_fkey"
            columns: ["patch_id"]
            isOneToOne: false
            referencedRelation: "patches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patch_module_instances_patch_id_fkey"
            columns: ["patch_id"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["patchid"]
          },
        ]
      }
      patches: {
        Row: {
          authorid: string
          created: string
          description: string | null
          id: number
          image: string | null
          linked_rack_id: number | null
          name: string | null
          public: boolean
          public_id: string
          tags: string[]
          updated: string
        }
        Insert: {
          authorid: string
          created?: string
          description?: string | null
          id?: number
          image?: string | null
          linked_rack_id?: number | null
          name?: string | null
          public?: boolean
          public_id?: string
          tags?: string[]
          updated?: string
        }
        Update: {
          authorid?: string
          created?: string
          description?: string | null
          id?: number
          image?: string | null
          linked_rack_id?: number | null
          name?: string | null
          public?: boolean
          public_id?: string
          tags?: string[]
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "patches_authorid_fkey"
            columns: ["authorid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patches_linked_rack_id_fkey"
            columns: ["linked_rack_id"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          confirmed: boolean
          created_at: string
          email: string
          id: string
          public: boolean
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          confirmed?: boolean
          created_at?: string
          email: string
          id: string
          public?: boolean
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          confirmed?: boolean
          created_at?: string
          email?: string
          id?: string
          public?: boolean
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      shipping_addresses: {
        Row: {
          city: string
          country_code: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          line1: string
          line2: string | null
          postal_code: string | null
          profileid: string
          recipient_name: string
          region: string | null
          updated_at: string
        }
        Insert: {
          city: string
          country_code: string
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          line1: string
          line2?: string | null
          postal_code?: string | null
          profileid: string
          recipient_name: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          city?: string
          country_code?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          line1?: string
          line2?: string | null
          postal_code?: string | null
          profileid?: string
          recipient_name?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_addresses_profileid_fkey"
            columns: ["profileid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rack_modules: {
        Row: {
          column: number | null
          created: string
          id: number
          moduleid: number
          orientation: "normal" | "rot180"
          rackid: number
          row: number | null
          selected_panel_id: number | null
          updated: string
        }
        Insert: {
          column?: number | null
          created?: string
          id?: number
          moduleid: number
          orientation?: "normal" | "rot180"
          rackid: number
          row?: number | null
          selected_panel_id?: number | null
          updated?: string
        }
        Update: {
          column?: number | null
          created?: string
          id?: number
          moduleid?: number
          orientation?: "normal" | "rot180"
          rackid?: number
          row?: number | null
          selected_panel_id?: number | null
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "rack_modules_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_modules_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_modules_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_modules_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
          {
            foreignKeyName: "rack_modules_rackid_fkey"
            columns: ["rackid"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_modules_selected_panel_id_fkey"
            columns: ["selected_panel_id"]
            isOneToOne: false
            referencedRelation: "api_v1_module_panels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_modules_selected_panel_id_fkey"
            columns: ["selected_panel_id"]
            isOneToOne: false
            referencedRelation: "module_panels"
            referencedColumns: ["id"]
          },
        ]
      }
      racks: {
        Row: {
          authorid: string
          created: string
          description: string | null
          hp: number
          id: number
          image: string | null
          locked: boolean
          name: string | null
          public: boolean
          public_id: string
          rows: number
          updated: string
        }
        Insert: {
          authorid: string
          created?: string
          description?: string | null
          hp?: number
          id?: number
          image?: string | null
          locked?: boolean
          name?: string | null
          public?: boolean
          public_id?: string
          rows?: number
          updated?: string
        }
        Update: {
          authorid?: string
          created?: string
          description?: string | null
          hp?: number
          id?: number
          image?: string | null
          locked?: boolean
          name?: string | null
          public?: boolean
          public_id?: string
          rows?: number
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "racks_authorid_fkey"
            columns: ["authorid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reaction_counts: {
        Row: {
          entity_id: number
          entity_type: number
          kind: string
          total: number
          updated_at: string
        }
        Insert: {
          entity_id: number
          entity_type: number
          kind?: string
          total?: number
          updated_at?: string
        }
        Update: {
          entity_id?: number
          entity_type?: number
          kind?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          entity_id: number
          entity_type: number
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: number
          entity_type: number
          kind?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: number
          entity_type?: number
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      standards: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          active: boolean
          adapter_kind: string
          base_url: string
          country_code: string | null
          created_at: string
          currency_hint: string | null
          id: number
          name: string
          price_tracking_enabled: boolean
          rate_limit_per_day: number
          search_url_template: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          adapter_kind?: string
          base_url: string
          country_code?: string | null
          created_at?: string
          currency_hint?: string | null
          id?: number
          name: string
          price_tracking_enabled?: boolean
          rate_limit_per_day?: number
          search_url_template?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          adapter_kind?: string
          base_url?: string
          country_code?: string | null
          created_at?: string
          currency_hint?: string | null
          id?: number
          name?: string
          price_tracking_enabled?: boolean
          rate_limit_per_day?: number
          search_url_template?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: number
          name: string
          type: number
        }
        Insert: {
          id?: number
          name: string
          type: number
        }
        Update: {
          id?: number
          name?: string
          type?: number
        }
        Relationships: []
      }
      user_module_tags: {
        Row: {
          authorid: string
          moduletagid: number
        }
        Insert: {
          authorid: string
          moduletagid: number
        }
        Update: {
          authorid?: string
          moduletagid?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_module_tags_authorid_fkey"
            columns: ["authorid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_tags_moduletagid_fkey"
            columns: ["moduletagid"]
            isOneToOne: false
            referencedRelation: "api_v1_module_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_tags_moduletagid_fkey"
            columns: ["moduletagid"]
            isOneToOne: false
            referencedRelation: "module_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      user_modules: {
        Row: {
          kind: Database["public"]["Enums"]["user module possession"]
          moduleid: number
          profileid: string
          updated: string
        }
        Insert: {
          kind?: Database["public"]["Enums"]["user module possession"]
          moduleid: number
          profileid: string
          updated?: string
        }
        Update: {
          kind?: Database["public"]["Enums"]["user module possession"]
          moduleid?: number
          profileid?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_modules_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_modules_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_modules_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_modules_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
          {
            foreignKeyName: "user_modules_profileid_fkey"
            columns: ["profileid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      api_v1_manufacturers: {
        Row: {
          description: string | null
          id: number | null
          logo: string | null
          name: string | null
          social_links: Json | null
          tagline: string | null
          websiteURL: string | null
        }
        Insert: {
          description?: string | null
          id?: number | null
          logo?: string | null
          name?: string | null
          social_links?: Json | null
          tagline?: string | null
          websiteURL?: string | null
        }
        Update: {
          description?: string | null
          id?: number | null
          logo?: string | null
          name?: string | null
          social_links?: Json | null
          tagline?: string | null
          websiteURL?: string | null
        }
        Relationships: []
      }
      api_v1_module_ins: {
        Row: {
          id: number | null
          isAudio: boolean | null
          isDCC: boolean | null
          isVOCT: boolean | null
          max: number | null
          min: number | null
          moduleid: number | null
          name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moduleINs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleINs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleINs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleINs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
        ]
      }
      api_v1_module_outs: {
        Row: {
          id: number | null
          isAudio: boolean | null
          isDCC: boolean | null
          isVOCT: boolean | null
          max: number | null
          min: number | null
          moduleid: number | null
          name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moduleOUTs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleOUTs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleOUTs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moduleOUTs_moduleId_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
        ]
      }
      api_v1_module_panels: {
        Row: {
          color: number | null
          description: string | null
          id: number | null
          moduleid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "module_panels_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_panels_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_panels_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_panels_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
        ]
      }
      api_v1_module_tags: {
        Row: {
          id: number | null
          moduleid: number | null
          tagid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "module_tags_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_tags_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_tags_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_tags_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
          {
            foreignKeyName: "module_tags_tagid_fkey"
            columns: ["tagid"]
            isOneToOne: false
            referencedRelation: "api_v1_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_tags_tagid_fkey"
            columns: ["tagid"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      api_v1_modules: {
        Row: {
          depth: number | null
          depthMax: number | null
          description: string | null
          hp: number | null
          id: number | null
          isDIY: boolean | null
          manualURL: string | null
          manufacturerId: number | null
          name: string | null
          powerNeg12: number | null
          powerPos12: number | null
          powerPos5: number | null
          standard: number | null
          switches: Json | null
          weight: number | null
        }
        Insert: {
          depth?: number | null
          depthMax?: number | null
          description?: string | null
          hp?: number | null
          id?: number | null
          isDIY?: boolean | null
          manualURL?: string | null
          manufacturerId?: number | null
          name?: string | null
          powerNeg12?: number | null
          powerPos12?: number | null
          powerPos5?: number | null
          standard?: number | null
          switches?: Json | null
          weight?: number | null
        }
        Update: {
          depth?: number | null
          depthMax?: number | null
          description?: string | null
          hp?: number | null
          id?: number | null
          isDIY?: boolean | null
          manualURL?: string | null
          manufacturerId?: number | null
          name?: string | null
          powerNeg12?: number | null
          powerPos12?: number | null
          powerPos5?: number | null
          standard?: number | null
          switches?: Json | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_manufacturerId_fkey"
            columns: ["manufacturerId"]
            isOneToOne: false
            referencedRelation: "api_v1_manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_manufacturerId_fkey"
            columns: ["manufacturerId"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_manufacturerId_fkey"
            columns: ["manufacturerId"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["manufacturer_id"]
          },
          {
            foreignKeyName: "modules_standard_fkey"
            columns: ["standard"]
            isOneToOne: false
            referencedRelation: "api_v1_standards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_standard_fkey"
            columns: ["standard"]
            isOneToOne: false
            referencedRelation: "standards"
            referencedColumns: ["id"]
          },
        ]
      }
      api_v1_standards: {
        Row: {
          id: number | null
          name: string | null
        }
        Insert: {
          id?: number | null
          name?: string | null
        }
        Update: {
          id?: number | null
          name?: string | null
        }
        Relationships: []
      }
      api_v1_tags: {
        Row: {
          id: number | null
          name: string | null
          type: number | null
        }
        Insert: {
          id?: number | null
          name?: string | null
          type?: number | null
        }
        Update: {
          id?: number | null
          name?: string | null
          type?: number | null
        }
        Relationships: []
      }
      module_discovery_snapshot: {
        Row: {
          bucket: string | null
          id: number | null
          manufacturer_id: number | null
          manufacturer_name: string | null
          name: string | null
          trend_count: number | null
        }
        Relationships: []
      }
      module_flag_counts: {
        Row: {
          module_id: number | null
          open_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "module_flags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_flags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_flags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_flags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
        ]
      }
      patches_for_modules: {
        Row: {
          moduleid: number | null
          patchid: number | null
        }
        Relationships: []
      }
      rack_modules_grouped_by_moduleid: {
        Row: {
          column: number | null
          created: string | null
          id: number | null
          moduleid: number | null
          rackid: number | null
          row: number | null
          updated: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rack_modules_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "api_v1_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_modules_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "module_discovery_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_modules_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_modules_moduleid_fkey"
            columns: ["moduleid"]
            isOneToOne: false
            referencedRelation: "patches_for_modules"
            referencedColumns: ["moduleid"]
          },
          {
            foreignKeyName: "rack_modules_rackid_fkey"
            columns: ["rackid"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_api_key: {
        Args: { p_label: string }
        Returns: {
          id: string
          prefix: string
          raw_key: string
          tier: string
        }[]
      }
      create_partner_api_key: {
        Args: { p_label: string; p_profile_id: string }
        Returns: {
          id: string
          prefix: string
          raw_key: string
          tier: string
        }[]
      }
      delete_current_user_account: { Args: never; Returns: undefined }
      delete_module_collection: {
        Args: { p_collection_id: number }
        Returns: undefined
      }
      generate_public_id: { Args: { p_len?: number }; Returns: string }
      get_application_insights_snapshot: {
        Args: { p_days?: number }
        Returns: {
          activity_series: Json
          module_insights: Json
          statistics: Json
        }[]
      }
      get_current_user_module_collection_by_id: {
        Args: { p_collection_id: number }
        Returns: {
          author: Json
          authorid: string
          created: string
          description: string
          entries: Json
          id: number
          image: string
          module_count: number
          name: string
          public: boolean
          public_id: string
          updated: string
        }[]
      }
      get_current_user_module_collections: {
        Args: { p_from?: number; p_to?: number }
        Returns: {
          author: Json
          authorid: string
          created: string
          description: string
          id: number
          image: string
          module_count: number
          name: string
          public: boolean
          public_id: string
          updated: string
        }[]
      }
      get_module_collections_for_module: {
        Args: { p_module_id: number }
        Returns: {
          author: Json
          authorid: string
          created: string
          description: string
          id: number
          image: string
          module_count: number
          name: string
          public: boolean
          public_id: string
          updated: string
        }[]
      }
      get_module_discovery_snapshot: {
        Args: { p_limit?: number; p_min_count?: number }
        Returns: {
          most_owned: Json
          most_sold: Json
          most_wanted: Json
        }[]
      }
      get_module_open_flag_count: {
        Args: { p_module_id: number }
        Returns: number
      }
      get_module_usage_summary: {
        Args: { p_module_id: number }
        Returns: {
          hidden_patch_count: number
          hidden_rack_count: number
          public_patch_count: number
          public_rack_count: number
        }[]
      }
      get_module_usage_summary_bucketed: {
        Args: { p_module_id: number }
        Returns: {
          hidden_patch_bucket: string
          hidden_rack_bucket: string
          public_patch_count: number
          public_rack_count: number
        }[]
      }
      get_patch_by_public_id: {
        Args: { p_public_id: string }
        Returns: {
          author: Json
          authorid: string
          created: string
          description: string
          id: number
          linked_rack_id: number
          name: string
          public: boolean
          public_id: string
          tags: string[]
          updated: string
        }[]
      }
      get_public_module_collection_by_public_id: {
        Args: { p_public_id: string }
        Returns: {
          author: Json
          authorid: string
          created: string
          description: string
          entries: Json
          id: number
          image: string
          module_count: number
          name: string
          public: boolean
          public_id: string
          updated: string
        }[]
      }
      get_public_module_collections: {
        Args: { p_from?: number; p_to?: number }
        Returns: {
          author: Json
          authorid: string
          created: string
          description: string
          id: number
          image: string
          module_count: number
          name: string
          public: boolean
          public_id: string
          updated: string
        }[]
      }
      get_public_patches_for_module: {
        Args: {
          p_from?: number
          p_module_id: number
          p_order_by?: string
          p_order_direction?: string
          p_to?: number
        }
        Returns: {
          author: Json
          created: string
          description: string
          id: number
          name: string
          public: boolean
          tags: string[]
          updated: string
        }[]
      }
      get_rack_by_public_id: {
        Args: { p_public_id: string }
        Returns: {
          author: Json
          authorid: string
          created: string
          description: string
          hp: number
          id: number
          image: string
          locked: boolean
          name: string
          public: boolean
          public_id: string
          rows: number
          updated: string
        }[]
      }
      is_reaction_entity_eligible: {
        Args: { p_entity_id: number; p_entity_type: number }
        Returns: boolean
      }
      price_hub_latest_snapshots: {
        Args: { p_listing_ids: number[] }
        Returns: {
          availability: string
          created_at: string
          currency: string | null
          id: number
          listing_id: number
          observed_at: string
          price_amount_minor: number | null
          raw_meta: Json
          source: string
        }[]
        SetofOptions: {
          from: "*"
          to: "module_price_snapshots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_api_key_usage: {
        Args: { p_key_id: string; p_month: string; p_used: number }
        Returns: undefined
      }
      refresh_module_discovery_snapshot: { Args: never; Returns: undefined }
      reorder_listing_media: {
        Args: { p_listing_id: string; p_media_ids: string[] }
        Returns: {
          created_at: string
          id: string
          kind: string
          listing_id: string
          mime_type: string
          position: number
          storage_path: string
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "listing_media"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      resolve_public_patch_legacy_id: {
        Args: { p_id: number }
        Returns: string
      }
      resolve_public_rack_legacy_id: { Args: { p_id: number }; Returns: string }
      revoke_api_key: { Args: { p_id: string }; Returns: undefined }
      save_module_collection: {
        Args: {
          p_collection_id?: number
          p_description?: string
          p_image?: string
          p_module_ids?: number[]
          p_name: string
          p_public?: boolean
        }
        Returns: number
      }
      verify_api_key: {
        Args: { p_hash: string }
        Returns: {
          id: string
          monthly_quota: number
          per_minute_quota: number
          profile_id: string
          tier_code: string
        }[]
      }
    }
    Enums: {
      "user module possession": "HAS" | "WANTS" | "SELLS"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      "user module possession": ["HAS", "WANTS", "SELLS"],
    },
  },
} as const
