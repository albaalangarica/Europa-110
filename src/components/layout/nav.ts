import { rolePanels, type Permisos, type RolePanel } from '@/lib/domain/permissions'

export type NavIcon = 'agenda' | 'planchas' | 'interno' | 'secretaria' | 'venerable' | 'vigilante' | 'formacion'

export interface NavItem {
  href: string
  label: string
  icon: NavIcon
  // Rutas que también marcan este apartado como activo.
  match: string[]
}

const PANEL_ITEMS: Record<RolePanel, (p: Permisos) => NavItem> = {
  secretaria: () => ({ href: '/panel/secretaria', label: 'Secretaría', icon: 'secretaria', match: ['/panel/secretaria'] }),
  venerable: () => ({ href: '/panel/venerable', label: 'Venerable', icon: 'venerable', match: ['/panel/venerable'] }),
  // Quien ayuda en la formación sin ser Vigilante ve el mismo panel con otro nombre.
  'primer-vigilante': (p) => ({
    href: '/panel/primer-vigilante',
    label: p.primerVigilante ? '1er Vigilante' : 'Formación',
    icon: 'vigilante',
    match: ['/panel/primer-vigilante', '/formacion/companero'],
  }),
  companero: () => ({ href: '/panel/companero', label: 'Compañero', icon: 'formacion', match: ['/panel/companero', '/formacion/companero'] }),
  'segundo-vigilante': (p) => ({
    href: '/panel/segundo-vigilante',
    label: p.segundoVigilante ? '2º Vigilante' : 'Formación',
    icon: 'vigilante',
    match: ['/panel/segundo-vigilante', '/formacion/aprendiz'],
  }),
  aprendiz: () => ({ href: '/panel/aprendiz', label: 'Aprendiz', icon: 'formacion', match: ['/panel/aprendiz', '/formacion/aprendiz'] }),
}

export function navItems(p: Permisos): NavItem[] {
  return [
    { href: '/', label: 'Agenda', icon: 'agenda', match: ['/', '/tenidas', '/convocatorias'] },
    { href: '/planchas', label: 'Planchas', icon: 'planchas', match: ['/planchas'] },
    { href: '/interno', label: 'Interno', icon: 'interno', match: ['/interno'] },
    ...rolePanels(p).map((panel) => PANEL_ITEMS[panel](p)),
  ]
}
