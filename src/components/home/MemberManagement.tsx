import { useEffect, useState } from 'react';
import type { Member } from '../../types';
import { useMealStore } from '../../stores/mealStore';

type MemberForm = {
  name: string;
  email: string;
  phone: string;
  active: boolean;
};

const emptyForm: MemberForm = {
  name: '',
  email: '',
  phone: '',
  active: true,
};

function MemberManagement() {
  const { members, loading, fetchMembers, createMember, updateMember, deleteMemberIfUnused } = useMealStore();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const startEdit = (member: Member) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email || '',
      phone: member.phone || '',
      active: member.active !== false,
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      await updateMember(editingId, form);
    } else {
      await createMember(form);
    }
    reset();
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Members</h3>
          <p className="text-sm text-text-secondary">Admin-managed resident records</p>
        </div>
        {editingId && (
          <button className="btn-secondary px-3 py-2 text-sm" onClick={reset} type="button">
            Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1.4fr_1.2fr_1fr_auto] mb-5">
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          className="input"
          placeholder="Member name"
        />
        <input
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          className="input"
          placeholder="Email optional"
          type="email"
        />
        <input
          value={form.phone}
          onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          className="input"
          placeholder="Phone"
        />
        <button className="btn-primary px-4 py-2" type="submit" disabled={loading || !form.name.trim()}>
          {editingId ? 'Save' : 'Add'}
        </button>
      </form>

      <button type="button" className="w-full py-2 flex items-center justify-between text-sm font-medium text-text-secondary hover:text-text-primary border-t border-border" onClick={() => setShowMembers((value) => !value)} aria-expanded={showMembers}>
        <span>Added members ({members.length})</span><span aria-hidden="true">{showMembers ? '▲' : '▼'}</span>
      </button>

      {showMembers && <div className="overflow-x-auto mt-3">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-bg-tertiary">
              <th className="px-3 py-2 text-left text-sm font-semibold text-text-primary">Name</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-text-primary">Contact</th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-text-primary">Status</th>
              <th className="px-3 py-2 text-right text-sm font-semibold text-text-primary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-border">
                <td className="px-3 py-2 text-text-primary font-medium">{member.name}</td>
                <td className="px-3 py-2 text-sm text-text-secondary">
                  <div>{member.phone || '-'}</div>
                  <div>{member.email || '-'}</div>
                </td>
                <td className="px-3 py-2 text-sm">
                  <span className={member.active === false ? 'text-text-tertiary' : 'text-success'}>
                    {member.active === false ? 'Inactive' : 'Active'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button className="btn-secondary px-3 py-1 text-sm" type="button" onClick={() => startEdit(member)}>
                      Edit
                    </button>
                    <button
                      className="btn-secondary px-3 py-1 text-sm text-error"
                      type="button"
                      onClick={() => deleteMemberIfUnused(member.id)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </div>
  );
}

export default MemberManagement;
