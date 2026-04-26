import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CONFIG,
  CONFIG_PRESETS,
  POSITION_LABELS,
  getPositionLabel,
} from '../../src/lib/rules'
import type { PlayerRole } from '../../src/types'

describe('rules', () => {
  describe('DEFAULT_CONFIG', () => {
    it('has standard U12 values', () => {
      expect(DEFAULT_CONFIG.halves).toBe(2)
      expect(DEFAULT_CONFIG.halfDurationMinutes).toBe(20)
      expect(DEFAULT_CONFIG.timeoutsPerHalf).toBe(1)
      expect(DEFAULT_CONFIG.exclusionDurationSeconds).toBe(120)
      expect(DEFAULT_CONFIG.playersOnCourt).toBe(7)
    })

    it('has all required fields', () => {
      const keys = [
        'halves', 'halfDurationMinutes', 'timeoutsPerHalf',
        'timeoutDurationSeconds', 'exclusionDurationSeconds',
        'maxExclusionsPerTeam', 'playersOnCourt', 'maxSquadSize',
      ]
      for (const key of keys) {
        expect(DEFAULT_CONFIG).toHaveProperty(key)
      }
    })
  })

  describe('CONFIG_PRESETS', () => {
    it('has 5 presets', () => {
      expect(Object.keys(CONFIG_PRESETS)).toHaveLength(5)
    })

    it.each([
      ['u12-standard', 2, 20],
      ['u14-standard', 2, 25],
      ['senior', 2, 30],
      ['mini-4x12', 4, 12],
      ['friendly-2x15', 2, 15],
    ])('%s has halves=%d, duration=%d', (key, halves, duration) => {
      const preset = CONFIG_PRESETS[key]
      expect(preset).toBeDefined()
      expect(preset.config.halves).toBe(halves)
      expect(preset.config.halfDurationMinutes).toBe(duration)
    })

    it('each preset has a label', () => {
      for (const preset of Object.values(CONFIG_PRESETS)) {
        expect(preset.label).toBeTruthy()
        expect(typeof preset.label).toBe('string')
      }
    })
  })

  describe('POSITION_LABELS', () => {
    const allRoles: PlayerRole[] = ['GK', 'LW', 'RW', 'LB', 'RB', 'CB', 'PV']

    it('has labels for all 7 positions', () => {
      expect(Object.keys(POSITION_LABELS)).toHaveLength(7)
    })

    it.each(allRoles)('%s has en and es labels', (role) => {
      expect(POSITION_LABELS[role].en).toBeTruthy()
      expect(POSITION_LABELS[role].es).toBeTruthy()
    })
  })

  describe('getPositionLabel', () => {
    it('returns English label by default', () => {
      expect(getPositionLabel('GK')).toBe('Goalkeeper')
    })

    it('returns Spanish label when requested', () => {
      expect(getPositionLabel('GK', 'es')).toBe('Portero')
    })

    it('returns English for all positions', () => {
      expect(getPositionLabel('LW')).toBe('Left Wing')
      expect(getPositionLabel('PV')).toBe('Pivot')
    })

    it('returns Spanish for all positions', () => {
      expect(getPositionLabel('CB', 'es')).toBe('Central')
      expect(getPositionLabel('RB', 'es')).toBe('Lateral Derecho')
    })

    it('falls back to role code for unknown role', () => {
      expect(getPositionLabel('XX' as PlayerRole)).toBe('XX')
    })
  })
})
