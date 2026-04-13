import { useState } from 'react'
import { supabase } from '../lib/supabase'

export const useAnalyzeOutfit = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const analyze = async (imageBase64, colors = []) => {
    setLoading(true)
    setError(null)
    
    try {
      // 1. Get Clothing Metadata from Lykdat via tag-clothing function
      let clothingTags = null;
      try {
        const { data: items } = await supabase.functions.invoke('tag-clothing', {
          body: { imageBase64, service: 'detect' }
        });
        const { data: tags } = await supabase.functions.invoke('tag-clothing', {
          body: { imageBase64, service: 'tags' }
        });
        if (items || tags) {
          clothingTags = { items, tags };
        }
      } catch (err) {
        console.warn('Lykdat API call failed, falling back to pure Gemini:', err);
      }

      // 2. Pass base64 + context vectors directly to AI Edge Function
      const { data, error } = await supabase.functions.invoke('analyze-outfit', {
        body: { imageBase64, colors, clothingTags }
      })
      
      if (error) throw error
      setResult(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { analyze, loading, result, error }
}