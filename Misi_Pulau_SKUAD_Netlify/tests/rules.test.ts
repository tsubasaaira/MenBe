import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sample,activitySchema} from '../lib/activity';
import {checkAnswer,studentActivity,isTeacher} from '../lib/server-rules';
test('sample validates and every objective question accepts its correct answer',()=>{activitySchema.parse(sample);for(const station of [1,2])for(let i=0;i<3;i++){const q=(station===1?sample.questions:sample.moves)[i];assert.equal(checkAnswer(sample,station,i,q.options[q.answer]).score,1);}});
test('student payload does not expose answer keys or teacher examples',()=>{const a=studentActivity(sample);assert.ok(!('examples'in a));assert.ok(!('assessment'in a));assert.ok(!('answer'in a.questions[0]));assert.ok(!('feedback'in a.moves[0]));});
test('invalid question and fabricated choice are rejected',()=>{assert.throws(()=>checkAnswer(sample,1,3,'x'));assert.throws(()=>checkAnswer(sample,9,0,'x'));assert.throws(()=>checkAnswer(sample,1,0,'x'));});
test('open responses are left for teacher review',()=>assert.equal(checkAnswer(sample,3,0,'Saya akan mengutip sampah.').score,null));
test('self-registered verified Google and email-password accounts can be teachers',()=>{const google={firebase:{sign_in_provider:'google.com'},email_verified:true,email:'teacher@example.com'};const password={firebase:{sign_in_provider:'password'},email_verified:true,email:'teacher@example.com'};assert.equal(isTeacher(google),true);assert.equal(isTeacher(password),true);assert.equal(isTeacher({...password,email_verified:false}),false);assert.equal(isTeacher({...google,firebase:{sign_in_provider:'anonymous'}}),false);assert.equal(isTeacher({...google,firebase:{sign_in_provider:'facebook.com'}}),false);assert.equal(isTeacher({...google,email:''}),false);});
