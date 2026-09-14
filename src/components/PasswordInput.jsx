import { useState } from 'react';

/**
 * ช่องรหัสผ่านพร้อมไอคอนลูกตาสำหรับดู/ซ่อนรหัสผ่าน
 * ใช้แทน <input type="password"> ธรรมดาได้เลย รับ props เหมือน input ปกติ
 */
export function PasswordInput({ value, onChange, required, placeholder }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-wrapper">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
      />
      <span className="toggle-password" onClick={() => setVisible(!visible)}>
        {visible ? '🙈' : '👁️'}
      </span>
    </div>
  );
}
