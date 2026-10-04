type Row = Record<string, any>;
type DemoDatabase = { tables: Record<string, Row[]>; settings: Row };

const STORAGE_KEY = 'mess-meal-pages-demo-v1';
const memberNames = [
  'Abdullah Vai', 'Abid Vai', 'Ashique Vai', 'Ashraf Vai', 'Dalton Vai',
  'Hasan Vai', 'Mahdi Vai', 'Mijan Vai', 'Muhit Vai', 'Rajib Vai',
  'Reza Vai', 'Ribat Vai', 'Roni Vai', 'Sajid Vai', 'Shahjahan (Vaitja)',
  'Sourav Vai', 'Ujjal Vai',
];
const memberId = (name: string) => `demo-${memberNames.indexOf(name) + 1}`;

function createSeed(): DemoDatabase {
  const members = memberNames.map((name, index) => ({
    id: `demo-${index + 1}`,
    name,
    email: null,
    role: name === 'Rajib Vai' ? 'admin' : 'member',
    active: true,
    meal_month_start_date: '2026-07-01',
    meal_month_end_date: '2026-07-31',
  }));

  const meals: Row[] = [];
  const july3 = {
    'Abdullah Vai': [0, 1, 1], 'Abid Vai': [0, 0, 0], 'Ashique Vai': [0, 1, 1],
    'Ashraf Vai': [0, 0, 0], 'Dalton Vai': [0, 1, 1], 'Hasan Vai': [0, 1, 1],
    'Mahdi Vai': [0, 0, 0], 'Mijan Vai': [0, 0, 0], 'Muhit Vai': [0, 1, 1],
    'Rajib Vai': [0, 1, 0], 'Reza Vai': [0, 0, 0], 'Ribat Vai': [0, 1, 1],
    'Roni Vai': [0, 1, 1], 'Sajid Vai': [0, 1, 1], 'Shahjahan (Vaitja)': [0, 0, 0],
    'Sourav Vai': [1, 1, 1], 'Ujjal Vai': [0, 1, 1],
  } as Record<string, number[]>;
  for (const [name, quantities] of Object.entries(july3)) {
    (['breakfast', 'lunch', 'dinner'] as const).forEach((period, periodIndex) => {
      const quantity = quantities[periodIndex];
      if (quantity) meals.push({
        id: `demo-meal-${memberId(name)}-${period}`,
        member_id: memberId(name), meal_date: '2026-07-03', period, quantity,
        created_at: '2026-07-03T08:00:00+06:00',
      });
    });
  }

  const dutyRows: Array<[string, string]> = [
    ['2026-10-01', 'Abdullah Vai'], ['2026-10-02', 'Abdullah Vai'],
    ['2026-10-03', 'Abid Vai'], ['2026-10-04', 'Ashraf Vai'],
    ['2026-10-05', 'Dalton Vai'], ['2026-10-06', 'Ashique Vai'],
    ['2026-10-08', 'Dalton Vai'], ['2026-10-14', 'Hasan Vai'],
    ['2026-10-16', 'Mijan Vai'], ['2026-10-22', 'Hasan Vai'],
    ['2026-10-27', 'Ribat Vai'],
  ];
  const groceryDuty = dutyRows.map(([date, name], index) => ({
    id: `demo-duty-${index + 1}`, billing_start_date: '2026-10-01',
    billing_end_date: '2026-10-31', duty_date: date, member_id: memberId(name),
    created_by: memberId('Rajib Vai'), updated_by: memberId('Rajib Vai'),
    created_at: '2026-10-01T00:00:00+06:00', updated_at: '2026-10-01T00:00:00+06:00',
  }));

  const ocrSummaries = [
    ['2026-07-13', 0, 14, 11, 'applied', '2026-07-13T21:06:15+06:00'],
    ['2026-07-10', 2, 9, 5, 'applied', '2026-07-13T14:27:00+06:00'],
    ['2026-07-11', 2, 9, 9, 'applied', '2026-07-13T14:23:51+06:00'],
    ['2026-07-12', 3, 14, 3, 'applied', '2026-07-13T14:17:38+06:00'],
    ['2026-07-09', 1, 12, 12, 'applied', '2026-07-10T14:57:40+06:00'],
    ['2026-07-10', 1, 12, 12, 'applied', '2026-07-10T14:53:55+06:00'],
    ['2026-07-09', 1, 12, 12, 'ready', '2026-07-10T14:49:37+06:00'],
    ['2026-07-09', 1, 12, 12, 'ready', '2026-07-10T14:46:45+06:00'],
    ['2026-07-08', 2, 6, 16, 'applied', '2026-07-09T14:38:01+06:00'],
    ['2026-07-07', 2, 7, 4, 'applied', '2026-07-08T14:44:42+06:00'],
    ['2026-07-05', 3, 5, 12, 'applied', '2026-07-06T16:26:21+06:00'],
    ['2026-07-04', 2, 7, 13, 'applied', '2026-07-05T05:10:17+06:00'],
    ['2026-07-05', 2, 7, 13, 'ready', '2026-07-05T05:05:18+06:00'],
    ['2026-07-04', 0, 6, 3, 'applied', '2026-07-04T05:06:58+06:00'],
    ['2026-07-02', 2, 5, 5, 'applied', '2026-07-02T21:13:27+06:00'],
    ['2026-07-01', 2, 16, 8, 'applied', '2026-07-02T11:03:32+06:00'],
  ] as const;
  const ocrImports = ocrSummaries.map(([meal_date, breakfast, lunch, dinner, status, created_at], index) => ({
    id: `demo-ocr-${index + 1}`, meal_date, breakfast_total: breakfast, lunch_total: lunch,
    dinner_total: dinner, status: status === 'ready' ? 'validation_failed' : status,
    validation_status: status === 'ready' ? 'validation_failed' : 'valid', created_at,
    processed_at: created_at,
    validation_report: { valid: true, errors: [], warnings: [], totals: { breakfast, lunch, dinner } },
  }));
  const firstHistoryRows = [
    'Sajid Vai', 'Ashique Vai', 'Ujjal Vai', 'Mijan Vai', 'Reza Vai', 'Dalton Vai',
    'Sourav Vai', 'Roni Vai', 'Mahdi Vai', 'Abid Vai', 'Shahjahan (Vaitja)',
    'Hasan Vai', 'Rajib Vai', 'Ribat Vai', 'Abdullah Vai', 'Muhit Vai',
  ].map((name, index) => ({
    id: `demo-ocr-row-${index + 1}`, import_id: 'demo-ocr-1', detected_name: name,
    matched_member_id: memberId(name), breakfast: false,
    lunch: index !== 6 && index !== 8, dinner: index < 6,
    confidence: index === 1 || index === 2 ? 0.9 : 0.95,
    needs_review: false,
  }));

  return {
    settings: { public_report_settings: { id: true, show_monthly_totals_and_member_summary: false, show_deposit_report: false, show_grocery_expense_report: false } },
    tables: {
      members,
      meals,
      meal_details: [],
      deposits: [{ id: 'demo-deposit-1', depositor_id: memberId('Rajib Vai'), added_by: memberId('Rajib Vai'), amount: 13, details: 'Opening demo balance', deposit_date: '2026-07-01', accounting_date: '2026-07-01', created_at: '2026-07-01T00:00:00+06:00' }],
      grocery_expenses: [],
      grocery_duty_assignments: groceryDuty,
      admin_notes: [{ id: true, content: '' }],
      meal_rate_history: [{ id: 'demo-rate-1', meal_rate: 46.65, total_expenses: 0, total_meals: 0, trigger_source: 'manual', period_start: '2026-07-01', period_end: '2026-07-31', created_at: '2026-07-13T21:06:15+06:00' }],
      ocr_imports: ocrImports,
      ocr_import_rows: firstHistoryRows,
      eggs: [], egg_inventory: [], egg_price_config: [],
      public_report_settings: [{ id: true, show_monthly_totals_and_member_summary: false, show_deposit_report: false, show_grocery_expense_report: false }],
    },
  };
}

function readDb(): DemoDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoDatabase;
  } catch { /* start with a fresh browser-local demo */ }
  const seed = createSeed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function writeDb(db: DemoDatabase) {
  const publicSettings = (db.tables.public_report_settings || [])[0];
  if (publicSettings) db.settings.public_report_settings = publicSettings;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent('meal-demo:changed'));
}

const scalar = <T,>(data: T) => ({ data, error: null });
const byDate = (row: Row, key: string, start?: string, end?: string) =>
  (!start || String(row[key] || '') >= start) && (!end || String(row[key] || '') <= end);

class LocalQuery implements PromiseLike<{ data: any; error: null; count?: number }> {
  private mode: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
  private payload: Row | Row[] = [];
  private filters: Array<(row: Row) => boolean> = [];
  private sort: Array<{ key: string; ascending: boolean }> = [];
  private take?: number;
  private returning = false;
  private countMode = false;
  private headOnly = false;
  private conflictKey = 'id';
  constructor(private table: string, private db: DemoDatabase) {}
  select(_columns = '*', options?: Row) { this.returning = true; this.countMode ||= options?.count === 'exact'; this.headOnly ||= options?.head === true; return this; }
  insert(rows: Row | Row[]) { this.mode = 'insert'; this.payload = rows; return this; }
  upsert(rows: Row | Row[], options?: Row) { this.mode = 'upsert'; this.payload = rows; this.conflictKey = options?.onConflict || 'id'; return this; }
  update(values: Row) { this.mode = 'update'; this.payload = values; return this; }
  delete() { this.mode = 'delete'; return this; }
  eq(key: string, value: any) { this.filters.push(row => row[key] === value); return this; }
  neq(key: string, value: any) { this.filters.push(row => row[key] !== value); return this; }
  is(key: string, value: any) { this.filters.push(row => row[key] === value); return this; }
  not(key: string, operator: string, value: any) { this.filters.push(row => operator === 'is' ? row[key] !== value : row[key] != value); return this; }
  gt(key: string, value: any) { this.filters.push(row => row[key] > value); return this; }
  gte(key: string, value: any) { this.filters.push(row => row[key] >= value); return this; }
  lt(key: string, value: any) { this.filters.push(row => row[key] < value); return this; }
  lte(key: string, value: any) { this.filters.push(row => row[key] <= value); return this; }
  in(key: string, values: any[]) { this.filters.push(row => values.includes(row[key])); return this; }
  contains(key: string, value: any) { this.filters.push(row => Array.isArray(row[key]) ? value.every((item: any) => row[key].includes(item)) : String(row[key] || '').includes(value)); return this; }
  ilike(key: string, value: string) { const term = value.replace(/%/g, '').toLowerCase(); this.filters.push(row => String(row[key] || '').toLowerCase().includes(term)); return this; }
  match(values: Row) { Object.entries(values).forEach(([key, value]) => this.eq(key, value)); return this; }
  order(key: string, options?: Row) { this.sort.push({ key, ascending: options?.ascending !== false }); return this; }
  limit(value: number) { this.take = value; return this; }
  range(start: number, end: number) { this.filters.push(() => true); this.take = Math.max(0, end - start + 1); this.rangeStart = start; return this; }
  private rangeStart = 0;
  single() { return this.run().then(result => ({ ...result, data: result.data?.[0] ?? null })); }
  maybeSingle() { return this.run().then(result => ({ ...result, data: result.data?.[0] ?? null })); }
  then<TResult1 = { data: any; error: null; count?: number }, TResult2 = never>(onfulfilled?: ((value: { data: any; error: null; count?: number }) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> { return this.run().then(onfulfilled, onrejected); }
  private run() {
    let rows = [...(this.db.tables[this.table] || [])];
    const matches = (row: Row) => this.filters.every(filter => filter(row));
    if (this.mode === 'insert' || this.mode === 'upsert') {
      const values = (Array.isArray(this.payload) ? this.payload : [this.payload]).map(row => {
        const today = new Date().toISOString().slice(0, 10);
        const defaults: Row = this.table === 'grocery_expenses' ? { expense_date: today } : this.table === 'deposits' ? { deposit_date: today, accounting_date: today } : {};
        return { id: row.id ?? crypto.randomUUID(), created_at: row.created_at ?? new Date().toISOString(), ...defaults, ...row };
      });
      for (const value of values) {
        const index = rows.findIndex(row => row[this.conflictKey] === value[this.conflictKey]);
        if (this.mode === 'upsert' && index >= 0) rows[index] = { ...rows[index], ...value };
        else rows.push(value);
      }
      this.db.tables[this.table] = rows;
      writeDb(this.db);
      return Promise.resolve({ data: this.returning ? values : null, error: null });
    }
    const selected = rows.filter(matches);
    const count = selected.length;
    if (this.mode === 'update') {
      const values = this.payload as Row;
      const changed: Row[] = selected.map(row => ({ ...row, ...values, updated_at: new Date().toISOString() }));
      const changedIds = new Map(changed.map(row => [row.id, row]));
      this.db.tables[this.table] = rows.map(row => changedIds.get(row.id) || row);
      writeDb(this.db);
      return Promise.resolve({ data: this.returning ? changed : null, error: null, count: this.countMode ? count : undefined });
    }
    if (this.mode === 'delete') {
      this.db.tables[this.table] = rows.filter(row => !matches(row));
      writeDb(this.db);
      return Promise.resolve({ data: null, error: null, count: this.countMode ? count : undefined });
    }
    for (const sort of [...this.sort].reverse()) selected.sort((a, b) => {
      const value = a[sort.key] < b[sort.key] ? -1 : a[sort.key] > b[sort.key] ? 1 : 0;
      return sort.ascending ? value : -value;
    });
    const paged = selected.slice(this.rangeStart, this.take === undefined ? undefined : this.rangeStart + this.take);
    const data = paged.map(row => this.hydrate(row));
    return Promise.resolve({ data: this.headOnly ? null : data, error: null, count: this.countMode ? count : undefined });
  }
  private hydrate(row: Row): Row {
    const result = { ...row };
    if (this.table === 'meal_details' && row.updated_by) result.members = this.db.tables.members.find(member => member.id === row.updated_by) || null;
    if (this.table === 'ocr_imports') result.ocr_import_rows = (this.db.tables.ocr_import_rows || []).filter(item => item.import_id === row.id);
    if (this.table === 'grocery_duty_assignments') result.members = this.db.tables.members.find(member => member.id === row.member_id) || null;
    return result;
  }
}

function totalsForRange(db: DemoDatabase, start?: string, end?: string) {
  const meals = db.tables.meals.filter(row => byDate(row, 'meal_date', start, end));
  const deposits = db.tables.deposits.filter(row => byDate(row, 'accounting_date', start, end));
  const expenses = db.tables.grocery_expenses.filter(row => row.transaction_type === 'cash' && byDate(row, 'expense_date', start, end));
  return { meals, deposits, expenses };
}

function reportRows(db: DemoDatabase, start: string, end: string) {
  const { meals } = totalsForRange(db, start, end);
  const grouped = new Map<string, Row>();
  for (const meal of meals) {
    const member = db.tables.members.find(row => row.id === meal.member_id);
    if (!member) continue;
    const key = `${meal.meal_date}|${meal.member_id}`;
    const row = grouped.get(key) || { meal_date: meal.meal_date, member_id: meal.member_id, member_name: member.name, breakfast_count: 0, lunch_count: 0, dinner_count: 0 };
    row[`${meal.period}_count`] = Number(row[`${meal.period}_count`] || 0) + Number(meal.quantity || 0);
    grouped.set(key, row);
  }
  return [...grouped.values()];
}

function rpc(name: string, args: Row = {}, db = readDb()): { data: any; error: null } {
  const start = args.p_start_date;
  const end = args.p_end_date;
  const rows = reportRows(db, start, end);
  const members = db.tables.members;
  const { deposits, expenses } = totalsForRange(db, start, end);
  switch (name) {
    case 'get_server_time': return scalar(new Date().toISOString());
    case 'get_latest_meal_rate': case 'get_public_latest_meal_rate': {
      const history = db.tables.meal_rate_history;
      const rate = [...history].reverse().find(row => row.period_start === start && row.period_end === end) || history[history.length - 1];
      return scalar(rate ? [rate] : []);
    }
    case 'get_meal_rate_history': case 'get_public_meal_rate_history': return scalar(db.tables.meal_rate_history.filter(row => byDate({ date: row.created_at?.slice(0, 10) }, 'date', start, end)).slice(-Number(args.p_limit || 50)).reverse());
    case 'get_member_monthly_report_with_dates': {
      const own = rows.filter(row => row.member_id === args.p_member_id);
      const byDay = new Map<string, Row>();
      own.forEach(row => { const item = byDay.get(row.meal_date) || { meal_date: row.meal_date, breakfast_count: 0, lunch_count: 0, dinner_count: 0 }; item.breakfast_count += row.breakfast_count; item.lunch_count += row.lunch_count; item.dinner_count += row.dinner_count; byDay.set(row.meal_date, item); });
      return scalar([...byDay.values()].sort((a, b) => a.meal_date.localeCompare(b.meal_date)));
    }
    case 'get_global_monthly_report_with_dates': case 'get_public_global_meal_report': return scalar(name.includes('public') ? rows.map(row => ({ ...row, member_key: row.member_id })) : rows);
    case 'get_public_report_visibility': return scalar([{ show_monthly_totals_and_member_summary: Boolean(db.settings.public_report_settings?.show_monthly_totals_and_member_summary) }]);
    case 'get_public_report_carry_over_visibility': return scalar([{ show_deposit_report: Boolean(db.settings.public_report_settings?.show_deposit_report), show_grocery_expense_report: Boolean(db.settings.public_report_settings?.show_grocery_expense_report) }]);
    case 'get_monthly_deposit_report_with_dates': case 'get_public_monthly_deposit_report_with_dates':
      return scalar(deposits.map(row => ({ ...row, depositor_name: members.find(member => member.id === row.depositor_id)?.name || 'Member', added_by_name: members.find(member => member.id === row.added_by)?.name || 'Admin', total_amount: deposits.reduce((sum, item) => sum + Number(item.amount || 0), 0) })));
    case 'get_grocery_expense_report_with_dates': case 'get_public_grocery_expense_report_with_dates':
      return scalar(db.tables.grocery_expenses.filter(row => byDate(row, 'expense_date', start, end)).map(row => ({ ...row, shopper_name: members.find(member => member.id === row.shopper_id)?.name || 'Member', added_by_name: members.find(member => member.id === row.added_by)?.name || 'Admin' })));
    case 'get_total_deposits': return scalar(deposits.reduce((sum, row) => sum + Number(row.amount || 0), 0));
    case 'get_total_cash_grocery_expenses': return scalar(expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0));
    case 'get_member_total_deposit': return scalar(deposits.filter(row => row.depositor_id === args.p_member_id).reduce((sum, row) => sum + Number(row.amount || 0), 0));
    case 'get_public_settlement_snapshot': return scalar([]);
    case 'apply_ocr_meal_import': {
      const payload = Array.isArray(args.p_rows) ? args.p_rows : [];
      for (const item of payload) {
        for (const period of ['breakfast', 'lunch', 'dinner']) {
          db.tables.meals = db.tables.meals.filter(meal => !(meal.member_id === item.member_id && meal.meal_date === args.p_meal_date && meal.period === period));
          if (item[period]) db.tables.meals.push({ id: crypto.randomUUID(), member_id: item.member_id, meal_date: args.p_meal_date, period, quantity: Number(item[period]), created_at: new Date().toISOString() });
        }
      }
      writeDb(db);
      return scalar(null);
    }
    default: return scalar([]);
  }
}

export const demoDb = {
  from: (table: string) => new LocalQuery(table, readDb()),
  rpc: (name: string, args?: Row) => Promise.resolve(rpc(name, args)),
  reset: () => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); },
};
