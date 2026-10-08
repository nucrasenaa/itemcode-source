const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalizeRedeemAttempts} = require('../retry-settings');
const {formatBrowserRetryFailureNotification} = require('../browser-retry-notification');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../index.js'), 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('async function runBrowserRedeemAfterNotification(');
const end = source.indexOf('\n}\n', start) + 2;
test('retry settings default and validation', () => {
    for (const value of [undefined, null, '', 0, -1, 1.5, 101, NaN, Infinity, true, {}]) assert.equal(normalizeRedeemAttempts(value), 20);
    for (const value of [1, 20, 100, '30']) assert.equal(normalizeRedeemAttempts(value), Number(value));
});
for (const [configured, successAt, expected] of [[undefined, Infinity, 20], [3, Infinity, 3], [20, 2, 2], [1, Infinity, 1]]) {
    test(`actual redeem loop: configured=${configured}, successAt=${successAt}`, async () => {
        let attempts = 0;
        const context = vm.createContext({
            config: {browser_redeem_enabled:true},
            getItemcodeAccounts: () => [{username:'test',password:'test'}],
            browserRedeemMaxAttempts: () => normalizeRedeemAttempts(configured),
            formatBrowserRetryFailureNotification,
            sendDiscord: async () => false,
            log: () => {}, logItemcodeEvent: () => {},
            redeemCodeWithBrowser: async () => ({success: ++attempts >= successAt}),
            sendTelegram: async () => false,
            setTimeout: callback => callback(), BROWSER_REDEEM_RETRY_DELAY_MS: 0,
        });
        vm.runInContext(source.slice(start, end), context);
        const result = await context.runBrowserRedeemAfterNotification('TEST');
        assert.equal(attempts, expected);
        assert.equal(result.browser_max_attempts, normalizeRedeemAttempts(configured));
    });
}
