# Medieval Stickman Generator

A Node.js-based sprite generator that creates animated medieval stickman characters with various classes, weapons, armor, and accessories.

## Features

- **4 Character Classes**: Knight, Archer, Mage, Peasant
- **Multiple Headwear Options**: Great Helm, Bascinet, Sallet, Hood, Coif, Circlet
- **Weapon Variety**: Swords, Bows, Staffs, Wands, Maces, Axes, Daggers
- **Armor Types**: Plate, Chainmail, Leather, or simple tunics
- **Shield Types**: Heater, Kite, Round shields with emblems
- **Accessories**: Cloaks, Scarfs, Quivers, Belt Pouches, Leg Armor
- **3 Color Palettes**: Forest, Castle, Royal themes
- **4 Directions**: Right, Left, Front, Back walking animations
- **6 Animation Frames**: Smooth walking cycles

## Generated Characters

1. **Knights (IDs 1-4)**: Heavily armored warriors with various helmets, weapons, and shields
2. **Archers (IDs 5-6)**: Bow-wielding characters with quivers and lighter armor
3. **Mages (IDs 7-8)**: Spell-casters with staffs/wands and mystical accessories
4. **Peasants (IDs 9-10)**: Common folk with simple clothing and basic tools

## Installation & Usage

1. Install dependencies:
   ```bash
   npm install canvas
   ```

2. Run the generator:
   ```bash
   node medieval_stickmen_generator.js
   ```

3. Generated files will be saved to:
   - Individual frames: `medieval_sprites/`
   - Sprite sheets: `medieval_sprites/sheets/`
   - Metadata: `medieval_sprites/sheets/{id}_meta.json`

## Output Structure

- **Sprite Sheets**: 600x100px images containing 6 animation frames per direction
- **Metadata JSON**: Contains frame coordinates, character traits, and animation info
- **Individual Frames**: 100x100px PNG files for each animation frame

## Character Traits

Each character is randomly assigned traits based on their class:
- **Armor Type**: None, Leather, Chainmail, or Plate
- **Weapons**: Class-appropriate weapons (swords for knights, bows for archers, etc.)
- **Accessories**: Cloaks, emblems, pouches, and other medieval items
- **Appearance**: Hair styles, beards, and facial features

## Integration

The generated sprite sheets and metadata are designed for easy integration into game engines. Each character includes:
- Frame rectangles for sprite sheet slicing
- Animation timing information
- Character class and trait data
- Multiple direction support

## Adapting the Generator

Both the medieval and cowboy generators now import a shared base template from `../templates/base_character_template.cjs`.  The template supplies sensible defaults for sprite sizing, anchor points, and walk-cycle tuning.  When creating a new genre, start by calling `createGenreTemplate` and override only the values that need to change—everything else is inherited automatically.

## Color Palettes

- **Forest**: Earth tones with greens and browns
- **Castle**: Stone grays with deep reds
- **Royal**: Rich purples and golds

Perfect for medieval-themed games, animations, or educational content!

