'use strict';

function formatBrowserRetryFailureNotification(serial, accountResults = []) {
    const failed = accountResults.filter(result => result?.success !== true);
    if (failed.length === 0) return '';
    const succeeded = accountResults.length - failed.length;
    const lines = failed.map(result => {
        const account = String(result.account_username || 'ไม่ระบุบัญชี');
        const attempts = `${result.browser_attempt || 1}/${result.browser_max_attempts || '?'}`;
        const reason = String(result.message || result.stage || 'ไม่ทราบสาเหตุ')
            .replace(/\s+/g, ' ').trim().slice(0, 240);
        return `- ${account}: ${attempts} ครั้ง, ${reason}`;
    });
    return [
        '⚠️ เติม ItemCode ผ่านเว็บไม่สำเร็จหลัง retry ครบแล้ว',
        `โค้ด: ${String(serial || '').trim().toUpperCase()}`,
        `ผลลัพธ์: สำเร็จ ${succeeded}/${accountResults.length} บัญชี`,
        'บัญชีที่ยังไม่สำเร็จ:',
        ...lines
    ].join('\n').slice(0, 3500);
}

module.exports = { formatBrowserRetryFailureNotification };
