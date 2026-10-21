/**
 * "Faire une offre" in place (docs/09 §4 Item details): the offer form in a
 * gesture-driven Sheet (50–60 % / 92 % snaps), no navigation. After sending,
 * the sheet closes and the buyer lands in the conversation.
 */
import React from 'react';
import type { BdNegotiation } from '@/constants/types';
import Sheet from '../motion/Sheet';
import { OfferFormBody, OfferSubmitButton, useOfferForm } from './OfferForm';

export interface OfferSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: number;
  onSent: (neg: BdNegotiation, conversationId: number | null) => void;
}

export default function OfferSheet({ visible, onClose, postId, onSent }: OfferSheetProps) {
  const form = useOfferForm({
    postId,
    enabled: visible,
    onSent: (neg, convId) => {
      onClose();
      onSent(neg, convId);
    },
  });
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Faire une offre"
      maxHeight="92%"
      footer={<OfferSubmitButton form={form} />}>
      <OfferFormBody form={form} />
    </Sheet>
  );
}
