import { Suggestion } from '../../types';

export interface AnalysisResult {
  score: number;
  event: string;
  action: string;
  suggestions: Suggestion[];
}

const ANALYZE_PROMPT = [
  '你是桌面整洁度分析助手。',
  '请根据用户上传的桌面图片，输出严格 JSON。',
  'JSON 结构必须为：',
  '{',
  '  "score": 0-100 的整数,',
  '  "event": "对当前桌面状态的一句总结",',
  '  "action": "下一步最重要的整理动作",',
  '  "suggestions": [',
  '    { "label": "建议标题", "desc": "建议描述", "impact": "影响说明" }',
  '  ]',
  '}',
  '不要输出 Markdown，不要输出代码块，不要输出 JSON 以外的任何内容。',
].join('\n');

const normalizeSuggestions = (value: unknown): Suggestion[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      const desc = typeof record.desc === 'string' ? record.desc.trim() : '';
      const impact = typeof record.impact === 'string' ? record.impact.trim() : '';

      if (!label || !desc || !impact) {
        return null;
      }

      return { label, desc, impact };
    })
    .filter((item): item is Suggestion => item !== null);
};

const validateResult = (payload: unknown): AnalysisResult => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Garden 返回了无效数据');
  }

  const result = payload as Record<string, unknown>;
  const score = typeof result.score === 'number' ? Math.max(0, Math.min(100, Math.round(result.score))) : null;
  const event = typeof result.event === 'string' ? result.event.trim() : '';
  const action = typeof result.action === 'string' ? result.action.trim() : '';
  const suggestions = normalizeSuggestions(result.suggestions);

  if (score === null || !event || !action) {
    throw new Error('Garden 返回结果缺少必要字段');
  }

  return { score, event, action, suggestions };
};

const ensureHttpUrl = (value: string) => {
  const trimmed = value
    .trim()
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/models$/i, '')
    .replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('Base URL 必须以 http:// 或 https:// 开头');
  }

  return trimmed;
};

const extractJsonObject = (content: string) => {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i) || content.match(/```\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : content.trim();

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Garden 返回内容中没有可解析的 JSON');
  }

  return candidate.slice(firstBrace, lastBrace + 1);
};

const safeFetchJson = async (url: string, init: RequestInit) => {
  try {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => null);
    return { response, payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    throw new Error(`无法连接到 Garden 服务：${url}。原始错误：${message}`);
  }
};

const tryCustomAnalyze = async (baseUrl: string, apiKey: string, base64Image: string) => {
  const { response, payload } = await safeFetchJson(`${baseUrl}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : `Garden /analyze 请求失败，状态码 ${response.status}`;
    throw new Error(message);
  }

  return validateResult(payload);
};

const loadModelId = async (openAiBaseUrl: string, apiKey: string) => {
  const { response, payload } = await safeFetchJson(`${openAiBaseUrl}/models`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Garden /models 请求失败，状态码 ${response.status}`);
  }

  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { data?: unknown[] }).data)) {
    throw new Error('Garden /models 返回格式无效');
  }

  const firstModel = (payload as { data: Array<Record<string, unknown>> }).data[0];
  const modelId = typeof firstModel?.id === 'string' ? firstModel.id : '';

  if (!modelId) {
    throw new Error('Garden 服务没有返回可用模型');
  }

  return modelId;
};

const tryOpenAiCompatibleAnalyze = async (baseUrl: string, apiKey: string, base64Image: string) => {
  const openAiBaseUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
  const model = await loadModelId(openAiBaseUrl, apiKey);

  const { response, payload } = await safeFetchJson(`${openAiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: ANALYZE_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请分析这张桌面图片，并按要求返回 JSON。' },
            { type: 'image_url', image_url: { url: base64Image } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? JSON.stringify((payload as { error: unknown }).error)
        : `Garden /chat/completions 请求失败，状态码 ${response.status}`;
    throw new Error(message);
  }

  const content = (() => {
    if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { choices?: unknown[] }).choices)) {
      return '';
    }

    const firstChoice = (payload as { choices: Array<Record<string, unknown>> }).choices[0];
    const message = firstChoice?.message;

    if (!message || typeof message !== 'object') {
      return '';
    }

    const rawContent = (message as { content?: unknown }).content;

    if (typeof rawContent === 'string') {
      return rawContent;
    }

    if (Array.isArray(rawContent)) {
      return rawContent
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return '';
          }

          const record = item as Record<string, unknown>;
          return typeof record.text === 'string' ? record.text : '';
        })
        .join('\n')
        .trim();
    }

    return '';
  })();

  if (!content) {
    throw new Error('Garden 没有返回可解析的分析内容');
  }

  const json = extractJsonObject(content);
  return validateResult(JSON.parse(json) as unknown);
};

export const analyzeDesktopImage = async (
  base64Image: string,
  apiKey: string,
  baseUrl: string
): Promise<AnalysisResult> => {
  if (!apiKey) {
    throw new Error('缺少 Garden API key');
  }

  if (!base64Image) {
    throw new Error('缺少图片数据');
  }

  const normalizedBaseUrl = ensureHttpUrl(baseUrl);
  const errors: string[] = [];

  try {
    return await tryCustomAnalyze(normalizedBaseUrl, apiKey, base64Image);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : '自定义 /analyze 调用失败');
  }

  try {
    return await tryOpenAiCompatibleAnalyze(normalizedBaseUrl, apiKey, base64Image);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'OpenAI 兼容接口调用失败');
  }

  throw new Error(
    [
      'Garden 分析失败。',
      '请确认：',
      '1. Base URL 是否可从本机 Node 服务访问',
      '2. API key 是否正确',
      '3. 如果是 vLLM / OpenAI 兼容服务，Base URL 建议填写到 /v1',
      `详细错误：${errors.join(' | ')}`,
    ].join('\n')
  );
};
