import type { ExecutionStepResult, LanguageType } from '../types/pipeline';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateCode(
  step: ExecutionStepResult,
  language: LanguageType,
): string {
  switch (language) {
    case 'python':
      return generatePython(step);
    case 'node':
      return generateNode(step);
    case 'curl':
      return step.curl || '';
  }
}

// ---------------------------------------------------------------------------
// Python code generation
// ---------------------------------------------------------------------------

function generatePython(step: ExecutionStepResult): string {
  const req = step.request as Record<string, unknown> | undefined;
  if (!req) return '# No request data available';

  const body = (req.body as Record<string, unknown>) ?? req;
  const headers = (req.headers as Record<string, string>) ?? {};
  const url = (req.url as string) ?? '';

  // Detect OpenAI chat-completion shape
  if (body && body.model && body.messages) {
    return generatePythonOpenAI(url, headers, body);
  }

  // MCP tool-call shape
  if (req.tool) {
    return generatePythonMCP(url, headers, req);
  }

  // Generic HTTP request
  const method = extractMethod(step) || 'POST';
  return generateGenericPython(url, method, headers, body);
}

function generatePythonOpenAI(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
): string {
  const apiKey = extractApiKey(headers) || 'YOUR_API_KEY';
  const model = body.model as string;
  const messages = body.messages as unknown[];
  const temperature = body.temperature;
  const lines: string[] = [];

  lines.push('from openai import OpenAI');
  lines.push('');
  lines.push('');
  lines.push(`client = OpenAI(api_key="${apiKey}")`);
  lines.push('');
  lines.push('');
  lines.push('response = client.chat.completions.create(');
  lines.push(`    model="${model}",`);
  lines.push(`    messages=${replacer(JSON.stringify(messages, null, 4))},`);

  if (temperature !== undefined) {
    lines.push(`    temperature=${temperature},`);
  }

  // optional extras
  for (const key of ['max_tokens', 'top_p', 'stop']) {
    if (body[key] !== undefined) {
      lines.push(`    ${key}=${JSON.stringify(body[key])},`);
    }
  }

  lines.push(')');
  return lines.join('\n');
}

function generatePythonMCP(
  url: string,
  _headers: Record<string, string>,
  req: Record<string, unknown>,
): string {
  const toolName = req.tool as string;
  const args = req.arguments ?? {};
  const lines: string[] = [];

  lines.push('import httpx');
  lines.push('');
  lines.push('');
  lines.push('payload = {');
  lines.push('    "jsonrpc": "2.0",');
  lines.push('    "id": 1,');
  lines.push(`    "method": "tools/call",`);
  lines.push('    "params": {');
  lines.push(`        "name": "${toolName}",`);
  lines.push(`        "arguments": ${replacer(JSON.stringify(args, null, 4))},`);
  lines.push('    },');
  lines.push('}');
  lines.push('');
  lines.push('');
  lines.push(`response = httpx.post("${url}", json=payload)`);
  lines.push('data = response.json()');
  return lines.join('\n');
}

function generateGenericPython(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
): string {
  const lines: string[] = ['import requests', ''];

  const safeUrl = url || 'https://api.example.com/endpoint';
  const isGet = method.toUpperCase() === 'GET';

  if (isGet) {
    lines.push('');
    lines.push(`response = requests.get("${safeUrl}"${formatHeaders(headers)})`);
  } else {
    const bodyStr =
      body && typeof body === 'object'
        ? `json=${replacer(JSON.stringify(body, null, 4))}`
        : `data=${JSON.stringify(body ?? {})}`;

    lines.push('');
    lines.push(`response = requests.${method.toLowerCase()}(`);
    lines.push(`    "${safeUrl}",`);
    lines.push(`    ${bodyStr},`);
    lines.push(`    headers=${replacer(JSON.stringify(headers, null, 4))},`);
    lines.push(')');
  }

  lines.push('data = response.json()');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Node.js / fetch code generation
// ---------------------------------------------------------------------------

function generateNode(step: ExecutionStepResult): string {
  const req = step.request as Record<string, unknown> | undefined;
  if (!req) return '// No request data available';

  const body = (req.body as Record<string, unknown>) ?? req;
  const headers = (req.headers as Record<string, string>) ?? {};
  const url = (req.url as string) ?? '';

  const method = extractMethod(step) || 'POST';
  const safeUrl = url || 'https://api.example.com/endpoint';
  const lines: string[] = [];

  const hasBody = method.toUpperCase() !== 'GET';

  lines.push('const response = await fetch(');
  lines.push(`  "${safeUrl}", {`);
  lines.push(`    method: "${method.toUpperCase()}",`);
  lines.push(`    headers: ${replacer(JSON.stringify(headers, null, 2))},`);

  if (hasBody) {
    const bodyStr =
      body && typeof body === 'object'
        ? JSON.stringify(body, null, 2)
        : JSON.stringify(body ?? {});
    lines.push(`    body: JSON.stringify(${replacer(bodyStr)}),`);
  }

  lines.push('  });');
  lines.push('const data = await response.json();');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractApiKey(headers: Record<string, string>): string {
  const auth = headers['authorization'] || headers['Authorization'] || '';
  const match = auth.match(/Bearer\s+(.+)/i);
  return match ? match[1] : '';
}

function extractMethod(step: ExecutionStepResult): string {
  const curl = step.curl || '';
  if (/^-X\s+(GET|POST|PUT|PATCH|DELETE)/i.test(curl)) {
    const m = curl.match(/-X\s+(\w+)/i);
    if (m) return m[1];
  }
  // default to POST when there's a body
  return 'POST';
}

function formatHeaders(headers: Record<string, string>): string {
  const keys = Object.keys(headers);
  if (keys.length === 0) return '';
  return `, headers=${replacer(JSON.stringify(headers, null, 2))}`;
}

/**
 * Replace JSON string placeholders with their literal values so we don't
 * end up with extra escaped quotes in the generated code.
 */
function replacer(jsonStr: string): string {
  return jsonStr;
}
