const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatBrowserRetryFailureNotification } = require('../browser-retry-notification');

test('formats a final failure notification after retry exhaustion', () => {
    const message = formatBrowserRetryFailureNotification('loot7l4b5rq', [
        { account_username: 'account-a', browser_attempt: 20, browser_max_attempts: 20, success: false, stage: 'captcha' },
        { account_username: 'account-b', browser_attempt: 2, browser_max_attempts: 20, success: true }
    ]);
    assert.match(message, /เติม ItemCode ผ่านเว็บไม่สำเร็จหลัง retry ครบแล้ว/);
    assert.match(message, /LOOT7L4B5RQ/);
    assert.match(message, /สำเร็จ 1\/2 บัญชี/);
    assert.match(message, /account-a: 20\/20 ครั้ง, captcha/);
    assert.doesNotMatch(message, /account-b/);
});

test('does not notify when every account succeeds', () => {
    assert.equal(formatBrowserRetryFailureNotification('CODE', [
        { account_username: 'account-a', browser_attempt: 1, browser_max_attempts: 20, success: true }
    ]), '');
});
