'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PremiumGiftBoxProps {
  isOpen: boolean;
  isOpening: boolean;
  className?: string;
}

export function PremiumGiftBox({ isOpen, isOpening, className = '' }: PremiumGiftBoxProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Gift Box Base */}
      <motion.div
        className="relative"
        animate={{
          scale: isOpening ? [1, 1.1, 1] : 1,
          rotate: isOpening ? [0, -2, 2, 0] : 0,
        }}
        transition={{ duration: 0.8 }}
      >
        {/* Box Shadow/Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 to-transparent blur-3xl rounded-full" />
        
        {/* Gift Box Body */}
        <div className="relative w-48 h-48 md:w-64 md:h-64">
          {/* Main Box */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 rounded-lg shadow-2xl">
            {/* Box Texture - Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg" />
            
            {/* Box Corner Accents */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400/50 rounded-tl" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400/50 rounded-tr" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400/50 rounded-bl" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400/50 rounded-br" />
          </div>

          {/* Vertical Ribbon */}
          <div className="absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 bg-gradient-to-r from-red-600 via-red-500 to-red-600 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          </div>

          {/* Horizontal Ribbon */}
          <div className="absolute top-1/2 left-0 right-0 h-8 -translate-y-1/2 bg-gradient-to-b from-red-600 via-red-500 to-red-600 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Ribbon Cross (Center) */}
          <div className="absolute top-1/2 left-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-red-400 to-red-600 rounded-full shadow-xl z-10">
            <div className="absolute inset-1 bg-gradient-to-br from-red-300 to-red-500 rounded-full" />
          </div>

          {/* Gift Box Lid */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-24 md:h-32 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-t-lg shadow-2xl origin-top"
            animate={{
              rotateX: isOpen ? [-60, 0] : 0,
              y: isOpen ? -80 : 0,
              opacity: isOpen ? 0 : 1,
            }}
            transition={{ duration: 0.6, delay: isOpen ? 0.1 : 0 }}
            style={{ transformOrigin: 'top center' }}
          >
            {/* Lid Texture */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-400/30 to-transparent rounded-t-lg" />
            
            {/* Lid Ribbon */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-full bg-gradient-to-r from-red-600 via-red-500 to-red-600">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            </div>

            {/* Lid Bow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              {/* Bow Loops */}
              <div className="relative w-20 h-16">
                <motion.div
                  className="absolute left-0 top-0 w-8 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full shadow-lg"
                  animate={{ rotate: isOpen ? [0, -15, 0] : 0 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.div
                  className="absolute right-0 top-0 w-8 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full shadow-lg"
                  animate={{ rotate: isOpen ? [0, 15, 0] : 0 }}
                  transition={{ duration: 0.3 }}
                />
                {/* Bow Center */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-full shadow-xl z-10">
                  <div className="absolute inset-1 bg-gradient-to-br from-red-400 to-red-600 rounded-full" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Inner Light Burst (visible when opening) */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-amber-300 via-yellow-200 to-white rounded-lg opacity-0"
            animate={{
              opacity: isOpening ? [0, 0.8, 0] : 0,
              scale: isOpening ? [0.5, 1.5, 2] : 0.5,
            }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </motion.div>

      {/* Ground Shadow */}
      <motion.div
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-black/40 rounded-full blur-md"
        animate={{
          scale: isOpening ? [1, 0.5, 0] : 1,
          opacity: isOpening ? [0.5, 0.3, 0] : 0.5,
        }}
        transition={{ duration: 0.6 }}
      />
    </div>
  );
}
