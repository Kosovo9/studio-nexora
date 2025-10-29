'use client';

import React, { useRef, useEffect, useState, Suspense } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';

interface EarthCanvasProps {
  className?: string;
  onCountryClick?: (country: string) => void;
  showStats?: boolean;
}

interface UserStats {
  country: string;
  flag: string;
  city: string;
  users: number;
  position: [number, number, number];
}

const EarthCanvas: React.FC<EarthCanvasProps> = ({ 
  className = '', 
  onCountryClick, 
  showStats = false 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const earthRef = useRef<THREE.Mesh | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [userStats] = useState<UserStats[]>([
    { country: 'USA', flag: '🇺🇸', city: 'New York', users: 1247, position: [0.8, 0.3, 0.5] },
    { country: 'Spain', flag: '🇪🇸', city: 'Madrid', users: 892, position: [-0.2, 0.5, 0.8] },
    { country: 'Japan', flag: '🇯🇵', city: 'Tokyo', users: 1156, position: [0.5, -0.3, 0.7] },
    { country: 'Brazil', flag: '🇧🇷', city: 'São Paulo', users: 734, position: [-0.3, -0.6, 0.4] },
    { country: 'Germany', flag: '🇩🇪', city: 'Berlin', users: 623, position: [0.1, 0.7, 0.6] }
  ]);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!mountRef.current || prefersReducedMotion) return;

    let mounted = true;

    const initThreeJS = async () => {
      try {
        const container = mountRef.current;
        if (!container) return;

        // Scene setup
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Camera setup - ISS vantage point (slightly farther to see complete disc)
        const camera = new THREE.PerspectiveCamera(
          45, // Narrower FOV for more realistic perspective
          container.clientWidth / container.clientHeight,
          0.1,
          1000
        );
        camera.position.set(0, 0, 4.5); // ISS distance - farther to see complete Earth disc

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance'
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;

        container.appendChild(renderer.domElement);

        // Earth geometry and materials
        const geometry = new THREE.SphereGeometry(1, 128, 128);
        
        // Load local Earth textures
        const textureLoader = new THREE.TextureLoader();
        const [earthTexture, normalTexture, roughnessTexture, cloudsTexture] = await Promise.all([
          new Promise<THREE.Texture>((resolve, reject) => {
            textureLoader.load(
                '/textures/earth_day.jpg',
                (texture: THREE.Texture) => {
                  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
                  resolve(texture);
                },
              undefined,
              () => {
                // Fallback to external high-quality Earth texture
                textureLoader.load(
                  'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=2048&q=80',
                  resolve,
                  undefined,
                  reject
                );
              }
            );
          }),
          new Promise<THREE.Texture>((resolve, reject) => {
              textureLoader.load(
                '/textures/earth_bump.jpg',
                (texture: THREE.Texture) => {
                  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                  resolve(texture);
                },
              undefined,
              () => {
                // Fallback to day texture for bump map
                textureLoader.load('/textures/earth_day.jpg', resolve, undefined, reject);
              }
            );
          }),
          new Promise<THREE.Texture>((resolve, reject) => {
            textureLoader.load(
              '/textures/earth_day.jpg',
              resolve,
              undefined,
              () => {
                // Fallback to external texture
                textureLoader.load(
                  'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=2048&q=80',
                  resolve,
                  undefined,
                  reject
                );
              }
            );
          }),
          new Promise<THREE.Texture>((resolve, reject) => {
              textureLoader.load(
                '/textures/earth_day.jpg',
                (texture: THREE.Texture) => {
                  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                  texture.anisotropy = Math.min(2, renderer.capabilities.getMaxAnisotropy());
                  resolve(texture);
                },
              undefined,
              () => {
                // Fallback to external texture
                textureLoader.load(
                  'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=2048&q=80',
                  resolve,
                  undefined,
                  reject
                );
              }
            );
          })
        ]);

        const material = new THREE.MeshStandardMaterial({
          map: earthTexture,
          normalMap: normalTexture,
          roughnessMap: roughnessTexture,
          metalness: 0.1,
          roughness: 0.8,
          transparent: true,
          opacity: 0.95,
          emissive: new THREE.Color(0x112244),
          emissiveIntensity: 0.1
        });

        const earth = new THREE.Mesh(geometry, material);
        earth.castShadow = true;
        earth.receiveShadow = true;
        earthRef.current = earth;
        scene.add(earth);

        // Add atmosphere effect
        const atmosphereGeometry = new THREE.SphereGeometry(1.01, 64, 64);
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
          color: 0x88ccff,
          transparent: true,
          opacity: 0.1,
          side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        scene.add(atmosphere);

        // Add clouds layer
        const cloudsGeometry = new THREE.SphereGeometry(1.005, 64, 64);
        const cloudsMaterial = new THREE.MeshBasicMaterial({
          map: cloudsTexture,
          transparent: true,
          opacity: 0.3
        });
        const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
        scene.add(clouds);

        // Add interactive markers for user statistics
        const markers: THREE.Mesh[] = [];
        if (showStats) {
          userStats.forEach((stat) => {
            const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({
              color: 0xff6b35
            });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(...stat.position);
            marker.userData = { country: stat.country, city: stat.city, users: stat.users, flag: stat.flag };
            markers.push(marker);
            scene.add(marker);
          });
        }

        // Mouse interaction for country detection
        const handleMouseMove = (event: MouseEvent) => {
          if (!container) return;
          const rect = container.getBoundingClientRect();
          mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        };

        const handleClick = (event: MouseEvent) => {
          if (!onCountryClick) return;
          
          raycasterRef.current.setFromCamera(mouseRef.current, camera);
          const intersects = raycasterRef.current.intersectObjects([earth, ...markers]);
          
          if (intersects.length > 0) {
            const intersected = intersects[0].object;
            if (intersected.userData.country) {
              onCountryClick(intersected.userData.country);
            } else {
              // Simulate country detection based on intersection point
              const countries = ['USA', 'Mexico', 'Spain', 'France', 'Germany', 'Japan', 'Brazil', 'Australia', 'India', 'China'];
              const randomCountry = countries[Math.floor(Math.random() * countries.length)];
              onCountryClick(randomCountry);
            }
          }
        };

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('click', handleClick);

        // Lighting setup - main light from LEFT as specified
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
        mainLight.position.set(-8, 2, 4); // Strong light from left
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 4096;
        mainLight.shadow.mapSize.height = 4096;
        mainLight.shadow.camera.near = 0.1;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        scene.add(mainLight);

        // Soft ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.2);
        scene.add(ambientLight);

        // Subtle fill light from right (creates penumbra effect)
        const fillLight = new THREE.DirectionalLight(0x4a90e2, 0.3);
        fillLight.position.set(6, -1, 2); // Gentle light from right
        scene.add(fillLight);

        // Rim light for atmospheric effect
        const rimLight = new THREE.DirectionalLight(0x87ceeb, 0.4);
        rimLight.position.set(0, 0, -10); // Back lighting for atmosphere
        scene.add(rimLight);

        // Animation loop with enhanced effects
        const animate = () => {
          if (!mounted) return;

          animationIdRef.current = requestAnimationFrame(animate);

          if (earthRef.current && !prefersReducedMotion) {
            // Smooth constant rotation with subtle wobble
            earthRef.current.rotation.y += 0.005;
            earthRef.current.rotation.x = Math.sin(Date.now() * 0.0005) * 0.1;
          }

          // Animate clouds independently
          if (clouds && !prefersReducedMotion) {
            clouds.rotation.y += 0.003;
          }

          // Animate markers with pulsing effect
          markers.forEach((marker, index) => {
            if (!prefersReducedMotion) {
              const time = Date.now() * 0.001;
              marker.scale.setScalar(1 + Math.sin(time + index) * 0.3);
            }
          });

          // Raycasting for hover effects
          if (onCountryClick) {
            raycasterRef.current.setFromCamera(mouseRef.current, camera);
            const intersects = raycasterRef.current.intersectObjects([earth, ...markers]);
            
            if (intersects.length > 0) {
              const intersected = intersects[0].object;
              if (intersected.userData.country && hoveredCountry !== intersected.userData.country) {
                setHoveredCountry(intersected.userData.country);
                container.style.cursor = 'pointer';
              }
            } else if (hoveredCountry) {
              setHoveredCountry(null);
              container.style.cursor = 'default';
            }
          }

          if (rendererRef.current && sceneRef.current) {
            rendererRef.current.render(sceneRef.current, camera);
          }
        };

        animate();

        // Handle resize
        const handleResize = () => {
          if (!container || !camera || !renderer) return;
          
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight);
        };

        window.addEventListener('resize', handleResize);

        setIsLoading(false);

        return () => {
          window.removeEventListener('resize', handleResize);
          container.removeEventListener('mousemove', handleMouseMove);
          container.removeEventListener('click', handleClick);
          if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
          }
          if (container && renderer.domElement) {
            container.removeChild(renderer.domElement);
          }
          renderer.dispose();
          geometry.dispose();
          material.dispose();
          atmosphereGeometry.dispose();
          atmosphereMaterial.dispose();
          cloudsGeometry.dispose();
          cloudsMaterial.dispose();
          earthTexture.dispose();
          normalTexture.dispose();
          roughnessTexture.dispose();
          cloudsTexture.dispose();
          markers.forEach(marker => {
            marker.geometry.dispose();
            (marker.material as THREE.Material).dispose();
          });
        };

      } catch (err) {
        console.error('Error initializing Earth canvas:', err);
        setError('Failed to load 3D Earth');
        setIsLoading(false);
      }
    };

    initThreeJS();

    return () => {
      mounted = false;
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [prefersReducedMotion]);

  // Fallback for reduced motion or errors
  if (prefersReducedMotion || error) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src="https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=800&q=80"
          alt="Earth"
          className="w-full h-full object-cover rounded-full opacity-80"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gold-400/20 to-gold-600/20 rounded-full" />
      </div>
    );
  }

  return (
    <motion.div 
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      {/* Atmospheric grain overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-10 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay'
        }}
      />
      
      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 pointer-events-none z-5 bg-gradient-to-r from-black/30 via-transparent to-black/20" />
      <div className="absolute inset-0 pointer-events-none z-5 bg-gradient-to-b from-transparent via-transparent to-black/40" />

      <div 
        ref={mountRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-metallic-800/50 rounded-full z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 mx-auto mb-2"></div>
            <p className="text-gold-400 text-sm">Loading Earth...</p>
          </div>
        </div>
      )}
      {showStats && !isLoading && (
        <div className="absolute top-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs space-y-1 z-30 backdrop-blur-sm">
          <h3 className="font-semibold text-gold-400 mb-2">Live User Statistics</h3>
          {userStats.map((stat) => (
            <div key={stat.country} className={`flex items-center space-x-2 ${hoveredCountry === stat.country ? 'text-gold-400' : ''}`}>
              <span>{stat.flag}</span>
              <span>{stat.city}: {stat.users.toLocaleString()} users</span>
            </div>
          ))}
        </div>
      )}
      {hoveredCountry && (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm z-30 backdrop-blur-sm">
          <p className="text-gold-400">Hovering: {hoveredCountry}</p>
          <p className="text-xs opacity-75">Click to view details</p>
        </div>
      )}
    </motion.div>
  );
};

// Lazy-loaded wrapper component with enhanced fallback
const LazyEarthCanvas: React.FC<EarthCanvasProps> = (props) => {
  return (
    <Suspense fallback={
      <motion.div 
        className={`relative overflow-hidden ${props.className || ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-full h-full bg-gradient-to-br from-metallic-800 to-metallic-900 rounded-full animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 mx-auto mb-2"></div>
            <p className="text-gold-400 text-sm">Initializing Earth Canvas...</p>
          </div>
        </div>
        {props.showStats && (
          <div className="absolute top-4 left-4 bg-black/60 text-white p-3 rounded-lg text-xs">
            <div className="animate-pulse space-y-2">
              <div className="h-3 bg-gray-600 rounded w-24"></div>
              <div className="h-2 bg-gray-700 rounded w-32"></div>
              <div className="h-2 bg-gray-700 rounded w-28"></div>
            </div>
          </div>
        )}
      </motion.div>
    }>
      <EarthCanvas {...props} />
    </Suspense>
  );
};

export default LazyEarthCanvas;