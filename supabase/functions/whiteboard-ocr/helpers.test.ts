import { describe, expect, it } from 'vitest';
import { decodeBase64, geminiErrorStatus, matchMember, normalizeName, parseOcrResponse } from './helpers';

describe('whiteboard OCR helpers', () => {
  it('validates and decodes base64', () => {
    expect(Array.from(decodeBase64('aGVsbG8='))).toEqual([104, 101, 108, 108, 111]);
    expect(() => decodeBase64('not-base64')).toThrow('valid base64');
  });

  it('parses schema-shaped rows', () => {
    expect(parseOcrResponse(JSON.stringify({ rows: [{ name: 'Hasan Vai', breakfast: true, lunch: false, dinner: true, confidence: 0.9 }] }))[0]).toMatchObject({ name: 'Hasan Vai', lunch: false });
    expect(() => parseOcrResponse('{bad json')).toThrow('malformed JSON');
    expect(() => parseOcrResponse(JSON.stringify({ rows: [{ name: 'Hasan', breakfast: 'yes', lunch: false, dinner: true, confidence: 0.9 }] }))).toThrow('invalid breakfast');
  });

  it('normalizes honorifics and matches clear names', () => {
    expect(normalizeName('  Hasan Bhai! ')).toBe('hasan');
    expect(matchMember('Hasan Vai', [{ id: '1', name: 'Hasan' }, { id: '2', name: 'Rajib' }]).member?.id).toBe('1');
  });

  it('rejects ambiguous member matches', () => {
    const result = matchMember('Ron', [{ id: '1', name: 'Roni' }, { id: '2', name: 'Rony' }]);
    expect(result.member).toBeNull();
    expect(result.ambiguous).toBe(true);
  });

  it('maps upstream failures to safe gateway statuses', () => {
    expect(geminiErrorStatus(401)).toBe(502);
    expect(geminiErrorStatus(404)).toBe(502);
    expect(geminiErrorStatus(429)).toBe(503);
    expect(geminiErrorStatus(500)).toBe(503);
  });
});
