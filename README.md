# STICKS: Godfall Echoes

A physics-driven stickman chaos game built on modular animation and divine delirium.

![STICKS: Godfall Echoes](https://via.placeholder.com/800x600/0d0d33/ffffff?text=STICKS+Godfall+Echoes)

## 🎮 Game Overview

**STICKS: Godfall Echoes** is a stickman physics chaos game that combines:
- Realistic limb detachment physics using Matter.js
- Procedural animation generation and genetic optimization
- Modular character and environment systems with Cowboy and Medieval themes
- Godfall-inspired delusion mechanics and lore integration

### Core Gameplay Loop
1. **Spawn** as a modular stickman in a delusion-tainted environment.
2. **Interact** using mouse drag to pull/throw limbs, Space for **Delusion Bursts**, and Q/E to cycle **Modular Attachments**.
3. **Survive** until the **God's Pulse** triggers world-shattering events every 60 seconds.
4. **Die gloriously** with meme-worthy ragdoll physics and unique delusion traits.

## 🛠️ Technical Stack

- **Physics Engine**: Matter.js v0.20.0 for rigid body dynamics.
- **Logic Chain Architecture**: Deterministic game logic using structured "Logic Chains" for complex state transitions like limb detachment (see `docs/logic_chains/`).
- **Rendering**: HTML5 Canvas 2D with a procedural animation system.
- **Modular System**: ES Module based character and environment generators.
- **Godfall Integration**: Automated theme application and delusion database integration.

## 📁 Project Structure

```
STICKS-main/
├── index.html                # Main landing page
├── modular_stickman/         # Core game components
│   ├── animations/           # Procedural animation data (walk, moonwalk, bar_fight, etc.)
│   ├── tests/                # Physics and logic chain tests
│   ├── animation_renderer.js # Animation rendering system
│   ├── animations.js         # Animation data loader
│   ├── cowboy_modular_generator.js # Modular character generator
│   ├── procedural_animation_generator.js # Genetic animation optimizer
│   ├── physics_engine.js     # Matter.js physics & collision integration
│   ├── limb_detachment_service.js # Logic chain for limb detachment
│   ├── game.js               # Main game loop and state management
│   └── demo.html             # Interactive physics demo
├── godfall/                  # Godfall integration & Lore
│   ├── integrate_godfall.js  # Non-invasive integration helper
│   ├── apply_godfall_style.js # Visual theme post-processor
│   ├── god_manifest_96.json  # Delusion trait database
│   └── README.md             # Lore manifest and world overview
├── stickemup_character_generator/ # Character sprite generators
│   ├── cowboy/               # Cowboy theme assets and generators
│   └── medieval/             # Medieval theme assets and generators
├── stickemup_environment_generator/ # Level generation systems
├── docs/                     # Technical documentation
│   └── logic_chains/         # Logic chain contracts and specifications
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js v16+
- npm

### Installation
```bash
npm install
```

### Running the Demo
```bash
npm run demo
```
Then open your browser to `http://localhost:8080/demo.html`.

### Development & Generation
- **Start Web Server**: `npm start`
- **Generate Moonwalk Animation**: `npm run generate:moonwalk`
- **Integrate Godfall**: `node godfall/integrate_godfall.js list`

## 🎯 Key Features

### Physics & Limb Detachment
- **High-impact collisions**: Detach limbs based on velocity thresholds.
- **Logic Chain Safety**: Atomic state transitions ensure game state integrity.
- **Limb-Specific Delusions**: Detaching different limbs triggers unique traits:
    - **Head**: `hallucinate_enemies_as_cows`
    - **Arms**: `weaponized_limbs`
    - **Legs**: `gravity_distortion`

### Animation System
- **Procedural Library**: Includes `walk`, `moonwalk`, `bar_fight`, `shoot`, `jump`, `wave`, and `algorithmic_walk`.
- **Optimization**: Use the `procedural_animation_generator` to evolve new movement patterns.

### Delusion System
- **Delusion Bursts**: Space key triggers temporary reality warps (inverted gravity, elasticity).
- **World Pulse Events**: Every 60 seconds, terrain fractures and delusions intensify.
- **Attachment Cycling**: Q/E keys cycle through modular tools like grappling hooks, gravity guns, and time dilation fields.

## 🎨 Visual Style & Lore

- **Theming**: Deep purples, gold accents, and "Godfall" corruption effects.
- **Lore**: Set in a world existing on the body of a dying god, where madness is the only clarity.
- **Post-Processing**: Automatic application of VHS glitches and divine "veins" to generated sprites.

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

---

> "If you don't laugh when your stickman's spine uncoils and punches a dragon, we've failed."  
> — STICKS: Godfall Echoes Development Team