// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, colors = [], clothingTags } = await req.json()
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")
    
    // Initialize Gemini with the API key stored in Supabase secrets
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY secret' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    
    // Inject contextual meta-data into prompt if available
    const colorContext = colors.length 
      ? `\nDominant hex colors extracted from image: ${colors.join(', ')}` 
      : "";
    
    const lykdatContext = clothingTags
      ? `\nLykdat AI clothing detection data for extra accuracy: ${JSON.stringify(clothingTags)}`
      : "";

    const prompt = `You are an expert fashion stylist AI. Analyze this outfit image and provide feedback.${colorContext}${lykdatContext}
    
    Return ONLY a valid JSON object with this exact structure:
    {
      "vibeScore": number (1-100),
      "verdict": "A stylish, witty one-sentence critique",
      "positives": ["list", "of", "things", "that", "work"],
      "suggestions": ["actionable", "improvement", "tips"],
      "colorMatches": ["suggested", "color", "palettes"]
    }`
    
    console.log("Generating AI content...");
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
    ])
    
    const response = result.response
    const text = response.text()
    
    // Extract JSON from the response (Gemini sometimes wraps it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const jsonData = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      vibeScore: 75,
      verdict: "Looking sharp! Could use a pop of color.",
      positives: ["Good fit"],
      suggestions: ["Add an accent piece"],
      colorMatches: ["Navy", "White"]
    }
    
    return new Response(JSON.stringify(jsonData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error("AI Analysis crash:", error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})