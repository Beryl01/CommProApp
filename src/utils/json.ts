function repairJSON(json: string): string {
  let result   = '';
  let inString = false;
  let escaped  = false;

  for (const ch of json) {
    if (escaped)      { result += ch; escaped = false; continue; }
    if (ch === '\\')  { result += ch; escaped = true;  continue; }
    if (ch === '"')   { inString = !inString; result += ch; continue; }
    if (inString) {
      if (ch === '\n') { result += '\\n'; continue; }
      if (ch === '\r') { result += '\\r'; continue; }
      if (ch === '\t') { result += '\\t'; continue; }
    }
    result += ch;
  }
  return result;
}

function strip(raw: string): string {
  return raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

export function parseJsonObject<T>(raw: string): T {
  const cleaned = strip(raw);
  const start   = cleaned.indexOf('{');
  const end     = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  const slice = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(slice) as T;
  } catch {
    return JSON.parse(repairJSON(slice)) as T;
  }
}

export function parseJsonArray<T>(raw: string): T[] {
  const cleaned = strip(raw);
  const start   = cleaned.indexOf('[');
  const end     = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('No JSON array found in response');
  const slice = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(slice) as T[];
  } catch {
    return JSON.parse(repairJSON(slice)) as T[];
  }
}