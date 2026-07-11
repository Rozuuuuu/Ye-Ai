import { useState } from 'react'
import { analyzeOutfit } from '../lib/api'

export const useAnalyzeOutfit = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const analyze = async (imageBase64, colors = []) => {
    setLoading(true)
    setError(null)

    try {
      // Lykdat clothing tagging + Gemini analysis both run server-side in /api/analyze
      const data = await analyzeOutfit({ imageBase64, colors })
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
