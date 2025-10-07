import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface RequestBody {
  code?: string;
  gameId?: string;
  autoClaimSlot?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: RequestBody = await req.json();
    const code = body.code?.trim().toUpperCase();
    const expectedGameId = body.gameId;
    const autoClaimSlot = body.autoClaimSlot ?? true;

    if (!code) {
      return new Response(JSON.stringify({ error: 'Invite code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('game_invites')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (inviteError) {
      console.error('Failed to fetch invite:', inviteError);
      throw new Error('Failed to validate invite code');
    }

    if (!invite) {
      return new Response(JSON.stringify({ error: 'Invalid invite code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (expectedGameId && invite.game_id !== expectedGameId) {
      return new Response(JSON.stringify({ error: 'Invite code does not match this game' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Invite code has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (typeof invite.max_uses === 'number' && invite.uses >= invite.max_uses) {
      return new Response(JSON.stringify({ error: 'Invite code has reached maximum uses' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const gameId = invite.game_id;

    const { data: existingMember, error: memberError } = await supabaseAdmin
      .from('game_members')
      .select('id')
      .eq('game_id', gameId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError) {
      console.error('Failed to check membership:', memberError);
      throw new Error('Failed to check membership');
    }

    if (!existingMember) {
      const { error: insertMemberError } = await supabaseAdmin
        .from('game_members')
        .insert({
          game_id: gameId,
          user_id: user.id,
          role: 'player'
        });

      if (insertMemberError) {
        console.error('Failed to insert membership:', insertMemberError);
        throw new Error('Failed to join game');
      }

      const { error: updateInviteError } = await supabaseAdmin
        .from('game_invites')
        .update({ uses: (invite.uses ?? 0) + 1 })
        .eq('id', invite.id);

      if (updateInviteError) {
        console.warn('Failed to update invite usage:', updateInviteError);
      }
    }

    if (autoClaimSlot) {
      const { data: existingSlot } = await supabaseAdmin
        .from('party_slots')
        .select('id')
        .eq('game_id', gameId)
        .eq('claimed_by', user.id)
        .maybeSingle();

      if (!existingSlot) {
        const { data: availableSlot } = await supabaseAdmin
          .from('party_slots')
          .select('id')
          .eq('game_id', gameId)
          .eq('status', 'empty')
          .order('index_in_party', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (availableSlot) {
          const { error: claimError } = await supabaseAdmin
            .from('party_slots')
            .update({
              claimed_by: user.id,
              status: 'reserved'
            })
            .eq('id', availableSlot.id)
            .eq('status', 'empty');

          if (claimError) {
            console.warn('Failed to auto-claim slot:', claimError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, gameId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Join game error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
