import { useEffect, useState } from 'react'

function currentMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** Minutos desde a meia-noite, no horário do aparelho; atualiza a cada minuto. */
export function useNowMinutes(): number {
  const [now, setNow] = useState(currentMinutes)
  useEffect(() => {
    const id = setInterval(() => setNow(currentMinutes()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}
