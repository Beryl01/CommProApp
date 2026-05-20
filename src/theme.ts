const STORAGE_KEY = 'commpro-theme';

export function initTheme(): void {
  if (localStorage.getItem(STORAGE_KEY) !== 'light') {
    document.documentElement.dataset.theme = 'dark';
  }

  const button = document.getElementById('theme-toggle');
  if (!button) return;

  button.textContent = isDark() ? '☀️' : '🌙';

  button.addEventListener('click', () => {
    if (isDark()) {
      delete document.documentElement.dataset.theme;
      localStorage.setItem(STORAGE_KEY, 'light');
    } else {
      document.documentElement.dataset.theme = 'dark';
      localStorage.setItem(STORAGE_KEY, 'dark');
    }
    button.textContent = isDark() ? '☀️' : '🌙';
  });
}

function isDark(): boolean {
  return document.documentElement.dataset.theme === 'dark';
}