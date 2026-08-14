# UI/UX Refactor Implementation Guide v2.2

**Document Status**: Implementation in Progress
**Last Updated**: 2026-08-13
**Phase**: Foundation + Core Components Complete

## Quick Start

### Using New Components

#### Import Shared Components

```tsx
import {
  GlassPanel,
  AnimatedNumber,
  ProgressBar,
  Badge,
} from '@/ui/components/shared'

// Use in your component
;<GlassPanel variant="default" intensity="high" glow>
  <div className="text-text-primary">Hello World</div>
</GlassPanel>
```

#### Import HUD Components

```tsx
import {
  HealthBar,
  AmmoCounter,
  Crosshair,
  KillFeed,
  RoundTimer
} from '@/ui/components/hud';

// Use in your HUD
<HealthBar hp={75} maxHp={100} armor={50} hasHelmet={true} />
<AmmoCounter
  current={28}
  max={30}
  reserve={90}
  isReloading={false}
  isSwitching={false}
  weaponName="M4A1"
/>
```

#### Import Screen Components

```tsx
import { MainMenu, BuyMenu } from '@/ui/components/screens'

// Use in your app
;<MainMenu
  onPlayMultiplayer={() => startMultiplayer()}
  onPlayTraining={() => startTraining()}
/>
```

### Design System Usage

#### Using CSS Variables

All design tokens are available as CSS custom properties:

```css
.my-element {
  color: var(--color-text-primary);
  background: var(--color-bg-glass);
  font-family: var(--font-display);
  font-size: var(--text-xl);
  padding: var(--space-4);
  animation: slide-in-right 0.3s var(--ease-spring);
}
```

#### Using Tailwind Classes

Design tokens are integrated into Tailwind:

```tsx
<div className="bg-primary text-text-primary font-display text-xl p-4 animate-slide-in-right">
  Styled with Tailwind tokens
</div>
```

#### Using the cn() Utility

Combine classnames with automatic Tailwind class merging:

```tsx
import { cn } from '@/utils/cn'

;<div
  className={cn(
    'p-4 rounded-lg',
    isActive && 'bg-accent-gold text-text-inverse',
    !isActive && 'bg-bg-secondary text-text-primary'
  )}
>
  Smart Classname Merging
</div>
```

## Component Examples

### HealthBar

```tsx
<HealthBar
  hp={75}
  maxHp={100}
  armor={50}
  hasHelmet={true}
  isTakingDamage={true}
/>
```

**Features**:

- Animated number transitions
- Color-coded health status (green/yellow/red)
- Damage flash effect
- Critical HP pulse effect
- Armor display with helmet indicator

### AmmoCounter

```tsx
<AmmoCounter
  current={28}
  max={30}
  reserve={90}
  isReloading={false}
  isSwitching={false}
  weaponName="M4A1"
/>
```

**Features**:

- Low ammo warning
- Reload progress bar
- Switching state indicator
- Animated reload animation

### Crosshair

```tsx
<Crosshair
  isADS={false}
  isMoving={true}
  isReloading={false}
  bulletsFired={5}
  weaponSpread={0.2}
  style="dynamic"
  size={1}
/>
```

**Features**:

- Dynamic spread calculation
- ADS scope overlay for snipers
- Movement and recoil indicators
- Multiple styles (dot, cross, dynamic)

### KillFeed

```tsx
<KillFeed
  events={[
    {
      id: '1',
      killerName: 'Player1',
      victimName: 'Player2',
      weapon: 'ak47',
      headshot: true,
      teamKill: false,
    },
  ]}
  maxEvents={5}
/>
```

**Features**:

- Staggered entry animations
- Headshot indicators
- Team kill detection
- Auto-fade after duration

### RoundTimer

```tsx
<RoundTimer
  phase="active"
  timeLeft={35}
  roundNumber={5}
  teamRedScore={8}
  teamBlueScore={7}
  isOvertime={false}
  bombPlanted={false}
  bombTimeLeft={undefined}
/>
```

**Features**:

- Phase indicators (buy/active/roundEnd)
- Panic mode at <10 seconds
- Score display
- Bomb timer with warning

### DamageVignette

```tsx
<DamageVignette damageDirection="front" intensity={0.7} isHealing={false} />
```

**Features**:

- Radial vignette overlay
- Directional damage indicator
- Screen shake effect
- Healing indicator

### GrenadeIndicator

```tsx
<GrenadeIndicator
  heGrenades={1}
  smokeGrenades={1}
  flashGrenades={2}
  selectedType="he"
  maxGrenades={3}
/>
```

**Features**:

- Individual grenade counts
- Selected grenade highlight
- Max grenades indicator
- Status icons

## Color Reference

### Primary Colors

- `--color-bg-primary`: #0a0a0f (Main background)
- `--color-bg-secondary`: #12121a (Secondary background)
- `--color-text-primary`: #ffffff (Main text)
- `--color-text-muted`: rgba(255,255,255,0.4) (Subtle text)

### Team Colors

- `--color-terrorist`: #ff4444 (Red team)
- `--color-counter`: #4488ff (Blue team)

### Status Colors

- `--color-health-full`: #4ade80 (Healthy - green)
- `--color-health-mid`: #fbbf24 (Medium - yellow)
- `--color-health-low`: #ef4444 (Low - red)
- `--color-armor`: #60a5fa (Armor - blue)
- `--color-money`: #fbbf24 (Economy - yellow)

### Accent Colors

- `--color-accent-gold`: #ffd700 (Premium/Important)
- `--color-accent-purple`: #a855f7 (Overtime/Special)
- `--color-accent-cyan`: #22d3ee (Info)

## Animation Timing

All animations use predefined durations:

- `--duration-instant`: 50ms
- `--duration-fast`: 150ms (UI interactions)
- `--duration-normal`: 250ms (Standard transitions)
- `--duration-slow`: 400ms (Delayed reactions)
- `--duration-dramatic`: 800ms (Cinematic effects)

**Easing Functions**:

- `--ease-default`: smooth cubic-bezier
- `--ease-spring`: bounce/spring effect
- `--ease-elastic`: elastic overshoot
- `--ease-bounce`: bouncy landing

## Font Sizes (Modular Scale 1.25)

- `--text-xs`: 0.75rem (12px) - Small labels
- `--text-sm`: 0.875rem (14px) - Secondary info
- `--text-base`: 1rem (16px) - Body text
- `--text-lg`: 1.25rem (20px) - Emphasis
- `--text-xl`: 1.5rem (24px) - HP/Ammo
- `--text-2xl`: 2rem (32px) - Score/Timer
- `--text-3xl`: 2.5rem (40px) - Kill confirm
- `--text-4xl`: 3.5rem (56px) - Major events

## Spacing Scale

All spacing uses consistent 4px base unit:

- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-6`: 24px
- `--space-8`: 32px

## Performance Tips

### React Optimization

```tsx
import { memo, useMemo } from 'react'

// Memoize expensive components
export const HealthBar = memo(({ hp, armor }: Props) => {
  return <div>{hp}</div>
})

// Memoize callbacks
const handleBuy = useCallback(() => {
  onBuy(itemId)
}, [itemId, onBuy])
```

### CSS Optimization

```tsx
// Prefer GPU-accelerated properties
// ✅ Use: transform, opacity, will-change
// ❌ Avoid: left, top, width, height for animations

// Use will-change on animated elements
<div className="will-change-transform animate-slide-in-right" />
```

### Bundle Size

- Design system uses CSS variables (zero JS)
- Tailwind JIT only generates used classes
- Components are tree-shakeable

## Accessibility

All components follow WCAG 2.1 AA standards:

### Color Contrast

- Minimum 4.5:1 for text
- White on dark = 15:1 ratio
- Status colors tested with contrast checker

### Motion

```tsx
// Respects prefers-reduced-motion
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
```

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Focus states are clearly visible
- Buy Menu: arrow keys + Enter

## Common Patterns

### Conditional Styling

```tsx
const className = cn(
  'base-classes',
  hp > 60 && 'text-health-full',
  hp > 25 && !hp > 60 && 'text-health-mid',
  hp <= 25 && 'text-health-low animate-pulse'
)
```

### Staggered Animations

```tsx
{
  items.map((item, index) => (
    <div
      key={item.id}
      style={{ animationDelay: `${index * 50}ms` }}
      className="animate-slide-in-right"
    >
      {item}
    </div>
  ))
}
```

### Glass Effect

```tsx
<GlassPanel variant="default" intensity="high" border glow>
  Content goes here
</GlassPanel>
```

## Troubleshooting

### Animations Not Working

- Check if `@media (prefers-reduced-motion)` is active
- Verify animation class is applied
- Check z-index stacking

### Colors Look Wrong

- Verify CSS variables are loaded
- Check Tailwind config is extended
- Inspect computed styles

### Performance Issues

- Use React.memo for list items
- Add will-change to animated elements
- Check CSS contain property usage

## Migration Guide (from old HUD)

### Before (Inline Styles)

```tsx
<div
  style={{
    background: 'rgba(59,130,246,0.8)',
    padding: '6px 20px',
    borderRadius: '6px',
    fontSize: '22px',
  }}
>
  Score
</div>
```

### After (Design System)

```tsx
<GlassPanel className="p-1.5 text-2xl" variant="default">
  <span className="text-counter font-bold">Score</span>
</GlassPanel>
```

## Next Steps

1. **Phase 2**: Create additional HUD components
   - WeaponSlots (weapon quick-select)
   - Minimap (2D radar)
   - ChatBox (in-game messaging)
   - RadioCommands (command wheel)

2. **Phase 3**: Create additional screen components
   - DeathScreen (with kill cam)
   - Leaderboard (sortable rankings)
   - SettingsMenu (preferences)
   - MatchEndScreen (results)

3. **Phase 4**: Integration & Testing
   - Replace old HUD.tsx with new components
   - Test on multiple resolutions
   - Performance profiling
   - Cross-browser testing

4. **Phase 5**: Polish
   - Add more micro-interactions
   - Sound feedback system
   - Dark/light mode support
   - Mobile responsiveness

## Documentation Files

- **Design System**: `/src/ui/design-system/`
- **Components**: `/src/ui/components/`
- **Utils**: `/src/utils/cn.ts`
- **Config**: `/tailwind.config.js`
- **Styles**: `/src/index.css`

## Support & Questions

For questions or issues:

1. Check component props documentation
2. Review component examples above
3. Check design tokens in CSS variables
4. Test in different browsers/resolutions

---

**Version**: 2.2
**Last Updated**: 2026-08-13
**Status**: ✅ Foundation Complete, Core Components Done
