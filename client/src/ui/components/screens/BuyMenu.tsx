import { useState } from 'react'
import { GlassPanel } from '../shared/GlassPanel'
import { cn } from '../../../utils/cn'

interface BuyMenuProps {
  money: number
  team: 'T' | 'CT'
  items: Record<string, any>
  onBuy: (item: string) => void
  onClose: () => void
}

type Category = 'rifles' | 'smgs' | 'pistols' | 'gear' | 'grenades'

/**
 * BuyMenu - Equipment purchase menu with category tabs
 * Shows weapon/item stats and handles purchase logic
 */
export function BuyMenu({ money, team, items, onBuy, onClose }: BuyMenuProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('rifles')
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const categories: { id: Category; label: string }[] = [
    { id: 'rifles', label: 'RIFLES' },
    { id: 'smgs', label: 'SMGS' },
    { id: 'pistols', label: 'PISTOLS' },
    { id: 'gear', label: 'GEAR' },
    { id: 'grenades', label: 'GRENADES' },
  ]

  const getItems = () => {
    // TODO: Implement actual item filtering based on category
    // For now, return empty array - will be populated from actual game data
    return Object.entries(items || {}).filter(([key]) => {
      const lowerKey = key.toLowerCase()
      switch (activeCategory) {
        case 'rifles':
          return ['ak47', 'm4a1', 'awp', 'galil', 'famas'].some(w =>
            lowerKey.includes(w)
          )
        case 'smgs':
          return ['mp5', 'mp7', 'mac10', 'ump'].some(w => lowerKey.includes(w))
        case 'pistols':
          return ['deagle', 'glock', 'tec9', 'autopistol', 'p250'].some(w =>
            lowerKey.includes(w)
          )
        case 'gear':
          return ['vest', 'helmet', 'defuse', 'bomb'].some(w =>
            lowerKey.includes(w)
          )
        case 'grenades':
          return ['grenade', 'flash', 'smoke', 'incendiary'].some(w =>
            lowerKey.includes(w)
          )
        default:
          return false
      }
    })
  }

  return (
    <div className="absolute inset-0 bg-bg-primary/90 backdrop-blur-sm flex items-center justify-center z-50">
      <GlassPanel
        className="w-[800px] max-w-[90vw] max-h-[80vh] flex flex-col"
        intensity="high"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-2xl font-black font-display tracking-wider">
            BUY MENU
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-sm">BALANCE:</span>
            <span className="text-2xl font-bold font-mono text-money">
              ${money.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 p-2 border-b border-white/10">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'flex-1 py-2 px-4 text-sm font-bold tracking-wider transition-all duration-200',
                'hover:bg-white/5 rounded',
                activeCategory === cat.id
                  ? 'bg-white/10 text-text-primary border-b-2 border-accent-gold'
                  : 'text-text-muted'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
          {getItems().length > 0 ? (
            getItems().map(([key, item]: [string, any]) => {
              const canAfford = !item.price || item.price <= money
              const isTeamLocked =
                item.team && item.team !== 'both' && item.team !== team
              const isHovered = hoveredItem === key

              return (
                <button
                  key={key}
                  onClick={() => canAfford && !isTeamLocked && onBuy(key)}
                  onMouseEnter={() => setHoveredItem(key)}
                  onMouseLeave={() => setHoveredItem(null)}
                  disabled={!canAfford || isTeamLocked}
                  className={cn(
                    'relative p-4 rounded-lg border transition-all duration-200 text-left',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    canAfford && !isTeamLocked
                      ? 'border-white/10 hover:border-accent-gold/50 hover:bg-white/5'
                      : 'border-white/5 opacity-50 cursor-not-allowed',
                    isHovered && canAfford && 'shadow-lg shadow-accent-gold/10'
                  )}
                >
                  {/* Item Name & Price */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg">
                      {key.toUpperCase()}
                    </span>
                    <span
                      className={cn(
                        'font-mono font-bold',
                        canAfford ? 'text-money' : 'text-health-low'
                      )}
                    >
                      ${(item.price || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="space-y-1 text-xs text-text-secondary">
                    {item.dmg && (
                      <div className="flex justify-between">
                        <span>Damage</span>
                        <span className="text-text-primary">{item.dmg}</span>
                      </div>
                    )}
                    {item.fireRate && (
                      <div className="flex justify-between">
                        <span>Fire Rate</span>
                        <span className="text-text-primary">
                          {item.fireRate}/s
                        </span>
                      </div>
                    )}
                    {item.mag && (
                      <div className="flex justify-between">
                        <span>Magazine</span>
                        <span className="text-text-primary">{item.mag}</span>
                      </div>
                    )}
                  </div>

                  {/* Team Lock Badge */}
                  {isTeamLocked && (
                    <div className="absolute top-2 right-2 text-[10px] font-bold text-health-low bg-health-low/20 px-2 py-0.5 rounded">
                      {item.team?.toUpperCase()} ONLY
                    </div>
                  )}
                </button>
              )
            })
          ) : (
            <div className="col-span-2 flex items-center justify-center h-32 text-text-muted">
              No items available in this category
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-between items-center">
          <span className="text-xs text-text-muted">Press B to close</span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded font-bold transition-colors"
          >
            CLOSE
          </button>
        </div>
      </GlassPanel>
    </div>
  )
}
