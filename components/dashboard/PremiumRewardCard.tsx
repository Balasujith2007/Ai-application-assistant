'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Sparkles, Shield, Trophy, Award, Gift } from 'lucide-react';

interface PremiumRewardCardProps {
  rewardData: any;
  onClaim: () => void;
  claiming: boolean;
  claimed: boolean;
  claimResult: {
    xpAwarded?: number;
    coinsAwarded?: number;
    coinBalance?: number;
  } | null;
}

export function PremiumRewardCard({
  rewardData,
  onClaim,
  claiming,
  claimed,
  claimResult,
}: PremiumRewardCardProps) {
  const getRewardIcon = () => {
    if (!rewardData) return Gift;
    switch (rewardData.rewardType) {
      case 'BONUS_XP':
        return Zap;
      case 'BONUS_COINS':
        return Sparkles;
      case 'STREAK_RESCUE_TOKEN':
        return Shield;
      case 'LEADERBOARD_BOOST_TOKEN':
        return Trophy;
      case 'EXCLUSIVE_BADGE':
        return Award;
      default:
        return Gift;
    }
  };

  const getRarityGradient = () => {
    if (!rewardData) return 'from-slate-400 to-slate-600';
    
    // Champion-specific colors
    if (rewardData.championPosition === 1) {
      return 'from-yellow-300 via-amber-400 to-yellow-500'; // Gold
    }
    if (rewardData.championPosition === 2) {
      return 'from-slate-200 via-slate-300 to-slate-400'; // Silver
    }
    if (rewardData.championPosition === 3) {
      return 'from-orange-300 via-orange-400 to-orange-500'; // Bronze
    }
    
    switch (rewardData.rewardRarity) {
      case 'LEGENDARY':
        return 'from-amber-400 via-amber-500 to-amber-600';
      case 'EPIC':
        return 'from-purple-400 via-purple-500 to-purple-600';
      case 'RARE':
        return 'from-blue-400 via-blue-500 to-blue-600';
      case 'COMMON':
        return 'from-slate-400 via-slate-500 to-slate-600';
      case 'COMEBACK':
        return 'from-emerald-400 via-emerald-500 to-emerald-600';
      default:
        return 'from-amber-400 to-amber-500';
    }
  };

  const getRarityBorder = () => {
    if (!rewardData) return 'border-slate-400';
    
    if (rewardData.championPosition === 1) return 'border-yellow-400';
    if (rewardData.championPosition === 2) return 'border-slate-300';
    if (rewardData.championPosition === 3) return 'border-orange-400';
    
    switch (rewardData.rewardRarity) {
      case 'LEGENDARY':
        return 'border-amber-400';
      case 'EPIC':
        return 'border-purple-400';
      case 'RARE':
        return 'border-blue-400';
      case 'COMMON':
        return 'border-slate-400';
      case 'COMEBACK':
        return 'border-emerald-400';
      default:
        return 'border-amber-400';
    }
  };

  const getChampionMessage = () => {
    if (!rewardData || !rewardData.championPosition) return null;
    
    switch (rewardData.championPosition) {
      case 1:
        return '🏆 CHAMPION - 1st Place';
      case 2:
        return '🥈 CHAMPION - 2nd Place';
      case 3:
        return '🥉 CHAMPION - 3rd Place';
      default:
        return null;
    }
  };

  const isChampionReward = rewardData?.championPosition && rewardData.championPosition <= 3;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotate: -10 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ duration: 0.6, type: 'spring', damping: 20 }}
      className="relative max-w-md w-full mx-4"
    >
      {/* Card Background */}
      <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl p-8 border-2 border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Ambient Glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${getRarityGradient()} opacity-10 blur-3xl`} />
        
        {/* Premium Border Glow */}
        <div className={`absolute inset-0 rounded-3xl border-2 ${getRarityBorder()} opacity-50 blur-sm`} />

        {/* Reward Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring', delay: 0.2 }}
          className={`relative w-28 h-28 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${getRarityGradient()} shadow-2xl flex items-center justify-center border-2 ${getRarityBorder()}`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
          {React.createElement(getRewardIcon(), { className: 'w-14 h-14 text-white drop-shadow-lg' })}
          
          {/* Sparkle Effects */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full"
              style={{
                left: `${20 + i * 20}%`,
                top: `${20 + (i % 2) * 40}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </motion.div>

        {/* Reward Title */}
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-black text-white text-center mb-2"
        >
          {isChampionReward && getChampionMessage()}
          {!isChampionReward && (rewardData?.badgeName || 'Reward Unlocked!')}
        </motion.h2>

        {/* Reward Details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-3 mb-6"
        >
          {rewardData?.xpAmount && (
            <div className="flex items-center justify-between text-white bg-white/5 rounded-xl p-3">
              <span className="text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                XP Earned
              </span>
              <span className="font-bold text-xl text-purple-300">+{rewardData.xpAmount}</span>
            </div>
          )}
          {rewardData?.coinAmount && rewardData.coinAmount > 0 && (
            <div className="flex items-center justify-between text-white bg-white/5 rounded-xl p-3">
              <span className="text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Coins Earned
              </span>
              <span className="font-bold text-xl text-amber-300">+{rewardData.coinAmount}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-white bg-white/5 rounded-xl p-3">
            <span className="text-slate-300">Rarity</span>
            <span className={`font-bold px-3 py-1 rounded-full bg-gradient-to-r ${getRarityGradient()} text-white text-sm`}>
              {rewardData?.rewardRarity}
            </span>
          </div>
        </motion.div>

        {/* Personalized Message */}
        {rewardData?.personalizedMessage && (
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-slate-300 text-sm text-center mb-4 italic"
          >
            "{rewardData.personalizedMessage}"
          </motion.p>
        )}

        {/* Reason Earned */}
        {rewardData?.reasonEarned && (
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-slate-400 text-xs text-center mb-6"
          >
            {rewardData.reasonEarned}
          </motion.p>
        )}

        {/* Claim Button */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClaim}
          disabled={claiming || claimed}
          className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-600 hover:to-amber-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-amber-300/30"
        >
          {claiming ? 'Claiming...' : claimed ? 'Claimed ✓' : 'Claim Reward'}
        </motion.button>
      </div>
    </motion.div>
  );
}
