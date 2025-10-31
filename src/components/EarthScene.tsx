'use client';

import { useEffect, useRef } from 'react';

export default function EarthScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cleanup = () => {};
    const run = async () => {
      try {
        // Respeta reducida animación
        if (typeof window !== 'undefined' && 
            window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }

        const THREE = await import('three');

        const canvas = canvasRef.current!;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
          35,
          window.innerWidth / window.innerHeight,
          0.1,
          1000
        );
        camera.position.z = 6;

        const loader = new THREE.TextureLoader();
        const earth = new THREE.Mesh(
          new THREE.SphereGeometry(2.2, 64, 64),
          new THREE.MeshStandardMaterial({
            map: loader.load('/textures/earth_day.jpg'),
            bumpMap: loader.load('/textures/earth_bump.jpg'),
            bumpScale: 0.02
          })
        );
        scene.add(earth);

        // Luz más fuerte a la izquierda; sombra a la derecha
        const lightL = new THREE.DirectionalLight(0xffffff, 1.1);
        lightL.position.set(-5, 2, 2);
        scene.add(lightL);

        const lightR = new THREE.DirectionalLight(0x223344, 0.6);
        lightR.position.set(5, -1, -2);
        scene.add(lightR);

        const onResize = () => {
          const w = window.innerWidth, h = window.innerHeight;
          renderer.setSize(w, h, false);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        onResize();
        window.addEventListener('resize', onResize);

        let raf = 0;
        const tick = () => {
          earth.rotation.y += 0.0018; // giro suave
          raf = requestAnimationFrame(tick);
          renderer.render(scene, camera);
        };
        raf = requestAnimationFrame(tick);

        cleanup = () => {
          cancelAnimationFrame(raf);
          window.removeEventListener('resize', onResize);
          renderer.dispose();
        };
      } catch (e) {
        console.error('EarthScene init failed', e);
      }
    };
    // Carga tras el primer paint para no golpear el LCP
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(run);
    } else {
      setTimeout(run, 500);
    }
    return () => cleanup();
  }, []);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <canvas ref={canvasRef} />
      {/* Fallback estático si WebGL falla */}
      <img
        src="/earth_static.svg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/50" />
    </div>
  );
}