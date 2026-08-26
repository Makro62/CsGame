# Zombie Survival — Alien Shooter Arena

> **Status:** Twin-stick arena survival (2026-08-26)
> **Reference feel:** Alien Shooter (Sigma Team)
> **Source of truth:** `client/src/game/zombie/ZombieEngine.ts`, `client/src/game/zombie/survivalLayout.ts`, `client/src/screens/ZombieSurvivalMode.tsx`

---

## Overview

Top-down isometric horde survival. You fight in a 4-room arena (center cross + cover crates). Waves start automatically. Enemies spawn from the edges. Kill loot (HP / ammo / armor / weapons) and buy upgrades between waves.

**Camera:** Isometric follow (y=22, fov=48). Mouse aims on the ground; WASD moves independently.

---

## Controls

| Key | Action |
|:----|:-------|
| WASD | Move |
| Mouse | Aim |
| Left Click | Shoot |
| Shift | Sprint |
| R | Reload |
| 1–3 | Weapon slots |
| B | Shop (between waves) |

---

## Arena

Playable area ±26 on X/Z. Four rooms around a central plaza, interior walls with door gaps, crates for cover. Zombies path around walls.

---

## Wave loop

1. Buy phase (8s first, 12s later) — shop open, countdown
2. Wave auto-starts — no button
3. Clear the horde → next buy phase
4. Downed bleedout → game over

Count: `6 + (wave - 1) × 4`. Types unlock like before (runner 3, exploder 4, tank 5, spitter 7, boss 10).

---

## Loot & shop

Ground drops: health (+40), ammo, armor (+50), weapons (MP5 / AK / Deagle / M4). Power-ups still drop (insta-kill, double points, nuke, etc.). Shop spends points on weapons, ammo, armor, and full heal.
