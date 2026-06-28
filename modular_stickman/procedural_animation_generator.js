/**
 * procedural_animation_generator.js
 * Genetic algorithm to evolve realistic procedural stickman animations.
 * Optimized for natural movement and physical plausibility.
 *
 * Usage: node procedural_animation_generator.js --name <anim_name>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeterministicProvider } from './determinism_provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TWO_PI = Math.PI * 2;
const DEFAULT_OPTIONS = {
    frameCount: 12,
    populationSize: 48,
    generations: 60,
    mutationRate: 0.25,
    eliteCount: 4,
};

/** Gene bounds for the genetic optimizer */
const GENE_BOUNDS = {
    legAmplitude: { min: 18, max: 42 },
    legPhaseOffset: { min: Math.PI * 0.85, max: Math.PI * 1.15 },
    armAmplitude: { min: 12, max: 34 },
    armPhaseOffset: { min: 0, max: TWO_PI },
    bodyBobAmplitude: { min: 1.2, max: 5.5 },
    bodyBobPhase: { min: 0, max: TWO_PI },
    leanAmplitude: { min: 0, max: 6 },
    leanPhase: { min: 0, max: TWO_PI },
    headTiltAmplitude: { min: 0, max: 4 },
    headTiltPhase: { min: 0, max: TWO_PI },
};

/**
 * Genetic Animation Optimizer.
 */
export class AnimationEvolver {
    /**
     * @param {Object} options
     */
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.determinism = new DeterministicProvider(Date.now());
    }

    /**
     * Clamps a value within bounds.
     * @private
     */
    _clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Generates a random chromosome.
     * @returns {Object}
     */
    randomChromosome() {
        const chromosome = {};
        for (let [gene, bounds] of Object.entries(GENE_BOUNDS)) {
            chromosome[gene] = bounds.min + this.determinism.random() * (bounds.max - bounds.min);
        }
        return chromosome;
    }

    /**
     * Performs crossover between two parents.
     * @param {Object} parentA
     * @param {Object} parentB
     * @returns {Object}
     */
    crossover(parentA, parentB) {
        const child = {};
        Object.keys(parentA).forEach(key => {
            child[key] = this.determinism.random() < 0.5 ? parentA[key] : parentB[key];
        });
        return child;
    }

    /**
     * Mutates a chromosome.
     * @param {Object} chromosome
     * @returns {Object}
     */
    mutate(chromosome) {
        const mutated = { ...chromosome };
        Object.keys(mutated).forEach(key => {
            if (this.determinism.random() < this.options.mutationRate) {
                const bounds = GENE_BOUNDS[key];
                const delta = (bounds.max - bounds.min) * 0.1 * (this.determinism.random() - 0.5);
                mutated[key] = this._clamp(mutated[key] + delta, bounds.min, bounds.max);
            }
        });
        return mutated;
    }

    /**
     * Evaluates the fitness of a chromosome.
     * Higher is better.
     * @param {Object} chromosome
     * @returns {Object} Evaluation results.
     */
    evaluate(chromosome) {
        const frames = [];
        const frameCount = this.options.frameCount;

        let legOpposition = 0;
        let smoothness = 0;
        let prev = null;

        for (let i = 0; i < frameCount; i++) {
            const t = (i / frameCount) * TWO_PI;

            const rightLeg = chromosome.legAmplitude * Math.sin(t);
            const leftLeg = chromosome.legAmplitude * Math.sin(t + chromosome.legPhaseOffset);
            const rightArm = chromosome.armAmplitude * Math.sin(t + chromosome.armPhaseOffset);
            const leftArm = chromosome.armAmplitude * Math.sin(t + chromosome.armPhaseOffset + Math.PI);

            const bodyOffset = chromosome.bodyBobAmplitude * Math.sin(t + chromosome.bodyBobPhase);
            const lean = chromosome.leanAmplitude * Math.sin(t + chromosome.leanPhase);
            const headTilt = chromosome.headTiltAmplitude * Math.sin(t + chromosome.headTiltPhase);

            const frame = {
                frame: i,
                bodyParts: {
                    rightArm: { angle: Math.round(rightArm), length: 18 },
                    leftArm: { angle: Math.round(leftArm), length: 18 },
                    rightLeg: { angle: Math.round(rightLeg), length: 20 },
                    leftLeg: { angle: Math.round(leftLeg), length: 20 },
                    body: { verticalOffset: Number(bodyOffset.toFixed(2)), lean: Number(lean.toFixed(2)) },
                    head: { tilt: Number(headTilt.toFixed(2)) },
                },
            };
            frames.push(frame);

            // Fitness metrics
            legOpposition += Math.abs(rightLeg + leftLeg);
            if (prev) {
                smoothness += Math.abs(rightLeg - prev.rightLeg);
            }
            prev = { rightLeg, leftLeg };
        }

        // Penalize poor opposition and excessive jerkiness
        const fitness = 100 - (legOpposition / frameCount) - (smoothness / frameCount);

        return { fitness, frames };
    }

    /**
     * Main evolution loop.
     * @returns {Object} Best animation found.
     */
    evolve() {
        let population = Array.from({ length: this.options.populationSize }, () => this.randomChromosome());
        let best = null;

        for (let g = 0; g < this.options.generations; g++) {
            const evaluated = population.map(c => ({ ...this.evaluate(c), chromosome: c }));
            evaluated.sort((a, b) => b.fitness - a.fitness);

            if (!best || evaluated[0].fitness > best.fitness) {
                best = evaluated[0];
            }

            console.log(`[Gen ${g+1}] Best Fitness: ${evaluated[0].fitness.toFixed(2)}`);

            const nextPop = evaluated.slice(0, this.options.eliteCount).map(e => e.chromosome);
            while (nextPop.length < this.options.populationSize) {
                const p1 = evaluated[Math.floor(this.determinism.random() * Math.min(10, evaluated.length))].chromosome;
                const p2 = evaluated[Math.floor(this.determinism.random() * Math.min(10, evaluated.length))].chromosome;
                nextPop.push(this.mutate(this.crossover(p1, p2)));
            }
            population = nextPop;
        }

        return best;
    }
}

/**
 * CLI Entry Point.
 */
async function main() {
    const args = process.argv.slice(2);
    const animName = args[args.indexOf('--name') + 1] || 'algorithmic_walk';

    // Security check
    if (animName.includes('..') || animName.includes('/')) {
        console.error("Invalid animation name.");
        process.exit(1);
    }

    console.log(`--- Evolving Animation: ${animName} ---`);
    const evolver = new AnimationEvolver();
    // Run evolution to find best movement
    const result = evolver.evolve();

    const outputPath = path.join(__dirname, 'animations', `${animName}.json`);

    // Ensure directory exists
    if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify({
        name: animName,
        frameCount: result.frames.length,
        frames: result.frames,
        metadata: { generator: 'AnimationEvolver v1.0', fitness: result.fitness }
    }, null, 2));

    console.log(`✅ Saved evolved animation to ${outputPath}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]);
if (isMain) main();
