import assert from 'node:assert/strict';

// Invoke via runLiveLoad with 200 verified disposable students in twelve companies.
export async function phaseScenario({students, teacher, endpoint, call, requireOk, checks, run, db}) {
  const read = async who => requireOk(await call('review',endpoint,who,undefined,60000)).state;
  const openingTeams = await Promise.all(students.slice(0,12).map(read));
  const opening = openingTeams[0];
  assert.equal(opening.course.plan[0].id,'training');
  const requests = students.map((_,i) => ({key:run+'-student-'+i, revision:opening.revision, teamVersion:openingTeams[i%12].course.teamVersion, command:{type:'deposit',amount:10000,term:24}}));
  const send = (i,phase) => call(phase,endpoint+'/command',students[i],requests[i],90000);
  const burst = await Promise.all(students.map((_,i) => send(i,'200-simultaneous-submissions')));
  assert.equal(burst.filter(r=>r.status===200).length,12);
  assert.equal(burst.filter(r=>r.status===409).length,188);
  checks.initialAccepted=12; checks.staleReview=188;
  let revision = Math.max(...burst.map(r=>r.value?.revision || 0));
  for (let i=0;i<students.length;i++) {
    if (burst[i].status===200) continue;
    const reviewed=await read(students[i]);
    assert.equal(reviewed.company.id,'company-'+(i%12+1));
    requests[i].revision=reviewed.revision; requests[i].teamVersion=reviewed.course.teamVersion;
    revision=requireOk(await send(i,'reviewed-submission')).revision;
    if (revision%50===0) console.log('Confirmed '+revision+' student decisions.');
  }
  assert.equal(revision,200);
  const duplicate = await Promise.all(students.map((_,i)=>send(i,'200-duplicate-receipts')));
  duplicate.forEach(requireOk);
  for (let i=0;i<12;i++) {
    const state=await read(students[i]);
    assert.equal(state.company.deposits.length,Math.floor((211-i)/12));
    assert.ok(!Object.hasOwn(state.course,'lanes'));
  }
  assert.equal((await db.collection('studioRequests').where('sessionId','==',run).get()).size,200);
  checks.exactlyOnce=200;
  const submit=async(who,command,key)=>requireOk(await call('phase-command',endpoint+'/command',who,{key:run+'-'+key,revision:(await read(who)).revision,command},60000));
  await submit(students[0],{type:'teamStep',hours:8},'private-clock');
  assert.equal((await read(students[0])).hour,8);
  assert.equal((await read(students[1])).hour,0);
  await submit(teacher,{type:'finishTeamBlock'},'finish-practice');
  assert.equal((await read(students[0])).company.deposits.length,0);
  await submit(teacher,{type:'step',hours:24},'complete');
  const final=await read(teacher);
  assert.equal(final.status,'completed');
  assert.equal(final.course.results.filter(r=>r.companyId==='benchmark').length,4);
  checks.independentClocks=true;checks.sharedBenchmark=true;checks.phaseTransitions=5;
}
