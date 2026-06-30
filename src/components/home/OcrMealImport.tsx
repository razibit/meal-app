import { useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import { MEAL_PERIOD_LABELS, MEAL_PERIODS, type MealPeriod } from '../../constants/meals';
import type { Member, OcrImportRow } from '../../types';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateMeals } from '../../query/invalidation';
import { queryKeys } from '../../query/keys';

interface OcrMealImportProps {
  selectedDate: string;
  members: Member[];
  onApplied: () => Promise<void>;
}

function OcrMealImport({ selectedDate, members, onApplied }: OcrMealImportProps) {
  const queryClient = useQueryClient();
  const activeMembers = useMemo(() => members.filter((member) => member.active !== false), [members]);
  const [file, setFile] = useState<File | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [rows, setRows] = useState<OcrImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[]; warnings: string[]; totals: Record<string, number> } | null>(null);

  const fileToBase64 = (input: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(input);
  });

  const processImage = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const image_base64 = await fileToBase64(file);
      const { data, error: invokeError } = await supabase.functions.invoke('whiteboard-ocr', {
        body: {
          meal_date: selectedDate,
          image_base64,
          mime_type: file.type,
          file_name: file.name,
        },
      });

      if (invokeError) throw invokeError;
      setImportId(data.import_id);
      setRows(data.rows || []);
      setValidation(data.validation_report || null);
    } catch (err) {
      console.error('OCR import failed:', err);
      setError(err instanceof Error ? err.message : 'OCR import failed');
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (index: number, patch: Partial<OcrImportRow>) => {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const togglePeriod = (index: number, period: MealPeriod) => {
    updateRow(index, { [period]: !rows[index][period] });
  };

  const applyRows = async () => {
    if (!importId) return;
    setApplying(true);
    setError(null);

    try {
      const editableRows = rows.filter((row) => row.id).map((row) => supabase.from('ocr_import_rows').update({ matched_member_id: row.matched_member_id, breakfast: row.breakfast, lunch: row.lunch, dinner: row.dinner, needs_review: !row.matched_member_id }).eq('id', row.id!));
      const updates = await Promise.all(editableRows);
      const updateError = updates.find((result) => result.error)?.error;
      if (updateError) throw updateError;
      const payload = rows
        .filter((row) => row.matched_member_id)
        .map((row) => ({
          member_id: row.matched_member_id,
          breakfast: row.breakfast,
          lunch: row.lunch,
          dinner: row.dinner,
        }));

      const { error: rpcError } = await supabase.rpc('apply_ocr_meal_import', {
        p_import_id: importId,
        p_meal_date: selectedDate,
        p_rows: payload,
      });

      if (rpcError) throw rpcError;
      await onApplied();
      await invalidateMeals(queryClient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.ocrHistory });
      window.dispatchEvent(new CustomEvent('ocr:changed'));
    } catch (err) {
      console.error('Apply OCR import failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply OCR import');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Whiteboard OCR</h3>
          <p className="text-sm text-text-secondary">Capture or upload the kitchen board, review, then apply.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="hidden"
            id="whiteboard-ocr-file"
          />
          <label htmlFor="whiteboard-ocr-file" className="btn-secondary px-4 py-2 cursor-pointer">
            Select Image
          </label>
          <button type="button" className="btn-primary px-4 py-2" disabled={!file || loading} onClick={processImage}>
            {loading ? 'Reading...' : 'Read Board'}
          </button>
        </div>
      </div>

      {file && <div className="text-sm text-text-secondary mb-3">{file.name}</div>}
      {error && <div className="mb-3 p-3 rounded-lg border border-error bg-error/10 text-error text-sm">{error}</div>}
      {validation && <div className={`mb-3 p-3 rounded-lg border text-sm ${validation.valid ? 'border-success bg-success/10 text-success' : 'border-warning bg-warning/10 text-text-primary'}`}><div className="font-semibold">Validation {validation.valid ? 'passed' : 'requires review'} · B {validation.totals.breakfast || 0} / L {validation.totals.lunch || 0} / D {validation.totals.dinner || 0}</div>{validation.errors.map((item) => <div key={item}>{item}</div>)}{validation.warnings.map((item) => <div key={item}>{item}</div>)}</div>}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-tertiary border-b border-border">
                <th className="px-3 py-2 text-left text-sm font-semibold text-text-primary">Detected</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-text-primary">Matched Member</th>
                {MEAL_PERIODS.map((period) => (
                  <th key={period} className="px-3 py-2 text-center text-sm font-semibold text-text-primary">
                    {MEAL_PERIOD_LABELS[period]}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-sm font-semibold text-text-primary">Review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.detected_name}-${index}`} className="border-b border-border">
                  <td className="px-3 py-2 text-sm text-text-primary">{row.detected_name}</td>
                  <td className="px-3 py-2">
                    <select
                      className="input min-w-[180px]"
                      value={row.matched_member_id || ''}
                      onChange={(event) => updateRow(index, {
                        matched_member_id: event.target.value || null,
                        needs_review: !event.target.value,
                      })}
                    >
                      <option value="">Unmatched</option>
                      {activeMembers.map((member) => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                  </td>
                  {MEAL_PERIODS.map((period) => (
                    <td key={period} className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => togglePeriod(index, period)}
                        className={`w-9 h-9 rounded-lg border font-bold ${row[period] ? 'bg-primary text-white border-primary' : 'bg-bg-primary border-border text-text-tertiary'}`}
                      >
                        {row[period] ? 'Y' : '-'}
                      </button>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-xs">
                    {row.needs_review ? (
                      <span className="text-warning">Needs review</span>
                    ) : (
                      <span className="text-success">Ready</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <button type="button" className="btn-primary px-4 py-2" disabled={applying || rows.some((row) => !row.matched_member_id)} onClick={applyRows}>
              {applying ? 'Applying...' : 'Apply Meals'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OcrMealImport;
