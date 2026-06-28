/**
 * autonomous_manager.js
 * Manages the autonomous stickman generation logic using symbolic triggers.
 * Optimized for determinism and high-chaos emergence.
 */

import { RealWorldProvider } from './determinism_provider.js';

/**
 * Configuration for autonomous generation.
 */
export const autonomousGeneration = {
    active: true,
    baseTriggerRate: 0.05,
    symbolChain: ['$', 'Σ', 'λ', '∞'],
    symbolMap: {
        '$': { weight: 1.2, meaning: 'VALUE_CREATION' },
        'Σ': { weight: 0.8, meaning: 'SUMMATION_EVENT' },
        'λ': { weight: 1.5, meaning: 'LAMBDA_CALCULATION' },
        '∞': { weight: 2.0, meaning: 'INFINITY_WARP' }
    }
};

/**
 * Manages the autonomous creation of stickmen based on game state.
 */
export class AutonomousManager {
    /**
     * @param {Object} game - The game instance.
     * @param {Object} [config={}]
     * @param {import('./determinism_provider.js').DeterminismProvider} [config.determinismProvider]
     */
    constructor(game, config = {}) {
        this.game = game;
        this.config = autonomousGeneration;
        this.determinismProvider = config.determinismProvider || new RealWorldProvider();
    }

    /**
     * Checks if a generation event should be triggered.
     * @param {number} currentTime
     * @param {number} stickmanCount
     * @returns {boolean}
     */
    checkTrigger(currentTime, stickmanCount) {
        if (!this.config.active) return false;

        // Probability scales inversely with current stickman count to prevent performance collapse
        const dynamicRate = this.config.baseTriggerRate / (1 + stickmanCount * 0.2);

        const symbolicValue = this.config.symbolChain.reduce((acc, symbol) => {
            const mapping = this.config.symbolMap[symbol] || { weight: 1.0 };
            return acc * mapping.weight;
        }, 1.0);

        const probability = dynamicRate * symbolicValue;

        // Use deterministic provider for trigger check
        return this.determinismProvider.random() < probability;
    }

    /**
     * Executes a stickman generation.
     * @param {string} [correlationId]
     */
    executeGeneration(correlationId = null) {
        // Deterministic spawn coordinates
        const x = 100 + this.determinismProvider.random() * 600;
        const y = 50 + this.determinismProvider.random() * 100;

        if (this.game.generationService) {
            this.game.generationService.generateStickman(x, y, correlationId);
        } else {
            this.game.physics.createStickman(x, y);
        }
    }
}
