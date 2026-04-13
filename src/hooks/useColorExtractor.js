import { useState } from 'react'

export const useColorExtractor = () => {
  const [palette, setPalette] = useState([])
  const [loading, setLoading] = useState(false)

  const extract = (imageElement, count = 5) => {
    setLoading(true)
    try {
      // Use purely native Canvas for extraction (Zero Dependencies!)
      const SIZE = 120; // Scale down for blazing fast pixel parsing
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0, SIZE, SIZE);
      const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

      const pixels = [];
      // Step by 16 to sample evenly and quickly
      for (let i = 0; i < data.length; i += 16) {
        if (data[i + 3] > 128) pixels.push([data[i], data[i + 1], data[i + 2]]);
      }
      
      if (!pixels.length) return [];
      
      // Sort to establish luminance spread
      pixels.sort((a, b) => (0.299*a[0] + 0.587*a[1] + 0.114*a[2]) - (0.299*b[0] + 0.587*b[1] + 0.114*b[2]));
      
      const bucket = Math.max(1, Math.floor(pixels.length / count));
      const colors = pixels
          .filter((_, i) => i % bucket === Math.floor(bucket / 2))
          .slice(0, count)
          .map(([r, g, b]) => '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join(''));

      setPalette(colors)
      return colors
    } catch (error) {
      console.error('Color extraction failed:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  return { extract, palette, loading }
}