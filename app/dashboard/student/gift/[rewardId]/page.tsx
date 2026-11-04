'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Sparkles, CheckCircle2, Zap, Trophy, Award, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { soundEngine } from '@/lib/audio/soundEffects';

type AnimationStage = 'falling' | 'landed' | 'countdown' | 'opening' | 'revealed' | 'claimed';

export default function GiftRevealPage({ params }: { params: { rewardId: string } }) {
  const router = useRouter();
  const [stage, setStage] = useState<AnimationStage>('falling');
  const [countdown, setCountdown] = useState(3);
  const [rewardData, setRewardData] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    fetchRewardData();
    // Play falling sound when component mounts
    soundEngine.play('gift_fall');
    
    // Play landing sound after animation
    const landingTimer = setTimeout(() => {
      soundEngine.play('gift_land');
      setStage('landed');
    }, 1500);
    
    return () => clearTimeout(landingTimer);
  }, [params.rewardId]);

  const fetchRewardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rewards/${params.rewardId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) {
        setRewardData(json.reward);
      }
    } catch (error) {
      console.error('Error fetching reward:', error);
    }
  };

  const handleGiftClick = () => {
    if (stage === 'landed') {
      soundEngine.play('button_tap');
      setStage('countdown');
      startCountdown();
    }
  };

  const startCountdown = () => {
    let count = 3;
    setCountdown(count);
    
    const interval = setInterval(() => {
      soundEngine.play('countdown');
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
        setTimeout(() => setStage('opening'), 500);
      }
    }, 1000);
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rewards/${params.rewardId}/claim`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) {
        setClaimed(true);
        setStage('claimed');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setClaiming(false);
    }
  };

  const handleClose = () => {
    router.push('/dashboard/student');
  };

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

  const getRarityColor = () => {
    if (!rewardData) return 'from-amber-400 to-amber-500';
    
    // Champion-specific colors
    if (rewardData.championPosition === 1) {
      return 'from-yellow-300 to-amber-500'; // Gold
    }
    if (rewardData.championPosition === 2) {
      return 'from-slate-300 to-slate-400'; // Silver
    }
    if (rewardData.championPosition === 3) {
      return 'from-orange-300 to-orange-500'; // Bronze
    }
    
    switch (rewardData.rewardRarity) {
      case 'LEGENDARY':
        return 'from-amber-400 to-amber-600';
      case 'EPIC':
        return 'from-purple-400 to-purple-600';
      case 'RARE':
        return 'from-blue-400 to-blue-600';
      case 'COMMON':
        return 'from-slate-400 to-slate-600';
      case 'COMEBACK':
        return 'from-emerald-400 to-emerald-600';
      default:
        return 'from-amber-400 to-amber-500';
    }
  };

  const getChampionMessage = () => {
    if (!rewardData || !rewardData.championPosition) return null;
    
    switch (rewardData.championPosition) {
      case 1:
        return '🏆 YOU ARE A TOP 3 CHAMPION!';
      case 2:
        return '🥈 YOU ARE A TOP 3 CHAMPION!';
      case 3:
        return '🥉 YOU ARE A TOP 3 CHAMPION!';
      default:
        return null;
    }
  };

  const isChampionReward = rewardData?.championPosition && rewardData.championPosition <= 3;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 z-50 flex items-center justify-center overflow-hidden">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-50 text-white/70 hover:text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Sound toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-4 left-4 z-50 text-white/70 hover:text-white transition-colors"
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>

      <AnimatePresence mode="wait">
        {/* Stage 1: Gift Falling */}
        {stage === 'falling' && (
          <motion.div
            key="falling"
            initial={{ y: -500, rotate: -20 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
              duration: 1.5,
            }}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, 20, 0] }}
              transition={{ duration: 0.5, delay: 1.5 }}
            >
              <Gift className="w-48 h-48 text-amber-400 drop-shadow-2xl" />
            </motion.div>
            {/* Landing shadow */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.5 }}
              transition={{ delay: 1.2, duration: 0.3 }}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-black/30 rounded-full blur-md"
            />
          </motion.div>
        )}

        {/* Stage 2: Landed - Tap to Open */}
        {stage === 'landed' && (
          <motion.div
            key="landed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center cursor-pointer"
            onClick={handleGiftClick}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative"
            >
              <Gift className="w-48 h-48 text-amber-400 drop-shadow-2xl" />
              {/* Glowing particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-amber-400 rounded-full"
                  style={{
                    left: `${50 + (Math.random() - 0.5) * 100}%`,
                    top: `${50 + (Math.random() - 0.5) * 100}%`,
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-white mt-8 mb-2"
            >
              {isChampionReward ? getChampionMessage() : 'YOUR SURPRISE IS WAITING!'}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-purple-200 font-medium"
            >
              TAP TO OPEN
            </motion.p>
          </motion.div>
        )}

        {/* Stage 3: Countdown */}
        {stage === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-9xl font-black text-white"
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}

        {/* Stage 4: Opening */}
        {stage === 'opening' && (
          <motion.div
            key="opening"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.2, 0] }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <Gift className="w-48 h-48 text-amber-400" />
            {/* Explosion of particles - Champion-specific colors */}
            {[...Array(30)].map((_, i) => {
              let particleColor = 'bg-amber-400';
              if (isChampionReward) {
                if (rewardData?.championPosition === 1) {
                  particleColor = 'bg-yellow-300'; // Gold
                } else if (rewardData?.championPosition === 2) {
                  particleColor = 'bg-slate-300'; // Silver
                } else if (rewardData?.championPosition === 3) {
                  particleColor = 'bg-orange-300'; // Bronze
                }
              }
              
              return (
                <motion.div
                  key={i}
                  className={`absolute w-3 h-3 ${particleColor} rounded-full`}
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                  animate={{
                    x: (Math.random() - 0.5) * 500,
                    y: (Math.random() - 0.5) * 500,
                    scale: [1, 0],
                    opacity: [1, 0],
                  }}
                  transition={{ duration: 1.2, delay: 0.3 }}
                />
              );
            })}
            {/* Additional confetti for champions */}
            {isChampionReward && [...Array(20)].map((_, i) => (
              <motion.div
                key={`confetti-${i}`}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  backgroundColor: rewardData?.championPosition === 1 ? '#FFD700' : 
                                  rewardData?.championPosition === 2 ? '#C0C0C0' : '#CD7F32',
                }}
                animate={{
                  x: (Math.random() - 0.5) * 600,
                  y: (Math.random() - 0.5) * 600,
                  rotate: [0, 360],
                  scale: [1, 0.5, 0],
                  opacity: [1, 0.8, 0],
                }}
                transition={{ duration: 1.5, delay: 0.4 }}
              />
            ))}
          </motion.div>
        )}

        {/* Stage 5: Revealed */}
        {stage === 'revealed' && (
          <motion.div
            key="revealed"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full mx-4 border border-white/20"
          >
            <motion.div
              initial={{ rotate: -180 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.8, type: 'spring' }}
              className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${getRarityColor()} flex items-center justify-center mx-auto mb-6 shadow-2xl`}
            >
              {React.createElement(getRewardIcon(), { className: 'w-12 h-12 text-white' })}
            </motion.div>

            <h2 className="text-2xl font-black text-white text-center mb-2">
              {isChampionReward && rewardData?.championPosition === 1 && '👑 CHAMPION REWARD'}
              {isChampionReward && rewardData?.championPosition === 2 && '🥈 RUNNER-UP REWARD'}
              {isChampionReward && rewardData?.championPosition === 3 && '🥉 RISING CHAMPION REWARD'}
              {!isChampionReward && (rewardData?.badgeName || 'Reward Unlocked!')}
            </h2>

            <div className="space-y-3 mb-6">
              {rewardData?.xpAmount && (
                <div className="flex items-center justify-between text-white">
                  <span className="text-purple-200">XP Earned</span>
                  <span className="font-bold text-xl">+{rewardData.xpAmount}</span>
                </div>
              )}
              {rewardData?.coinAmount && rewardData.coinAmount > 0 && (
                <div className="flex items-center justify-between text-white">
                  <span className="text-purple-200">Coins Earned</span>
                  <span className="font-bold text-xl">+{rewardData.coinAmount}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-white">
                <span className="text-purple-200">Rarity</span>
                <span className="font-bold">{rewardData?.rewardRarity}</span>
              </div>
            </div>

            <p className="text-purple-200 text-sm text-center mb-6">
              {rewardData?.personalizedMessage}
            </p>

            <p className="text-white/60 text-xs text-center mb-6">
              {rewardData?.reasonEarned}
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClaim}
              disabled={claiming || claimed}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {claiming ? 'Claiming...' : claimed ? 'Claimed! ✓' : 'Claim Reward'}
            </motion.button>
          </motion.div>
        )}

        {/* Stage 6: Claimed */}
        {stage === 'claimed' && (
          <motion.div
            key="claimed"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-12 h-12 text-white" />
            </motion.div>
            <h2 className="text-3xl font-black text-white mb-2">
              Reward Claimed!
            </h2>
            <p className="text-purple-200 mb-8">
              Your reward has been added to your account
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClose}
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-xl border border-white/20 transition-all"
            >
              Back to Dashboard
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
