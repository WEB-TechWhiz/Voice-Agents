function detectLanguage(transcript) {
  if (!transcript) return 'en';
  const hindiPattern = /[\u0900-\u097F]/g;
  const hindiMatches = (transcript.match(hindiPattern) || []).length;
  const totalChars   = transcript.replace(/\s/g, '').length;
  const ratio        = hindiMatches / (totalChars || 1);
  if (ratio > 0.5)  return 'hi';
  if (ratio > 0.15) return 'hinglish';
  return 'en';
}
module.exports = { detectLanguage };
