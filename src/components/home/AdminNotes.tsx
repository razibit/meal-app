import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../services/supabase';

const DRAFT_KEY = 'admin-notes-draft';

function AdminNotes() {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const contentRef = useRef('');
  const savedRef = useRef('');
  const timerRef = useRef<number>();
  const savingRef = useRef<Promise<void>>(Promise.resolve());

  const save = useCallback(() => {
    window.clearTimeout(timerRef.current);
    if (contentRef.current === savedRef.current) return savingRef.current;
    const value = contentRef.current;
    setStatus('saving');
    const operation = savingRef.current.then(async () => {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase.from('admin_notes').upsert(
        { id: true, content: value, updated_by: authData.user?.id },
        { onConflict: 'id' }
      );
      if (error) throw error;
      savedRef.current = value;
      localStorage.removeItem(DRAFT_KEY);
      setStatus('saved');
    }).catch((error) => {
      console.error('Failed to save admin notes:', error);
      localStorage.setItem(DRAFT_KEY, contentRef.current);
      setStatus('error');
    });
    savingRef.current = operation;
    return operation;
  }, []);

  useEffect(() => {
    let active = true;
    supabase.from('admin_notes').select('content').eq('id', true).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) { setStatus('error'); return; }
      const remote = data?.content || '';
      const draft = localStorage.getItem(DRAFT_KEY);
      const initial = draft ?? remote;
      savedRef.current = remote;
      contentRef.current = initial;
      setContent(initial);
      setStatus(draft === null ? 'saved' : 'saving');
      if (draft !== null) window.setTimeout(save, 0);
    });
    const visibility = () => { if (document.visibilityState === 'hidden') void save(); };
    const pageHide = () => { localStorage.setItem(DRAFT_KEY, contentRef.current); void save(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pageHide);
    return () => {
      active = false;
      window.clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pageHide);
      void save();
    };
  }, [save]);

  const update = (value: string) => {
    contentRef.current = value;
    setContent(value);
    localStorage.setItem(DRAFT_KEY, value);
    setStatus('saving');
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(save, 700);
  };

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-text-primary">Notes</h3>
        <span className="text-xs text-text-secondary">
          {status === 'saving' ? 'Saving...' : status === 'error' ? 'Saved locally' : status === 'loading' ? 'Loading...' : 'Saved'}
        </span>
      </div>
      <textarea className="input w-full min-h-40 resize-y" value={content} onChange={(event) => update(event.target.value)} onBlur={() => void save()} placeholder="Shared administrative notes" disabled={status === 'loading'} />
    </section>
  );
}

export default AdminNotes;
