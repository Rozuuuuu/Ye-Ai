import { useEffect, useRef, useState } from 'react';

export const useMediaPipe = (videoElement) => {
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
        modelComplexity: 1, // 1 for better performance, 2 for better accuracy
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      holistic.onResults((results) => {
        setIsLoaded(true); // Model is running and returning results!
        setLandmarks(results);
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
