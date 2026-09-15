const STORAGE_KEY = 'theme';

export function getSavedTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'light';
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark-mode', theme === 'dark');
  localStorage.setItem(STORAGE_KEY, theme);
}

// เรียกใช้ตอนแอปเริ่มโหลด เพื่อกันหน้าจอกะพริบขาวก่อนสลับเป็นมืด
export function initTheme() {
  applyTheme(getSavedTheme());
}
