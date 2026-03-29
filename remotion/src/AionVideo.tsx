import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  Audio,
  Img,
  staticFile,
  interpolate,
  Sequence,
} from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { ParticleOrb } from './components/ParticleOrb';
import { Subtitles, type SubtitleSegment } from './components/Subtitles';

interface AionVideoProps {
  audioPath?: string;
  durationMs?: number;
  images?: string[];
  subtitles?: SubtitleSegment[];
}

export const AionVideo: React.FC<AionVideoProps> = ({
  audioPath,
  durationMs,
  images = [],
  subtitles = [],
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const time = frame / fps;

  // Amplitude audio simulée
  const fakeAmplitude = audioPath
    ? Math.abs(Math.sin(time * 4)) * 0.4 + Math.abs(Math.sin(time * 7)) * 0.25 + 0.1
    : 0.2 + Math.sin(time * 1.5) * 0.1;

  // Images
  const imageCount = images.length;
  const framesPerImage = imageCount > 0 ? Math.floor(durationInFrames / imageCount) : durationInFrames;
  const currentImageIndex = imageCount > 0 ? Math.min(Math.floor(frame / framesPerImage), imageCount - 1) : -1;

  const imageProgress = imageCount > 0 ? (frame % framesPerImage) / framesPerImage : 0;
  const fadeIn = interpolate(imageProgress, [0, 0.05], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(imageProgress, [0.9, 1], [1, 0], { extrapolateRight: 'clamp' });
  const imageOpacity = fadeIn * fadeOut;

  const orbSize = 260;
  const orbMargin = 25;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Fond gradient sombre */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(ellipse at 50% 40%, #0D1B2A 0%, #0A0F1C 40%, #050810 100%)',
        }}
      />

      {/* Image de fond plein écran */}
      {currentImageIndex >= 0 && images[currentImageIndex] && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: imageOpacity,
          }}
        >
          <Img
            src={staticFile(images[currentImageIndex])}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.6) contrast(1.1)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(to bottom, rgba(5,8,16,0.3) 0%, rgba(5,8,16,0.6) 100%)',
            }}
          />
        </div>
      )}

      {/* Sous-titres */}
      {subtitles.length > 0 && <Subtitles segments={subtitles} />}

      {/* Orbe PIP — coin bas gauche */}
      <div
        style={{
          position: 'absolute',
          bottom: orbMargin + 100,
          left: orbMargin,
          width: orbSize,
          height: orbSize,
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -30,
            left: -30,
            width: orbSize + 60,
            height: orbSize + 60,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(107,92,231,${0.25 + fakeAmplitude * 0.3}) 0%, rgba(0,229,204,${0.1 + fakeAmplitude * 0.15}) 50%, transparent 75%)`,
          }}
        />
        <ThreeCanvas
          width={orbSize * 3}
          height={orbSize * 3}
          camera={{ position: [0, 0, 3], fov: 45 }}
        >
          <ParticleOrb
            time={time}
            audioAmplitude={fakeAmplitude}
            particleCount={1200}
            baseRadius={0.8}
          />
        </ThreeCanvas>
      </div>

      {/* Nom AION */}
      <div
        style={{
          position: 'absolute',
          bottom: orbMargin + 100 + orbSize / 2 - 15,
          left: orbMargin + orbSize + 15,
          color: '#00E5CC',
          fontSize: 28,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          letterSpacing: 4,
          textShadow: '0 0 20px rgba(0,229,204,0.5)',
        }}
      >
        AION
      </div>

      {/* Son signature AION — début de la vidéo */}
      <Audio src={staticFile('aion-signature.mp3')} volume={0.6} />

      {/* Voix AION — démarre après le son signature (2s) */}
      {audioPath && (
        <Sequence from={60}>
          <Audio src={staticFile(audioPath)} />
        </Sequence>
      )}
    </div>
  );
};
