#!/usr/bin/env node
// integrate_godfall.js
// Lightweight, non-invasive integration helper for Godfall to invoke existing
// stickman character and environment generators. This script spawns node
// processes for the original generators and passes-through any args.
//
// Usage examples:
//   node integrate_godfall.js list
//   node integrate_godfall.js generate --target=cowboy_characters
//   node integrate_godfall.js generate --target=cowboy_environment

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Known generator entry points (non-invasive mapping)
const generators = {
  cowboy_characters: {
    script: path.join(__dirname, "..", "stickemup_character_generator", "cowboy", "cowboy_stickmen_generator.js"),
    desc: "Generate cowboy stickmen sprites (commonjs)"
  },
  cowboy_apng_characters: {
    script: path.join(__dirname, "..", "stickemup_character_generator", "cowboy", "cowboy_apng_generator.js"),
    desc: "Create APNGs from character frames"
  },
  medieval_characters: {
    script: path.join(__dirname, "..", "stickemup_character_generator", "medieval", "medieval_stickmen_generator.js"),
    desc: "Generate medieval stickmen sprites (CommonJS)"
  },
  modular_cowboy: {
    script: path.join(__dirname, "..", "modular_stickman", "cowboy_modular_generator.js"),
    desc: "Modular ESM generator (may require node ESM support)"
  },
  cowboy_environment: {
    script: path.join(__dirname, "..", "stickemup_environment_generator", "cowboy", "cowboy_environment_generator.js"),
    desc: "Generate cowboy environment elements (commonjs)"
  },
  cowboy_apng_environment: {
    script: path.join(__dirname, "..", "stickemup_environment_generator", "cowboy", "cowboy_apng_generator.js"),
    desc: "Create APNGs from environment frames"
  }
};

// Post-processor to theme outputs for Godfall
const postProcessor = {
  apply_theme: {
    script: path.join(__dirname, "apply_godfall_theme.js"),
    desc: 'Apply Godfall visual theme to generated PNGs (CommonJS)'
  }
};

// Stronger style post-processor (composes overlays, accessories, veins)
postProcessor.apply_style = {
  script: path.join(__dirname, "apply_godfall_style.js"),
  desc: 'Apply Godfall style overlays (auras/veins/accessories) to sprites (CommonJS)'
};

function listGenerators() {
  console.log("Available generators:\n");
  for (const [key, info] of Object.entries(generators)) {
    const exists = fs.existsSync(info.script);
    console.log(`- ${key}: ${info.desc} -> ${info.script} ${exists ? "(found)" : "(missing)"}`);
  }
  console.log('\nPost-processors:');
  for (const [key, info] of Object.entries(postProcessor)) {
    const exists = fs.existsSync(info.script);
    console.log(`- ${key}: ${info.desc} -> ${info.script} ${exists ? "(found)" : "(missing)"}`);
  }
  console.log('\nGodfall convenience targets:');
  console.log('- godfall_characters  : run character generation then apply Godfall style');
  console.log('- godfall_environment : run environment generation then apply Godfall style');
  console.log("\nUse: node integrate_godfall.js generate --target=<name> [--...]\n");
}

function spawnScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(scriptPath)) {
      return reject(new Error(`Script not found: ${scriptPath}`));
    }
    const nodeArgs = [scriptPath, ...args];
    console.log(`Spawning: node ${nodeArgs.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}\n`);
    const cp = spawn(process.execPath, nodeArgs, { stdio: 'inherit' });
    cp.on('close', (code) => {
      if (code === 0) return resolve(code);
      return reject(new Error(`Process exited with code ${code}`));
    });
    cp.on('error', (err) => reject(err));
  });
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.replace(/^--/, '').split('=');
      if (v !== undefined) out[k] = v;
      else out[k] = argv[i+1] && !argv[i+1].startsWith('--') ? argv[++i] : true;
    } else {
      out._.push(a);
    }
  }
  return out;
}

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  const cmd = argv._[0] || 'help';

  if (cmd === 'list' || cmd === 'help') {
    listGenerators();
    return;
  }

  if (cmd === 'generate') {
    const target = argv.target || argv.t;
    if (!target) {
      console.error('Missing --target argument. Run `node integrate_godfall.js list` to see options.');
      process.exit(1);
    }
    if (target === 'all') {
      // Run all available generators sequentially (safe order)
      for (const key of Object.keys(generators)) {
        const g = generators[key];
        if (!fs.existsSync(g.script)) {
          console.warn(`Skipping ${key}: script not found (${g.script})`);
          continue;
        }
        try {
          await spawnScript(g.script, []);
        } catch (err) {
          console.error(`Generator ${key} failed: ${err.message}`);
        }
      }
      // After raw generation, apply Godfall theme to both characters and environment if outputs exist
      try {
        if (fs.existsSync(postProcessor.apply_theme.script)) {
          // Default: look in cowboy outputs; user can override --in/--out
          await spawnScript(postProcessor.apply_theme.script, []);
        }
      } catch (err) {
        console.error('Post-processing failed:', err.message);
      }
      return;
    }
    // Special convenience targets for Godfall-themed outputs
    if (target === 'godfall_characters') {
      // Run character generators then apply theme
      // Run all available character generators (cowboy + medieval + modular if present)
      const charGens = [generators.cowboy_characters, generators.medieval_characters, generators.modular_cowboy, generators.cowboy_apng_characters, generators.cowboy_apng_characters].filter(Boolean);
      try {
        for (const g of charGens) {
          if (g && fs.existsSync(g.script)) await spawnScript(g.script, []);
        }
        // After generation, apply a stronger Godfall style (prefer overlays that add class/race cues)
        const styleArgs = [];
        if (argv.in) styleArgs.push(`--in=${argv.in}`);
        if (argv.out) styleArgs.push(`--out=${argv.out}`);
        if (argv.theme) styleArgs.push(`--theme=${argv.theme}`);
        // Use provided manifest, or default to the repository 96-entry manifest if present
        const defaultManifest = path.join(__dirname, 'god_manifest_96.json');
        if (argv.manifest) styleArgs.push(`--manifest=${argv.manifest}`);
        else if (fs.existsSync(defaultManifest)) styleArgs.push(`--manifest=${defaultManifest}`);
        // Prefer apply_style if available, fall back to apply_theme
        if (postProcessor.apply_style && fs.existsSync(postProcessor.apply_style.script)) {
          await spawnScript(postProcessor.apply_style.script, styleArgs);
        } else if (postProcessor.apply_theme && fs.existsSync(postProcessor.apply_theme.script)) {
          await spawnScript(postProcessor.apply_theme.script, styleArgs);
        }
        console.log('Godfall character generation complete.');
      } catch (err) {
        console.error('godfall_characters failed:', err.message);
        process.exit(4);
      }
      return;
    }
    if (target === 'godfall_environment') {
      // Run environment generators (cowboy environment + modular if exists)
      const envGens = [generators.cowboy_environment, generators.cowboy_apng_environment].filter(Boolean);
      try {
        for (const g of envGens) {
          if (g && fs.existsSync(g.script)) await spawnScript(g.script, []);
        }
        const styleArgs = [];
        if (argv.in) styleArgs.push(`--in=${argv.in}`);
        if (argv.out) styleArgs.push(`--out=${argv.out}`);
        if (argv.theme) styleArgs.push(`--theme=${argv.theme}`);
    const defaultManifest = path.join(__dirname, 'god_manifest_96.json');
    if (argv.manifest) styleArgs.push(`--manifest=${argv.manifest}`);
    else if (fs.existsSync(defaultManifest)) styleArgs.push(`--manifest=${defaultManifest}`);
        if (postProcessor.apply_style && fs.existsSync(postProcessor.apply_style.script)) {
          await spawnScript(postProcessor.apply_style.script, styleArgs);
        } else if (postProcessor.apply_theme && fs.existsSync(postProcessor.apply_theme.script)) {
          await spawnScript(postProcessor.apply_theme.script, styleArgs);
        }
        console.log('Godfall environment generation complete.');
      } catch (err) {
        console.error('godfall_environment failed:', err.message);
        process.exit(5);
      }
      return;
    }
    const gen = generators[target];
    if (!gen) {
      console.error(`Unknown target: ${target}. Run list to see available targets.`);
      process.exit(2);
    }
    try {
      // Pass through any extra args (keep same format)
      const passthrough = [];
      for (const [k, v] of Object.entries(argv)) {
        if (k === '_' ) continue;
        if (k === 'target') continue;
        if (v === true) passthrough.push(`--${k}`);
        else passthrough.push(`--${k}=${v}`);
      }
      await spawnScript(gen.script, passthrough);
      console.log(`Generator ${target} completed.`);
    } catch (err) {
      console.error(`Generator failed: ${err.message}`);
      process.exit(3);
    }
    return;
  }

  listGenerators();
}

main().catch(err => {
  console.error(err);
  process.exit(10);
});
