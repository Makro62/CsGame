interface ZombieHealthBarProps {
  hp: number;
  maxHp: number;
  position: [number, number, number];
  type: string;
}

export function ZombieHealthBar({ hp, maxHp }: ZombieHealthBarProps) {
  if (hp >= maxHp) return null;
  return null;
}
