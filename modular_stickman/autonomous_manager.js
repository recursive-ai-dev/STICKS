/**
 * autonomous_manager.js
 * Manages the autonomous stickman generation logic using symbolic triggers.
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

export class AutonomousManager {
    constructor(game) {
        this.game = game;
        this.config = autonomousGeneration;
    }

    checkTrigger(currentTime, stickmanCount) {
        if (!this.config.active) return false;
        const dynamicRate = this.config.baseTriggerRate / (1 + stickmanCount * 0.2);
        const symbolicValue = this.config.symbolChain.reduce((acc, symbol) => {
            const mapping = this.config.symbolMap[symbol] || { weight: 1.0 };
            return acc * mapping.weight;
        }, 1.0);
        const probability = dynamicRate * symbolicValue;
        return Math.random() < probability;
    }

    executeGeneration(correlationId = null) {
        const x = 100 + Math.random() * 600;
        const y = 50 + Math.random() * 100;
        if (this.game.generationService) {
            this.game.generationService.generateStickman(x, y, correlationId);
        } else {
            this.game.physics.createStickman(x, y);
        }
    }
}
