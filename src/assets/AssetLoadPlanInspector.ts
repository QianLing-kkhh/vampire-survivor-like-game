import { AssetLoadPlan } from './AssetLoadPlan';

export interface AssetLoadPlanSummary {
  total: number;
  byType: Record<string, number>;
  keys: string[];
}

export function summarizeAssetLoadPlan(plan: AssetLoadPlan): AssetLoadPlanSummary {
  const byType: Record<string, number> = {};

  for (const asset of plan.assets) {
    byType[asset.type] = (byType[asset.type] ?? 0) + 1;
  }

  return {
    total: plan.assets.length,
    byType,
    keys: plan.assets.map((asset) => asset.key),
  };
}

export function logAssetLoadPlan(plan: AssetLoadPlan, label = 'asset-load-plan'): void {
  const summary = summarizeAssetLoadPlan(plan);
  const firstKeys = summary.keys.slice(0, 50);
  const remaining = Math.max(0, summary.keys.length - firstKeys.length);

  console.info(`[${label}] id=${plan.id}`);
  console.info(`[${label}] total=${summary.total}`, summary.byType);
  console.info(`[${label}] keys[0..${firstKeys.length - 1}]=`, firstKeys);

  if (remaining > 0) {
    console.info(`[${label}] remaining=${remaining}`);
  }
}
