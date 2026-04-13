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
      const { data, error } = await supabase.functions.invoke('analyze-outfit', {
        body: { imageBase64, colors }
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