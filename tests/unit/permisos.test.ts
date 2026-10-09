import { describe, expect, it } from 'vitest'
import { isVisibleForUser, permissionsFor, rolePanels } from '@/lib/domain/permissions'
import { attendanceIsOpen, canOpenDate, toIsoDate } from '@/lib/domain/dates'

const user = (grado: 'aprendiz' | 'companero' | 'maestro', rol = 'Miembro', cargos = '', usuario = 'x') => ({ usuario, grado, rol, cargos })

describe('permisos (como en Code.gs)', () => {
  it('Secretaría por cargo o por rol', () => {
    expect(permissionsFor(user('maestro', 'Miembro', 'Secretario')).asistencia).toBe(true)
    expect(permissionsFor(user('maestro', 'Secretaría')).secretaria).toBe(true)
    expect(permissionsFor(user('maestro')).gestion).toBe(false)
  })

  it('Tronco: Administrador, Secretaría, Tronco, Tesorero u Hospitalario', () => {
    expect(permissionsFor(user('companero', 'Administrador')).tronco).toBe(true)
    expect(permissionsFor(user('maestro', 'Miembro', 'Tesorero')).tronco).toBe(true)
    expect(permissionsFor(user('maestro', 'Miembro', 'Hospitalario')).tronco).toBe(true)
    expect(permissionsFor(user('maestro')).tronco).toBe(false)
  })

  it('cada persona ve su panel de formación', () => {
    expect(rolePanels(permissionsFor(user('companero')))).toEqual(['companero'])
    expect(rolePanels(permissionsFor(user('aprendiz')))).toEqual(['aprendiz'])
    expect(rolePanels(permissionsFor(user('maestro', 'Miembro', 'Primer Vigilante')))).toEqual(['primer-vigilante'])
    expect(rolePanels(permissionsFor(user('maestro', 'Miembro', 'Apoyo formación Compañeros')))).toEqual(['primer-vigilante'])
    expect(rolePanels(permissionsFor(user('maestro', 'Venerable Maestro', 'Venerable Maestro')))).toEqual(['venerable'])
    expect(rolePanels(permissionsFor(user('maestro')))).toEqual([])
  })

  it('grado mínimo y "Visible para"', () => {
    expect(isVisibleForUser({ grado_minimo: 'companero', visible_para: 'Todos' }, user('aprendiz'))).toBe(false)
    expect(isVisibleForUser({ grado_minimo: 'aprendiz', visible_para: 'Todos' }, user('aprendiz'))).toBe(true)
    expect(isVisibleForUser({ grado_minimo: '', visible_para: 'Todos' }, user('maestro'))).toBe(false)
    expect(isVisibleForUser({ grado_minimo: 'aprendiz', visible_para: 'Secretario, alba' }, user('aprendiz', 'Miembro', '', 'Alba'))).toBe(true)
    expect(isVisibleForUser({ grado_minimo: 'aprendiz', visible_para: 'Compañero' }, user('companero'))).toBe(true)
    expect(isVisibleForUser({ grado_minimo: 'aprendiz', visible_para: 'Maestro' }, user('companero'))).toBe(false)
  })
})

describe('fechas', () => {
  it('la confirmación se abre 10 días antes', () => {
    expect(attendanceIsOpen('2026-10-10', '2026-10-09')).toBe(true)
    expect(attendanceIsOpen('2026-10-19', '2026-10-09')).toBe(true)
    expect(attendanceIsOpen('2026-10-20', '2026-10-09')).toBe(false)
    expect(attendanceIsOpen('2026-10-08', '2026-10-09')).toBe(false)
  })

  it('se abre la siguiente tenida, las pasadas y las de menos de un mes', () => {
    const all = ['2026-09-12', '2026-12-19', '2027-01-09']
    expect(canOpenDate('2026-09-12', all, '2026-10-09')).toBe(true)
    expect(canOpenDate('2026-12-19', all, '2026-10-09')).toBe(true)
    expect(canOpenDate('2027-01-09', all, '2026-10-09')).toBe(false)
    expect(canOpenDate('2027-01-09', all, '2026-12-20')).toBe(true)
  })

  it('entiende las fechas del Sheet', () => {
    expect(toIsoDate('14/09/2026')).toBe('2026-09-14')
    expect(toIsoDate('2026-10-10')).toBe('2026-10-10')
    expect(toIsoDate('3/1/2027')).toBe('2027-01-03')
  })
})
