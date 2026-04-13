import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, service = 'detect' } = await req.json()
    const apiKey = Deno.env.get('LYKDAT_API_KEY')
    
    // Determine the correct API endpoint
    let endpoint = 'https://cloudapi.lykdat.com/v1/detect' // For Item Detection
    if (service === 'tags') {
      endpoint = 'https://cloudapi.lykdat.com/v1/deep-tagging' // For Image Tagging
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image: imageBase64 })
    })
    
    const data = await response.json()
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
