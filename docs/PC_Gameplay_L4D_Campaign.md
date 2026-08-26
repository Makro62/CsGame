# Left 4 Dead Campaign — First Person

> **Status:** FPS campaign (2026-08-26)
> **Reference feel:** Left 4 Dead 2
> **Source of truth:** `client/src/game/l4d/L4DDirector.ts`, `client/src/screens/L4DMode.tsx`

---

## Overview

First-person cooperative campaign. You play Coach with 3 AI survivors (Rochelle, Ellis, Nick). Each chapter runs Safe Room → Traverse → Finale rescue. The Director AI paces hordes and special infected.

**Camera:** First-person (pointer lock, fov 75). WASD relative to look; RMB ADS.

---

## Controls

| Key | Action |
|:----|:-------|
| WASD | Move |
| Mouse | Look |
| Left Click | Shoot |
| Right Click | ADS |
| R | Reload |
| Shift | Sprint |
| F (hold) | Revive downed teammate |
| 1–3 | Weapon slots |

---

## Campaign

4 chapters, longer maps each time. Leave the starting safe room to begin. Reach the rescue pad with all living survivors to start the finale (call → holdout 40s → escape).

---

## Special infected

| Type | Role |
|:-----|:-----|
| Common | Horde melee |
| Hunter | Pounces and pins (incapacitate) |
| Smoker | Tongue grab, drags the survivor |
| Boomer | Explodes bile (vision smear + horde) |
| Tank | Heavy melee |
| Witch | Idle until startled, then insta-down |

Bots follow, shoot, and revive you if you go down. Bleedout ~22s.
