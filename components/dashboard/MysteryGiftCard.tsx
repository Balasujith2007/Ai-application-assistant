'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MysteryGiftData {
  id: string;
  rewardType: string;
  rewardRarity: string;
  weeklyScore: number;
  weeklyRank: string;
  championPosition?: number;
  personalizedMessage: string;
  reasonEarned: string;
  allocatedAt: string;
}

export function MysteryGiftCard() {
  const router = useRouter();
  const [availableGift, setAvailableGift] = useState<MysteryGiftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    fetchAvailableGift();
  }, []);

  const fetchAvailableGift = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/rewards', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success && json.availableRewards && json.availableRewards.length > 0) {
        setAvailableGift(json.availableRewards[0]);
        setShowIndicator(true);
      }
    } catch (error) {
      console.error('Error fetching gift:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGift = () => {
    if (availableGift) {
      // Open the cinematic gift modal
      router.push(`/dashboard/student/gift/${availableGift.id}`);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border border-purple-200/30 shadow-2xs p-4 h-[140px] animate-pulse" />
    );
  }

  if (!availableGift) {
    return null; // Don't show card if no gift available
  }

  const rarityColors = {
    COMMON: 'from-slate-100 to-slate-200 border-slate-300',
    RARE: 'from-blue-100 to-blue-200 border-blue-300',
    EPIC: 'from-purple-100 to-purple-200 border-purple-300',
    LEGENDARY: 'from-amber-100 to-amber-200 border-amber-300',
    COMEBACK: 'from-emerald-100 to-emerald-200 border-emerald-300',
  };

  const rarityGlow = {
    COMMON: 'shadow-slate-200/50',
    RARE: 'shadow-blue-200/50',
    EPIC: 'shadow-purple-200/50',
    LEGENDARY: 'shadow-amber-200/50',
    COMEBACK: 'shadow-emerald-200/50',
  };

  const rarityClass = rarityColors[availableGift.rewardRarity as keyof typeof rarityColors] || rarityColors.COMMON;
  const glowClass = rarityGlow[availableGift.rewardRarity as keyof typeof rarityGlow] || glowClass.COMMON;

  // Champion-specific styling
  const isChampion = availableGift.championPosition && availableGift.championPosition <= 3;
  const championGradient = isChampion
    ? availableGift.championPosition === 1
      ? 'from-yellow-500 via-amber-500 to-yellow-600'
      : availableGift.championPosition === 2
      ? 'from-slate-400 via-slate-300 to-slate-400'
      : 'from-orange-500 via-orange-400 to-orange-600'
    : 'from-slate-900 via-purple-900 to-slate-900';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl bg-gradient-to-br ${championGradient} border border-purple-200/30 shadow-2xs p-4 h-[140px] relative overflow-hidden cursor-pointer group`}
      onClick={handleOpenGift}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-amber-500/10" />

      {/* Animated golden particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-400 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [0, -10, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* NEW / CHAMPION indicator */}
      <AnimatePresence>
        {showIndicator && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`absolute top-2 right-2 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg z-10 ${
              isChampion
                ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                : 'bg-gradient-to-r from-amber-400 to-amber-500'
            }`}
          >
            {isChampion ? '🏆 CHAMPION' : 'NEW'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift content */}
      <div className="relative z-10 h-full flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative"
            >
              <div className={`w-10 h-10 rounded-xl ${rarityClass} border-2 flex items-center justify-center ${glowClass} shadow-lg`}>
                <Gift className="w-5 h-5 text-amber-600" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400" />
            </motion.div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                A Surprise Awaits You!
              </h3>
              <p className="text-[10px] text-purple-200 font-medium">
                Your efforts deserve something special
              </p>
            </div>
          </div>
        </div>

        {/* Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full mt-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all"
        >
          Open Your Gift
          <ChevronRight className="w-3 h-3" />
        </motion.button>
      </div>
    </motion.div>
  );
}
