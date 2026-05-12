import React, { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Points, PointMaterial, Float, MeshDistortMaterial, Sphere, Torus, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'

function Avatar({ isThinking, isListening }) {
  const coreRef = useRef()
  const groupRef = useRef()
  const texture = useTexture('/hologram.png')
  
  // Create a procedural "environment" point cloud
  const count = 1000
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const r = 2 + Math.random() * 2
      const h = (Math.random() - 0.5) * 6
      pos[i * 3] = r * Math.cos(theta)
      pos[i * 3 + 1] = h
      pos[i * 3 + 2] = r * Math.sin(theta)
    }
    return pos
  }, [])

  const timeRef = useRef(0)

  useFrame((state, delta) => {
    timeRef.current += delta
    const t = timeRef.current
    
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.2
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.1
    }
    if (coreRef.current) {
      coreRef.current.rotation.z = t * 0.5
      coreRef.current.scale.setScalar(1 + Math.sin(t * (isThinking ? 10 : 2)) * 0.05)
    }
  })

  return (
    <group ref={groupRef}>
      {/* Central Holographic Image */}
      <mesh position={[0, -0.2, 0]}>
        <planeGeometry args={[3.8, 4.8]} />
        <meshBasicMaterial 
          map={texture} 
          transparent 
          opacity={isThinking || isListening ? 1.0 : 0.8} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Core Heart (Pulse) */}
      <Sphere ref={coreRef} args={[0.15, 32, 32]} position={[0, 0.2, 0.2]}>
        <MeshDistortMaterial
          color="#00f3ff"
          speed={isThinking ? 10 : 2}
          distort={0.6}
          radius={0.15}
          emissive="#00f3ff"
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </Sphere>

      {/* Ambient Particles */}
      <Points positions={positions} stride={3}>
        <PointMaterial
          transparent
          color="#00f3ff"
          size={0.015}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.3}
        />
      </Points>

      {/* Decorative Rings */}
      <Torus args={[1.5, 0.01, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#00f3ff" transparent opacity={0.1} />
      </Torus>
      <Torus args={[1.2, 0.005, 16, 100]} rotation={[Math.PI / 2, 0.2, 0]}>
        <meshBasicMaterial color="#00f3ff" transparent opacity={0.1} />
      </Torus>
      
      {/* Scanline Effect Floor */}
      <gridHelper args={[10, 20, "#00f3ff", "#002222"]} position={[0, -2, 0]} opacity={0.05} transparent />
    </group>
  )
}
export default function Hologram({ isThinking, isListening }) {
  return (
    <div className="w-full h-full relative min-h-[400px] lg:min-h-[600px] pointer-events-auto border border-cyan-500/10">
      {/* Teste de visibilidade da imagem */}
      <img src="/hologram.png" className="hidden" onLoad={() => console.log('Imagem carregada!')} onError={() => console.error('Erro ao carregar imagem!')} />
      
      <Canvas camera={{ position: [0, 0.5, 6], fov: 40 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={1.5} />
          <pointLight position={[10, 10, 10]} intensity={2} color="#00f3ff" />
          <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
          <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <Avatar isThinking={isThinking} isListening={isListening} />
          </Float>
        </Suspense>
      </Canvas>
      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] z-50 opacity-20"></div>
    </div>
  )
}

