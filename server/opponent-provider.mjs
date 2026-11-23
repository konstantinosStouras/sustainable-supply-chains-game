import { fail, integer, products } from '../src/engine.mjs';

const hosts = {
  openai: 'https://api.openai.com/v1', anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta', mistral: 'https://api.mistral.ai/v1',
  xai: 'https://api.x.ai/v1', deepseek: 'https://api.deepseek.com', cohere: 'https://api.cohere.com',
  moonshot: 'https://api.moonshot.ai/v1', openrouter: 'https://openrouter.ai/api/v1', alibaba: 'https://dashscope-us.aliyuncs.com'
};

export const supportedProvider = provider => Object.hasOwn(hosts, provider);

export async function opponentProvider(user, input, operation, request = fetch) {
  if (user.role !== 'instructor') fail('Instructor access required.', 403);
  const { provider, key, model } = input;
  if (!Object.hasOwn(hosts, provider) || typeof key !== 'string' || !key.trim() || key.length > 4000 || /[\r\n]/.test(key)) fail('Choose a provider and enter its API key.');
  const headers = { 'Content-Type': 'application/json' };
  if (provider === 'anthropic') Object.assign(headers, { 'x-api-key': key, 'anthropic-version': '2023-06-01' });
  else if (provider === 'google') headers['x-goog-api-key'] = key;
  else headers.Authorization = 'Bearer ' + key;
  const signal = AbortSignal.timeout(35000);
  async function call(path, data) {
    let response;
    try { response = await request(hosts[provider] + path, { method: data ? 'POST' : 'GET', headers, redirect: 'error', signal, ...(data && { body: JSON.stringify(data) }) }); }
    catch { fail('The model provider could not be reached. Retry or choose the built-in opponent.', 502); }
    if (!response.ok) fail('Provider returned HTTP ' + response.status + '. Check key access, available credit and model capabilities.', 422);
    try { return await response.json(); } catch { fail('The provider returned an unreadable response.', 502); }
  }
  if (operation === 'models') {
    const models = new Set(), cursors = new Set();
    const base = provider === 'alibaba' ? '/api/v1/models' : provider === 'cohere' ? '/v1/models' : '/models';
    let path = base;
    while (path) {
      const page = await call(path);
      for (const item of page.data ?? page.models ?? page.output?.models ?? []) {
        const id = item.model ?? item.id ?? item.name?.replace(/^models\//, '');
        if (typeof id === 'string') models.add(id);
      }
      if (provider === 'alibaba') {
        const { page_no, page_size, total } = page.output || {};
        if (cursors.has(page_no)) fail('Repeated provider catalog page.', 502);
        cursors.add(page_no);
        path = page_no * page_size < total ? base + '?page_no=' + (page_no+1) : null;
        continue;
      }
      const token = page.nextPageToken || page.next_page_token || (page.has_more && page.last_id);
      if (token && cursors.has(token)) fail('The provider returned a repeated catalog page.', 502);
      if (token) cursors.add(token);
      const param = provider === 'google' ? 'pageToken' : provider === 'cohere' ? 'page_token' : 'after_id';
      path = token ? base + '?' + param + '=' + encodeURIComponent(token) : null;
    }
    if (!models.size) fail('This key has no available models.', 422);
    return { models: [...models].sort() };
  }
  if (!Object.hasOwn(products, input.productId) || typeof model !== 'string' || !/^[a-zA-Z0-9._:/@-]{1,180}$/.test(model)) fail('Choose a product and a text-generation model.');
  const count = integer(input.count, 'Company count', 1, 12);
  const prompt = 'Design distinct novice supply-chain rivals for ' + count + ' teams manufacturing ' + products[input.productId].name + '. Choose one integer profile 0–8 per team. Profile k reviews operations every 8+k simulation hours, charges 4+k percent above reference, ships one order per review and restocks conservatively. Mix styles. Reply with just a JSON array of ' + count + ' integers.';
  const messages = [{ role: 'user', content: prompt }];
  let answer;
  if (provider === 'google') {
    const data = await call('/models/' + encodeURIComponent(model) + ':generateContent', { contents: [{ parts: [{ text: prompt }] }] });
    answer = data.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text).join('');
  } else if (provider === 'anthropic') {
    const data = await call('/messages', { model, max_tokens: 512, messages });
    answer = data.content?.find(c => c.type === 'text')?.text;
  } else if (provider === 'cohere') {
    const data = await call('/v2/chat', { model, messages });
    answer = data.message?.content?.[0]?.text;
  } else if (provider === 'openai') {
    const data = await call('/responses', { model, input: prompt, store: false });
    answer = data.output?.flatMap(o => o.content ?? []).find(c => c.type === 'output_text')?.text;
  } else {
    const data = await call(provider === 'alibaba' ? '/compatible-mode/v1/chat/completions' : '/chat/completions', { model, messages });
    answer = data.choices?.[0]?.message?.content;
  }
  let profiles;
  try { profiles = JSON.parse(answer.match(/\[[\d,\s]+\]/)[0]); } catch {}
  if (!Array.isArray(profiles) || profiles.length !== count || profiles.some(n => !Number.isInteger(n) || n < 0 || n > 8)) fail('This model did not return usable opponent profiles. Retry or choose another text model.', 422);
  return { provider, model, profiles };
}
