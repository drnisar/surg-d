import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLabTrends, filterLabTrends, labCategory, sortLabTrends, splitLabTrends } from '@surg-d/shared';

const r = (name, value, abnormal = false, range = null) => ({ name, value, abnormal, range });
const panels = [
  { name: 'CBC + Manual Differential', reportedAt: '2026-10-01T08:00', results: [r('HGB', '12.1', false, 'old range'), r('PLT', '160')] },
  { name: 'CBC + Manual  Differential', reportedAt: '2026-11-04T09:00', results: [r('HGB', '9.8', true, '11.5 - 17.5'), r('WBC', '14', true)] },
  { name: 'LFT (T.BILI, ALP, ALT)', reportedAt: '2026-11-05T10:00', results: [r('ALT', '30')] },
  { name: 'GLUCOSE RANDOM', reportedAt: '2026-09-01T10:00', results: [r('Glucose', '250', true)] },
];

test('labCategory groups tests by name', () => {
  assert.equal(labCategory('CBC + Manual Differential (3 Parts)').key, 'cbc');
  assert.equal(labCategory('RFT (CREA, BU)').key, 'rft');
  assert.equal(labCategory('LFT (T.BILI, ALP, ALT)').key, 'lft');
  assert.equal(labCategory('HbA1C (Glycohemoglobin)').key, 'sugar');
  assert.equal(labCategory('C-Reactive Protein').key, 'inflammation');
  assert.equal(labCategory('VIRAL PROFILE By ICT (HBsAg + AntiHCV)').key, 'serology');
  assert.equal(labCategory('Something new').key, 'other');
});

test('buildLabTrends makes one table per test with the newest column first', () => {
  const [cbc] = buildLabTrends(panels).filter((t) => t.category === 'cbc');
  assert.equal(cbc.name, 'CBC + Manual Differential');
  assert.deepEqual(cbc.times, ['2026-11-04T09:00', '2026-10-01T08:00']);
  assert.deepEqual(cbc.rows.map((row) => row.name), ['HGB', 'WBC', 'PLT']);
  assert.equal(cbc.rows[0].range, '11.5 - 17.5');
  assert.deepEqual(cbc.rows[0].cells['2026-10-01T08:00'], { value: '12.1', abnormal: false });
  assert.equal(cbc.rows[1].cells['2026-10-01T08:00'], undefined);
  const [ordered] = buildLabTrends([{ name: 'CBC', reportedAt: 't', results: ['MPV', '%MXD', 'PLT', 'WBC', 'HGB'].map((n) => r(n, '1')) }]);
  assert.deepEqual(ordered.rows.map((row) => row.name), ['HGB', 'WBC', 'PLT', 'MPV', '%MXD']);
});

test('splitLabTrends separates this admission from earlier results', () => {
  const { recent, earlier } = splitLabTrends(buildLabTrends(panels), '2026-11-03');
  assert.deepEqual(recent.map((t) => [t.name, t.times]).sort(), [
    ['CBC + Manual Differential', ['2026-11-04T09:00']],
    ['LFT (T.BILI, ALP, ALT)', ['2026-11-05T10:00']],
  ]);
  const cbc = earlier.find((t) => t.category === 'cbc');
  assert.deepEqual(cbc.rows.map((row) => row.name), ['HGB', 'PLT']); // WBC has no earlier value
  assert.equal(earlier.length, 2);
  assert.equal(splitLabTrends([], null).earlier.length, 0);
});

test('filterLabTrends narrows by category, name and out-of-range values', () => {
  const trends = buildLabTrends(panels);
  assert.deepEqual(filterLabTrends(trends, { category: 'lft' }).map((t) => t.name), ['LFT (T.BILI, ALP, ALT)']);
  const [byParam] = filterLabTrends(trends, { query: 'wbc' });
  assert.deepEqual(byParam.rows.map((row) => row.name), ['WBC']);
  assert.equal(filterLabTrends(trends, { query: 'cbc' })[0].rows.length, 3);
  const abnormal = filterLabTrends(trends, { abnormalOnly: true });
  assert.deepEqual(abnormal.map((t) => t.name).sort(), ['CBC + Manual Differential', 'GLUCOSE RANDOM']);
  assert.deepEqual(abnormal.find((t) => t.category === 'cbc').rows.map((row) => row.name), ['HGB', 'WBC']);
});

test('sortLabTrends puts abnormal latest results first, then the most recent', () => {
  const trends = buildLabTrends(panels);
  assert.deepEqual(sortLabTrends(trends, 'abnormal').map((t) => t.category), ['cbc', 'sugar', 'lft']);
  assert.deepEqual(sortLabTrends(trends, 'latest').map((t) => t.category), ['lft', 'cbc', 'sugar']);
  assert.deepEqual(sortLabTrends(trends, 'name').map((t) => t.category), ['cbc', 'sugar', 'lft']);
});
