import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { events } = await req.json();

    const systemPrompt = `You are a Game Master creating a session recap. Summarize the key events in 3-5 paragraphs, highlighting key moments, character development, and cliffhangers.`;

    const userPrompt = `
Session Events
${events.map((e: any, i: number) => `**Event ${i + 1}**: ${e.player_action ? `- Player Action: ${e.player_action}` : ''} ${e.narration ? `- Narration: ${e.narration}` : ''} ${e.consequences ? `- Consequences: ${e.consequences.join(', ')}` : ''}`).join('\n')}

Create an engaging recap that reminds players what happened last session.
`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://api.lovable.app/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    const aiData = await aiResponse.json();
    const recap = aiData.choices[0].message.content;

    return new Response(JSON.stringify({ recap }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Recap generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
