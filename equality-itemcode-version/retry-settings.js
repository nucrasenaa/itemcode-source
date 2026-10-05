'use strict';
const DEFAULT_REDEEM_ATTEMPTS = 20;
function normalizeRedeemAttempts(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return DEFAULT_REDEEM_ATTEMPTS;
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 1 && n <= 100 ? n : DEFAULT_REDEEM_ATTEMPTS;
}
module.exports = { DEFAULT_REDEEM_ATTEMPTS, normalizeRedeemAttempts };
