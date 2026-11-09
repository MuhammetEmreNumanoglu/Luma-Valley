// Publisher and support details shown in Settings and the privacy policy. Fill these in before a
// store release (release-compliance/18-manual-actions-required.md): stores require a support
// contact and a hosted privacy policy URL. Never put guessed values here: an empty field simply
// hides its row in the app.
export const PUBLISHER: {
  /** Legal name of the publisher (person or company) acting as data controller. */
  name: string | null;
  /** Support e-mail shown in Settings → Support and in the privacy policy. */
  supportEmail: string | null;
  /** Public URL of the hosted privacy policy (release-compliance/legal/privacy-policy.html). */
  privacyUrl: string | null;
  /** Public URL of the hosted terms of use, if any. */
  termsUrl: string | null;
} = {
  name: null,
  supportEmail: null,
  privacyUrl: null,
  termsUrl: null,
};

/** Date the in-app privacy policy text was last changed (keep in sync with legal/privacy-policy.md). */
export const PRIVACY_UPDATED = '2026-11-09';
