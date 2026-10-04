export const GEMINI_MODEL = 'gemini-3.1-flash-lite';
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type OcrRow = {
  name: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  confidence: number;
  notes?: string;
};

export type MemberRef = { id: string; name: string };

export const normalizeName = (value: string) => value
  .toLowerCase()
  .replace(/\b(vai|bhai|ভাই)\b/g, ' ')
  .replace(/[^a-z0-9\u0980-\u09ff\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const editDistance = (a: string, b: string) => {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = old;
    }
  }
  return row[b.length];
};

export const nameScore = (left: string, right: string) => {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  return 1 - editDistance(a, b) / Math.max(a.length, b.length);
};

export const matchMember = (name: string, members: MemberRef[]) => {
  const ranked = members.map((member) => ({ member, score: nameScore(name, member.name) })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const runnerUp = ranked[1];
  const ambiguous = Boolean(best && runnerUp && best.score - runnerUp.score < 0.12);
  return { member: best && best.score >= 0.72 && !ambiguous ? best.member : null, score: best?.score ?? 0, ambiguous };
};

export const decodeBase64 = (input: string) => {
  const clean = input.replace(/\s/g, '');
  if (!clean || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new Error('Image data is not valid base64');
  const estimatedBytes = (clean.length * 3) / 4 - (clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0);
  if (estimatedBytes > MAX_IMAGE_BYTES) throw new Error('Image exceeds the 10 MB OCR limit');
  try {
    return Uint8Array.from(atob(clean), (char) => char.charCodeAt(0));
  } catch {
    throw new Error('Image data is not valid base64');
  }
};

export const parseOcrResponse = (text: string): OcrRow[] => {
  let value: unknown;
  try { value = JSON.parse(text.trim()); } catch { throw new Error('Gemini returned malformed JSON'); }
  const candidate = Array.isArray(value) ? value : (value as { rows?: unknown })?.rows;
  if (!Array.isArray(candidate)) throw new Error('Gemini response did not contain a rows array');
  return candidate.map((item, index) => {
    const row = item as Record<string, unknown>;
    if (typeof row.name !== 'string' || !row.name.trim()) throw new Error(`Gemini row ${index + 1} has no name`);
    for (const field of ['breakfast', 'lunch', 'dinner'] as const) if (typeof row[field] !== 'boolean') throw new Error(`Gemini row ${index + 1} has an invalid ${field} value`);
    const confidence = Number(row.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error(`Gemini row ${index + 1} has invalid confidence`);
    return { name: row.name.trim(), breakfast: row.breakfast as boolean, lunch: row.lunch as boolean, dinner: row.dinner as boolean, confidence, notes: typeof row.notes === 'string' ? row.notes : undefined };
  });
};

export const geminiErrorStatus = (status: number) => status === 401 || status === 403 ? 502 : status === 429 ? 503 : status >= 500 ? 503 : 502;

export const buildPrompt = (members: MemberRef[]) => `You are reading the kitchen meal whiteboard used by a Bangladeshi dormitory. This is a layout-understanding task, not generic OCR.

BOARD STRUCTURE:
- Each horizontal ruled row represents exactly one member. Read rows from top to bottom.
- The wide left column contains a handwritten member name, often followed by "Vai" or "Bhai".
- The three narrow columns to the right are breakfast (নাস্তা), lunch (দুপুর), and dinner (রাত), in that left-to-right order.
- A deliberate tick/check mark inside a meal cell means true. A blank cell, erased/painted patch without a visible tick, stain, scratch, or unrelated mark means false.

RECOGNITION RULES:
- Correct perspective/tilt mentally and follow the ruled row and column boundaries. Do not shift a tick into an adjacent row.
- Handle faded handwriting, uneven lighting, shadows, dirty surfaces, white paint patches, overlapping marks, and messy ticks.
- Ignore headings, row numbers, stains, graffiti, and all writing below the member table.
- Use the active-member roster below to resolve handwriting, but never invent a row that is not visibly present.
- Include every visible named member row once. Preserve uncertain readings and explain uncertainty in notes.
- Confidence is the confidence in the complete row (name plus three meal cells), from 0 to 1.

ACTIVE MEMBER ROSTER:
${members.map((member) => `- ${member.name}`).join('\n')}

Return only the requested structured JSON.`;

export const responseSchema = {
  type: 'OBJECT',
  required: ['rows'],
  properties: {
    rows: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['name', 'breakfast', 'lunch', 'dinner', 'confidence'],
        properties: {
          name: { type: 'STRING' }, breakfast: { type: 'BOOLEAN' }, lunch: { type: 'BOOLEAN' }, dinner: { type: 'BOOLEAN' },
          confidence: { type: 'NUMBER', minimum: 0, maximum: 1 }, notes: { type: 'STRING' },
        },
      },
    },
  },
};
