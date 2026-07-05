/**
 * Shared API types — mirror the FastAPI serializers in the backend
 * (post_service.serialize_post, conversation_service._serialize_*,
 * negotiation_service._serialize_negotiation, notification_service._serialize).
 */

export interface BdPostImage {
  id: number;
  url: string;
}

export interface BdPost {
  id: number;
  title: string;
  description: string;
  price: number | null;
  is_free: boolean;
  exchange_items: string | null;
  allow_negotiation: boolean;
  state: string;
  owner_id: number;
  owner_username: string | null;
  city: string | null;
  categories: string[];
  pickup_quartier: string | null;
  pickup_location_note: string | null;
  condition: string | null;
  age_bucket: string | null;
  views_count: number;
  likes_count: number;
  liked_by_me: boolean;
  shares_count: number;
  offer_count: number;
  active_offer_count: number;
  images: BdPostImage[];
  created_at: string | null;
  updated_at: string | null;
}

/** Paginated envelope from GET /posts, /posts/mine, /posts/liked. */
export interface BdPostListResponse {
  success: boolean;
  total_posts: number;
  offset: number;
  limit: number;
  posts: BdPost[];
}

export interface BdUserBrief {
  id: number;
  username: string;
}

/** Fuller brief returned by negotiation / admin serializers. */
export interface BdUserBriefFull {
  id: number;
  username: string;
  avatar_url: string | null;
  avg_rating: number | null;
  review_count: number | null;
}

export type BdNegotiationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

/** Compact negotiation summary embedded in a conversation payload. */
export interface BdNegotiationSummary {
  id: number;
  status: BdNegotiationStatus;
  current_offer_amount: number | null;
  last_offer_by_id: number | null;
  accepted_amount: number | null;
  transaction_id: number | null;
  closed_reason: string | null;
}

export interface BdConversationPost {
  id: number;
  title: string;
  price: number | null;
  is_free: boolean;
  state: string;
  city: string | null;
  thumbnail_url: string | null;
}

export interface BdConversation {
  id: number;
  post: BdConversationPost;
  buyer_id: number;
  seller_id: number;
  role: 'buyer' | 'seller';
  counterparty: BdUserBrief;
  last_message_at: string | null;
  created_at: string | null;
  unread_count: number;
  latest_negotiation: BdNegotiationSummary | null;
}

export type BdChatMessageKind =
  | 'text'
  | 'system_offer_made'
  | 'system_counter'
  | 'system_accepted'
  | 'system_rejected'
  | 'system_auto_rejected'
  | 'system_withdrawn';

export interface BdChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number | null;
  kind: BdChatMessageKind;
  body: string | null;
  payload: Record<string, any> | null;
  created_at: string | null;
  read_at: string | null;
}

export interface BdNegotiationOffer {
  id: number;
  proposed_by_id: number;
  proposed_by: BdUserBriefFull | null;
  amount: number;
  message: string | null;
  created_at: string | null;
}

/** Ephemeral Bon prix ? verdict (POST /posts/{id}/price_check). */
export interface BdPriceCheck {
  post_id: number;
  verdict: 'bonne_affaire' | 'prix_correct' | 'trop_cher';
  rationale_fr: string;
  condition_flags_fr: string[];
  confidence: number;
  warning: string | null;
  market_verdict: 'bonne_affaire' | 'prix_correct' | 'trop_cher' | null;
  market: {
    suggested: number;
    range_min: number;
    range_max: number;
    comparable_count: number;
  } | null;
  source: 'similar_items' | 'listing_only';
  listed_price: number;
  delta_pct: number | null;
  images_checked: number;
  generated_at: string;
}

/** Ephemeral Négo-Coach verdict (POST /negotiations/{id}/coach) — never
 *  persisted server-side; lives only in the response and local state. */
export interface BdCoachVerdict {
  negotiation_id: number;
  role: 'buyer' | 'seller';
  action: 'hold' | 'counter' | 'accept';
  suggested_amount: number | null;
  rationale_fr: string;
  confidence: number;
  warning: string | null;
  market: {
    suggested: number;
    range_min: number;
    range_max: number;
    comparable_count: number;
  } | null;
  source: 'similar_items' | 'ladder_only';
  counterparty: BdUserBriefFull | null;
  as_of_amount: number;
  as_of_last_offer_by_id: number;
  stale: boolean;
  generated_at: string;
}

export interface BdNegotiation {
  id: number;
  post_id: number;
  conversation_id: number | null;
  post_title: string | null;
  buyer_id: number;
  seller_id: number;
  buyer: BdUserBriefFull | null;
  seller: BdUserBriefFull | null;
  status: BdNegotiationStatus;
  current_offer_amount: number | null;
  last_offer_by_id: number | null;
  last_offer_by: BdUserBriefFull | null;
  accepted_amount: number | null;
  transaction_id: number | null;
  closed_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
  accepted_at: string | null;
  closed_at: string | null;
  offers?: BdNegotiationOffer[];
}

export interface BdNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  conversation_id: number | null;
  negotiation_id: number | null;
  payload: Record<string, any> | null;
  read_at: string | null;
  created_at: string | null;
}
