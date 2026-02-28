
## Medieval Character Types:
- Knight (male/female)
- Archer (male/female)
- Peasant (male/female)
- Mage (male/female)
- Rogue (male/female)

## Medieval Accessories:
- **Headwear:** Helmets (various styles: great helm, bascinet, sallet), coifs, hoods, circlets
- **Weapons:** Swords (longsword, broadsword, scimitar), daggers, axes, maces, spears, bows, quivers with arrows, crossbows, staffs, wands
- **Shields:** Heater shield, kite shield, round shield (various emblems)
- **Armor:** Chainmail, plate armor (full suit, breastplate, gauntlets, greaves), leather armor, padded gambeson
- **Clothing/Cloaks:** Tunics, cloaks (hooded, flowing), robes, capes, belts, pouches
- **Other:** Scrolls, potions, torches, lanterns, backpacks



## Medieval Color Palettes:
- **Forest:**
  - line: #3A3A3A (dark grey)
  - skin: #E0C0A0 (fair skin)
  - armor_metal: #808080 (steel grey)
  - leather: #6B4423 (dark brown)
  - fabric_main: #4A7C4A (forest green)
  - fabric_accent: #A0522D (rust orange)
  - wood: #7A5230 (medium brown)
  - gem: #4CAF50 (emerald green)

- **Castle:**
  - line: #2B2B2B (very dark grey)
  - skin: #F0C7A1 (light skin)
  - armor_metal: #A0A0A0 (silver grey)
  - leather: #5A3A20 (darker brown)
  - fabric_main: #607D8B (slate blue)
  - fabric_accent: #B71C1C (deep red)
  - wood: #8D6E63 (reddish brown)
  - gem: #880E4F (ruby red)

- **Royal:**
  - line: #1A1A1A (black)
  - skin: #FFDAB9 (peach skin)
  - armor_metal: #D4AF37 (gold)
  - leather: #4E342E (espresso brown)
  - fabric_main: #4A148C (royal purple)
  - fabric_accent: #FFD700 (gold yellow)
  - wood: #A1887F (ash brown)
  - gem: #1A237E (sapphire blue)

## Trait Mapping and New Medieval Traits:
- **Hat/Bonnet -> Helmet/Hood/Coif/Circlet:**
  - `character.hat` becomes `character.headwear` (e.g., 'great_helm', 'bascinet', 'hood', 'coif', 'circlet')
  - `character.bonnet` is removed.
- **Bandana -> Scarf/Cowl:**
  - `character.bandana` becomes `character.scarf` or `character.cowl`.
- **Type (cowboy/cowgirl) -> Class (knight/archer/peasant/mage/rogue):**
  - `character.type` becomes `character.class`.
- **HasBadge -> HasEmblem:**
  - `traits.hasBadge` becomes `traits.hasEmblem` (for shields or armor).
- **HasPoncho -> HasCloak:**
  - `traits.hasPoncho` becomes `traits.hasCloak`.
- **HasChaps -> HasGreaves/LegArmor:**
  - `traits.hasChaps` becomes `traits.hasLegArmor`.
- **HasLasso -> HasWeapon:**
  - `traits.hasLasso` becomes `traits.weapon` (e.g., 'sword', 'bow', 'staff', 'dagger').
- **HasMustache -> HasBeard (for male characters):**
  - `traits.hasMustache` becomes `traits.hasBeard`.
- **HairLength -> HairStyle (more varied for medieval):**
  - `traits.hairLength` becomes `traits.hairStyle` (e.g., 'short', 'long', 'braided', 'bald').
- **BootStyle -> Footwear:**
  - `traits.bootStyle` becomes `traits.footwear` (e.g., 'boots', 'shoes', 'sandals').
- **SpurSize -> WeaponDetail/ArmorDetail:**
  - `traits.spurSize` is removed, replaced by details specific to weapons or armor.

**New Medieval Traits:**
- `traits.armorType`: (e.g., 'none', 'leather', 'chainmail', 'plate')
- `traits.shieldType`: (e.g., 'none', 'heater', 'kite', 'round')
- `traits.hasQuiver`: Boolean for archers.
- `traits.hasBeltPouch`: Boolean for peasants/rogues.
- `traits.cloakColor`: Specific color for cloaks.
- `traits.emblemShape`: Shape of the emblem on shield/armor.
- `traits.emblemColor`: Color of the emblem.

