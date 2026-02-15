export interface DefenseStats {
  baseDefense: number;
  armorBonus: number;
  shieldBonus: number;
  elementalResistance: Partial<Record<string, number>>;
}
