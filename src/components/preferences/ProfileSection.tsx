import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../services/supabase';

export function ProfileSection() {
  const user = useAuthStore((state) => state.user);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [ricePreference, setRicePreference] = useState(user?.rice_preference || 'boiled');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const { error: updateError } = await supabase
        .from('members')
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          rice_preference: ricePreference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      const { data: updatedMember, error: fetchError } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update auth store
      useAuthStore.setState({ user: updatedMember });

      setSuccess(true);
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setRicePreference(user?.rice_preference || 'boiled');
    setIsEditing(false);
    setError(null);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Profile</h3>

      <div className="space-y-4">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">
            Name
          </label>
          {isEditing ? (
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder="Enter your name"
            />
          ) : (
            <p className="text-text-primary py-2">{user.name}</p>
          )}
        </div>

        {/* Email Field (Read-only) */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
            Email
          </label>
          <p className="text-text-primary py-2">{user.email}</p>
        </div>

        {/* Phone Field */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-1">
            Phone
          </label>
          {isEditing ? (
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full"
              placeholder="Enter your phone number"
            />
          ) : (
            <p className="text-text-primary py-2">{user.phone || 'Not provided'}</p>
          )}
        </div>

        {/* Rice Preference Field */}
        <div>
          <label htmlFor="rice-preference" className="block text-sm font-medium text-text-secondary mb-1">
            Rice Preference
          </label>
          {isEditing ? (
            <select
              id="rice-preference"
              value={ricePreference}
              onChange={(e) => setRicePreference(e.target.value as 'boiled' | 'atop')}
              className="input w-full"
            >
              <option value="boiled">Boiled Rice</option>
              <option value="atop">Atop Rice</option>
            </select>
          ) : (
            <p className="text-text-primary py-2 capitalize">{user.rice_preference || 'boiled'}</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">Profile updated successfully!</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={loading || !name.trim()}
                className="btn-primary flex-1"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-primary w-full"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
