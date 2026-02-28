# STICKS: Godfall Echoes

A physics-driven stickman chaos game built on modular animation and divine delirium.

![STICKS: Godfall Echoes](https://via.placeholder.com/800x600/0d0d33/ffffff?text=STICKS+Godfall+Echoes)

## 🎮 Game Overview

**STICKS: Godfall Echoes** is a stickman physics chaos game that combines:
- Realistic limb detachment physics using Matter.js
- Procedural animation generation
- Modular character and environment systems
- Godfall-inspired delusion mechanics

### Core Gameplay Loop
1. **Spawn** as a modular stickman in a delusion-tainted environment
2. **Interact** using mouse drag, Space (Delusion Burst), and Q/E (attachment cycling)
3. **Survive** until the God's Pulse triggers world-shattering events
4. **Die gloriously** with meme-worthy ragdoll physics

## 🛠️ Technical Stack

- **Physics Engine**: Matter.js v0.20.0
- **Rendering**: Canvas 2D with procedural animation system
- **Modular System**: Character and environment generators
- **Godfall Integration**: Delusion database and visual theming

## 📁 Project Structure

```
STICKS-main/
├── index.html                # Main landing page
├── modular_stickman/         # Core game components
│   ├── animation_renderer.js # Animation rendering system
│   ├── animations.js         # Animation data loader
│   ├── cowboy_modular_generator.js # Character generator
│   ├── procedural_animation_generator.js # Genetic animation optimizer
│   ├── physics_engine.js     # Matter.js physics integration
│   ├── game.js               # Main game logic
│   ├── demo.html             # Interactive demo
│   └── animations/           # Generated animation JSON files
├── godfall/                  # Godfall integration
│   ├── apply_godfall_style.js
│   ├── apply_godfall_theme.js
│   ├── god_manifest_96.json
│   ├── integrate_godfall.js
│   └── README.md
├── stickemup_character_generator/
├── stickemup_environment_generator/
└── package.json              # Dependencies and scripts
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

Then open your browser to `http://localhost:8080/modular_stickman/demo.html`

### Development Server
```bash
npm start
```

Open `http://localhost:8080` for the main landing page.

## 🎯 Key Features

### Physics & Limb Detachment
- High-impact collision detection for limb detachment
- Detached limbs can be grabbed and thrown
- Realistic ragdoll physics with elastic deformation

### Delusion System
- **Delusion Bursts**: Space key triggers temporary reality warps
- **World Pulse Events**: Every 60 seconds, terrain fractures and delusions intensify
- **Limb Identity**: Each limb retains metadata for unique effects

### Modular Design
- Character system with cowboy, medieval, and Godfall corruption themes
- Environment generator for procedurally created levels
- Attachment system with weapon/tool cycling (Q/E keys)

## 🎨 Visual Style

Godfall-themed aesthetics:
- Deep purples and dark blues (#0d0d33, #1a1a2e)
- Gold accents (#ffcc00) for highlights
- Blood red (#8b4513) for delusion effects
- VHS glitch overlays during delusion bursts

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

---

> "If you don't laugh when your stickman's spine uncoils and punches a dragon, we've failed."  
> — STICKS: Godfall Echoes Development Team