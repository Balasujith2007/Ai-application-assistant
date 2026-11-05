'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ConfettiParticle {
  id: string;
  x: number;
  y: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  size: number;
  color: string;
  shape: 'rect' | 'square' | 'ribbon';
  delay: number;
}

interface FourCornerConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

const CONFETTI_COLORS = [
  '#FFD700', // Gold
  '#FF4444', // Red
  '#4444FF', // Blue
  '#44FF44', // Green
  '#9B59B6', // Purple
  '#C0C0C0', // Silver
  '#FF6B6B', // Coral
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
];

export function FourCornerConfetti({ active, onComplete }: FourCornerConfettiProps) {
  const [particles, setParticles] = React.useState<ConfettiParticle[]>([]);

  React.useEffect(() => {
    if (active && particles.length === 0) {
      // Generate particles from all four corners
      const newParticles: ConfettiParticle[] = [];
      const particlesPerCorner = 25;

      for (let corner = 0; corner < 4; corner++) {
        for (let i = 0; i < particlesPerCorner; i++) {
          const size = Math.random() * 8 + 4;
          const shape: 'rect' | 'square' | 'ribbon' = 
            Math.random() < 0.4 ? 'square' : 
            Math.random() < 0.7 ? 'rect' : 'ribbon';
          
          let startX: number, startY: number, velocityX: number, velocityY: number;
          const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
          const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

          switch (corner) {
            case 0: // Top-left
              startX = -20;
              startY = -20;
              velocityX = Math.random() * 15 + 10;
              velocityY = Math.random() * 15 + 10;
              break;
            case 1: // Top-right
              startX = screenWidth + 20;
              startY = -20;
              velocityX = -(Math.random() * 15 + 10);
              velocityY = Math.random() * 15 + 10;
              break;
            case 2: // Bottom-left
              startX = -20;
              startY = screenHeight + 20;
              velocityX = Math.random() * 15 + 10;
              velocityY = -(Math.random() * 15 + 10);
              break;
            case 3: // Bottom-right
              startX = screenWidth + 20;
              startY = screenHeight + 20;
              velocityX = -(Math.random() * 15 + 10);
              velocityY = -(Math.random() * 15 + 10);
              break;
            default:
              startX = 0;
              startY = 0;
              velocityX = 10;
              velocityY = 10;
          }

          newParticles.push({
            id: `${corner}-${i}-${Date.now()}`,
            x: startX,
            y: startY,
            rotation: Math.random() * 360,
            velocityX,
            velocityY,
            size,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            shape,
            delay: Math.random() * 0.3,
          });
        }
      }

      setParticles(newParticles);

      // Cleanup after animation
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [active, particles.length, onComplete]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute"
          initial={{
            x: particle.x,
            y: particle.y,
            rotate: particle.rotation,
            opacity: 0,
            scale: 0,
          }}
          animate={{
            x: [
              particle.x,
              particle.x + particle.velocityX * 3,
              particle.x + particle.velocityX * 6,
            ],
            y: [
              particle.y,
              particle.y + particle.velocityY * 3 + 100,
              particle.y + particle.velocityY * 6 + 300,
            ],
            rotate: [
              particle.rotation,
              particle.rotation + 360 * 2,
              particle.rotation + 360 * 4,
            ],
            opacity: [0, 1, 0],
            scale: [0, 1, 0.5],
          }}
          transition={{
            duration: 2.5,
            delay: particle.delay,
            ease: 'easeOut',
          }}
          style={{
            width: particle.shape === 'ribbon' ? particle.size * 3 : particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: particle.shape === 'square' ? '2px' : '1px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
      ))}
    </div>
  );
}
