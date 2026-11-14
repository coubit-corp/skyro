// Dados da própria conta: telefone (privado), foto, nome, bio e e-mail.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/auth-context'
import { accountErrorMessage, greetingFor, msUntilNextGreeting, phoneDigits, type PhotoChange } from '../lib/profile'
import { AVATAR_BUCKET, supabase } from '../lib/supabase'

function fail(error: { message: string } | null) {
  if (error) throw new Error(accountErrorMessage(error.message))
}

/** Telefone salvo (só a própria conta consegue ler). */
export function useMyPhone() {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['private_contact', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.from('private_contacts').select('phone').eq('user_id', userId!).maybeSingle()
      fail(error)
      return (data as { phone: string | null } | null)?.phone ?? ''
    },
  })
}

export interface SaveAccountInput {
  fullName: string
  /** Só a pessoa tem bio no perfil da conta; o profissional usa a bio do catálogo. */
  bio?: string
  email: string
  phone: string
  photo: PhotoChange
}

/**
 * Salva o que mudou. Devolve emailPending = true quando o e-mail novo ainda
 * depende de a pessoa abrir o link de confirmação.
 */
export function useSaveAccount() {
  const { session, profile, refreshProfile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveAccountInput): Promise<{ emailPending: boolean }> => {
      if (!session || !profile) throw new Error('Sua sessão expirou. Entre de novo.')
      const userId = session.user.id
      const oldPath = profile.avatar_path
      const patch: Record<string, unknown> = { full_name: input.fullName.trim().replace(/\s+/g, ' ') }
      if (input.bio !== undefined) patch.bio = input.bio.trim()

      // 1. Foto: envia primeiro; o perfil só aponta para ela se o envio der certo.
      if (input.photo.kind === 'new') {
        const path = `${userId}/${Date.now()}.jpg`
        const up = await supabase.storage.from(AVATAR_BUCKET).upload(path, input.photo.blob, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
        })
        fail(up.error)
        patch.avatar_path = path
      } else if (input.photo.kind === 'remove') {
        patch.avatar_path = null
      }

      // 2. Perfil
      fail((await supabase.from('profiles').update(patch).eq('id', userId)).error)

      // A foto antiga só é apagada depois que o perfil já não aponta para ela.
      if ('avatar_path' in patch && oldPath && oldPath !== patch.avatar_path) {
        await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]) // se falhar, só sobra um arquivo sem uso
      }

      // 3. Telefone (tabela privada)
      const phone = phoneDigits(input.phone)
      const saved = qc.getQueryData<string>(['private_contact', userId]) ?? ''
      if (phone !== saved) {
        fail(
          (await supabase.from('private_contacts').upsert({ user_id: userId, phone: phone || null }, { onConflict: 'user_id' }))
            .error,
        )
      }

      // 4. E-mail: o Supabase manda um link de confirmação para o endereço novo.
      let emailPending = false
      const email = input.email.trim().toLowerCase()
      if (email !== (session.user.email ?? '').toLowerCase()) {
        const { data, error } = await supabase.auth.updateUser({ email })
        fail(error)
        emailPending = (data.user?.email ?? '').toLowerCase() !== email
      }
      return { emailPending }
    },
    onSettled: async () => {
      await refreshProfile()
      // Nome e foto aparecem em várias telas: tudo que depende deles é buscado de novo.
      qc.invalidateQueries()
    },
  })
}

/**
 * "Bom dia, Lucas!", atualizada sozinha quando o horário vira (12h, 18h e 5h)
 * e quando a pessoa volta para a aba, sem precisar recarregar.
 */
export function useGreeting(fullName: string | null | undefined): string {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    // +1 s de folga para o relógio já ter passado da hora cheia
    const timer = setTimeout(() => setNow(new Date()), msUntilNextGreeting(now) + 1000)
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [now])
  return greetingFor(fullName, now)
}
