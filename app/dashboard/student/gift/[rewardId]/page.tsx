'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { soundEngine } from '@/lib/audio/soundEffects';
import { PremiumGiftBox } from '@/components/dashboard/PremiumGiftBox';
import { FourCornerConfetti } from '@/components/dashboard/FourCornerConfetti';
import { PremiumRewardCard } from '@/components/dashboard/PremiumRewardCard';

type AnimationStage = 'appearing' | 'landed' | 'countdown' | 'opening' | 'revealed' | 'claimed';

export default function GiftRevealPage() {
  const router = useRouter();
  const routeParams = useParams<{ rewardId: string }>();
  const rewardId = routeParams?.rewardId as string;
  const [stage, setStage] = useState<AnimationStage>('appearing');
  const [countdown, setCountdown] = useState(3);
  const [rewardData, setRewardData] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimResult, setClaimResult] = useState<{
    xpAwarded?: number;
    coinsAwarded?: number;
    coinBalance?: number;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [confettiActive, setConfettiActive] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    fetchRewardData();
    // Play appearance sound
    soundEngine.play('gift_fall');
    
    // Transition to landed after animation
    const landingTimer = setTimeout(() => {
      soundEngine.play('gift_land');
      setStage('landed');
    }, prefersReducedMotion ? 500 : 1500);
    
    return () => clearTimeout(landingTimer);
  }, [rewardId, prefersReducedMotion]);

  // Trigger confetti when opening starts
  useEffect(() => {
    if (stage === 'opening' && !prefersReducedMotion) {
      setConfettiActive(true);
      soundEngine.play('gift_open');
      
      // Play confetti burst sound for celebration
      setTimeout(() => {
        soundEngine.play('confetti_burst');
      }, 200);
    }
  }, [stage, prefersReducedMotion]);

  // Advance from opening to revealed
  useEffect(() => {
    if (stage !== 'opening') return;
    const timer = setTimeout(() => setStage('revealed'), prefersReducedMotion ? 800 : 1400);
    return () => clearTimeout(timer);
  }, [stage, prefersReducedMotion]);

  const fetchRewardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rewards/${rewardId}`, {
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
        setTimeout(() => setStage('opening'), prefersReducedMotion ? 200 : 500);
      }
    }, prefersReducedMotion ? 600 : 1000);
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rewards/${rewardId}/claim`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) {
        setClaimResult({
          xpAwarded: json.xpAwarded,
          coinsAwarded: json.coinsAwarded,
          coinBalance: json.coinBalance,
        });
        setClaimed(true);
        setStage('claimed');
        soundEngine.play('claim_success');
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
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 z-50 flex items-center justify-center overflow-hidden">
      {/* Premium Ambient Background Lighting */}
      <div className="absolute inset-0">
        {/* Top-left ambient light */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        {/* Top-right ambient light */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        {/* Bottom ambient glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-gradient-to-t from-amber-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-50 text-white/60 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-2"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Sound toggle */}
      <button
        onClick={() => {
          setSoundEnabled(!soundEnabled);
          soundEngine.toggle(!soundEnabled);
        }}
        className="absolute top-4 left-4 z-50 text-white/60 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-2"
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>

      {/* Four Corner Confetti */}
      <FourCornerConfetti 
        active={confettiActive} 
        onComplete={() => setConfettiActive(false)} 
      />

      <AnimatePresence mode="wait">
        {/* Stage 1: Gift Appearing */}
        {stage === 'appearing' && (
          <motion.div
            key="appearing"
            initial={{ y: -400, opacity: 0, rotate: -15 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
              duration: prefersReducedMotion ? 0.5 : 1.5,
            }}
            className="relative"
          >
            <PremiumGiftBox isOpen={false} isOpening={false} />
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
              animate={{ y: prefersReducedMotion ? 0 : [0, -8, 0] }}
              transition={{ duration: prefersReducedMotion ? 0 : 2, repeat: Infinity }}
              className="relative"
            >
              <PremiumGiftBox isOpen={false} isOpening={false} />
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-white mt-8 mb-2"
            >
              {isChampionReward ? getChampionMessage() : 'YOUR SURPRISE AWAITS'}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-slate-300 font-medium"
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
            animate={{ scale: [1, 1.1, 0] }}
            transition={{ duration: prefersReducedMotion ? 0.4 : 0.8 }}
            className="relative"
          >
            <PremiumGiftBox isOpen={true} isOpening={true} />
          </motion.div>
        )}

        {/* Stage 5: Revealed */}
        {stage === 'revealed' && (
          <PremiumRewardCard
            rewardData={rewardData}
            onClaim={handleClaim}
            claiming={claiming}
            claimed={claimed}
            claimResult={claimResult}
          />
        )}

        {/* Stage 6: Claimed */}
        {stage === 'claimed' && (
          <motion.div
            key="claimed"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center max-w-md w-full mx-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-2xl"
            >
              <CheckCircle2 className="w-12 h-12 text-white" />
            </motion.div>
            <h2 className="text-3xl font-black text-white mb-2">
              Reward Claimed!
            </h2>
            <p className="text-slate-300 mb-4">
              Your reward has been added to your account
            </p>

            {claimResult && (
              <div className="mb-6 space-y-2 rounded-2xl border border-white/20 bg-white/5 p-4 text-left">
                {typeof claimResult.xpAwarded === 'number' && claimResult.xpAwarded > 0 && (
                  <div className="flex items-center justify-between text-white">
                    <span className="text-slate-300">XP added</span>
                    <span className="font-bold">+{claimResult.xpAwarded}</span>
                  </div>
                )}
                {typeof claimResult.coinsAwarded === 'number' && claimResult.coinsAwarded > 0 && (
                  <div className="flex items-center justify-between text-white">
                    <span className="text-slate-300">Coins added</span>
                    <span className="font-bold">+{claimResult.coinsAwarded}</span>
                  </div>
                )}
                {typeof claimResult.coinBalance === 'number' && (
                  <div className="flex items-center justify-between border-t border-white/10 pt-2 text-white">
                    <span className="text-slate-300">Coin balance</span>
                    <span className="font-bold">{claimResult.coinBalance}</span>
                  </div>
                )}
              </div>
            )}

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
