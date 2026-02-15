export type ElementType = 'fire' | 'ice' | 'lightning' | 'earth' | 'wind' | 'neutral';

export interface ElementMatchup {
  attacker: ElementType;
  defender: ElementType;
  multiplier: number;
}
