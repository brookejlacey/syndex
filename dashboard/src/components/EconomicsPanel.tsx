'use client';

import { clsx } from 'clsx';

interface NetworkEconomics {
  apiCostUsd: number;
  yieldEarnedUsd: number;
  tipsPaidUsd: number;
  selfSustaining: boolean;
  sustainabilityRatio: number;
}

export function EconomicsPanel({ economics }: { economics: NetworkEconomics }) {
  if (!economics) return null;
  const netProfit = (economics.yieldEarnedUsd ?? 0) - (economics.apiCostUsd ?? 0);

  return (
    <div className={clsx(
      'rounded-xl border p-5',
      economics.selfSustaining
        ? 'border-green-500/30 bg-green-500/5'
        : 'border-yellow-500/30 bg-yellow-500/5',
    )}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Network Economics</h2>
        <span className={clsx(
          'text-xs font-bold px-2 py-1 rounded-full',
          economics.selfSustaining
            ? 'bg-green-500/20 text-green-400'
            : 'bg-yellow-500/20 text-yellow-400',
        )}>
          {economics.selfSustaining ? 'SELF-SUSTAINING' : 'BUILDING'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-1">AI Compute Cost</p>
          <p className="text-lg font-mono font-bold text-red-400">
            -${(economics.apiCostUsd ?? 0).toFixed(4)}
          </p>
        </div>

        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-1">DeFi Yield Earned</p>
          <p className="text-lg font-mono font-bold text-green-400">
            +${(economics.yieldEarnedUsd ?? 0).toFixed(4)}
          </p>
        </div>

        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-1">Tips to Creators</p>
          <p className="text-lg font-mono font-bold text-yellow-400">
            ${(economics.tipsPaidUsd ?? 0).toFixed(4)}
          </p>
        </div>

        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-1">Net Position</p>
          <p className={clsx(
            'text-lg font-mono font-bold',
            netProfit >= 0 ? 'text-green-400' : 'text-red-400',
          )}>
            {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Sustainability bar */}
      <div className="mt-4 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[var(--text-secondary)]">Sustainability Ratio (yield / compute cost)</span>
          <span className="text-xs font-mono font-bold">
            {(economics.sustainabilityRatio ?? 0).toFixed(1)}x
          </span>
        </div>
        <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              economics.sustainabilityRatio >= 1 ? 'bg-green-500' : 'bg-yellow-500',
            )}
            style={{ width: `${Math.min(100, (economics.sustainabilityRatio ?? 0) * 50)}%` }}
          />
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1 text-center">
          {economics.selfSustaining
            ? 'The network earns more from DeFi than it spends on AI reasoning'
            : 'Building toward self-sustainability — yield will exceed compute costs'
          }
        </p>
      </div>
    </div>
  );
}
