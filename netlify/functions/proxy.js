exports.handler = async (event) => {
  // Only POST is accepted - the Claude Messages API doesn't use GET/PUT/etc.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Origin check keeps the proxy locked to requests from the app itself.
  // ALLOWED_ORIGIN is set in Netlify environment variables. If it's not set,
  // the check is skipped - useful for local development with netlify dev.
  const origin  = event.headers['origin'] ?? event.headers['referer'] ?? '';
  const allowed = process.env['ALLOWED_ORIGIN'];
  if (allowed && !origin.startsWith(allowed)) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'Forbidden' } }),
    };
  }

  // If the API key isn't set the function would fail anyway when calling Anthropic,
  // but returning early here gives a clearer error message
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY is not configured' } }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'Invalid JSON body' } }),
    };
  }

  const { model, max_tokens, system, messages } = body;

  // Pass the request straight through to the Anthropic Messages API.
  // The function doesn't modify or validate the payload beyond parsing it -
  // if Claude rejects it, the error comes back with the original status code.
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens, system, messages }),
  });

  const data = await response.json();

  return {
    statusCode: response.status,
    headers:    { 'Content-Type': 'application/json' },
    body:       JSON.stringify(data),
  };
};
