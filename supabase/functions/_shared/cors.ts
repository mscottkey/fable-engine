// Shared CORS headers for all edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight requests
 * Returns OPTIONS response with CORS headers
 */
export function handleCorsPreflightRequest(): Response {
  return new Response('ok', {
    status: 200,
    headers: corsHeaders
  });
}
