'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const KEY = 'europa110_external_signups'

function read(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/** "Apuntarme" solo queda anotado en este dispositivo: la logia organizadora no recibe aviso. */
export function ExternalSignup({ id }: { id: string }) {
  const [signedUp, setSignedUp] = useState(false)
  const [justNow, setJustNow] = useState(false)

  useEffect(() => {
    // localStorage solo existe en el navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSignedUp(read().includes(id))
  }, [id])

  function signUp() {
    const list = read()
    if (!list.includes(id)) list.push(id)
    try {
      localStorage.setItem(KEY, JSON.stringify(list))
    } catch {
      // Sin almacenamiento (modo privado): solo se marca en pantalla.
    }
    setSignedUp(true)
    setJustNow(true)
  }

  return (
    <div className="mt-6">
      <Button type="button" block onClick={signUp} disabled={signedUp} variant={signedUp ? 'selected' : 'primary'}>
        {signedUp ? (
          <>
            <Check aria-hidden className="size-4" strokeWidth={2.25} /> Apuntado
          </>
        ) : (
          'Apuntarme'
        )}
      </Button>
      <p aria-live="polite" className="mt-2 text-center text-[13px] text-muted">
        {signedUp
          ? justNow
            ? 'Anotado en este dispositivo. Recuerda confirmar tu asistencia a la logia organizadora.'
            : 'Anotado en este dispositivo.'
          : ''}
      </p>
    </div>
  )
}
