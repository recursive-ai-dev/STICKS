import { FeatureSpecGenerator } from './feature_spec_generator.js';
import { MicrocopyGenerator } from './microcopy_generator.js';
import fs from 'fs';

const featureGen = new FeatureSpecGenerator();
const microcopyGen = new MicrocopyGenerator();

// 1. Generate Feature Spec for "Delusion Bursts"
const delusionBurstSpec = featureGen.generate({
  feature_name: "Delusion Bursts",
  feature_category: "core utility",
  user_segment: "Active players seeking high-chaos gameplay",
  prerequisites: ["Completion of 'First Fracture' tutorial", "Collection of 3 God-Essence shards"],
  feature_count: 2,
  feature_names: ["Basic Delusion Burst", "Deity-Level Reality Warp"],
  platform: "Desktop (Keyboard: Spacebar)"
});

fs.writeFileSync('ux/DELUSION_BURST_SPEC.md', delusionBurstSpec);
console.log('Generated: ux/DELUSION_BURST_SPEC.md');

// 2. Generate Microcopy Pack for "World Pulse"
const worldPulseContent = microcopyGen.generate({
  content_contexts: ["notifications", "modals", "screens"],
  tone_constraints: ["dark", "gothic", "delusional"],
  avoid_list: ["game over", "points", "winner"],
  localization_prep: ["en", "la", "gr"] // English, Latin, Greek
});

fs.writeFileSync('ux/WORLD_PULSE_CONTENT.md', worldPulseContent);
console.log('Generated: ux/WORLD_PULSE_CONTENT.md');
