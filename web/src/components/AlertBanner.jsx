import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function AlertBanner({ type = 'info', message }) {
  if (!message) return null;

  const icons = {
    error: <AlertCircle size={20} color="#ef4444" />,
    success: <CheckCircle size={20} color="#22c55e" />,
    info: <Info size={20} color="#0ea5e9" />
  };

  return (
    <div className={`alert-box alert-${type}`}>
      {icons[type] || icons.info}
      <span>{message}</span>
    </div>
  );
}
