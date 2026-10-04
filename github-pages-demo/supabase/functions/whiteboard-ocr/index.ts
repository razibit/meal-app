import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { buildPrompt, decodeBase64, GEMINI_MODEL, geminiErrorStatus, matchMember, normalizeName, parseOcrResponse, responseSchema } from './helpers.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
class HttpError extends Error { constructor(message: string, public status = 400, public stage = 'request') { super(message); } }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed', stage: 'request' }, 405);
  let importId: string | null = null;
  let db: ReturnType<typeof createClient> | null = null;
  let stage = 'configuration';
  const startedAt = Date.now();
  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!apiKey || !url || !serviceKey) throw new HttpError('OCR service is not configured', 500, stage);
    const auth = request.headers.get('Authorization') || '';
    db = createClient(url, serviceKey, { global: { headers: { Authorization: auth } } });
    stage = 'authorization';
    const { data: userData, error: userError } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
    if (userError || !userData.user) throw new HttpError('Unauthorized', 401, stage);
    const { data: admin } = await db.from('members').select('id,role,active').eq('id', userData.user.id).single();
    if (!admin || admin.role !== 'admin' || admin.active === false) throw new HttpError('Only active admins can process OCR', 403, stage);

    stage = 'input_validation';
    const body = await request.json().catch(() => { throw new HttpError('Request body must be valid JSON', 400, stage); });
    const mealDate = body.meal_date;
    const mime = body.mime_type || 'image/jpeg';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(mealDate || '') || !body.image_base64) throw new HttpError('Valid meal_date and image_base64 are required', 400, stage);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new HttpError('Unsupported image type', 415, stage);
    const imageBytes = decodeBase64(body.image_base64);

    stage = 'create_import';
    const { data: created, error: createError } = await db.from('ocr_imports').insert({ meal_date: mealDate, file_name: body.file_name || 'whiteboard.jpg', mime_type: mime, status: 'processing', validation_status: 'pending', created_by: admin.id }).select('id').single();
    if (createError) throw createError;
    importId = created.id;
    console.log(JSON.stringify({ event: 'ocr_started', import_id: importId, model: GEMINI_MODEL, image_bytes: imageBytes.length }));
    const { data: members, error: memberError } = await db.from('members').select('id,name').eq('active', true).order('name');
    if (memberError) throw memberError;

    stage = 'gemini_request';
    let geminiResponse: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      try {
        geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
          method: 'POST', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(members || []) }, { inlineData: { mimeType: mime, data: body.image_base64 } }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema } }),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw new HttpError('Gemini request timed out', 504, stage);
        throw new HttpError('Could not reach Gemini', 503, stage);
      } finally { clearTimeout(timeout); }
      if (geminiResponse.ok || (geminiResponse.status !== 429 && geminiResponse.status < 500)) break;
      if (attempt < 2) await delay(500 * (2 ** attempt));
    }
    if (!geminiResponse) throw new HttpError('Gemini did not return a response', 503, stage);
    if (!geminiResponse.ok) {
      const detail = await geminiResponse.json().catch(() => null) as { error?: { message?: string } } | null;
      console.error(JSON.stringify({ event: 'gemini_error', import_id: importId, status: geminiResponse.status, detail: detail?.error?.message?.slice(0, 300) }));
      throw new HttpError(`Gemini OCR failed (${geminiResponse.status})`, geminiErrorStatus(geminiResponse.status), stage);
    }

    stage = 'response_parsing';
    const raw = await geminiResponse.json();
    if (raw.promptFeedback?.blockReason) throw new HttpError(`Gemini blocked the image: ${raw.promptFeedback.blockReason}`, 422, stage);
    const candidate = raw.candidates?.[0];
    if (!candidate) throw new HttpError('Gemini returned no candidates', 502, stage);
    if (candidate.finishReason && candidate.finishReason !== 'STOP') throw new HttpError(`Gemini stopped early: ${candidate.finishReason}`, 502, stage);
    const text = candidate.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim();
    if (!text) throw new HttpError('Gemini returned an empty response', 502, stage);
    const parsed = parseOcrResponse(text);
    const seen = new Map<string, number>();
    parsed.forEach((row) => seen.set(normalizeName(row.name), (seen.get(normalizeName(row.name)) || 0) + 1));
    const rows = parsed.map((row) => {
      const match = matchMember(row.name, members || []);
      const confidence = Math.min(row.confidence, match.score || row.confidence);
      return { detected_name: row.name, matched_member_id: match.member?.id || null, breakfast: row.breakfast, lunch: row.lunch, dinner: row.dinner, confidence, needs_review: !match.member || match.ambiguous || confidence < 0.85, notes: row.notes || (match.ambiguous ? 'Ambiguous member match' : null) };
    });
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!rows.length) errors.push('OCR returned no member rows');
    for (const [name, count] of seen) if (name && count > 1) errors.push(`Duplicate detected name: ${name}`);
    rows.forEach((row) => { if (!row.matched_member_id) errors.push(`Unmatched or ambiguous name: ${row.detected_name}`); else if (row.confidence < 0.7) errors.push(`Low confidence row: ${row.detected_name}`); else if (row.needs_review) warnings.push(`Review row: ${row.detected_name}`); });
    const detected = new Set(rows.map((row) => row.matched_member_id).filter(Boolean));
    const missing = (members || []).filter((member) => !detected.has(member.id)).map((member) => member.name);
    if (missing.length) warnings.push(`Active members not detected: ${missing.join(', ')}`);
    const totals = { breakfast: rows.filter((row) => row.breakfast).length, lunch: rows.filter((row) => row.lunch).length, dinner: rows.filter((row) => row.dinner).length };
    if (totals.breakfast + totals.lunch + totals.dinner === 0) errors.push('No meal ticks were detected');

    stage = 'storage';
    const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const path = `${mealDate.slice(0, 4)}/${mealDate.slice(5, 7)}/${mealDate}/${importId}.${extension}`;
    const { error: uploadError } = await db.storage.from('whiteboard-images').upload(path, imageBytes, { contentType: mime, upsert: false });
    if (uploadError) throw uploadError;
    const { data: storedRows, error: rowError } = rows.length ? await db.from('ocr_import_rows').insert(rows.map((row) => ({ ...row, import_id: importId }))).select() : { data: [], error: null };
    if (rowError) throw rowError;
    const valid = errors.length === 0;
    const report = { valid, errors, warnings, totals, row_count: rows.length, active_member_count: (members || []).length };
    const metadata = { model: GEMINI_MODEL, model_version: raw.modelVersion, response_id: raw.responseId, usage: raw.usageMetadata, duration_ms: Date.now() - startedAt };
    const { error: updateError } = await db.from('ocr_imports').update({ status: valid ? 'ready' : 'validation_failed', validation_status: valid ? 'valid' : 'invalid', validation_report: report, breakfast_total: totals.breakfast, lunch_total: totals.lunch, dinner_total: totals.dinner, storage_path: path, raw_output: raw, model_metadata: metadata, processed_at: new Date().toISOString() }).eq('id', importId);
    if (updateError) throw updateError;
    console.log(JSON.stringify({ event: 'ocr_completed', import_id: importId, ...metadata, valid, rows: rows.length }));
    return json({ import_id: importId, status: valid ? 'ready' : 'validation_failed', validation_report: report, rows: storedRows || rows });
  } catch (error) {
    const failure = error instanceof HttpError ? error : new HttpError(error instanceof Error ? error.message : 'OCR failed', 500, stage);
    console.error(JSON.stringify({ event: 'ocr_failed', import_id: importId, stage: failure.stage || stage, status: failure.status, duration_ms: Date.now() - startedAt, error: failure.message }));
    if (importId && db) {
      try { await db.from('ocr_imports').update({ status: 'failed', validation_status: 'invalid', validation_report: { valid: false, errors: [failure.message], failure_stage: failure.stage || stage }, model_metadata: { model: GEMINI_MODEL, failure_stage: failure.stage || stage, duration_ms: Date.now() - startedAt }, processed_at: new Date().toISOString() }).eq('id', importId); } catch { /* preserve the original failure */ }
    }
    return json({ error: failure.message, stage: failure.stage || stage, import_id: importId }, failure.status);
  }
});
