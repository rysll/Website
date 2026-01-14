import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { X, Lock } from 'lucide-react';

export const AdminLogin = ({ onClose }) => {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      if (login(password)) {
        setPassword('');
        onClose();
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="bg-stone-900 text-white p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 p-2 rounded-lg">
              <Lock size={24} />
            </div>
            <h2 className="text-xl font-bold">Admin Login</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-700 rounded-full text-stone-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-stone-600 text-sm mb-6">
            Enter your admin password to access the product management settings.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter password"
                disabled={isLoading}
                className="w-full px-4 py-3 border-2 border-stone-300 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none font-mono disabled:bg-stone-100"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Login'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-stone-200 text-stone-700 py-2 rounded-lg font-medium hover:bg-stone-300 transition-colors"
            >
              Cancel
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-stone-200"> 
          </div>
        </div>
      </div>
    </div>
  );
};
