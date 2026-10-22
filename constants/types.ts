/**
 * Shared API types — mirror the FastAPI serializers in the backend
 * (post_service.serialize_post, conversation_service._serialize_*,
 * negotiation_service._serialize_negotiation, notification_service._serialize).
 */

export type BdImageStatus = 'ready' | 'processing' | 'failed';

/** Post photo. Direct uploads carry WebP `variants` once the worker is done;
 *  while `processing` the `url` may be empty (only the owner sees those). */
export interface BdPostImage {
  id: number;
  url: string;
  status?: BdImageStatus;
  variants?: { thumb?: string; medium?: string; large?: string } | null;
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
  lat?: number | null;
  lng?: number | null;
  /** When a published listing goes offline (state becomes `expired`). */
  expires_at?: string | null;
  /** Only with a `near_*` feed query. */
  distance_km?: number | null;
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
  /** Newest message; null for an empty conversation. Older APIs omit it. */
  last_message?: BdLastMessage | null;
  created_at: string | null;
  unread_count: number;
  latest_negotiation: BdNegotiationSummary | null;
}

/** Preview of a conversation's newest message (body cut to 140 chars). */
export interface BdLastMessage {
  id: number;
  sender_id: number | null;
  kind: BdChatMessageKind;
  body: string | null;
  payload: Record<string, any> | null;
  created_at: string | null;
  read_at: string | null;
  is_mine: boolean;
}

export type BdChatMessageKind =
  | 'text'
  | 'system_offer_made'
  | 'system_counter'
  | 'system_accepted'
  | 'system_rejected'
  | 'system_auto_rejected'
  | 'system_withdrawn'
  | 'system_meeting_set';

export interface BdChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number | null;
  kind: BdChatMessageKind;
  body: string | null;
  payload: Record<string, any> | null;
  created_at: string | null;
  read_at: string | null;
  /** Client-only: optimistic message state (never sent by the server). */
  client_status?: 'sending' | 'failed';
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

/** AI listing draft from photos (POST /posts/ai_draft). */
export interface BdAiDraft {
  categories: string[];
  title: string;
  description: string;
  confidence: number;
}

/** Comparables-grounded price suggestion (POST /posts/price_suggestion). */
export interface BdPriceSuggestion {
  suggested: number | null;
  range_min: number | null;
  range_max: number | null;
  source: 'similar_items' | 'depreciation_curve' | 'no_data';
  currency: string;
  comparable_count: number | null;
  reference_retail_xaf: number | null;
  message: string | null;
}

/** One Boutique Éclair draft (POST /posts/bulk_draft). */
export interface BdBulkDraft {
  categories: string[];
  title: string;
  description: string;
  condition: string | null;
  confidence: number;
  price_suggestion: {
    suggested: number | null;
    range_min: number | null;
    range_max: number | null;
    comparable_count: number | null;
  } | null;
}

/** Parsed natural-language search (POST /search/parse). */
export interface BdParsedSearch {
  search: string;
  categories?: string[];
  min_price?: number;
  max_price?: number;
  condition?: string[];
  sort?: string;
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

/** Public review (GET /users/{id}/reviews → transaction_service._serialize_review). */
export interface BdReview {
  id: number;
  transaction_id: number;
  reviewer_id: number;
  reviewee_id: number;
  reviewer: BdUserBriefFull | null;
  reviewee: BdUserBriefFull | null;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  direction: 'buyer_to_seller' | 'seller_to_buyer';
  created_at: string | null;
  updated_at: string | null;
}

export interface BdReviewListResponse {
  success: boolean;
  total: number;
  offset: number;
  limit: number;
  reviews: BdReview[];
}

// --- Phase 3: trust & safety -------------------------------------------------

export type BdReportTarget = 'post' | 'user' | 'message' | 'review';
export type BdReportReason =
  | 'spam'
  | 'scam'
  | 'prohibited_item'
  | 'offensive'
  | 'harassment'
  | 'fake_profile'
  | 'other';

export interface BdBlockedUser {
  user_id: number;
  username: string;
  avatar_url: string | null;
  blocked_at: string | null;
}

/** GET /users/{id}/profile → user. */
export interface BdPublicProfile {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  quartier: string | null;
  member_since: string | null;
  phone_verified: boolean;
  avg_rating: number | null;
  review_count: number;
  sales_count: number;
  active_listings: number;
  response_time_minutes: number | null;
  blocked_by_me: boolean;
}

export interface BdNotificationPrefs {
  messages: boolean;
  offers: boolean;
  listings: boolean;
  saved_searches: boolean;
  marketing: boolean;
}

export interface BdPrivacyPrefs {
  show_last_name: boolean;
  show_quartier: boolean;
  /** Consent to usage statistics (opt-in, off by default). */
  analytics?: boolean;
}

export interface BdPreferences {
  notifications: BdNotificationPrefs;
  privacy: BdPrivacyPrefs;
}

export type BdTransactionStatus = 'pending' | 'completed' | 'cancelled' | 'disputed';

export interface BdTransaction {
  id: number;
  post_id: number;
  post_title: string | null;
  seller_id: number;
  buyer_id: number;
  seller: BdUserBriefFull | null;
  buyer: BdUserBriefFull | null;
  amount: number;
  currency: string | null;
  payment_method: string | null;
  meeting_location: string | null;
  /** Agreed hand-over time (naive UTC ISO from the API, see `parseServerDate`). */
  meeting_at?: string | null;
  status: BdTransactionStatus;
  cancellation_reason: string | null;
  created_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  dispute_opened_by_id: number | null;
  /** Only on GET /transactions/{id}. */
  reviews?: BdReview[];
}

// --- Phase 4: discovery ------------------------------------------------------

export interface BdSavedSearchFilters {
  search?: string | null;
  categories?: string[];
  min_price?: number | null;
  max_price?: number | null;
  condition?: string[];
  quartier?: string | null;
  near_lat?: number | null;
  near_lng?: number | null;
  radius_km?: number | null;
}

export interface BdSavedSearch {
  id: number;
  name: string;
  filters: BdSavedSearchFilters;
  alerts_enabled: boolean;
  last_checked_at: string | null;
  created_at: string | null;
}
