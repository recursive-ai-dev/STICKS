#!/usr/bin/env node
/**
 * integrate_godfall.js
 * Lightweight, non-invasive integration helper for Godfall to invoke existing
 * stickman character and environment generators.
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Known generator entry points
const generators = {
  cowboy_characters: {
    script: path.join(__dirname, "..", "stickemup_character_generator", "cowboy", "cowboy_stickmen_generator.js"),
    desc: "Generate cowboy stickmen sprites"
  },
  cowboy_apng_characters: {
    script: path.join(__dirname, "..", "stickemup_character_generator", "cowboy", "cowboy_apng_generator.js"),
    desc: "Create APNGs from character frames"
  },
  medieval_characters: {
    script: path.join(__dirname, "..", "stickemup_character_generator", "medieval", "medieval_stickmen_generator.js"),
    desc: "Generate medieval stickmen sprites"
  },
  modular_cowboy: {
    script: path.join(__dirname, "..", "modular_stickman", "cowboy_modular_generator.js"),
    desc: "Modular cowboy generator"
  },
  sci_fi: {
    script: path.join(__dirname, "..", "modular_stickman", "sci_fi_stickmen_generator.js"),
    desc: "Sci-Fi themed generator"
  },
  cowboy_environment: {
    script: path.join(__dirname, "..", "stickemup_environment_generator", "cowboy", "cowboy_environment_generator.js"),
    desc: "Generate cowboy environment elements"
  }
};

const postProcessors = {
  apply_theme: {
    script: path.join(__dirname, "apply_godfall_theme.js"),
    desc: 'Apply Godfall visual theme'
  },
  apply_style: {
    script: path.join(__dirname, "apply_godfall_style.js"),
    desc: 'Apply Godfall style overlays'
  }
};

/**
 * Lists all available tools.
 */
function listTools() {
  console.log("=== Godfall Integration Hub ===\n");
  console.log("Available Generators:");
  for (const [key, info] of Object.entries(generators)) {
    const exists = fs.existsSync(info.script);
    console.log(`- ${key.padEnd(20)}: ${info.desc} ${exists ? "✅" : "❌"}`);
  }
  console.log('\nPost-Processors:');
  for (const [key, info] of Object.entries(postProcessors)) {
    const exists = fs.existsSync(info.script);
    console.log(`- ${key.padEnd(20)}: ${info.desc} ${exists ? "✅" : "❌"}`);
  }
  console.log("\nUsage: node godfall/integrate_godfall.js generate --target=<name> [--in=...] [--out=...]");
}

/**
 * Spawns a child process to run a script.
 */
function spawnScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(scriptPath)) {
      return reject(new Error(`Script not found: ${scriptPath}`));
    }
    const nodeArgs = [scriptPath, ...args];
    console.log(`[Integrate] Spawning: node ${nodeArgs.join(' ')}`);
    const cp = spawn(process.execPath, nodeArgs, { stdio: 'inherit' });
    cp.on('close', (code) => {
      if (code === 0) return resolve(code);
      return reject(new Error(`Process exited with code ${code}`));
    });
    cp.on('error', (err) => reject(err));
  });
}

/**
 * Simple argument parser.
 */
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
    listTools();
    return;
  }

  if (cmd === 'generate') {
    const target = argv.target || argv.t;
    if (!target) {
      console.error('[Integrate] Missing --target. Run list for options.');
      process.exit(1);
    }

    // Handle "all" or specific target
    const targets = target === 'all' ? Object.keys(generators) : [target];

    for (const t of targets) {
      const gen = generators[t];
      if (!gen) {
        console.warn(`[Integrate] Unknown target: ${t}`);
        continue;
      }

      try {
        const passthrough = [];
        for (const [k, v] of Object.entries(argv)) {
          if (k === '_' || k === 'target' || k === 't') continue;
          passthrough.push(v === true ? `--${k}` : `--${k}=${v}`);
        }
        await spawnScript(gen.script, passthrough);
      } catch (err) {
        console.error(`[Integrate] Generator ${t} failed:`, err.message);
      }
    }

    // Automatic post-processing if requested
    if (argv.theme) {
        try {
            await spawnScript(postProcessors.apply_theme.script, [`--theme=${argv.theme}`]);
        } catch (e) {
            console.error("[Integrate] Theme post-processing failed.");
        }
    }
  }
}

main().catch(err => {
  console.error("[Integrate] Fatal Error:", err);
  process.exit(10);
});
