TODO: Stickemup systems roadmap (bullet-point, shippable order)

Core loop & engine

Tick scheduler (global fixed tick; queue for concurrent player/NPC actions).

Deterministic RNG seeds per entity (stable personalities/quirks).

Time of day, weather, light level → modifiers to AI/encounters.

World model

Locations graph (town, saloon, jail, ranch, crossroads, canyon, mine).

POIs with services (bartender, doctor, general store, sheriff’s office).

Travel system (time costs, chance events, posse pursuit, ambush nodes).

Entities

NPC schema: stats (grit, aim, nerve, reputation), job role, routine.

Relationship graph: grudges, debts, posse membership, bounty status.

Inventory system: weapons, ammo types, horse, lasso, consumables.

AI & simulation

Daily routines per role (sheriff patrol, bartender shifts, rancher chores).

Goal stack (needs, jobs, relationships) + interrupts (alarms, duels).

Event emitters: robbery, bounty posting, jailbreak, bar brawl, dust storm.

Combat / conflict

Duel mini-system (stance, draw, aim, nerve checks, injury states).

Group shootouts (cover, morale checks, flee/surrender).

Non-lethal outcomes (disarm, intimidate, arrest, ransom).

Economy

Prices per town, scarcity flags (drought → water prices spike).

Jobs/contracts: bounty, escort, delivery, cattle drive, mine guard.

Faction reputation affects payouts and access (e.g., sheriff, bandits).

Narrative systems

Event templates with variable slots (who/where/why) + consequences.

Rumor/News feed (diegetic text log) that reacts to sim outcomes.

Personal arcs: rival spawns, mentor offers, betrayal triggers.

UI (text-first, minimal visuals)

Single Actions button → context menu (location/entity aware).

Inspect panel (hover/press to show tooltips with colored keywords).

Log window with inline highlights (skills, places, names).

Overlay for sprite loop (your stickmen) tied to current actor/context.

Content/data pipelines

YAML/JSON content packs (towns, names, slang, job templates).

Procedural character visuals → mapped from your generator’s metadata
(e.g., hasBadge → sheriff flag; hasLasso → lasso actions available).

Save/load with versioned world state.

Tech/devops

Engine: TypeScript core (deterministic sim), React UI shell.

Unit tests for tick ordering, duel resolution, AI interrupts.

Export debug timeline (replay a day to repro bugs).

Mod hooks: register new roles, items, events at runtime.

Nice-to-have (post-v0.2)

Horses as entities (speed, temperament), mounted combat.

Train schedules & heists, stagecoach robberies.

Procedural town gen (layout + businesses).

Photo mode: export animated APNG/GIF of notable events.