'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  verifiedProfiles: {
    github: boolean;
    linkedin: boolean;
    codolio: boolean;
  };
}

export function ProfileCompletionModal({
  isOpen,
  onClose,
  verifiedProfiles,
}: ProfileCompletionModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const items = [
    { label: 'GitHub Profile', verified: verifiedProfiles.github },
    { label: 'LinkedIn Profile', verified: verifiedProfiles.linkedin },
    { label: 'Codolio Profile', verified: verifiedProfiles.codolio },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Complete Verified Profile</h3>
              <p className="text-xs text-gray-500 mt-1">
                You must verify your GitHub, LinkedIn, and Codolio profiles before registering for campus opportunities.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 rounded-xl bg-gray-50 p-4 border border-gray-100">
            {items.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm font-semibold">
                <span className="text-gray-800">{item.label}</span>
                {item.verified ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Verified ✓
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-600">
                    <XCircle className="h-4 w-4" /> Missing ✗
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                router.push('/profile');
              }}
              className="font-bold flex items-center gap-1.5"
            >
              Complete Profile <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
