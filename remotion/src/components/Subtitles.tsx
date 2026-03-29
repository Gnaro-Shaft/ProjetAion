import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import '@fontsource/ibm-plex-mono/700.css';

export interface SubtitleWord {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface SubtitleSegment {
  text: string;
  startFrame: number;
  endFrame: number;
  words?: SubtitleWord[];
}

interface SubtitlesProps {
  segments: SubtitleSegment[];
}

export const Subtitles: React.FC<SubtitlesProps> = ({ segments }) => {
  const frame = useCurrentFrame();

  // Trouver le segment actif
  const activeSegment = segments.find(
    (s) => frame >= s.startFrame && frame < s.endFrame
  );

  if (!activeSegment) return null;

  const segmentDuration = activeSegment.endFrame - activeSegment.startFrame;
  const segmentProgress = (frame - activeSegment.startFrame) / segmentDuration;

  // Fade in/out
  const opacity = interpolate(
    segmentProgress,
    [0, 0.06, 0.88, 1],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const scale = interpolate(
    segmentProgress,
    [0, 0.06],
    [0.96, 1],
    { extrapolateRight: 'clamp' }
  );

  // Mots avec timing précis
  const words = activeSegment.words || activeSegment.text.split(' ').map((w) => ({
    word: w,
    startFrame: activeSegment.startFrame,
    endFrame: activeSegment.endFrame,
  }));

  return (
    <div
      style={{
        position: 'absolute',
        top: '38%',
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
        transform: `scale(${scale})`,
        padding: '0 60px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          lineHeight: 1.4,
          maxWidth: 900,
        }}
      >
        {words.map((w, i) => {
          // Le mot est actif si la frame courante a dépassé son startFrame
          const isActive = frame >= w.startFrame;
          // Le mot est en cours de prononciation
          const isCurrent = frame >= w.startFrame && frame < w.endFrame;

          return (
            <span
              key={i}
              style={{
                fontSize: 52,
                fontWeight: 900,
                fontFamily: '"IBM Plex Mono", monospace',
                color: isCurrent ? '#00FFD1' : isActive ? '#00E5CC' : '#FFFFFF',
                textShadow: isCurrent
                  ? '0 0 12px rgba(0,229,204,0.6), 0 2px 4px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.5)'
                  : '0 0 8px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)',
                transform: isCurrent ? 'scale(1.05)' : 'scale(1)',
                display: 'inline-block',
                marginRight: 12,
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
