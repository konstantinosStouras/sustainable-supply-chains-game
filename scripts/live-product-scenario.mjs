import assert from 'node:assert/strict';

// Supply this scenario to runLiveLoad with studentCount: 200 and sessionOptions.productId.
export const productScenario = productId => async ({ students, teacher, endpoint, call, requireOk, checks, run }) => {
 const wave=async phase=>Promise.all(students.map(who=>call(phase,endpoint,who,undefined,60000)));
 const initial=(await wave('200-student-opening-views')).map(requireOk);
 initial.forEach(({state},i)=>{assert.equal(state.productId,productId);assert.equal(state.company.id,'company-'+(i%12+1));});
 const state=initial[0].state;
 const inputs=Object.keys(state.recipe);
 const submit=async(who,cmd,key)=>{const view=requireOk(await call('review',endpoint,who));return requireOk(await call('decision',endpoint+'/command',who,{key:run+'-'+key,revision:view.state.revision,command:cmd}));};
 for(const item of inputs){const supplier=state.catalog.suppliers.find(row=>row.item===item);await submit(students[0],{type:'purchase',supplierId:supplier.id,qty:supplier.min},item);}
 await submit(teacher,{type:'step',hours:1},'step');
 const views=(await wave('200-student-production-views')).map(requireOk);
 views.forEach(({state:s},i)=>{const c=s.company,before=initial[i].state.company;assert.ok(c.production>0);for(const item of inputs)assert.equal(before.inventory[item].qty-c.inventory[item].qty,c.production*state.recipe[item]);});
 checks.productId=productId; checks.verifiedStudents=views.length;
};
