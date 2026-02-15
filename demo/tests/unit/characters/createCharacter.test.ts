import { describe, it, expect } from 'vitest';
import { createCharacter } from '../../../src/characters/createCharacter.js';

describe('createCharacter', () => {
  // warrior lv1: base stats
  it('warrior lv1 has correct stats', () => {
    const c = createCharacter('Hero', 'warrior', 1);
    expect(c.name).toBe('Hero');
    expect(c.hp).toBe(200);
    expect(c.maxHp).toBe(200);
    expect(c.attack).toBe(25);
    expect(c.defense).toBe(30);
    expect(c.element).toBe('earth');
    expect(c.level).toBe(1);
  });

  // mage lv5: base + 4 levels of growth
  // hp: 120 + 4*10 = 160, attack: 40 + 4*5 = 60, defense: 10 + 4*1 = 14
  it('mage lv5 has correct stats', () => {
    const c = createCharacter('Wizard', 'mage', 5);
    expect(c.hp).toBe(160);
    expect(c.attack).toBe(60);
    expect(c.defense).toBe(14);
    expect(c.element).toBe('fire');
  });

  // archer lv1: base stats
  it('archer lv1 has correct stats', () => {
    const c = createCharacter('Robin', 'archer', 1);
    expect(c.hp).toBe(150);
    expect(c.attack).toBe(35);
    expect(c.defense).toBe(15);
    expect(c.critChance).toBe(0.25);
    expect(c.element).toBe('wind');
  });

  // healer lv10: base + 9 levels of growth
  // hp: 130 + 9*15 = 265, attack: 15 + 9*2 = 33, defense: 20 + 9*3 = 47
  it('healer lv10 has correct stats', () => {
    const c = createCharacter('Priest', 'healer', 10);
    expect(c.hp).toBe(265);
    expect(c.attack).toBe(33);
    expect(c.defense).toBe(47);
    expect(c.element).toBe('ice');
  });

  // assassin lv1: base stats
  it('assassin lv1 has correct stats', () => {
    const c = createCharacter('Shadow', 'assassin', 1);
    expect(c.hp).toBe(110);
    expect(c.attack).toBe(45);
    expect(c.defense).toBe(8);
    expect(c.critChance).toBe(0.35);
    expect(c.element).toBe('lightning');
  });
});
