export function createEl(tag: string, cls?: string): HTMLElement {
  const element = document.createElement(tag);
  if (cls) element.className = cls;
  return element;
}

export function requireEl<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id) as T | null;
  if (!element) throw new Error(`Required element #${id} not found`);
  return element;
}

export function elMaybe<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function esc(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function appendMsg(idx: number, role: 'you' | 'ai' | 'sys', text: string, name: string): void {
  const container = elMaybe(`msgs-${idx}`);
  if (!container) return;
  const row = createEl('div', `msg ${role}`);
  row.innerHTML = `${role !== 'sys' ? `<div class="msg-who">${role === 'you' ? 'You' : esc(name)}</div>` : ''}
    <div class="msg-bub">${esc(text).replace(/\n/g, '<br>')}</div>`;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

export function showTyping(idx: number): void {
  const container = elMaybe(`msgs-${idx}`);
  if (!container) return;
  const row = createEl('div', 'msg ai');
  row.id = `typ-${idx}`;
  row.innerHTML = `<div class="typing-bub"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

export function removeTyping(idx: number): void {
  elMaybe(`typ-${idx}`)?.remove();
}
