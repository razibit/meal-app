import { useMemo, useRef, useState, type ReactNode } from 'react';
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { useAuthStore } from '../stores/authStore';
import { useMembers } from '../hooks/useMembers';
import { useGroceryDutyAssignments } from '../hooks/useGroceryDutyAssignments';
import type { GroceryDutyAssignment, Member } from '../types';
import { BillingCycle, getBillingCycle, getBillingCycleDates, shiftBillingCycle } from '../utils/billingCycleHelpers';
import { formatDateRangeForDisplay } from '../utils/mealMonthHelpers';

function MemberCard({ member, count }: { member: Member; count: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `member:${member.id}` });
  return <button ref={setNodeRef} {...listeners} {...attributes} type="button" style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }} className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left touch-none ${count < 2 ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-border bg-bg-secondary'} ${isDragging ? 'opacity-50' : ''}`}>
    <span className="font-medium text-text-primary">{member.name}</span>
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${count < 2 ? 'bg-amber-200 text-amber-900' : 'bg-green-100 text-green-700'}`}>{count}/2</span>
  </button>;
}

function AssignmentChip({ assignment, member, onRemove }: { assignment: GroceryDutyAssignment; member?: Member; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `assignment:${assignment.id}` });
  return <div ref={setNodeRef} style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }} className={`inline-flex items-center rounded-full bg-primary text-white shadow-sm ${isDragging ? 'opacity-50' : ''}`}>
    <button type="button" {...listeners} {...attributes} className="px-3 py-2 cursor-grab touch-none" aria-label={`Move ${member?.name || 'member'} assignment`}>{member?.name || 'Inactive member'}</button>
    <button type="button" onClick={onRemove} data-export-hide className="px-2 py-2 border-l border-white/30" aria-label={`Remove ${member?.name || 'member'} assignment`}>×</button>
  </div>;
}

function DateRow({ date, children }: { date: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `date:${date}` });
  const display = new Date(`${date}T00:00:00`);
  return <div ref={setNodeRef} className={`grid gap-3 md:grid-cols-[10rem_1fr] p-4 border-b border-border min-h-20 ${isOver ? 'bg-primary/10 ring-2 ring-inset ring-primary' : 'bg-bg-primary'}`}>
    <div><div className="font-semibold text-text-primary">{display.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div><div className="text-xs text-text-tertiary">{date}</div></div>
    <div className="flex flex-wrap items-center gap-2">{children}<span data-export-hide className="text-xs text-text-tertiary">Drop member here</span></div>
  </div>;
}

export default function GroceryDuty() {
  const user = useAuthStore((state) => state.user);
  const { members, loading: membersLoading } = useMembers();
  const [period, setPeriod] = useState<BillingCycle>(() => getBillingCycle());
  const [message, setMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const scheduleRef = useRef<HTMLElement>(null);
  const dates = useMemo(() => getBillingCycleDates(period), [period]);
  const { assignments, loading, saving, error, add, move, remove } = useGroceryDutyAssignments(period, user?.id);
  const activeMembers = useMemo(() => members.filter((member) => member.active !== false), [members]);
  const memberMap = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const counts = useMemo(() => assignments.reduce<Record<string, number>>((result, item) => { result[item.member_id] = (result[item.member_id] || 0) + 1; return result; }, {}), [assignments]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }), useSensor(KeyboardSensor));

  const exportSchedule = async (format: 'png' | 'jpeg') => {
    if (!scheduleRef.current) return;
    setExporting(true);
    setMessage(null);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(scheduleRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        onclone: (documentClone) => documentClone.querySelectorAll<HTMLElement>('[data-export-hide]').forEach((element) => { element.style.display = 'none'; }),
      });
      const link = document.createElement('a');
      link.download = `grocery-duty-${period.startDate}-${period.endDate}.${format === 'jpeg' ? 'jpg' : 'png'}`;
      link.href = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.92 : undefined);
      link.click();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not export the schedule.');
    } finally {
      setExporting(false);
    }
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || !String(over.id).startsWith('date:')) return;
    const dutyDate = String(over.id).slice(5);
    const source = String(active.id);
    setMessage(null);
    try {
      if (source.startsWith('member:')) {
        const memberId = source.slice(7);
        if (assignments.some((item) => item.member_id === memberId && item.duty_date === dutyDate)) return;
        await add({ memberId, dutyDate });
      } else if (source.startsWith('assignment:')) {
        const assignment = assignments.find((item) => item.id === source.slice(11));
        if (!assignment || assignment.duty_date === dutyDate) return;
        if (assignments.some((item) => item.id !== assignment.id && item.member_id === assignment.member_id && item.duty_date === dutyDate)) throw new Error('This member is already assigned to that date.');
        await move({ assignment, dutyDate });
      }
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Could not save the assignment.'); }
  };

  return <DndContext sensors={sensors} onDragEnd={onDragEnd}>
    <div className="p-4 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h1 className="text-2xl font-bold text-text-primary">Grocery Duty</h1><p className="text-sm text-text-secondary">Assign at least two shopping duties to each active member.</p></div><div className="flex flex-wrap items-center justify-end gap-2"><button type="button" className="btn-secondary px-3 py-2" disabled={exporting || loading} onClick={() => void exportSchedule('png')}>{exporting ? 'Exporting…' : 'Export PNG'}</button><button type="button" className="btn-secondary px-3 py-2" disabled={exporting || loading} onClick={() => void exportSchedule('jpeg')}>Export JPG</button>{saving ? <span className="text-sm text-primary">Saving…</span> : <span className="text-sm text-success">Changes save automatically</span>}</div></div>
      <div className="card mb-6 flex items-center justify-between gap-3"><button className="btn-secondary" onClick={() => setPeriod((value) => shiftBillingCycle(value, -1))} aria-label="Previous billing cycle">←</button><div className="text-center"><div className="font-semibold text-text-primary">{formatDateRangeForDisplay(period.startDate, period.endDate)}</div><button className="text-sm text-primary mt-1" onClick={() => setPeriod(getBillingCycle())}>Current cycle</button></div><button className="btn-secondary" onClick={() => setPeriod((value) => shiftBillingCycle(value, 1))} aria-label="Next billing cycle">→</button></div>
      {(message || error) ? <div className="mb-4 p-3 rounded-lg border border-error bg-error/10 text-error">{message || (error instanceof Error ? error.message : 'Unable to load assignments.')}</div> : null}
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr] items-start">
        <aside className="card lg:sticky lg:top-4"><h2 className="font-semibold text-text-primary mb-1">Active members</h2><p className="text-xs text-text-secondary mb-4">Drag a member onto any date.</p><div className="space-y-2">{membersLoading ? <p className="text-text-secondary">Loading members…</p> : activeMembers.map((member) => <MemberCard key={member.id} member={member} count={counts[member.id] || 0} />)}</div></aside>
        <section ref={scheduleRef} className="card overflow-hidden p-0"><div className="p-4 bg-bg-secondary border-b border-border"><h2 className="font-semibold text-text-primary">Grocery Duty Schedule</h2><p className="text-sm text-text-secondary">{formatDateRangeForDisplay(period.startDate, period.endDate)}</p></div>{loading ? <div className="p-8 text-center text-text-secondary">Loading schedule…</div> : dates.map((date) => <DateRow key={date} date={date}>{assignments.filter((item) => item.duty_date === date).map((assignment) => <AssignmentChip key={assignment.id} assignment={assignment} member={memberMap.get(assignment.member_id)} onRemove={() => void remove(assignment).catch((cause) => setMessage(cause instanceof Error ? cause.message : 'Could not remove assignment.'))} />)}</DateRow>)}</section>
      </div>
    </div>
  </DndContext>;
}
