export const PROPERTY_FIELDS = [
  'property_name',
  'location',
  'station',
  'walk_minutes',
  'land_area',
  'building_area',
  'zoning',
  'building_coverage',
  'floor_area_ratio',
  'price',
  'structure',
  'built_year',
  'road_info',
  'current_status',
  'yield',
  'occupancy'
] as const;

export type PropertyFieldKey = typeof PROPERTY_FIELDS[number];

export interface ExtractedField {
  value: string | null;
  confidence: number;
}

export type PropertyExtraction = Record<PropertyFieldKey, ExtractedField> & {
  overall_confidence: number;
};

export function extractJsonContentFromMessage(content: unknown): any {
  const textContent = getTextContent(content);
  if (!textContent) {
    throw new Error('OpenAIレスポンスからテキストを取得できませんでした');
  }

  const jsonString = extractJsonString(textContent);
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error('OpenAIレスポンスのJSON解析に失敗しました');
  }
}

export function normalizePropertyExtraction(raw: any, fallbackConfidence = 0.5): PropertyExtraction {
  const normalized: Partial<PropertyExtraction> = {};

  for (const field of PROPERTY_FIELDS) {
    const value = raw?.[field];

    if (value && typeof value === 'object' && 'value' in value) {
      normalized[field] = {
        value: value.value !== null && value.value !== undefined ? String(value.value) : null,
        confidence: clampConfidence(value.confidence ?? fallbackConfidence)
      };
    } else if (value !== undefined && value !== null) {
      normalized[field] = {
        value: String(value),
        confidence: fallbackConfidence
      };
    } else {
      normalized[field] = { value: null, confidence: 0 };
    }
  }

  const providedOverall = typeof raw?.overall_confidence === 'number'
    ? clampConfidence(raw.overall_confidence)
    : undefined;

  normalized.overall_confidence = providedOverall ?? calculateAverageConfidence(normalized as PropertyExtraction, fallbackConfidence);

  return normalized as PropertyExtraction;
}

export function mergePropertyData(results: any[], fallbackConfidence = 0.5): PropertyExtraction {
  if (!results || results.length === 0) {
    return normalizePropertyExtraction({}, fallbackConfidence);
  }

  const normalizedResults = results.map((result) => normalizePropertyExtraction(result, fallbackConfidence));
  const merged: Partial<PropertyExtraction> = {};

  for (const field of PROPERTY_FIELDS) {
    let best: ExtractedField = { value: null, confidence: 0 };

    for (const result of normalizedResults) {
      const candidate = result[field];
      if (!candidate || candidate.value === null) continue;

      const score = (candidate.confidence ?? fallbackConfidence) * String(candidate.value).length;
      const bestScore = (best.confidence ?? 0) * (best.value ? String(best.value).length : 0);

      if (score > bestScore) {
        best = candidate;
      }
    }

    merged[field] = best;
  }

  merged.overall_confidence = calculateAverageConfidence(merged as PropertyExtraction, fallbackConfidence);

  return merged as PropertyExtraction;
}

function getTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const textPart = content
      .map((item) => (typeof item === 'string' ? item : (item as any)?.text || ''))
      .find((text) => text);
    return textPart || '';
  }
  if (typeof content === 'object' && content !== null && 'text' in content) {
    return (content as any).text as string;
  }
  return '';
}

function extractJsonString(text: string): string {
  const fencedMatch = text.match(/```json\n([\s\S]+?)\n```/);
  if (fencedMatch) return fencedMatch[1];

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];

  return text.trim();
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function calculateAverageConfidence(result: PropertyExtraction, fallback: number): number {
  const confidences = PROPERTY_FIELDS
    .map((field) => result[field]?.confidence)
    .filter((c): c is number => typeof c === 'number' && !Number.isNaN(c));

  if (confidences.length === 0) return fallback;
  const total = confidences.reduce((sum, value) => sum + value, 0);
  return clampConfidence(total / confidences.length);
}

