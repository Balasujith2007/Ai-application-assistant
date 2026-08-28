'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OpportunityBroadcastModal } from '@/components/opportunities/OpportunityBroadcastModal';

export default function MentorPostOpportunityNewPage() {
  const router = useRouter();

  const handleClose = () => {
    router.push('/dashboard/mentor/opportunities');
  };

  const handleSuccess = () => {
    router.push('/dashboard/mentor/opportunities');
  };

  return (
    <OpportunityBroadcastModal
      isOpen={true}
      onClose={handleClose}
      onSuccess={handleSuccess}
      mode="mentor"
    />
  );
}
