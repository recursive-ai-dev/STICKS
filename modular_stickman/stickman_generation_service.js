/**
 * stickman_generation_service.js
 * Logic chain for generating and initializing stickmen.
 * Fuses generation logic, physics initialization, and Godfall theming.
 */

import { LogicChainBase } from './logic_chain_base.js';
import { buildTraits } from './cowboy_modular_generator.js';

/**
 * Service for orchestrating stickman creation.
 */
export class StickmanGenerationService extends LogicChainBase {
    /**
     * @param {import('./physics_engine.js').StickmanPhysics} physics
     * @param {Object} [config={}]
     */
    constructor(physics, config = {}) {
        super("Stickman Generation", "1.2", config);
        this.physics = physics;
    }

    /**
     * Orchestrates the stickman generation logic chain.
     * @param {number} x
     * @param {number} y
     * @param {string} [correlationId]
     * @returns {Object} The generated stickman.
     */
    generateStickman(x, y, correlationId = null) {
        const cid = this.getCorrelationId(correlationId);

        this.logStep(cid, "START", "SUCCESS", { x, y });

        try {
            // 1. Build Base Unit (Traits/Character Definition)
            const character = this.executeStep(cid, "BUILD_TRAITS", () => {
                const id = `stickman_${this.idProvider('sm').slice(0, 8)}`;
                const mockCharacter = { id, type: 'cowboy' };
                // Traits builder should ideally also be deterministic if we pass the RNG
                const traits = buildTraits(mockCharacter);
                return { id, traits };
            });

            // 2. Apply Godfall Style (Lore alignment)
            const godfallStyle = this.executeStep(cid, "APPLY_GODFALL", () => {
                const styles = ['CORRUPTED', 'ECHOED', 'MANIFESTED', 'VOID_TOUCHED'];
                const selected = styles[Math.floor(this.determinismProvider.random() * styles.length)];
                return selected;
            });

            // 3. Physics Initialization (Atomic state change)
            const stickman = this.executeStep(cid, "PHYSICS_INIT", () => {
                const sm = this.physics.createStickman(x, y);
                sm.id = character.id;
                sm.traits = character.traits;
                sm.godfallStyle = godfallStyle;
                sm.delusionTraits = sm.delusionTraits || [];
                sm.delusionTraits.push(`style:${godfallStyle.toLowerCase()}`);

                // Outbox Alignment
                this.commitToOutbox(cid, "StickmanGenerated", "1.0", {
                    stickman_id: sm.id,
                    x: x,
                    y: y,
                    traits: sm.traits,
                    godfall_style: godfallStyle
                });

                return sm;
            });

            const finalResult = {
                success: true,
                stickmanId: character.id,
                correlationId: cid,
                outcome: "GENERATED"
            };

            this.logStep(cid, "END", "SUCCESS", finalResult);
            return stickman;

        } catch (error) {
            this.logStep(cid, "END", "ERROR", {
                message: error.message,
                correlation_id: cid
            });
            throw error;
        }
    }
}
