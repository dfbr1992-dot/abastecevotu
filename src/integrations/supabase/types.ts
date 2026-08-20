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
      abastecimentos: {
        Row: {
          combustivel: string
          created_at: string
          data: string
          id: string
          km_atual: number
          litros: number
          user_id: string
          valor_total: number
          veiculo_id: string
        }
        Insert: {
          combustivel?: string
          created_at?: string
          data: string
          id?: string
          km_atual: number
          litros: number
          user_id: string
          valor_total: number
          veiculo_id: string
        }
        Update: {
          combustivel?: string
          created_at?: string
          data?: string
          id?: string
          km_atual?: number
          litros?: number
          user_id?: string
          valor_total?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abastecimentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read: boolean
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type?: string
        }
        Relationships: []
      }
      admin_push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
        }
        Relationships: []
      }
      app_installations: {
        Row: {
          id: string
          installed_at: string
        }
        Insert: {
          id?: string
          installed_at?: string
        }
        Update: {
          id?: string
          installed_at?: string
        }
        Relationships: []
      }
      assinaturas: {
        Row: {
          created_at: string | null
          data_cancelamento: string | null
          data_inicio: string | null
          data_proxima_cobranca: string | null
          id: string
          mp_payer_id: string | null
          mp_subscription_id: string | null
          status: string
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          data_cancelamento?: string | null
          data_inicio?: string | null
          data_proxima_cobranca?: string | null
          id?: string
          mp_payer_id?: string | null
          mp_subscription_id?: string | null
          status: string
          updated_at?: string | null
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string | null
          data_cancelamento?: string | null
          data_inicio?: string | null
          data_proxima_cobranca?: string | null
          id?: string
          mp_payer_id?: string | null
          mp_subscription_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      banners: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          image_url: string
          link_url: string | null
          prioridade: number
          titulo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          image_url: string
          link_url?: string | null
          prioridade?: number
          titulo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          image_url?: string
          link_url?: string | null
          prioridade?: number
          titulo?: string
        }
        Relationships: []
      }
      legacy_points_ledger: {
        Row: {
          cpf: string | null
          created_at: string
          delta: number | null
          descricao: string | null
          description: string | null
          id: string
          invoice_value: number | null
          points: number | null
          profile_id: string | null
          type: string | null
          user_cpf: string | null
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          delta?: number | null
          descricao?: string | null
          description?: string | null
          id?: string
          invoice_value?: number | null
          points?: number | null
          profile_id?: string | null
          type?: string | null
          user_cpf?: string | null
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          delta?: number | null
          descricao?: string | null
          description?: string | null
          id?: string
          invoice_value?: number | null
          points?: number | null
          profile_id?: string | null
          type?: string | null
          user_cpf?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_redemptions: {
        Row: {
          codigo: string
          created_at: string
          id: string
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          codigo: string
          created_at?: string
          id?: string
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "legacy_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_rewards: {
        Row: {
          ativo: boolean
          created_at: string
          custo_pontos: number
          descricao: string | null
          emoji: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_pontos: number
          descricao?: string | null
          emoji?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_pontos?: number
          descricao?: string | null
          emoji?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      mp_webhook_events: {
        Row: {
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          mp_subscription_id: string | null
          payload: Json
          processed: boolean | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          mp_subscription_id?: string | null
          payload: Json
          processed?: boolean | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          mp_subscription_id?: string | null
          payload?: Json
          processed?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          data_envio: string
          id: string
          mensagem: string
          titulo: string
        }
        Insert: {
          data_envio?: string
          id?: string
          mensagem: string
          titulo: string
        }
        Update: {
          data_envio?: string
          id?: string
          mensagem?: string
          titulo?: string
        }
        Relationships: []
      }
      operadores_turno: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          posto_id: string
          turno: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          posto_id: string
          turno: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          posto_id?: string
          turno?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operadores_turno_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
        ]
      }
      pontos_codigos: {
        Row: {
          codigo: string
          created_at: string
          expira_em: string
          id: string
          posto_id: string
          premio_id: string | null
          quantidade_pontos: number | null
          status: string
          tipo: string
          usado_em: string | null
          usado_por: string | null
          user_id: string
        }
        Insert: {
          codigo: string
          created_at?: string
          expira_em: string
          id?: string
          posto_id: string
          premio_id?: string | null
          quantidade_pontos?: number | null
          status?: string
          tipo: string
          usado_em?: string | null
          usado_por?: string | null
          user_id: string
        }
        Update: {
          codigo?: string
          created_at?: string
          expira_em?: string
          id?: string
          posto_id?: string
          premio_id?: string | null
          quantidade_pontos?: number | null
          status?: string
          tipo?: string
          usado_em?: string | null
          usado_por?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pontos_codigos_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontos_codigos_premio_id_fkey"
            columns: ["premio_id"]
            isOneToOne: false
            referencedRelation: "premios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontos_codigos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pontos_transacoes: {
        Row: {
          codigo_id: string | null
          created_at: string
          criado_por: string | null
          id: string
          motivo: string
          posto_id: string
          quantidade: number
          tipo: string
          user_id: string
          valor_gasto: number | null
        }
        Insert: {
          codigo_id?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          motivo: string
          posto_id: string
          quantidade: number
          tipo: string
          user_id: string
          valor_gasto?: number | null
        }
        Update: {
          codigo_id?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          motivo?: string
          posto_id?: string
          quantidade?: number
          tipo?: string
          user_id?: string
          valor_gasto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pontos_transacoes_codigo_id_fkey"
            columns: ["codigo_id"]
            isOneToOne: false
            referencedRelation: "pontos_codigos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontos_transacoes_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontos_transacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posto_servicos: {
        Row: {
          aceita_ticket: boolean
          carregador_ev: boolean
          conveniencia: boolean
          gas_cozinha: boolean
          posto_id: string
          troca_oleo: boolean
          updated_at: string
        }
        Insert: {
          aceita_ticket?: boolean
          carregador_ev?: boolean
          conveniencia?: boolean
          gas_cozinha?: boolean
          posto_id: string
          troca_oleo?: boolean
          updated_at?: string
        }
        Update: {
          aceita_ticket?: boolean
          carregador_ev?: boolean
          conveniencia?: boolean
          gas_cozinha?: boolean
          posto_id?: string
          troca_oleo?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posto_servicos_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: true
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
        ]
      }
      postos: {
        Row: {
          ativo: boolean
          created_at: string
          endereco: string
          horario_abertura: string | null
          horario_fechamento: string | null
          id: string
          lat: number | null
          lng: number | null
          nome: string
          pontos_por_real: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          endereco: string
          horario_abertura?: string | null
          horario_fechamento?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          nome: string
          pontos_por_real?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          endereco?: string
          horario_abertura?: string | null
          horario_fechamento?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          nome?: string
          pontos_por_real?: number
          updated_at?: string
        }
        Relationships: []
      }
      precos: {
        Row: {
          combustivel: Database["public"]["Enums"]["combustivel_tipo"]
          id: string
          posto_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          combustivel: Database["public"]["Enums"]["combustivel_tipo"]
          id?: string
          posto_id: string
          updated_at?: string
          valor: number
        }
        Update: {
          combustivel?: Database["public"]["Enums"]["combustivel_tipo"]
          id?: string
          posto_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "precos_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
        ]
      }
      premios: {
        Row: {
          ativo: boolean
          created_at: string | null
          exclusivo_premium: boolean
          id: string
          nome: string
          pontos_necessarios: number
          posto_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          exclusivo_premium?: boolean
          id?: string
          nome: string
          pontos_necessarios: number
          posto_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          exclusivo_premium?: boolean
          id?: string
          nome?: string
          pontos_necessarios?: number
          posto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premios_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          cpf: string | null
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          is_premium: boolean
          nome: string | null
          phone: string | null
          state: string | null
          total_points: number | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          is_premium?: boolean
          nome?: string | null
          phone?: string | null
          state?: string | null
          total_points?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_premium?: boolean
          nome?: string | null
          phone?: string | null
          state?: string | null
          total_points?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean
          categoria: Database["public"]["Enums"]["servico_categoria"]
          created_at: string
          descricao: string | null
          destaque: boolean | null
          duracao: string | null
          empresa_nome: string | null
          endereco: string | null
          horario: string | null
          id: string
          imagem_url: string | null
          nome: string
          nome_servico: string | null
          ordem: number | null
          ordem_prioridade: number | null
          patrocinado: boolean | null
          preco: number | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          categoria: Database["public"]["Enums"]["servico_categoria"]
          created_at?: string
          descricao?: string | null
          destaque?: boolean | null
          duracao?: string | null
          empresa_nome?: string | null
          endereco?: string | null
          horario?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          nome_servico?: string | null
          ordem?: number | null
          ordem_prioridade?: number | null
          patrocinado?: boolean | null
          preco?: number | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["servico_categoria"]
          created_at?: string
          descricao?: string | null
          destaque?: boolean | null
          duracao?: string | null
          empresa_nome?: string | null
          endereco?: string | null
          horario?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          nome_servico?: string | null
          ordem?: number | null
          ordem_prioridade?: number | null
          patrocinado?: boolean | null
          preco?: number | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          combustivel_tipo: string | null
          created_at: string
          device_id: string | null
          fcm_token: string
          id: string
          posto_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          combustivel_tipo?: string | null
          created_at?: string
          device_id?: string | null
          fcm_token: string
          id?: string
          posto_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          combustivel_tipo?: string | null
          created_at?: string
          device_id?: string | null
          fcm_token?: string
          id?: string
          posto_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          ano: number | null
          created_at: string
          id: string
          km_atual: number | null
          licenciamento_vencimento: string | null
          marca: string
          modelo: string
          placa: string | null
          seguro_vencimento: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ano?: number | null
          created_at?: string
          id?: string
          km_atual?: number | null
          licenciamento_vencimento?: string | null
          marca: string
          modelo: string
          placa?: string | null
          seguro_vencimento?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: number | null
          created_at?: string
          id?: string
          km_atual?: number | null
          licenciamento_vencimento?: string | null
          marca?: string
          modelo?: string
          placa?: string | null
          seguro_vencimento?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      push_audience_segments: {
        Row: {
          device_id: string | null
          segmento: string | null
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          device_id?: string | null
          segmento?: never
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          device_id?: string | null
          segmento?: never
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      saldo_pontos_por_posto: {
        Row: {
          posto_id: string | null
          saldo: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pontos_transacoes_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontos_transacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_premium_ativos: {
        Row: {
          data_cancelamento: string | null
          data_inicio: string | null
          data_proxima_cobranca: string | null
          mp_subscription_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          valor: number | null
        }
        Insert: {
          data_cancelamento?: string | null
          data_inicio?: string | null
          data_proxima_cobranca?: string | null
          mp_subscription_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          valor?: number | null
        }
        Update: {
          data_cancelamento?: string | null
          data_inicio?: string | null
          data_proxima_cobranca?: string | null
          mp_subscription_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          valor?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adopt_push_subscription: {
        Args: { _device_id: string }
        Returns: undefined
      }
      count_push_segment: { Args: { _segmento: string }; Returns: number }
      get_visitor_stats: {
        Args: { data_fim: string; data_inicio: string }
        Returns: {
          novas_instalacoes: number
          novos_usuarios: number
          usuarios_ativos: number
        }[]
      }
      get_visitor_stats_series: {
        Args: { data_fim: string; data_inicio: string }
        Returns: {
          dia: string
          novas_instalacoes: number
          novos_usuarios: number
          usuarios_ativos: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_admin_notification: {
        Args: { _payload: Json; _type: string }
        Returns: undefined
      }
      legacy_award_points_for_action: {
        Args: { _action: string }
        Returns: number
      }
      legacy_redeem_reward: { Args: { _reward_id: string }; Returns: string }
      posto_do_operador_atual: { Args: never; Returns: string }
      register_admin_push: {
        Args: { _auth_key: string; _endpoint: string; _p256dh: string }
        Returns: undefined
      }
      register_user_push_subscription: {
        Args: {
          _combustivel_tipo?: string
          _device_id?: string
          _fcm_token: string
          _posto_id?: string
        }
        Returns: undefined
      }
      validar_resgate_codigo: { Args: { p_codigo: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin"
      combustivel_tipo:
        | "etanol"
        | "gasolina_comum"
        | "gasolina_aditivada"
        | "diesel"
      servico_categoria: "lava_rapido" | "oficina_mecanica" | "troca_oleo"
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
      app_role: ["admin"],
      combustivel_tipo: [
        "etanol",
        "gasolina_comum",
        "gasolina_aditivada",
        "diesel",
      ],
      servico_categoria: ["lava_rapido", "oficina_mecanica", "troca_oleo"],
    },
  },
} as const
