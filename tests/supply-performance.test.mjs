import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationalReport } from '../src/operational-reports.mjs';
import { createSession, publicView } from '../src/engine.mjs';

for (const productId of ['earbuds', 'shoes', 'ebike']) {
  test(productId + ' reports partial, overdue and future orders consistently', () => {
    const state = createSession({ productId });
    const view = publicView(state, { role: 'student', companyId: state.companies[0].id });
    view.hour = 48;
    view.company.orders = [24, 48, 60].map((dueAt, i) => ({ id: String(i), originalQty: 10, createdAt: 0, dueAt }));
    view.company.shipments = [{ orderId: '0', qty: 10, receivedAt: 24 }, { orderId: '1', qty: 4, receivedAt: 40 }];
    const rows = buildOperationalReport(view, 'servicePerformance').rows;
    assert.deepEqual(rows.slice(0, 4).map(row => row[1]), [50, 70, null, 24]);
    const esg = buildOperationalReport(view, 'esgEvidence');
    assert.equal(esg.rows.length, view.catalog.suppliers.length);
    assert.match(esg.note, /zero spend/);
  });
}
