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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      deliverables: {
        Row: {
          created_at: string
          id: string
          project_id: string
          share_token: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          share_token?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          share_token?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_pins: {
        Row: {
          author_name: string
          comment: string
          created_at: string
          id: string
          is_resolved: boolean
          version_id: string
          x_coord_pct: number
          y_coord_pct: number
        }
        Insert: {
          author_name?: string
          comment: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          version_id: string
          x_coord_pct: number
          y_coord_pct: number
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          version_id?: string
          x_coord_pct?: number
          y_coord_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedback_pins_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_name: string | null
          created_at: string
          creator_id: string
          id: string
          title: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          creator_id: string
          id?: string
          title: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      versions: {
        Row: {
          approved_at: string | null
          approved_by_name: string | null
          created_at: string
          deliverable_id: string
          id: string
          image_url: string
          status: Database["public"]["Enums"]["version_status"]
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by_name?: string | null
          created_at?: string
          deliverable_id: string
          id?: string
          image_url: string
          status?: Database["public"]["Enums"]["version_status"]
          version_number: number
        }
        Update: {
          approved_at?: string | null
          approved_by_name?: string | null
          created_at?: string
          deliverable_id?: string
          id?: string
          image_url?: string
          status?: Database["public"]["Enums"]["version_status"]
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "versions_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_pin_by_token: {
        Args: {
          p_author?: string
          p_comment: string
          p_token: string
          p_version_id: string
          p_x: number
          p_y: number
        }
        Returns: {
          author_name: string
          comment: string
          created_at: string
          id: string
          is_resolved: boolean
          version_id: string
          x_coord_pct: number
          y_coord_pct: number
        }
        SetofOptions: {
          from: "*"
          to: "feedback_pins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_version_by_token: {
        Args: { p_client_name: string; p_token: string; p_version_id: string }
        Returns: {
          approved_at: string | null
          approved_by_name: string | null
          created_at: string
          deliverable_id: string
          id: string
          image_url: string
          status: Database["public"]["Enums"]["version_status"]
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_review: { Args: { p_token: string }; Returns: Json }
    }
    Enums: {
      version_status: "pending_review" | "changes_requested" | "approved"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      version_status: ["pending_review", "changes_requested", "approved"],
    },
  },
} as const
