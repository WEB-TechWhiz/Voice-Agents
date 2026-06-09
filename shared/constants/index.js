const INTENTS = {
  BOOK_APPOINTMENT: 'book_appointment',
  CHECK_ORDER_STATUS: 'check_order_status',
  GET_BUSINESS_INFO: 'get_business_info',
  CAPTURE_LEAD: 'capture_lead',
  SPEAK_TO_HUMAN: 'speak_to_human',
  CANCEL_APPOINTMENT: 'cancel_appointment',
  PAYMENT_QUERY: 'payment_query',
  GENERAL_QUERY: 'general_query'
};

const CALL_STATUS = {
  COMPLETED: 'completed',
  DROPPED: 'dropped',
  TRANSFERRED: 'transferred'
};

const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  CONVERTED: 'converted',
  LOST: 'lost'
};

const LANGUAGES = {
  HINDI: 'hi',
  ENGLISH: 'en',
  HINGLISH: 'hinglish',
  TAMIL: 'ta',
  TELUGU: 'te'
};

const PRICING_PLANS = {
  STARTER: 'starter',
  GROWTH: 'growth',
  ENTERPRISE: 'enterprise'
};

module.exports = {
  INTENTS,
  CALL_STATUS,
  LEAD_STATUS,
  LANGUAGES,
  PRICING_PLANS
};
