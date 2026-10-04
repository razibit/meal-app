import { demoDb } from './demoDatabase';

const DEMO_ADMIN = {
  id: 'demo-10',
  email: 'demo.admin@example.invalid',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-07-01T00:00:00.000Z',
};

const channel = () => {
  const instance = {
    on: () => instance,
    subscribe: () => instance,
    unsubscribe: async () => 'ok',
  };
  return instance;
};

export const isSupabaseConfigured = true;
export const supabase = {
  from: demoDb.from,
  rpc: demoDb.rpc,
  channel,
  removeChannel: async () => 'ok',
  auth: {
    getSession: async () => ({ data: { session: { access_token: 'local-demo', token_type: 'bearer', user: DEMO_ADMIN } }, error: null }),
    getUser: async () => ({ data: { user: DEMO_ADMIN }, error: null }),
    signInWithPassword: async () => ({ data: { user: DEMO_ADMIN, session: { access_token: 'local-demo', token_type: 'bearer', user: DEMO_ADMIN } }, error: null }),
    signUp: async () => ({ data: { user: DEMO_ADMIN, session: { access_token: 'local-demo', token_type: 'bearer', user: DEMO_ADMIN } }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
  },
  functions: {
    invoke: async (name: string, options?: { body?: Record<string, any> }) => {
      if (name !== 'whiteboard-ocr') return { data: null, error: null };
      const { data: members } = await demoDb.from('members').select('*').eq('active', true);
      const importId = crypto.randomUUID();
      const rows = (members || []).map((member: Record<string, any>) => ({
        id: crypto.randomUUID(), detected_name: member.name, matched_member_id: member.id,
        breakfast: false, lunch: false, dinner: false, confidence: 0, needs_review: true,
        notes: 'Local demo: select meal periods after reviewing the image.',
      }));
      await demoDb.from('ocr_imports').insert({
        id: importId, meal_date: options?.body?.meal_date, file_name: options?.body?.file_name,
        status: 'needs_review', created_at: new Date().toISOString(),
      });
      await demoDb.from('ocr_import_rows').insert(rows.map((row: Record<string, any>) => ({ ...row, import_id: importId })));
      return { data: { import_id: importId, rows, validation_report: { valid: false, errors: [], warnings: ['OCR recognition is not available in this offline demo; review each member and meal selection.'], totals: { breakfast: 0, lunch: 0, dinner: 0 } } }, error: null };
    },
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null }),
    }),
  },
} as any;

export { demoDb };
