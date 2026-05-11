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
            referencedRelation: "manufacturers"
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
          name: string | null
          public: boolean
          tags: string[]
          updated: string
        }
        Insert: {
          authorid: string
          created?: string
          description?: string | null
          id?: number
          name?: string | null
          public?: boolean
          tags?: string[]
          updated?: string
        }
        Update: {
          authorid?: string
          created?: string
          description?: string | null
          id?: number
          name?: string | null
          public?: boolean
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
      rack_modules: {
        Row: {
          column: number | null
          created: string
          id: number
          moduleid: number
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
      delete_current_user_account: { Args: never; Returns: undefined }
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
