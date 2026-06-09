const INTENTS = {
  BOOK_APPOINTMENT:   'book_appointment',
  CHECK_ORDER:        'check_order_status',
  GET_INFO:           'get_business_info',
  CAPTURE_LEAD:       'capture_lead',
  SPEAK_TO_HUMAN:     'speak_to_human',
  CANCEL_APPOINTMENT: 'cancel_appointment',
  PAYMENT_QUERY:      'payment_query',
  GENERAL_QUERY:      'general_query',
};
const LANGUAGES    = { HI: 'hi', EN: 'en', HINGLISH: 'hinglish' };
const CALL_STATUS  = { COMPLETED: 'completed', DROPPED: 'dropped', TRANSFERRED: 'transferred' };
const LEAD_STATUS  = { NEW: 'new', CONTACTED: 'contacted', CONVERTED: 'converted', LOST: 'lost' };
const PLANS        = { STARTER: 'starter', GROWTH: 'growth', ENTERPRISE: 'enterprise' };
module.exports = { INTENTS, LANGUAGES, CALL_STATUS, LEAD_STATUS, PLANS };
