const {test} = require('node:test');
const assert = require('node:assert/strict');
const {browserResultEvents} = require('../browser-result-events');
const checked = {checkSuccess:true, checkData:{data:{reward:{name:'Reward details'}}}};
const browser = {accountResults:[
    {account_username:'account1', browser_attempt:2, browser_max_attempts:20, success:true},
    {account_username:'account2', browser_attempt:20, browser_max_attempts:20, success:false}
]};
test('one final row per account with reward details and final outcome', () => {
    const events=browserResultEvents('CODE', checked, browser);
    assert.equal(events.length,2);
    assert.deepEqual(events.map(e=>[e.accountId,e.status,e.detail,e.kind]),[
        ['account1','redeemed','Reward details','browser_final'],
        ['account2','redeem_failed','Reward details','browser_final']
    ]);
});
test('detected/invalid/captcha messages without verified rewards are excluded', () => {
    for(const value of [null,{checkSuccess:false}, {checkSuccess:true,message:'Invalid itemcode'}, {checkSuccess:true,data:{message:'OK'}}]) {
        assert.deepEqual(browserResultEvents('CODE',value,browser),[]);
    }
});
test('check-only and unattempted browser accounts are excluded', () => {
    assert.deepEqual(browserResultEvents('CODE',checked,null),[]);
    assert.deepEqual(browserResultEvents('CODE',checked,{accountResults:[{account_username:'test',browser_attempt:0}]}),[]);
});
test('successful check after parallel retry can be joined with already completed browser results', () => {
    const result=browserResultEvents('CODE',{checkSuccess:true,data:{reward:{bundle:{name:'Bundle',items:[{item:{name:'Item A'}},{name:'Item B'}]}}}},browser);
    assert.equal(result[0].detail,'Item A, Item B');
    assert.equal(result[1].status,'redeem_failed');
});
