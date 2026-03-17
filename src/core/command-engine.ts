import type { Brain } from './brain.js';
import type { MessageBus } from './message-bus.js';
import type { WalletManager } from './wallet-manager.js';
import type { NexusOrchestrator } from '../agents/nexus/index.js';
import type { BankerAgent } from '../agents/banker/index.js';
import type { StrategistAgent } from '../agents/strategist/index.js';
import type { PatronAgent } from '../agents/patron/index.js';
import type { AgentRole, CommandLog } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * NATURAL LANGUAGE COMMAND ENGINE
 *
 * Humans can control the entire Nexus economy in plain English:
 *
 * "Move 200 USDt from Banker to Strategist"
 * "Pause the Patron until yield exceeds 5%"
 * "Show me Strategist's last 3 decisions"
 * "What's the total yield earned today?"
 * "Emergency: liquidate all Strategist positions"
 *
 * The engine uses Claude to parse intent, then executes against the live network.
 */

interface CommandResult {
  success: boolean;
  response: string;
  action?: string;
}

export class CommandEngine {
  private brain: Brain;
  private bus: MessageBus;
  private wallet: WalletManager;
  private nexus!: NexusOrchestrator;
  private banker!: BankerAgent;
  private strategist!: StrategistAgent;
  private patron!: PatronAgent;
  private commandLog: CommandLog[] = [];

  constructor(brain: Brain, bus: MessageBus, wallet: WalletManager) {
    this.brain = brain;
    this.bus = bus;
    this.wallet = wallet;
  }

  registerAgents(
    nexus: NexusOrchestrator,
    banker: BankerAgent,
    strategist: StrategistAgent,
    patron: PatronAgent,
  ): void {
    this.nexus = nexus;
    this.banker = banker;
    this.strategist = strategist;
    this.patron = patron;
  }

  /** Process a natural language command from a human operator */
  async execute(command: string): Promise<CommandResult> {
    logger.info(`[CMD] Processing: "${command}"`);

    // Get current network state for context
    const state = this.nexus.getNetworkState();

    // Use Claude to parse intent and generate action
    const decision = await this.brain.think({
      agent: 'nexus',
      systemPrompt: `You are the command interpreter for the Nexus multi-agent economic network. A human operator is giving you a natural language command. Parse their intent and respond with a JSON action.

AVAILABLE ACTIONS:
\`\`\`json
{
  "action": "transfer" | "pause" | "resume" | "liquidate" | "query_status" | "query_metrics" | "query_decisions" | "query_loans" | "query_tips" | "set_parameter" | "unknown",
  "reasoning": "what you understood and will do",
  "confidence": 0.0-1.0,
  "parameters": {
    "fromAgent": "nexus" | "banker" | "strategist" | "patron",
    "toAgent": "nexus" | "banker" | "strategist" | "patron",
    "amount": number,
    "targetAgent": "banker" | "strategist" | "patron",
    "queryType": "status" | "metrics" | "decisions" | "loans" | "tips" | "positions",
    "limit": number
  }
}
\`\`\`

CURRENT NETWORK STATE:
${Object.entries(state.agents).map(([role, a]) =>
  `- ${role}: ${a.status} | ${a.balance.toFixed(2)} USDt | PnL: ${a.pnl >= 0 ? '+' : ''}${a.pnl.toFixed(4)} | ${a.lastAction}`
).join('\n')}
- TVL: ${state.totalValueLocked.toFixed(2)} USDt
- Yield: ${state.totalYieldEarned.toFixed(4)} USDt
- Tips: ${state.totalTipsPaid.toFixed(2)} USDt
- Active loans: ${state.loans.filter(l => l.status === 'active').length}
- DeFi positions: ${state.positions.filter(p => p.amount > 0).length}
- Health: ${state.networkHealth}

Parse the human's command and determine the appropriate action. For queries, set action to the appropriate query type.`,
      context: `HUMAN COMMAND: "${command}"`,
      model: 'fast',
    });

    let result: CommandResult;

    switch (decision.action) {
      case 'transfer':
        result = await this.handleTransfer(decision.parameters);
        break;
      case 'pause':
        result = await this.handlePause(decision.parameters);
        break;
      case 'resume':
        result = await this.handleResume(decision.parameters);
        break;
      case 'liquidate':
        result = await this.handleLiquidate(decision.parameters);
        break;
      case 'query_status':
      case 'query_metrics':
      case 'query_decisions':
      case 'query_loans':
      case 'query_tips':
        result = this.handleQuery(decision.action, decision.parameters);
        break;
      default:
        result = await this.handleGenericQuery(command, state);
        break;
    }

    // Log the command
    const log: CommandLog = {
      id: `CMD-${randomUUID().slice(0, 8)}`,
      command,
      response: result.response,
      executedAction: result.action,
      timestamp: Date.now(),
    };
    this.commandLog.push(log);

    // Emit to dashboard
    this.bus.send({
      type: 'human_command',
      from: 'human',
      to: 'nexus',
      command,
      response: result.response,
      timestamp: Date.now(),
    });

    this.bus.emitDashboard({
      type: 'alert',
      data: {
        level: 'info',
        message: `Command: "${command}" → ${result.response}`,
      },
    });

    return result;
  }

  private async handleTransfer(params: Record<string, unknown>): Promise<CommandResult> {
    const from = params.fromAgent as AgentRole;
    const to = params.toAgent as AgentRole;
    const amount = params.amount as number;

    if (!from || !to || !amount || amount <= 0) {
      return { success: false, response: `Invalid transfer parameters. Specify from, to, and amount.` };
    }

    try {
      const result = await this.wallet.sendToAgent(from, to, amount);

      this.bus.send({
        type: 'fund_transfer',
        from,
        to,
        amount,
        purpose: `Human-directed transfer`,
        txHash: result.hash,
        timestamp: Date.now(),
      });

      return {
        success: true,
        response: `Transferred ${amount.toFixed(2)} USDt from ${from} to ${to}. TX: ${result.hash.slice(0, 16)}...`,
        action: 'transfer',
      };
    } catch (err) {
      return { success: false, response: `Transfer failed: ${(err as Error).message}` };
    }
  }

  private async handlePause(params: Record<string, unknown>): Promise<CommandResult> {
    const target = params.targetAgent as AgentRole;
    if (!target) return { success: false, response: 'Specify which agent to pause.' };

    this.bus.send({
      type: 'circuit_break',
      from: 'nexus',
      to: target,
      reason: 'Human-directed pause',
      action: 'pause',
      timestamp: Date.now(),
    });

    return { success: true, response: `${target} has been PAUSED.`, action: 'pause' };
  }

  private async handleResume(params: Record<string, unknown>): Promise<CommandResult> {
    const target = params.targetAgent as AgentRole;
    if (!target) return { success: false, response: 'Specify which agent to resume.' };

    this.bus.send({
      type: 'circuit_break',
      from: 'nexus',
      to: target,
      reason: 'Human-directed resume',
      action: 'resume',
      timestamp: Date.now(),
    });

    return { success: true, response: `${target} has been RESUMED.`, action: 'resume' };
  }

  private async handleLiquidate(params: Record<string, unknown>): Promise<CommandResult> {
    const target = (params.targetAgent as AgentRole) || 'strategist';

    this.bus.send({
      type: 'circuit_break',
      from: 'nexus',
      to: target,
      reason: 'Human-directed emergency liquidation',
      action: 'liquidate',
      timestamp: Date.now(),
    });

    return { success: true, response: `EMERGENCY: ${target} positions are being LIQUIDATED.`, action: 'liquidate' };
  }

  private handleQuery(queryType: string, params: Record<string, unknown>): CommandResult {
    const state = this.nexus.getNetworkState();

    switch (queryType) {
      case 'query_status': {
        const target = params.targetAgent as AgentRole;
        if (target && state.agents[target]) {
          const a = state.agents[target];
          return {
            success: true,
            response: `${target.toUpperCase()}: ${a.status} | Balance: ${a.balance.toFixed(2)} USDt | PnL: ${a.pnl >= 0 ? '+' : ''}${a.pnl.toFixed(4)} USDt | Last: "${a.lastAction}"`,
          };
        }
        const summary = Object.entries(state.agents)
          .map(([r, a]) => `${r}: ${a.status} (${a.balance.toFixed(1)} USDt, PnL ${a.pnl >= 0 ? '+' : ''}${a.pnl.toFixed(3)})`)
          .join(' | ');
        return { success: true, response: summary };
      }

      case 'query_metrics':
        return {
          success: true,
          response: `TVL: ${state.totalValueLocked.toFixed(2)} USDt | Yield: +${state.totalYieldEarned.toFixed(4)} USDt | Tips: ${state.totalTipsPaid.toFixed(2)} USDt | Loans: ${state.loans.filter(l => l.status === 'active').length} active | Positions: ${state.positions.filter(p => p.amount > 0).length} active | Health: ${state.networkHealth}`,
        };

      case 'query_loans': {
        const active = state.loans.filter(l => l.status === 'active');
        if (active.length === 0) return { success: true, response: 'No active loans.' };
        const list = active.map(l =>
          `${l.id}: ${l.borrower} owes ${l.principal.toFixed(2)} USDt at ${(l.interestRate * 100).toFixed(1)}% (repaid: ${l.repaidAmount.toFixed(2)})`
        ).join(' | ');
        return { success: true, response: list };
      }

      case 'query_tips': {
        const limit = (params.limit as number) || 5;
        const recent = state.tips.slice(-limit);
        if (recent.length === 0) return { success: true, response: 'No tips yet.' };
        const list = recent.map(t =>
          `${t.creator}: ${t.amount.toFixed(2)} USDt (${t.fundSource})`
        ).join(' | ');
        return { success: true, response: `Recent tips: ${list}` };
      }

      case 'query_decisions': {
        const decisions = this.brain.getDecisionLog(params.targetAgent as AgentRole).slice(-5);
        if (decisions.length === 0) return { success: true, response: 'No decisions recorded yet.' };
        const list = decisions.map(d =>
          `[${d.agent}] ${d.action} (${(d.confidence * 100).toFixed(0)}%): ${d.reasoning.slice(0, 80)}`
        ).join('\n');
        return { success: true, response: list };
      }

      default:
        return { success: false, response: 'Unknown query type.' };
    }
  }

  private async handleGenericQuery(command: string, state: any): Promise<CommandResult> {
    // For commands we can't classify, use Claude to generate a natural language response
    const decision = await this.brain.think({
      agent: 'nexus',
      systemPrompt: `You are the Nexus network assistant. Answer the human's question about the network using the data provided. Be concise (1-3 sentences max).`,
      context: `Question: "${command}"

Network data:
${JSON.stringify(state, null, 2).slice(0, 2000)}`,
      model: 'fast',
    });

    return { success: true, response: decision.reasoning };
  }

  getCommandLog(): CommandLog[] {
    return [...this.commandLog];
  }
}
