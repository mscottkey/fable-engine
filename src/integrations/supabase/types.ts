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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_events: {
        Row: {
          cache_hit: boolean
          completion_chars: number
          completion_hash: string
          cost_usd: number
          created_at: string
          error_code: string | null
          feature: string
          game_id: string | null
          http_status: number | null
          id: string
          input_tokens: number
          latency_ms: number
          model: string
          output_tokens: number
          phase: string
          pricing_id: string | null
          prompt_chars: number
          prompt_hash: string
          provider: string
          response_mode: string
          retry_count: number
          seed_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          cache_hit?: boolean
          completion_chars?: number
          completion_hash: string
          cost_usd?: number
          created_at?: string
          error_code?: string | null
          feature: string
          game_id?: string | null
          http_status?: number | null
          id?: string
          input_tokens?: number
          latency_ms?: number
          model: string
          output_tokens?: number
          phase: string
          pricing_id?: string | null
          prompt_chars?: number
          prompt_hash: string
          provider: string
          response_mode: string
          retry_count?: number
          seed_id?: string | null
          status: string
          user_id: string
        }
        Update: {
          cache_hit?: boolean
          completion_chars?: number
          completion_hash?: string
          cost_usd?: number
          created_at?: string
          error_code?: string | null
          feature?: string
          game_id?: string | null
          http_status?: number | null
          id?: string
          input_tokens?: number
          latency_ms?: number
          model?: string
          output_tokens?: number
          phase?: string
          pricing_id?: string | null
          prompt_chars?: number
          prompt_hash?: string
          provider?: string
          response_mode?: string
          retry_count?: number
          seed_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_events_pricing_id_fkey"
            columns: ["pricing_id"]
            isOneToOne: false
            referencedRelation: "model_pricing"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_seeds: {
        Row: {
          constraints: Json | null
          created_at: string
          difficulty_desc: string
          difficulty_label: Database["public"]["Enums"]["difficulty_label"]
          generation_attempts: number | null
          generation_status: string | null
          genre: Database["public"]["Enums"]["genre"]
          hooks: Json
          id: string
          last_generation_at: string | null
          name: string
          notable_locations: Json
          original_user_prompt: string | null
          sanitization_report: Json | null
          sanitized_user_prompt: string | null
          scenario_description: string
          scenario_title: string
          seed: number
          setting: string
          source_type: string | null
          story_overview_draft: Json | null
          tone_levers: Json
          tone_vibe: string
          user_id: string
          user_prompt: string | null
        }
        Insert: {
          constraints?: Json | null
          created_at?: string
          difficulty_desc: string
          difficulty_label: Database["public"]["Enums"]["difficulty_label"]
          generation_attempts?: number | null
          generation_status?: string | null
          genre: Database["public"]["Enums"]["genre"]
          hooks: Json
          id?: string
          last_generation_at?: string | null
          name: string
          notable_locations: Json
          original_user_prompt?: string | null
          sanitization_report?: Json | null
          sanitized_user_prompt?: string | null
          scenario_description: string
          scenario_title: string
          seed: number
          setting: string
          source_type?: string | null
          story_overview_draft?: Json | null
          tone_levers: Json
          tone_vibe: string
          user_id: string
          user_prompt?: string | null
        }
        Update: {
          constraints?: Json | null
          created_at?: string
          difficulty_desc?: string
          difficulty_label?: Database["public"]["Enums"]["difficulty_label"]
          generation_attempts?: number | null
          generation_status?: string | null
          genre?: Database["public"]["Enums"]["genre"]
          hooks?: Json
          id?: string
          last_generation_at?: string | null
          name?: string
          notable_locations?: Json
          original_user_prompt?: string | null
          sanitization_report?: Json | null
          sanitized_user_prompt?: string | null
          scenario_description?: string
          scenario_title?: string
          seed?: number
          setting?: string
          source_type?: string | null
          story_overview_draft?: Json | null
          tone_levers?: Json
          tone_vibe?: string
          user_id?: string
          user_prompt?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          created_at: string
          id: string
          name: string
          seed_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          seed_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          seed_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_seed_id_fkey"
            columns: ["seed_id"]
            isOneToOne: false
            referencedRelation: "campaign_seeds"
            referencedColumns: ["id"]
          },
        ]
      }
      model_pricing: {
        Row: {
          created_at: string
          effective_from: string
          id: string
          input_rate: number
          model: string
          output_rate: number
          provider: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          id?: string
          input_rate: number
          model: string
          output_rate: number
          provider: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: string
          input_rate?: number
          model?: string
          output_rate?: number
          provider?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_pronouns: string | null
          default_voice_uri: string | null
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_pronouns?: string | null
          default_voice_uri?: string | null
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_pronouns?: string | null
          default_voice_uri?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      story_overviews: {
        Row: {
          core_conflict: string
          created_at: string
          expanded_setting: string
          id: string
          name: string
          notable_locations: Json
          seed_id: string
          session_zero: Json
          story_hooks: Json
          tone_manifesto: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          core_conflict: string
          created_at?: string
          expanded_setting: string
          id?: string
          name: string
          notable_locations?: Json
          seed_id: string
          session_zero?: Json
          story_hooks?: Json
          tone_manifesto?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          core_conflict?: string
          created_at?: string
          expanded_setting?: string
          id?: string
          name?: string
          notable_locations?: Json
          seed_id?: string
          session_zero?: Json
          story_hooks?: Json
          tone_manifesto?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      difficulty_label: "Easy" | "Standard" | "Hard"
      genre:
        | "Fantasy"
        | "Sci-Fi"
        | "Modern"
        | "Horror"
        | "Historical"
        | "Post-Apocalyptic"
        | "Space Opera"
        | "Urban Fantasy"
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
      difficulty_label: ["Easy", "Standard", "Hard"],
      genre: [
        "Fantasy",
        "Sci-Fi",
        "Modern",
        "Horror",
        "Historical",
        "Post-Apocalyptic",
        "Space Opera",
        "Urban Fantasy",
      ],
    },
  },
} as const
