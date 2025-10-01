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
          deleted_at: string | null
          difficulty_desc: string
          difficulty_label: Database["public"]["Enums"]["difficulty_label"]
          generation_attempts: number | null
          generation_status: string
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
          deleted_at?: string | null
          difficulty_desc: string
          difficulty_label: Database["public"]["Enums"]["difficulty_label"]
          generation_attempts?: number | null
          generation_status?: string
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
          deleted_at?: string | null
          difficulty_desc?: string
          difficulty_label?: Database["public"]["Enums"]["difficulty_label"]
          generation_attempts?: number | null
          generation_status?: string
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
      character_lineups: {
        Row: {
          cost_usd: number
          created_at: string
          game_id: string
          id: string
          input_tokens: number
          lineup_json: Json
          model: string
          output_tokens: number
          provider: string
          seed_id: string
          story_overview_id: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          game_id: string
          id?: string
          input_tokens?: number
          lineup_json: Json
          model: string
          output_tokens?: number
          provider: string
          seed_id: string
          story_overview_id?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string
          game_id?: string
          id?: string
          input_tokens?: number
          lineup_json?: Json
          model?: string
          output_tokens?: number
          provider?: string
          seed_id?: string
          story_overview_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_lineups_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_lineups_seed_id_fkey"
            columns: ["seed_id"]
            isOneToOne: false
            referencedRelation: "campaign_seeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_lineups_story_overview_id_fkey"
            columns: ["story_overview_id"]
            isOneToOne: false
            referencedRelation: "story_overviews"
            referencedColumns: ["id"]
          },
        ]
      }
      character_seeds: {
        Row: {
          archetype_prefs: Json | null
          complexity: string | null
          concept: string | null
          created_at: string
          display_name: string | null
          game_id: string
          id: string
          keep_name: boolean
          mechanics_comfort: string | null
          must_have: Json | null
          no_thanks: Json | null
          pronouns: string | null
          role_tags_interest: Json | null
          slot_id: string
          timezone: string | null
          tone_comfort: Json | null
          tts_voice: string | null
          updated_at: string
          user_id: string
          violence_comfort: string | null
        }
        Insert: {
          archetype_prefs?: Json | null
          complexity?: string | null
          concept?: string | null
          created_at?: string
          display_name?: string | null
          game_id: string
          id?: string
          keep_name?: boolean
          mechanics_comfort?: string | null
          must_have?: Json | null
          no_thanks?: Json | null
          pronouns?: string | null
          role_tags_interest?: Json | null
          slot_id: string
          timezone?: string | null
          tone_comfort?: Json | null
          tts_voice?: string | null
          updated_at?: string
          user_id: string
          violence_comfort?: string | null
        }
        Update: {
          archetype_prefs?: Json | null
          complexity?: string | null
          concept?: string | null
          created_at?: string
          display_name?: string | null
          game_id?: string
          id?: string
          keep_name?: boolean
          mechanics_comfort?: string | null
          must_have?: Json | null
          no_thanks?: Json | null
          pronouns?: string | null
          role_tags_interest?: Json | null
          slot_id?: string
          timezone?: string | null
          tone_comfort?: Json | null
          tts_voice?: string | null
          updated_at?: string
          user_id?: string
          violence_comfort?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_seeds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_seeds_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "party_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          created_at: string
          game_id: string
          id: string
          pc_json: Json
          seed_id: string
          slot_id: string
          status: string
          status_changed_at: string | null
          updated_at: string | null
          user_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          pc_json: Json
          seed_id: string
          slot_id: string
          status?: string
          status_changed_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          pc_json?: Json
          seed_id?: string
          slot_id?: string
          status?: string
          status_changed_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "characters_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_seed_id_fkey"
            columns: ["seed_id"]
            isOneToOne: false
            referencedRelation: "campaign_seeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "party_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      game_invites: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          game_id: string
          id: string
          max_uses: number
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          game_id: string
          id?: string
          max_uses?: number
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          game_id?: string
          id?: string
          max_uses?: number
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_invites_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_members: {
        Row: {
          created_at: string
          game_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_members_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          party_locked: boolean
          party_size: number | null
          seed_id: string
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          party_locked?: boolean
          party_size?: number | null
          seed_id: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          party_locked?: boolean
          party_size?: number | null
          seed_id?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string | null
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
      generation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_stage: string | null
          error_message: string | null
          game_id: string
          id: string
          job_type: string
          progress: number | null
          result: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: string | null
          error_message?: string | null
          game_id: string
          id?: string
          job_type: string
          progress?: number | null
          result?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: string | null
          error_message?: string | null
          game_id?: string
          id?: string
          job_type?: string
          progress?: number | null
          result?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          key: string
          result: Json
        }
        Insert: {
          created_at?: string
          expires_at: string
          key: string
          result: Json
        }
        Update: {
          created_at?: string
          expires_at?: string
          key?: string
          result?: Json
        }
        Relationships: []
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
      party_slots: {
        Row: {
          claimed_by: string | null
          created_at: string
          game_id: string
          id: string
          index_in_party: number
          reserved_by: string | null
          status: string
          status_changed_at: string | null
          updated_at: string | null
        }
        Insert: {
          claimed_by?: string | null
          created_at?: string
          game_id: string
          id?: string
          index_in_party: number
          reserved_by?: string | null
          status?: string
          status_changed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          claimed_by?: string | null
          created_at?: string
          game_id?: string
          id?: string
          index_in_party?: number
          reserved_by?: string | null
          status?: string
          status_changed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_slots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_archetype_prefs: Json | null
          default_complexity: string | null
          default_mechanics_comfort: string | null
          default_must_have: Json | null
          default_no_thanks: Json | null
          default_pronouns: string | null
          default_role_tags_interest: Json | null
          default_timezone: string | null
          default_tone_comfort: Json | null
          default_violence_comfort: string | null
          default_voice_uri: string | null
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_archetype_prefs?: Json | null
          default_complexity?: string | null
          default_mechanics_comfort?: string | null
          default_must_have?: Json | null
          default_no_thanks?: Json | null
          default_pronouns?: string | null
          default_role_tags_interest?: Json | null
          default_timezone?: string | null
          default_tone_comfort?: Json | null
          default_violence_comfort?: string | null
          default_voice_uri?: string | null
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_archetype_prefs?: Json | null
          default_complexity?: string | null
          default_mechanics_comfort?: string | null
          default_must_have?: Json | null
          default_no_thanks?: Json | null
          default_pronouns?: string | null
          default_role_tags_interest?: Json | null
          default_timezone?: string | null
          default_tone_comfort?: Json | null
          default_violence_comfort?: string | null
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
          game_id: string | null
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
          game_id?: string | null
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
          game_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "story_overviews_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      ,
      // Campaign tables for AI phases
      factions: {
        Row: {
          id: string
          game_id: string
          seed_id: string
          version: number
          factions_json: Json
          relationships: Json
          fronts: Json
          provider: string
          model: string
          input_tokens: number
          output_tokens: number
          cost_usd: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          seed_id: string
          version?: number
          factions_json: Json
          relationships: Json
          fronts?: Json
          provider: string
          model: string
          input_tokens?: number
          output_tokens?: number
          cost_usd?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          seed_id?: string
          version?: number
          factions_json?: Json
          relationships?: Json
          fronts?: Json
          provider?: string
          model?: string
          input_tokens?: number
          output_tokens?: number
          cost_usd?: number
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      ,
      story_nodes: {
        Row: {
          id: string
          game_id: string
          seed_id: string
          factions_id: string
          version: number
          nodes_json: Json
          provider: string
          model: string
          input_tokens: number
          output_tokens: number
          cost_usd: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          seed_id: string
          factions_id: string
          version?: number
          nodes_json: Json
          provider: string
          model: string
          input_tokens?: number
          output_tokens?: number
          cost_usd?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          seed_id?: string
          factions_id?: string
          version?: number
          nodes_json?: Json
          provider?: string
          model?: string
          input_tokens?: number
          output_tokens?: number
          cost_usd?: number
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      ,
      campaign_arcs: {
        Row: {
          id: string
          game_id: string
          seed_id: string
          story_nodes_id: string
          version: number
          arcs_json: Json
          provider: string
          model: string
          input_tokens: number
          output_tokens: number
          cost_usd: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          seed_id: string
          story_nodes_id: string
          version?: number
          arcs_json: Json
          provider: string
          model: string
          input_tokens?: number
          output_tokens?: number
          cost_usd?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          seed_id?: string
          story_nodes_id?: string
          version?: number
          arcs_json?: Json
          provider?: string
          model?: string
          input_tokens?: number
          output_tokens?: number
          cost_usd?: number
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      ,
      resolutions: {
        Row: {
          id: string
          game_id: string
          seed_id: string
          campaign_arcs_id: string
          version: number
          resolution_paths_json: Json
          twist: string | null
          provider: string
          model: string
          input_tokens: number
          output_tokens: number
          cost_usd: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          seed_id: string
          campaign_arcs_id: string
          version?: number
          resolution_paths_json: Json
          twist?: string | null
          provider: string
          model: string
          input_tokens?: number
          output_tokens?: number
          cost_usd?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          seed_id?: string
          campaign_arcs_id?: string
          version?: number
          resolution_paths_json?: Json
          twist?: string | null
          provider?: string
          model?: string
          input_tokens?: number
          output_tokens?: number
          cost_usd?: number
          status?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_add_game_member: {
        Args: { _game_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_party_slots: {
        Args: { _game_id: string; _user_id: string }
        Returns: boolean
      }
      can_transition_game_state: {
        Args: { p_game_id: string; p_new_status: string }
        Returns: {
          can_transition: boolean
          error_message: string
        }[]
      }
      cleanup_expired_idempotency_keys: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      transition_game_state: {
        Args: {
          p_game_id: string
          p_new_status: string
          p_skip_validation?: boolean
        }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
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
