import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OcrRow {
  name: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  confidence?: number;
  notes?: string;
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function scoreName(candidate: string, target: string) {
  const a = normalizeName(candidate);
  const b = normalizeName(target);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.86;

  const aParts = new Set(a.split(' '));
  const bParts = new Set(b.split(' '));
  const overlap = [...aParts].filter((part) => bParts.has(part)).length;
  return overlap / Math.max(aParts.size, bParts.size);
}

function extractJson(text: string): OcrRow[] {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith('[')
    ? trimmed
    : trimmed.slice(trimmed.indexOf('['), trimmed.lastIndexOf(']') + 1);
  return JSON.parse(jsonText);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!geminiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing GEMINI_API_KEY or Supabase service environment variables');
    }

    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !userData.user) throw new Error('Unauthorized');

    const { data: adminMember } = await supabase
      .from('members')
      .select('id, role, active')
      .eq('id', userData.user.id)
      .single();

    if (!adminMember || adminMember.role !== 'admin' || adminMember.active === false) {
      throw new Error('Only admins can process whiteboard OCR');
    }

    const body = await req.json();
    const mealDate = body.meal_date;
    const imageBase64 = body.image_base64;
    const mimeType = body.mime_type || 'image/jpeg';
    const fileName = body.file_name || null;

    if (!mealDate || !imageBase64) {
      throw new Error('meal_date and image_base64 are required');
    }

    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name')
      .eq('active', true)
      .order('name');

    if (membersError) throw membersError;

    const prompt = [
      'You are reading a dormitory meal whiteboard.',
      'The board has one row per resident and three columns: Breakfast, Lunch, Dinner.',
      'A tick mark means that resident will take that meal.',
      'Return only a JSON array. Do not wrap in markdown.',
      'Each row must be: {"name":"Resident Name","breakfast":true|false,"lunch":true|false,"dinner":true|false,"confidence":0.0-1.0,"notes":"short optional note"}.',
      'If a name is unclear, provide the best visible text and lower confidence.',
    ].join('\n');

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiRes.ok) {
      throw new Error(`Gemini OCR failed with ${geminiRes.status}`);
    }

    const geminiJson = await geminiRes.json();
    const text = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const parsedRows = extractJson(text);

    const rows = parsedRows.map((row) => {
      const ranked = (members || [])
        .map((member) => ({ member, score: scoreName(row.name, member.name) }))
        .sort((a, b) => b.score - a.score);
      const best = ranked[0];
      const matched = best && best.score >= 0.72 ? best.member : null;

      return {
        detected_name: row.name,
        matched_member_id: matched?.id || null,
        breakfast: Boolean(row.breakfast),
        lunch: Boolean(row.lunch),
        dinner: Boolean(row.dinner),
        confidence: row.confidence ?? best?.score ?? null,
        needs_review: !matched || (row.confidence ?? best?.score ?? 0) < 0.85,
        notes: row.notes || null,
      };
    });

    const { data: importRow, error: importError } = await supabase
      .from('ocr_imports')
      .insert({
        meal_date: mealDate,
        file_name: fileName,
        mime_type: mimeType,
        status: 'parsed',
        raw_output: geminiJson,
        created_by: adminMember.id,
      })
      .select('id')
      .single();

    if (importError) throw importError;

    if (rows.length > 0) {
      const { error: rowsError } = await supabase
        .from('ocr_import_rows')
        .insert(rows.map((row) => ({ ...row, import_id: importRow.id })));
      if (rowsError) throw rowsError;
    }

    return new Response(JSON.stringify({ import_id: importRow.id, rows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'OCR failed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
