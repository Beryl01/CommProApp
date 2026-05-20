import './style.css';
import { initTheme } from './theme';
import { initOnboarding } from './ui/onboarding';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initOnboarding();
});