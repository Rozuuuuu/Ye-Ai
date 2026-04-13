import { useState, useCallback } from 'react'

export const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const speak = useCallback((text, options = {}) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported')
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = options.rate || 0.9
    utterance.pitch = options.pitch || 1
    utterance.volume = options.volume || 1
    utterance.lang = options.lang || 'en-US'

    // Optionally select a specific voice
    if (options.voiceName) {
      const voices = window.speechSynthesis.getVoices()
      const selectedVoice = voices.find(v => v.name.includes(options.voiceName))
      if (selectedVoice) utterance.voice = selectedVoice
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onpause = () => setIsPaused(true)
    utterance.onresume = () => setIsPaused(false)

    window.speechSynthesis.speak(utterance)

    return {
      pause: () => window.speechSynthesis.pause(),
      resume: () => window.speechSynthesis.resume(),
      cancel: () => window.speechSynthesis.cancel()
    }
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsPaused(false)
  }, [])

  return { speak, stop, isSpeaking, isPaused }
}
