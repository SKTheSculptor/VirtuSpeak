import React from 'react';

const Input = ({ label, type = 'text', ...props }) => {
  return (
    <div style={{ marginBottom: '1rem', width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </label>
      )}
      <input
        type={type}
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          transition: 'border-color 0.2s',
        }}
        {...props}
      />
    </div>
  );
};

export default Input;
