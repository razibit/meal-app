import { describe, expect, it } from 'vitest';
import { buildGlobalMealReport } from './globalMealReport';
import type { GlobalReportRow } from '../types';

const rows: GlobalReportRow[] = [
  { meal_date:'2026-07-01',member_id:'b',member_name:'B',breakfast_count:0,lunch_count:2,dinner_count:1 },
  { meal_date:'2026-07-01',member_id:'a',member_name:'A',breakfast_count:1,lunch_count:1,dinner_count:0 },
  { meal_date:'2026-07-02',member_id:'a',member_name:'A',breakfast_count:3,lunch_count:0,dinner_count:2 },
  { meal_date:'2026-07-02',member_id:'b',member_name:'B',breakfast_count:0,lunch_count:0,dinner_count:0 },
];

describe('global meal report', () => {
  it('builds sorted date rows and member columns', () => { const report=buildGlobalMealReport(rows); expect(report.members.map((m)=>m.name)).toEqual(['A','B']); expect(report.dates).toEqual(['2026-07-01','2026-07-02']); });
  it('calculates daily period and grand totals', () => { expect(buildGlobalMealReport(rows).dailyTotals.get('2026-07-01')).toEqual({breakfast:1,lunch:3,dinner:1,total:5}); });
  it('calculates member monthly totals including quantities above one', () => { expect(buildGlobalMealReport(rows).memberTotals.get('a')).toEqual({breakfast:4,lunch:1,dinner:2,total:7}); });
  it('calculates dormitory totals and preserves zero dates', () => { const report=buildGlobalMealReport(rows); expect(report.globalTotals).toEqual({breakfast:4,lunch:3,dinner:3,total:10}); expect(report.dailyTotals.get('2026-07-02')).toEqual({breakfast:3,lunch:0,dinner:2,total:5}); });
});
