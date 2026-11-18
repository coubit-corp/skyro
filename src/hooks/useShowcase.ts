// Vitrine do profissional: galeria de fotos e vídeos e avaliações.
// Quem pode enviar, apagar e avaliar é decidido pelo banco (RLS); aqui só
// buscamos, enviamos e traduzimos os erros.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import type { ProfessionalMedia, ProfessionalReview } from '../lib/database.types'
import { toGalleryJpeg } from '../lib/image'
import { PORTFOLIO_BUCKET, supabase } from '../lib/supabase'
import { showcaseErrorMessage, VIDEO_MAX_BYTES, VIDEO_TYPES, type VideoRef } from '../lib/vitrine'

function fail(error: { message: string } | null) {
  if (error) throw new Error(showcaseErrorMessage(error.message))
}

// ---------------------------------------------------------------------------
// Galeria
// ---------------------------------------------------------------------------

export function useProMedia(proId: string | undefined) {
  return useQuery({
    queryKey: ['professional_media', proId],
    enabled: Boolean(proId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_media')
        .select('*')
        .eq('professional_id', proId!)
        .order('created_at', { ascending: false })
      fail(error)
      return (data ?? []) as ProfessionalMedia[]
    },
  })
}

export type NewMedia =
  | { kind: 'foto'; file: File; caption: string }
  | { kind: 'video'; file: File; caption: string }
  | { kind: 'link'; ref: VideoRef; caption: string }

function videoExtension(type: string): string {
  return type === 'video/webm' ? 'webm' : type === 'video/quicktime' ? 'mov' : 'mp4'
}

/** Envia uma foto ou vídeo (ou guarda o link) na galeria do profissional logado. */
export function useAddMedia() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const proId = session?.user.id
  return useMutation({
    mutationFn: async (input: NewMedia) => {
      if (!proId) throw new Error('Sua sessão expirou. Entre de novo.')
      const caption = input.caption.trim()
      if (input.kind === 'link') {
        fail(
          (
            await supabase.from('professional_media').insert({
              professional_id: proId,
              kind: 'link',
              provider: input.ref.provider,
              external_id: input.ref.id,
              caption,
            })
          ).error,
        )
        return
      }

      let blob: Blob = input.file
      let contentType = input.file.type
      let ext = 'jpg'
      if (input.kind === 'foto') {
        blob = await toGalleryJpeg(input.file)
        contentType = 'image/jpeg'
      } else {
        if (!VIDEO_TYPES.includes(input.file.type)) throw new Error('Envie o vídeo em MP4, MOV ou WebM.')
        if (input.file.size > VIDEO_MAX_BYTES) {
          throw new Error('O vídeo passou de 50 MB. Envie um trecho mais curto ou coloque o link do YouTube.')
        }
        ext = videoExtension(input.file.type)
      }

      const path = `${proId}/${Date.now()}.${ext}`
      fail(
        (await supabase.storage.from(PORTFOLIO_BUCKET).upload(path, blob, { contentType, cacheControl: '31536000' })).error,
      )
      const { error } = await supabase
        .from('professional_media')
        .insert({ professional_id: proId, kind: input.kind, storage_path: path, caption })
      if (error) {
        await supabase.storage.from(PORTFOLIO_BUCKET).remove([path]) // não deixa arquivo sem uso
        fail(error)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professional_media', proId] }),
  })
}

export function useDeleteMedia() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const proId = session?.user.id
  return useMutation({
    mutationFn: async (item: ProfessionalMedia) => {
      fail((await supabase.from('professional_media').delete().eq('id', item.id)).error)
      // O arquivo só sai depois que a galeria já não aponta para ele.
      if (item.storage_path) await supabase.storage.from(PORTFOLIO_BUCKET).remove([item.storage_path])
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professional_media', proId] }),
  })
}

export function useUpdateCaption() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const proId = session?.user.id
  return useMutation({
    mutationFn: async ({ id, caption }: { id: string; caption: string }) =>
      fail((await supabase.from('professional_media').update({ caption: caption.trim() }).eq('id', id)).error),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professional_media', proId] }),
  })
}

// ---------------------------------------------------------------------------
// Avaliações
// ---------------------------------------------------------------------------

export function useProReviews(proId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['professional_reviews', proId],
    enabled: Boolean(proId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_reviews')
        .select('*')
        .eq('professional_id', proId!)
        .order('created_at', { ascending: false })
        .limit(50)
      fail(error)
      return (data ?? []) as ProfessionalReview[]
    },
  })
}

/**
 * A pessoa logada pode avaliar este profissional? (já compartilhou a rotina
 * com ele, mesmo que tenha parado). O banco confere de novo ao salvar.
 */
export function useCanReview(proId: string | undefined, enabled = true) {
  const { session, profile } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['can_review', userId, proId],
    enabled: Boolean(proId && userId) && profile?.role === 'person' && enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('shares')
        .select('id', { count: 'exact', head: true })
        .eq('person_id', userId!)
        .eq('professional_id', proId!)
      fail(error)
      return (count ?? 0) > 0
    },
  })
}

function invalidateReviews(qc: ReturnType<typeof useQueryClient>, proId: string) {
  qc.invalidateQueries({ queryKey: ['professional_reviews', proId] })
  // Nota e total aparecem no perfil e no catálogo
  qc.invalidateQueries({ queryKey: ['professionals'] })
}

export function useSaveReview() {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      proId,
      rating,
      comment,
      existingId,
    }: {
      proId: string
      rating: number
      comment: string
      existingId?: string
    }) => {
      if (!session) throw new Error('Sua sessão expirou. Entre de novo.')
      const res = existingId
        ? await supabase.from('professional_reviews').update({ rating, comment: comment.trim() }).eq('id', existingId)
        : await supabase
            .from('professional_reviews')
            .insert({ professional_id: proId, person_id: session.user.id, rating, comment: comment.trim() })
      fail(res.error)
    },
    onSuccess: (_d, v) => invalidateReviews(qc, v.proId),
  })
}

export function useDeleteReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; proId: string }) =>
      fail((await supabase.from('professional_reviews').delete().eq('id', id)).error),
    onSuccess: (_d, v) => invalidateReviews(qc, v.proId),
  })
}
