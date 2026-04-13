import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export default function ARTryOn() {
  const [videoTexture, setVideoTexture] = useState(null);
  const videoRef = useRef(document.createElement('video'));

  useEffect(() => {
    // Request webcam access
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        const video = videoRef.current;
        video.srcObject = stream;
        video.playsInline = true;
        video.play();
        
        // Create the Three.js video texture directly from the playing video element
        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        
        setVideoTexture(texture);
      })
      .catch((err) => {
        console.error("Failed to access webcam for AR background:", err);
      });

    // Cleanup stream on unmount
    return () => {
      const stream = videoRef.current?.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-auto" style={{ zIndex: 15 }}>
      {/* 
        The Canvas creates an isolated React rendering tree for Three.js.
        We set the camera slightly pushed back so the view matches the screen bounds.
      */}
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true }} 
        scene={{ background: videoTexture }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 5, 2]} intensity={1.5} castShadow />
          
          {/* Debugging helpers - you can uncomment OrbitControls to test 3D space manually */}
          {/* <OrbitControls enablePan={false} enableZoom={true} /> */}
          
          {/* Future models will be injected here. For now, a simple placeholder object */}
          <group position={[0, 0, 0]}>
             <mesh>
               <boxGeometry args={[1, 1, 1]} />
               <meshStandardMaterial color="#ff6b6b" wireframe />
             </mesh>
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
