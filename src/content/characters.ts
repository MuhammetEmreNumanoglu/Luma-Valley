// Characters. Portraits are drawn by src/render/portraits.ts from these palettes.

export type CharId = 'lumi' | 'mira' | 'ada' | 'niko' | 'bera' | 'deniz' | 'yaren';
export type Mood = 'happy' | 'calm' | 'curious' | 'sad' | 'surprised' | 'proud';

export interface CharacterDef {
  id: CharId;
  /** Region where the player meets them. */
  region: number;
  skin: string;
  hair: string;
  outfit: string;
  accent: string;
}

export const CHARACTERS: readonly CharacterDef[] = [
  { id: 'lumi', region: 1, skin: '#FFE7A8', hair: '#FFC94D', outfit: '#FFB238', accent: '#FFF6D8' },
  { id: 'mira', region: 1, skin: '#E9B58E', hair: '#6B3F2A', outfit: '#C2703D', accent: '#F3D9A6' },
  { id: 'ada', region: 1, skin: '#F2C8A6', hair: '#2E3A2A', outfit: '#6E9E6A', accent: '#F6E3B4' },
  { id: 'bera', region: 1, skin: '#C98E6B', hair: '#1F1A1A', outfit: '#4F78A8', accent: '#E9C46A' },
  { id: 'niko', region: 2, skin: '#F0C09A', hair: '#A8552F', outfit: '#F4EEE2', accent: '#D9604A' },
  { id: 'deniz', region: 3, skin: '#B87F5E', hair: '#D9D3C7', outfit: '#2F6E86', accent: '#F2C14E' },
  { id: 'yaren', region: 5, skin: '#E6B796', hair: '#3B2C4A', outfit: '#8C6BB1', accent: '#F4D35E' },
];

export const CHARACTER: Record<CharId, CharacterDef> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c])) as Record<
  CharId,
  CharacterDef
>;
