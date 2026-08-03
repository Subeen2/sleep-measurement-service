import { SleepEntry } from '../../../src/lib/sleepTypes';
import { OVERALL_CONDITION_LABEL, PHYSICAL_CONDITION_LABEL, ALCOHOL_LABEL } from '../../../src/lib/sleepLabels';

export interface Env {
  OPENAI_API_KEY: string;
}

const ALLOWED_ORIGINS = new Set(['https://subeen2.github.io', 'http://localhost:5173']);

const SYSTEM_PROMPT =
  '너는 수면 과학에 밝은 친근한 톤의 어시스턴트야. 사용자가 기록한 실제 수면 데이터를 보고, ' +
  '한국어 존댓말로 4~6문장 이내의 분석을 작성해. 반드시 데이터에서 뽑아낼 수 있는 구체적인 상관관계를 ' +
  '1~2개 짚어내고 (예: 특정 요일, 카페인 섭취 시간, 화면을 끈 시간과 컨디션의 관계), 실천 가능한 제안을 ' +
  '1~2개 제시해. 이모지는 최소한만 사용하고, 과장되거나 의학적 진단처럼 들리는 표현은 피해.';

function summarizeEntry(entry: SleepEntry): string {
  const parts = [
    `${entry.date}: 취침 ${entry.bedTime}, 화면 끔 ${entry.lastScreenTime}, 기상 ${entry.wakeTime}`,
    `컨디션 ${OVERALL_CONDITION_LABEL[entry.overallCondition]}/${PHYSICAL_CONDITION_LABEL[entry.physicalCondition]}`,
  ];
  if (entry.caffeineShots > 0) {
    parts.push(`카페인 ${entry.caffeineShots}샷${entry.caffeineTime ? `(${entry.caffeineTime})` : ''}`);
  }
  if (entry.hadAlcohol) {
    parts.push(`음주${entry.alcoholType ? ` (${ALCOHOL_LABEL[entry.alcoholType]})` : ''}`);
  }
  if (entry.lastMealTime) {
    parts.push(`마지막 식사 ${entry.lastMealTime}`);
  }
  return parts.join(', ');
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const originAllowed = origin !== null && ALLOWED_ORIGINS.has(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: originAllowed ? corsHeaders(origin!) : {} });
    }

    if (!originAllowed) {
      return new Response('Forbidden', { status: 403 });
    }

    const headers = corsHeaders(origin!);

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers });
    }

    let body: { entries?: SleepEntry[] };
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400, headers });
    }

    if (!Array.isArray(body.entries) || body.entries.length === 0) {
      return new Response('entries is required', { status: 400, headers });
    }

    const summary = body.entries.map(summarizeEntry).join('\n');

    let openaiRes: Response;
    try {
      openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: summary },
          ],
          temperature: 0.7,
        }),
      });
    } catch {
      return new Response('OpenAI request failed', { status: 502, headers });
    }

    if (!openaiRes.ok) {
      return new Response('OpenAI request failed', { status: 502, headers });
    }

    const data = (await openaiRes.json()) as { choices: { message: { content: string } }[] };
    const text = data.choices[0]?.message?.content?.trim() ?? '';

    return new Response(text, {
      status: 200,
      headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
