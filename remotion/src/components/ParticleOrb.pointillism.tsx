import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { staticFile } from 'remotion';

interface ParticleOrbProps {
  time: number;
  audioAmplitude?: number;
}

function createDotTexture(): THREE.Texture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const ParticleOrb: React.FC<ParticleOrbProps> = ({
  time,
  audioAmplitude = 0.2,
}) => {
  const { scene } = useGLTF(staticFile('head.glb'));
  const dotTexture = useMemo(() => createDotTexture(), []);

  // Extraire la géométrie
  const { vertices, normals } = useMemo(() => {
    const verts: THREE.Vector3[] = [];
    const norms: THREE.Vector3[] = [];

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geo = mesh.geometry;
        const pos = geo.getAttribute('position');
        const norm = geo.getAttribute('normal');

        // Échantillonner des points sur la surface des triangles
        // pour une couverture plus uniforme que juste les vertices
        const index = geo.index;
        if (index && norm) {
          for (let i = 0; i < index.count - 2; i += 3) {
            const i0 = index.getX(i);
            const i1 = index.getX(i + 1);
            const i2 = index.getX(i + 2);

            const v0 = new THREE.Vector3(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
            const v1 = new THREE.Vector3(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
            const v2 = new THREE.Vector3(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

            const n0 = new THREE.Vector3(norm.getX(i0), norm.getY(i0), norm.getZ(i0));
            const n1 = new THREE.Vector3(norm.getX(i1), norm.getY(i1), norm.getZ(i1));
            const n2 = new THREE.Vector3(norm.getX(i2), norm.getY(i2), norm.getZ(i2));

            // Calculer l'aire du triangle pour déterminer combien de points mettre
            const edge1 = v1.clone().sub(v0);
            const edge2 = v2.clone().sub(v0);
            const area = edge1.cross(edge2).length() * 0.5;

            // Plus de points par unité de surface = densité uniforme
            const pointsInTri = Math.max(1, Math.round(area * 8));

            for (let p = 0; p < pointsInTri; p++) {
              // Point aléatoire dans le triangle (coordonnées barycentriques)
              let u = seededRandom(i * 1000 + p * 7);
              let v = seededRandom(i * 1000 + p * 13 + 1);
              if (u + v > 1) { u = 1 - u; v = 1 - v; }
              const w = 1 - u - v;

              verts.push(new THREE.Vector3(
                v0.x * w + v1.x * u + v2.x * v,
                v0.y * w + v1.y * u + v2.y * v,
                v0.z * w + v1.z * u + v2.z * v,
              ));

              norms.push(new THREE.Vector3(
                n0.x * w + n1.x * u + n2.x * v,
                n0.y * w + n1.y * u + n2.y * v,
                n0.z * w + n1.z * u + n2.z * v,
              ).normalize());
            }
          }
        }
      }
    });

    return { vertices: verts, normals: norms };
  }, [scene]);

  // Centrage et échelle
  const { center, modelScale } = useMemo(() => {
    if (vertices.length === 0) return { center: new THREE.Vector3(), modelScale: 1 };

    const box = new THREE.Box3();
    vertices.forEach((v) => box.expandByPoint(v));
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const s = 3.8 / Math.max(size.x, size.y, size.z);

    return { center: c, modelScale: s };
  }, [vertices]);

  const particleCount = vertices.length;

  // Couleurs/luminosité basées sur la normale (éclairage directionnel)
  // Les zones face à la lumière sont plus brillantes = relief visible
  const baseColors = useMemo(() => {
    const col = new Float32Array(particleCount * 3);
    const lightDir = new THREE.Vector3(0.3, 0.5, 1.0).normalize();
    const baseColor = new THREE.Color('#E8E0D4'); // Blanc chaud

    for (let i = 0; i < particleCount; i++) {
      const n = normals[i];
      // Éclairage lambertien simple
      const light = Math.max(0.15, n.dot(lightDir));
      // Les particules face caméra sont plus lumineuses
      const facing = Math.max(0, n.z) * 0.3;
      const brightness = light + facing;

      col[i * 3] = baseColor.r * brightness;
      col[i * 3 + 1] = baseColor.g * brightness;
      col[i * 3 + 2] = baseColor.b * brightness;
    }

    return col;
  }, [normals, particleCount]);

  // Phase offsets stables pour chaque particule
  const phaseOffsets = useMemo(() => {
    const phases = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      phases[i] = seededRandom(i * 41 + 7) * Math.PI * 2;
    }
    return phases;
  }, [particleCount]);

  // Positions animées — mouvement fluide
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const pulse = 1.0 + audioAmplitude * 0.06;
    const breathe = Math.sin(time * 0.6) * 0.008;
    const s = modelScale * (1.0 + breathe) * pulse;

    for (let i = 0; i < particleCount; i++) {
      const v = vertices[i];
      const n = normals[i];

      // Très légère ondulation le long de la normale — effet de respiration
      const wave = Math.sin(time * 0.5 + phaseOffsets[i]) * 0.003;

      const x = (v.x - center.x) * s + n.x * wave;
      const y = (v.y - center.y) * s + n.y * wave;
      const z = (v.z - center.z) * s + n.z * wave;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }

    return pos;
  }, [vertices, normals, center, modelScale, time, audioAmplitude, particleCount, phaseOffsets]);

  // Rotation lente et fluide
  const rotationY = Math.sin(time * 0.12) * 0.15;

  return (
    <group
      position={[0, 0.2, 0]}
      rotation={[0.03, rotationY, 0]}
    >
      {/* Visage en points */}
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
            array={baseColors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.018}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.85}
          map={dotTexture}
          alphaMap={dotTexture}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
};

useGLTF.preload(staticFile('head.glb'));
