import { useEffect, useRef, useState } from 'react';

export const useMediaPipe = (videoElement, options = { modelComplexity: 1, mirrored: false }) => {
  const [landmarks, setLandmarks] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const holisticRef = useRef(null);
  const rafIdRef = useRef(null);

  useEffect(() => {
    if (!videoElement) return;

    // The most bulletproof way to load MediaPipe without Vite/Bundler ES Module conflicts
    // is to inject the CDN script tag directly and use window.Holistic
    const loadMediaPipe = () => {
      return new Promise((resolve, reject) => {
        if (window.Holistic) {
          resolve(window.Holistic);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve(window.Holistic);
        script.onerror = (err) => reject(err);
        document.body.appendChild(script);
      });
    };

    let holistic = null;

    loadMediaPipe().then((HolisticClass) => {
      if (!HolisticClass) {
        console.error("MediaPipe Holistic failed to load globally");
        return;
      }

      holistic = new HolisticClass({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });

      holistic.setOptions({
        modelComplexity: options.modelComplexity, 
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      holistic.onResults((results) => {
        setIsLoaded(true); // Model is running and returning results!
        
        // Handle Camera Mirroring (Crucial for selfie-mode AR Try-On)
        if (options.mirrored && results.poseLandmarks) {
          // Deep copy to avoid mutating mediapipe's internal references
          const mirroredResults = { ...results };
          mirroredResults.poseLandmarks = results.poseLandmarks.map(landmark => ({
            ...landmark,
            x: 1 - landmark.x // Flip X axis
          }));
          setLandmarks(mirroredResults);
        } else {
          setLandmarks(results);
        }
      });

      holisticRef.current = holistic;

      const sendToMediaPipe = async () => {
        if (!videoElement.videoWidth || !videoElement.videoHeight) {
          rafIdRef.current = requestAnimationFrame(sendToMediaPipe);
          return;
        }
        try {
          await holistic.send({ image: videoElement });
        } catch (e) {
          // ignore dropped frames
        }
        rafIdRef.current = requestAnimationFrame(sendToMediaPipe);
      };

      sendToMediaPipe();
    });

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (holistic) holistic.close();
    };
  }, [videoElement]);

  return { landmarks, isLoaded };
};
