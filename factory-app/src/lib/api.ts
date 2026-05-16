// GAS APIクライアント

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || '';
const API_KEY = process.env.GAS_API_KEY || '';

async function gasRequest(action: string, params: Record<string, unknown> = {}) {
  if (!GAS_URL) throw new Error('GAS_URLが設定されていません。.env.localを確認してください。');
  
  const res = await fetch(`${GAS_URL}?action=${action}&key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, key: API_KEY, ...params }),
  });
  
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// 図番マスタ
export const api = {
  drawings: {
    list: () => gasRequest('getDrawings'),
    save: (d: Record<string, unknown>) => gasRequest('saveDrawing', d),
    update: (d: Record<string, unknown>) => gasRequest('updateDrawing', d),
  },
  materials: {
    list: () => gasRequest('getMaterials'),
    stockIn:  (d: Record<string, unknown>) => gasRequest('stockIn', d),
    stockOut: (d: Record<string, unknown>) => gasRequest('stockOut', d),
    stockScrap: (d: Record<string, unknown>) => gasRequest('stockScrap', d),
    log: (d?: Record<string, unknown>) => gasRequest('getStockLog', d || {}),
  },
  processes: {
    list: (d?: Record<string, unknown>) => gasRequest('getProcesses', d || {}),
    update: (d: Record<string, unknown>) => gasRequest('updateProcess', d),
  },
  mistakes: {
    list: (d?: Record<string, unknown>) => gasRequest('getMistakes', d || {}),
    save: (d: Record<string, unknown>) => gasRequest('saveMistake', d),
  },
};

// ローカルキャッシュ付きフェッチ（デモ用モックデータにフォールバック）
export async function fetchWithFallback<T>(
  fetcher: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fetcher();
  } catch {
    console.warn('GAS接続失敗、モックデータを使用');
    return fallback;
  }
}
