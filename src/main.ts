import './style.css';
import { initTheme } from './theme';
import { initOnboarding } from './ui/onboarding';

// Wait for the DOM before touching anything - theme and onboarding both
// query elements that need to exist first
document.addEventListener('DOMContentLoaded', () => {
  initTheme();       // applies saved theme preference before anything renders
  initOnboarding();  // shows the role/channel setup screen on first visit
});
