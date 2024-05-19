export type Json =
  | string
  | number
  | boolean
  | null
  | {
  [key: string]: Json | undefined
}
  | Json[]

export type Database = {
  public: {
    Tables: {
      manufacturers: {
        Row: {
          adminUser: string | null
          id: number
          logo: string | null
          name: string | null
          websiteURL: string | null
        }
        Insert: {
          adminUser?: string | null
          id?: number
          logo?: string | null
          name?: string | null
          websiteURL?: string | null
        }
        Update: {
          adminUser?: string | null
          id?: number
          logo?: string | null
          name?: string | null
          websiteURL?: string | null
        }
        Relationships: []
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
            foreignKeyName: "module_ins_profiles_id_fk"
            columns: ["authorid"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "module_outs_profiles_id_fk"
            columns: ["authorid"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          additional: Json
          created: string
          description: string | null
          hp: number
          id: number
          isApproved: boolean
          isComplete: boolean
          isDIY: boolean
          manualURL: string | null
          manufacturerId: number
          name: string
          public: boolean
          standard: number
          submitter: string | null
          switches: Json
          updated: string
        }
        Insert: {
          additional?: Json
          created?: string
          description?: string | null
          hp: number
          id?: number
          isApproved?: boolean
          isComplete?: boolean
          isDIY?: boolean
          manualURL?: string | null
          manufacturerId: number
          name: string
          public?: boolean
          standard?: number
          submitter?: string | null
          switches?: Json
          updated?: string
        }
        Update: {
          additional?: Json
          created?: string
          description?: string | null
          hp?: number
          id?: number
          isApproved?: boolean
          isComplete?: boolean
          isDIY?: boolean
          manualURL?: string | null
          manufacturerId?: number
          name?: string
          public?: boolean
          standard?: number
          submitter?: string | null
          switches?: Json
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_manufacturerId_fkey"
            columns: ["manufacturerId"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_standards_id_fk"
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
          notes: string | null
          ordinal: number
          patchid: number
        }
        Insert: {
          a: number
          b: number
          notes?: string | null
          ordinal: number
          patchid: number
        }
        Update: {
          a?: number
          b?: number
          notes?: string | null
          ordinal?: number
          patchid?: number
        }
        Relationships: [
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
            referencedRelation: "module_ins"
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
      patches: {
        Row: {
          authorid: string
          created: string
          description: string | null
          id: number
          name: string | null
          updated: string
        }
        Insert: {
          authorid: string
          created?: string
          description?: string | null
          id?: number
          name?: string | null
          updated?: string
        }
        Update: {
          authorid?: string
          created?: string
          description?: string | null
          id?: number
          name?: string | null
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "patches_authorId_fkey"
            columns: ["authorid"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
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
          rackid: number
          row: number | null
          updated: string
        }
        Insert: {
          column?: number | null
          created?: string
          id?: number
          moduleid: number
          rackid: number
          row?: number | null
          updated?: string
        }
        Update: {
          column?: number | null
          created?: string
          id?: number
          moduleid?: number
          rackid?: number
          row?: number | null
          updated?: string
        }
        Relationships: [
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
      racks: {
        Row: {
          authorid: string
          created: string
          description: string | null
          hp: number
          id: number
          locked: boolean
          name: string | null
          public: boolean
          rows: number
          updated: string
        }
        Insert: {
          authorid: string
          created?: string
          description?: string | null
          hp?: number
          id?: number
          locked?: boolean
          name?: string | null
          public?: boolean
          rows?: number
          updated?: string
        }
        Update: {
          authorid?: string
          created?: string
          description?: string | null
          hp?: number
          id?: number
          locked?: boolean
          name?: string | null
          public?: boolean
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
            foreignKeyName: "user_module_tags_module_tags_id_fk"
            columns: ["moduletagid"]
            isOneToOne: false
            referencedRelation: "module_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_tags_profiles_id_fk"
            columns: ["authorid"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_modules: {
        Row: {
          moduleid: number
          profileid: string
          updated: string
        }
        Insert: {
          moduleid: number
          profileid: string
          updated?: string
        }
        Update: {
          moduleid?: number
          profileid?: string
          updated?: string
        }
        Relationships: [
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | {
    schema: keyof Database
  },
  TableName extends PublicTableNameOrOptions extends {
      schema: keyof Database
    }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends {
    schema: keyof Database
  }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends | keyof PublicSchema["Tables"]
    | {
    schema: keyof Database
  },
  TableName extends PublicTableNameOrOptions extends {
      schema: keyof Database
    }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends {
    schema: keyof Database
  }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends | keyof PublicSchema["Tables"]
    | {
    schema: keyof Database
  },
  TableName extends PublicTableNameOrOptions extends {
      schema: keyof Database
    }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends {
    schema: keyof Database
  }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends | keyof PublicSchema["Enums"]
    | {
    schema: keyof Database
  },
  EnumName extends PublicEnumNameOrOptions extends {
      schema: keyof Database
    }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends {
    schema: keyof Database
  }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never