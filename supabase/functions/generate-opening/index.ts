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
    const { storyOverview, characters } = await req.json();

    const systemPrompt = `You are a Game Master starting a new campaign. Create an opening scene that:
1. Sets the atmosphere and tone
2. Introduces the setting vividly
3. Presents an immediate hook or situation
4. Offers 3-4 initial action options for the party

Return JSON: { "narration": "string", "options": [{"label": "string", "description": "string"}] }`;

    const userPrompt = `
# Campaign Setup

**Genre**: ${storyOverview.genre}
**Setting**: ${storyOverview.expandedSetting}
**Tone**: ${storyOverview.toneManifesto.expanded}

## Story Hooks
${storyOverview.storyHooks.map((h: any) => `- **${h.title}**: ${h.description}`).join('\n')}

## Party
${characters.map((c: any) => `- **${c.pc_json.name}**: ${c.pc_json.concept}`).join('\n')}

Create the opening scene that draws the party into the adventure!
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
        ],
        response_format: { type: 'json_object' }
      })
    });

    const aiData = await aiResponse.json();
    const opening = JSON.parse(aiData.choices[0].message.content);

    return new Response(JSON.stringify(opening), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Opening scene error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
