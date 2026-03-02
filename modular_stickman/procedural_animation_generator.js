import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function wrapPhase(value) {
    const tau = TWO_PI;
    let wrapped = value % tau;
    if (wrapped < 0) {
        wrapped += tau;
    }
    return wrapped;
}

function sampleGaussian(mean = 0, stdDev = 1) {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const mag = Math.sqrt(-2.0 * Math.log(u));
    const z0 = mag * Math.cos(TWO_PI * v);
    return mean + z0 * stdDev;
}

function randomChromosome() {
    return {
        legAmplitude: randomRange(GENE_BOUNDS.legAmplitude.min, GENE_BOUNDS.legAmplitude.max),
        legPhaseOffset: randomRange(GENE_BOUNDS.legPhaseOffset.min, GENE_BOUNDS.legPhaseOffset.max),
        armAmplitude: randomRange(GENE_BOUNDS.armAmplitude.min, GENE_BOUNDS.armAmplitude.max),
        armPhaseOffset: randomRange(GENE_BOUNDS.armPhaseOffset.min, GENE_BOUNDS.armPhaseOffset.max),
        bodyBobAmplitude: randomRange(GENE_BOUNDS.bodyBobAmplitude.min, GENE_BOUNDS.bodyBobAmplitude.max),
        bodyBobPhase: randomRange(GENE_BOUNDS.bodyBobPhase.min, GENE_BOUNDS.bodyBobPhase.max),
        leanAmplitude: randomRange(GENE_BOUNDS.leanAmplitude.min, GENE_BOUNDS.leanAmplitude.max),
        leanPhase: randomRange(GENE_BOUNDS.leanPhase.min, GENE_BOUNDS.leanPhase.max),
        headTiltAmplitude: randomRange(GENE_BOUNDS.headTiltAmplitude.min, GENE_BOUNDS.headTiltAmplitude.max),
        headTiltPhase: randomRange(GENE_BOUNDS.headTiltPhase.min, GENE_BOUNDS.headTiltPhase.max),
    };
}

function crossover(parentA, parentB) {
    const child = {};
    Object.keys(parentA).forEach(key => {
        child[key] = Math.random() < 0.5 ? parentA[key] : parentB[key];
    });
    return child;
}

function mutateChromosome(chromosome, mutationRate) {
    const mutated = { ...chromosome };
    Object.keys(mutated).forEach(key => {
        if (Math.random() < mutationRate) {
            const bounds = GENE_BOUNDS[key];
            if (bounds) {
                const stdDev = (bounds.max - bounds.min) / 10;
                let value = mutated[key] + sampleGaussian(0, stdDev);
                if (key.endsWith('Phase')) {
                    value = wrapPhase(value);
                } else {
                    value = clamp(value, bounds.min, bounds.max);
                }
                mutated[key] = value;
            }
        }
    });
    return mutated;
}

function evaluateChromosome(chromosome, frameCount) {
    const frames = [];
    let legOpposition = 0;
    let armOpposition = 0;
    let armLegSynergy = 0;
    let smoothness = 0;
    let jerk = 0;
    let clampHits = 0;
    let prev = null;
    let prevDelta = null;

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        const t = (frameIndex / frameCount) * TWO_PI;
        const rightLegRaw = chromosome.legAmplitude * Math.sin(t);
        const leftLegRaw = chromosome.legAmplitude * Math.sin(t + chromosome.legPhaseOffset);
        const rightArmRaw = chromosome.armAmplitude * Math.sin(t + chromosome.armPhaseOffset);
        const leftArmRaw = chromosome.armAmplitude * Math.sin(t + chromosome.armPhaseOffset + Math.PI);
        const bodyOffsetRaw = chromosome.bodyBobAmplitude * Math.sin(t + chromosome.bodyBobPhase);
        const leanRaw = chromosome.leanAmplitude * Math.sin(t + chromosome.leanPhase);
        const headTiltRaw = chromosome.headTiltAmplitude * Math.sin(t + chromosome.headTiltPhase);

        const rightLeg = clamp(rightLegRaw, -60, 60);
        const leftLeg = clamp(leftLegRaw, -60, 60);
        const rightArm = clamp(rightArmRaw, -75, 75);
        const leftArm = clamp(leftArmRaw, -75, 75);
        const bodyOffset = clamp(bodyOffsetRaw, -8, 8);
        const lean = clamp(leanRaw, -10, 10);
        const headTilt = clamp(headTiltRaw, -6, 6);

        if (Math.abs(rightLegRaw) !== Math.abs(rightLeg)) clampHits += 1;
        if (Math.abs(leftLegRaw) !== Math.abs(leftLeg)) clampHits += 1;
        if (Math.abs(rightArmRaw) !== Math.abs(rightArm)) clampHits += 1;
        if (Math.abs(leftArmRaw) !== Math.abs(leftArm)) clampHits += 1;
        if (Math.abs(bodyOffsetRaw) !== Math.abs(bodyOffset)) clampHits += 1;
        if (Math.abs(leanRaw) !== Math.abs(lean)) clampHits += 1;
        if (Math.abs(headTiltRaw) !== Math.abs(headTilt)) clampHits += 1;

        frames.push({
            frame: frameIndex,
            bodyParts: {
                rightArm: { angle: rightArm, length: 18 },
                leftArm: { angle: leftArm, length: 18 },
                rightLeg: { angle: rightLeg, length: 20 },
                leftLeg: { angle: leftLeg, length: 20 },
                body: { verticalOffset: bodyOffset, lean },
                head: { tilt: headTilt },
            },
        });

        legOpposition += Math.abs(rightLegRaw + leftLegRaw);
        armOpposition += Math.abs(rightArmRaw + leftArmRaw);
        armLegSynergy += Math.abs(rightArmRaw + rightLegRaw);

        if (prev) {
            const delta = {
                rightLeg: rightLegRaw - prev.rightLegRaw,
                leftLeg: leftLegRaw - prev.leftLegRaw,
                rightArm: rightArmRaw - prev.rightArmRaw,
                leftArm: leftArmRaw - prev.leftArmRaw,
                body: bodyOffsetRaw - prev.bodyOffsetRaw,
            };
            smoothness +=
                Math.abs(delta.rightLeg) +
                Math.abs(delta.leftLeg) +
                Math.abs(delta.rightArm) +
                Math.abs(delta.leftArm) +
                Math.abs(delta.body);

            if (prevDelta) {
                jerk +=
                    Math.abs(delta.rightLeg - prevDelta.rightLeg) +
                    Math.abs(delta.leftLeg - prevDelta.leftLeg) +
                    Math.abs(delta.rightArm - prevDelta.rightArm) +
                    Math.abs(delta.leftArm - prevDelta.leftArm);
            }

            prevDelta = delta;
        }

        prev = { rightLegRaw, leftLegRaw, rightArmRaw, leftArmRaw, bodyOffsetRaw };
    }

    const invFrameCount = 1 / frameCount;
    legOpposition *= invFrameCount;
    armOpposition *= invFrameCount;
    armLegSynergy *= invFrameCount;
    smoothness *= invFrameCount;
    jerk *= invFrameCount;

    const amplitudePenalty =
        Math.abs(chromosome.legAmplitude - 30) * 0.8 +
        Math.abs(chromosome.armAmplitude - 22) * 0.5;

    const bobTarget = 2.8 + 0.05 * (chromosome.legAmplitude - 24);
    const bobPenalty = Math.abs(Math.abs(chromosome.bodyBobAmplitude) - bobTarget) * 4;

    const phasePenalty =
        Math.abs(chromosome.legPhaseOffset - Math.PI) * 3 +
        Math.abs(((chromosome.armPhaseOffset - Math.PI) + Math.PI) % TWO_PI - Math.PI) * 2;

    const smoothnessPenalty = smoothness * 1.2 + jerk * 0.8;
    const oppositionPenalty = legOpposition * 0.6 + armOpposition * 0.5 + armLegSynergy * 0.8;
    const clampPenalty = clampHits * 2;

    const fitness = 180 - (
        amplitudePenalty +
        bobPenalty +
        phasePenalty +
        smoothnessPenalty +
        oppositionPenalty +
        clampPenalty
    );

    return {
        fitness,
        frames,
        metrics: {
            legOpposition,
            armOpposition,
            armLegSynergy,
            smoothness,
            jerk,
            clampHits,
            amplitudePenalty,
            bobPenalty,
            phasePenalty,
        },
    };
}

function tournamentSelect(evaluated, k = 3) {
    let best = null;
    for (let i = 0; i < k; i += 1) {
        const candidate = evaluated[Math.floor(Math.random() * evaluated.length)];
        if (!best || candidate.fitness > best.fitness) {
            best = candidate;
        }
    }
    return best;
}

function roundTo(value, precision = 2) {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
}

function buildAnimationPayload(name, frameCount, evaluation) {
    return {
        name,
        frameCount,
        frames: evaluation.frames.map((frame, index) => ({
            frame: index,
            bodyParts: {
                rightArm: { angle: roundTo(frame.bodyParts.rightArm.angle), length: 18 },
                leftArm: { angle: roundTo(frame.bodyParts.leftArm.angle), length: 18 },
                rightLeg: { angle: roundTo(frame.bodyParts.rightLeg.angle), length: 20 },
                leftLeg: { angle: roundTo(frame.bodyParts.leftLeg.angle), length: 20 },
                body: {
                    verticalOffset: roundTo(frame.bodyParts.body.verticalOffset),
                    lean: roundTo(frame.bodyParts.body.lean),
                },
                head: { tilt: roundTo(frame.bodyParts.head.tilt) },
            },
        })),
        metadata: {
            generator: 'procedural_animation_generator',
            strategy: 'genetic_walk_optimizer',
            fitness: roundTo(evaluation.fitness, 3),
            metrics: Object.fromEntries(
                Object.entries(evaluation.metrics).map(([key, value]) => [key, roundTo(value, 4)])
            ),
        },
    };
}

function ensureAnimationDir() {
    const animationsDir = path.join(__dirname, 'animations');
    if (!fs.existsSync(animationsDir)) {
        fs.mkdirSync(animationsDir, { recursive: true });
    }
    return animationsDir;
}

function parseArgs(argv) {
    const options = { ...DEFAULT_OPTIONS };
    options.name = 'algorithmic_walk';

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--name' && argv[i + 1]) {
            options.name = argv[i + 1];
            i += 1;
        } else if (arg === '--frames' && argv[i + 1]) {
            options.frameCount = Number(argv[i + 1]);
            i += 1;
        } else if (arg === '--population' && argv[i + 1]) {
            options.populationSize = Number(argv[i + 1]);
            i += 1;
        } else if (arg === '--generations' && argv[i + 1]) {
            options.generations = Number(argv[i + 1]);
            i += 1;
        } else if (arg === '--mutation' && argv[i + 1]) {
            options.mutationRate = Number(argv[i + 1]);
            i += 1;
        } else if (arg === '--elite' && argv[i + 1]) {
            options.eliteCount = Number(argv[i + 1]);
            i += 1;
        }
    }

    return options;
}

function evolveAnimation(options) {
    const { frameCount, populationSize, generations, mutationRate, eliteCount } = options;
    let population = Array.from({ length: populationSize }, () => randomChromosome());
    let bestEvaluation = null;

    for (let generation = 0; generation < generations; generation += 1) {
        const evaluated = population.map(chromosome => {
            const evaluation = evaluateChromosome(chromosome, frameCount);
            return { ...evaluation, chromosome };
        });

        evaluated.sort((a, b) => b.fitness - a.fitness);
        if (!bestEvaluation || evaluated[0].fitness > bestEvaluation.fitness) {
            bestEvaluation = {
                ...evaluated[0],
                generation,
            };
        }

        const leader = evaluated[0];
        console.log(
            `[Gen ${generation + 1}] best=${leader.fitness.toFixed(2)} ` +
            `(legAmp=${leader.chromosome.legAmplitude.toFixed(2)}, armAmp=${leader.chromosome.armAmplitude.toFixed(2)}, ` +
            `phaseLeg=${leader.chromosome.legPhaseOffset.toFixed(2)}, phaseArm=${leader.chromosome.armPhaseOffset.toFixed(2)})`
        );

        const newPopulation = evaluated.slice(0, eliteCount).map(entry => entry.chromosome);

        while (newPopulation.length < populationSize) {
            const parentA = tournamentSelect(evaluated);
            const parentB = tournamentSelect(evaluated);
            const child = crossover(parentA.chromosome, parentB.chromosome);
            newPopulation.push(mutateChromosome(child, mutationRate));
        }

        population = newPopulation;
    }

    return bestEvaluation;
}

function main() {
    const options = parseArgs(process.argv.slice(2));

    // Security: Prevent path traversal by ensuring animationName doesn't contain path separators or parent directory references
    if (typeof options.name !== 'string' || options.name.includes('..') || options.name.includes('/') || options.name.includes('\\')) {
        console.error(`Security Warning: Invalid animation name provided: ${options.name}`);
        process.exit(1);
    }

    const evaluation = evolveAnimation(options);
    const animationsDir = ensureAnimationDir();
    const payload = buildAnimationPayload(options.name, options.frameCount, evaluation);
    const outputPath = path.join(animationsDir, `${options.name}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 4));
    console.log(`\nSaved procedural animation to ${outputPath}`);
    console.log(`Final fitness: ${payload.metadata.fitness}`);
    console.log('Metrics:', payload.metadata.metrics);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]);

if (isMain) {
    main();
}

export {
    evolveAnimation,
    buildAnimationPayload,
    evaluateChromosome,
    randomChromosome,
};
