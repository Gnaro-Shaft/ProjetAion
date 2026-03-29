import React, { useMemo } from 'react';
import * as THREE from 'three';

interface ParticleOrbProps {
  time: number;
  audioAmplitude?: number;
  particleCount?: number;
  baseRadius?: number;
}

const VIOLET = new THREE.Color('#6B5CE7');
const CYAN = new THREE.Color('#00E5CC');
const WHITE = new THREE.Color('#FFFFFF');

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function createGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

export const ParticleOrb: React.FC<ParticleOrbProps> = ({
  time,
  audioAmplitude = 0.2,
  particleCount = 2000,
  baseRadius = 1.0,
}) => {
  const glowTexture = useMemo(() => createGlowTexture(), []);

  // Données stables — calculées une seule fois
  const seeds = useMemo(() => {
    const data: Array<{
      theta: number;
      phi: number;
      radius: number;
      phase: number;
      speed: number;
      colorT: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      const theta = seededRandom(i * 7 + 1) * Math.PI * 2;
      const phi = Math.acos(2 * seededRandom(i * 13 + 3) - 1);
      const radius = baseRadius * (0.85 + seededRandom(i * 17 + 5) * 0.3);

      data.push({
        theta,
        phi,
        radius,
        phase: seededRandom(i * 23 + 7) * Math.PI * 2,
        speed: 0.3 + seededRandom(i * 29 + 11) * 0.4,
        colorT: seededRandom(i * 37 + 13),
      });
    }

    return data;
  }, [particleCount, baseRadius]);

  // Couleurs — STABLE
  const colors = useMemo(() => {
    const col = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const t = seeds[i].colorT;
      let color: THREE.Color;

      if (t < 0.35) {
        color = VIOLET.clone().lerp(CYAN, t / 0.35);
      } else if (t < 0.7) {
        color = CYAN.clone().lerp(WHITE, (t - 0.35) / 0.35);
      } else {
        color = WHITE.clone().lerp(VIOLET, (t - 0.7) / 0.3);
      }

      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }

    return col;
  }, [particleCount, seeds]);

  // Particules détachées — seeds stables
  const detachedCount = 150;
  const detachedSeeds = useMemo(() => {
    const data: Array<{
      baseTheta: number;
      basePhi: number;
      dist: number;
      phase: number;
      speed: number;
      colorT: number;
    }> = [];

    for (let i = 0; i < detachedCount; i++) {
      data.push({
        baseTheta: seededRandom(i * 43 + 1) * Math.PI * 2,
        basePhi: Math.acos(2 * seededRandom(i * 47 + 3) - 1),
        dist: baseRadius * (1.3 + Math.pow(seededRandom(i * 53 + 5), 0.6) * 1.5),
        phase: seededRandom(i * 59 + 7) * Math.PI * 2,
        speed: 0.1 + seededRandom(i * 61 + 9) * 0.2,
        colorT: seededRandom(i * 67 + 11),
      });
    }

    return data;
  }, [detachedCount, baseRadius]);

  // Positions animées — orbe principale
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const pulse = 1.0 + audioAmplitude * 0.2;

    for (let i = 0; i < particleCount; i++) {
      const s = seeds[i];
      const r = s.radius * pulse + Math.sin(time * s.speed + s.phase) * 0.05;
      const theta = s.theta + time * 0.15;

      pos[i * 3] = Math.cos(theta) * Math.sin(s.phi) * r;
      pos[i * 3 + 1] = Math.cos(s.phi) * r;
      pos[i * 3 + 2] = Math.sin(theta) * Math.sin(s.phi) * r;
    }

    return pos;
  }, [seeds, time, audioAmplitude, particleCount]);

  // Positions animées — particules détachées
  const { detachedPositions, detachedColors } = useMemo(() => {
    const dp = new Float32Array(detachedCount * 3);
    const dc = new Float32Array(detachedCount * 3);

    for (let i = 0; i < detachedCount; i++) {
      const s = detachedSeeds[i];
      const drift = Math.sin(time * s.speed + s.phase) * 0.1;
      const r = s.dist + drift;
      const theta = s.baseTheta + time * 0.08;

      dp[i * 3] = Math.cos(theta) * Math.sin(s.basePhi) * r;
      dp[i * 3 + 1] = Math.cos(s.basePhi) * r;
      dp[i * 3 + 2] = Math.sin(theta) * Math.sin(s.basePhi) * r;

      const t = s.colorT;
      const fade = 1.0 - (s.dist - baseRadius * 1.3) / (baseRadius * 1.5) * 0.6;
      const color = CYAN.clone().lerp(WHITE, t * 0.5);
      dc[i * 3] = color.r * fade;
      dc[i * 3 + 1] = color.g * fade;
      dc[i * 3 + 2] = color.b * fade;
    }

    return { detachedPositions: dp, detachedColors: dc };
  }, [detachedSeeds, time, detachedCount, baseRadius]);

  // Halo qui pulse
  const haloScale = 1.0 + audioAmplitude * 0.3;
  const haloOpacity = 0.1 + audioAmplitude * 0.12;

  return (
    <group>
      {/* Orbe principale */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleCount}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          vertexColors
          sizeAttenuation
          transparent
          opacity={1.0}
          map={glowTexture}
          alphaMap={glowTexture}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Particules détachées */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={detachedCount}
            array={detachedPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={detachedCount}
            array={detachedColors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.65}
          map={glowTexture}
          alphaMap={glowTexture}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Halo central violet */}
      <mesh scale={[haloScale, haloScale, haloScale]}>
        <sphereGeometry args={[baseRadius * 0.6, 32, 32]} />
        <meshBasicMaterial
          color="#6B5CE7"
          transparent
          opacity={haloOpacity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Second halo cyan */}
      <mesh scale={[haloScale * 1.1, haloScale * 1.1, haloScale * 1.1]}>
        <sphereGeometry args={[baseRadius * 0.9, 32, 32]} />
        <meshBasicMaterial
          color="#00E5CC"
          transparent
          opacity={haloOpacity * 0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
