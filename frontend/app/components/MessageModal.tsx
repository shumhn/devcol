'use client';

import { useState } from 'react';

interface MessageModalProps {
  isOpen: boolean;
  type: 'accept' | 'reject';
  onClose: () => void;
  onSubmit: (message: string) => void;
}

export function MessageModal({ isOpen, type, onClose, onSubmit }: MessageModalProps) {
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(message);
    setMessage('');
  };

  const title = type === 'accept' ? 'Accept Request' : 'Reject Request';
  const placeholder = type === 'accept' 
    ? 'Optional: Add next steps or welcome message (e.g., "Join our Discord at...")'
    : 'Optional: Reason for rejection (e.g., "Need more experience with...")';
  const submitText = type === 'accept' ? '✅ Accept' : '❌ Reject';
  const submitColor = type === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">
            Message to applicant
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            maxLength={300}
            rows={4}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">{message.length}/300 characters</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`flex-1 ${submitColor} text-white px-4 py-2 rounded-lg font-semibold`}
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
}
