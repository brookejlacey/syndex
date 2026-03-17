'use client';

import { clsx } from 'clsx';

interface NegotiationRound {
  round: number;
  proposer: string;
  terms: { amount: number; interestRate: number; duration: number };
  reasoning: string;
  accepted: boolean;
  timestamp: number;
}

interface Negotiation {
  id: string;
  borrower: string;
  lender: string;
  rounds: NegotiationRound[];
  status: string;
  finalTerms?: { amount: number; interestRate: number; duration: number };
  startedAt: number;
}

const agentColors: Record<string, string> = {
  banker: 'border-green-500/50 bg-green-500/5',
  strategist: 'border-purple-500/50 bg-purple-500/5',
};

const agentText: Record<string, string> = {
  banker: 'text-green-400',
  strategist: 'text-purple-400',
};

export function NegotiationPanel({ negotiations }: { negotiations: Negotiation[] }) {
  const active = negotiations.filter(n => n.status === 'active');
  const resolved = negotiations.filter(n => n.status !== 'active').slice(-3);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <h2 className="text-lg font-bold mb-4 text-cyan-400">Agent Negotiations</h2>

      {negotiations.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] italic">
          No negotiations yet — Strategist will negotiate when requesting loans
        </p>
      ) : (
        <div className="space-y-4">
          {[...active, ...resolved].map(neg => (
            <div key={neg.id} className="border border-[var(--border)] rounded-lg p-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">{neg.id}</span>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full', {
                    'bg-yellow-500/20 text-yellow-400': neg.status === 'active',
                    'bg-green-500/20 text-green-400': neg.status === 'agreed',
                    'bg-red-500/20 text-red-400': neg.status === 'rejected' || neg.status === 'expired',
                  })}>
                    {neg.status.toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">
                  {neg.rounds.length} round{neg.rounds.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Rounds */}
              <div className="space-y-2">
                {neg.rounds.map((round) => (
                  <div
                    key={round.round}
                    className={clsx('rounded-md border p-2', agentColors[round.proposer] || 'border-gray-500/50')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={clsx('text-xs font-bold uppercase', agentText[round.proposer] || 'text-gray-400')}>
                        {round.proposer} — Round {round.round}
                      </span>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span>{round.terms.amount.toFixed(0)} USDt</span>
                        <span className="text-[var(--text-secondary)]">@</span>
                        <span className={round.proposer === 'banker' ? 'text-green-400' : 'text-purple-400'}>
                          {(round.terms.interestRate * 100).toFixed(1)}%
                        </span>
                        <span className="text-[var(--text-secondary)]">for {round.terms.duration}h</span>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] italic">
                      &ldquo;{round.reasoning.slice(0, 120)}{round.reasoning.length > 120 ? '...' : ''}&rdquo;
                    </p>
                  </div>
                ))}
              </div>

              {/* Final terms */}
              {neg.finalTerms && (
                <div className="mt-2 pt-2 border-t border-[var(--border)] text-center">
                  <span className="text-xs text-green-400 font-bold">
                    DEAL: {neg.finalTerms.amount.toFixed(0)} USDt at {(neg.finalTerms.interestRate * 100).toFixed(1)}% for {neg.finalTerms.duration}h
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
