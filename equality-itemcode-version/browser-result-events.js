'use strict';

function browserResultEvents(code, checkResult, browserResult) {
    if (checkResult?.checkSuccess !== true) return [];
    let detail = '';
    for (const reward of [checkResult?.checkData?.data?.reward, checkResult?.checkData?.reward,
        checkResult?.data?.data?.reward, checkResult?.data?.reward]) {
        if (reward?.bundle?.name) {
            const names = (Array.isArray(reward.bundle.items) ? reward.bundle.items : [])
                .map(item => item?.item?.name || item?.name).filter(Boolean);
            detail = names.length ? names.join(', ') : String(reward.bundle.name);
        } else if (reward?.name) detail = String(reward.name);
        if (detail.trim()) break;
    }
    if (!detail.trim()) return [];
    const results = Array.isArray(browserResult?.accountResults) ? browserResult.accountResults : [];
    return results.filter(result => result?.account_username && result.browser_attempt >= 1).map(result => ({
        kind: 'browser_final', code, detail, accountId: String(result.account_username),
        status: result.success === true ? 'redeemed' : 'redeem_failed',
        attempt: result.browser_attempt, attemptTotal: result.browser_max_attempts
    }));
}
module.exports = { browserResultEvents };
