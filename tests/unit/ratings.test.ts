import { describe, it, expect } from 'vitest'
import {
  isGK,
  getStatKeys,
  getStatLabels,
  computeMedia,
  emptyRatings,
  validateRatings,
  FIELD_STAT_KEYS,
  GK_STAT_KEYS,
} from '../../src/lib/ratings'
import type { FieldPlayerRatings, GKRatings } from '../../src/lib/database.types'

describe('ratings utilities', () => {
  describe('isGK', () => {
    it('returns true for GK role', () => {
      expect(isGK('GK')).toBe(true)
    })

    it('returns false for field roles', () => {
      expect(isGK('CB')).toBe(false)
      expect(isGK('LW')).toBe(false)
      expect(isGK('PV')).toBe(false)
    })
  })

  describe('getStatKeys', () => {
    it('returns field stat keys for non-GK', () => {
      expect(getStatKeys('CB')).toEqual(FIELD_STAT_KEYS)
      expect(getStatKeys('CB')).toHaveLength(6)
    })

    it('returns GK stat keys for GK', () => {
      expect(getStatKeys('GK')).toEqual(GK_STAT_KEYS)
      expect(getStatKeys('GK')).toHaveLength(6)
    })
  })

  describe('getStatLabels', () => {
    it('returns Spanish labels for field players', () => {
      const labels = getStatLabels('CB')
      expect(labels['tiro']).toBe('Tiro')
      expect(labels['vision_de_juego']).toBe('Visión')
    })

    it('returns abbreviated labels for GK', () => {
      const labels = getStatLabels('GK')
      expect(labels['9m']).toBe('9M')
      expect(labels['7m']).toBe('7M')
    })
  })

  describe('computeMedia', () => {
    it('returns null for null ratings', () => {
      expect(computeMedia(null)).toBeNull()
    })

    it('computes rounded average for field player', () => {
      const ratings: FieldPlayerRatings = {
        tiro: 83, pase: 90, defensa: 80, fisico: 80, stamina: 90, vision_de_juego: 90,
      }
      // (83+90+80+80+90+90) / 6 = 85.5 → rounds to 86
      expect(computeMedia(ratings)).toBe(86)
    })

    it('computes rounded average for GK', () => {
      const ratings: GKRatings = {
        '9m': 87, '6m': 91, ex: 90, pas: 96, med: 99, '7m': 93,
      }
      // (87+91+90+96+99+93) / 6 = 92.67 → rounds to 93
      expect(computeMedia(ratings)).toBe(93)
    })

    it('handles all zeros', () => {
      const ratings: FieldPlayerRatings = {
        tiro: 0, pase: 0, defensa: 0, fisico: 0, stamina: 0, vision_de_juego: 0,
      }
      expect(computeMedia(ratings)).toBe(0)
    })
  })

  describe('emptyRatings', () => {
    it('returns field ratings with all 50s for non-GK', () => {
      const ratings = emptyRatings('CB') as FieldPlayerRatings
      expect(ratings.tiro).toBe(50)
      expect(ratings.vision_de_juego).toBe(50)
      expect(Object.keys(ratings)).toHaveLength(6)
    })

    it('returns GK ratings with all 50s for GK', () => {
      const ratings = emptyRatings('GK') as GKRatings
      expect(ratings['9m']).toBe(50)
      expect(ratings['7m']).toBe(50)
      expect(Object.keys(ratings)).toHaveLength(6)
    })
  })

  describe('validateRatings', () => {
    it('returns null for valid field ratings', () => {
      const ratings: FieldPlayerRatings = {
        tiro: 80, pase: 70, defensa: 90, fisico: 60, stamina: 85, vision_de_juego: 75,
      }
      expect(validateRatings(ratings)).toBeNull()
    })

    it('returns null for valid GK ratings', () => {
      const ratings: GKRatings = {
        '9m': 85, '6m': 90, ex: 90, pas: 95, med: 80, '7m': 85,
      }
      expect(validateRatings(ratings)).toBeNull()
    })

    it('rejects ratings with value above 99', () => {
      const ratings: FieldPlayerRatings = {
        tiro: 100, pase: 70, defensa: 90, fisico: 60, stamina: 85, vision_de_juego: 75,
      }
      expect(validateRatings(ratings)).toContain('0 y 99')
    })

    it('rejects ratings with negative value', () => {
      const ratings: FieldPlayerRatings = {
        tiro: -1, pase: 70, defensa: 90, fisico: 60, stamina: 85, vision_de_juego: 75,
      }
      expect(validateRatings(ratings)).toContain('0 y 99')
    })

    it('rejects non-integer values', () => {
      const ratings = {
        tiro: 80.5, pase: 70, defensa: 90, fisico: 60, stamina: 85, vision_de_juego: 75,
      } as FieldPlayerRatings
      expect(validateRatings(ratings)).toContain('0 y 99')
    })

    it('accepts boundary values 0 and 99', () => {
      const ratings: FieldPlayerRatings = {
        tiro: 0, pase: 99, defensa: 0, fisico: 99, stamina: 0, vision_de_juego: 99,
      }
      expect(validateRatings(ratings)).toBeNull()
    })
  })
})
