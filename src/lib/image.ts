// Prepara a foto de perfil no próprio aparelho: recorta o quadrado do centro e
// reduz para 512 px em JPEG. Assim o envio é leve (dezenas de kB) e os dados
// extras do arquivo original (como o local onde a foto foi tirada) não sobem.

import { squareCrop } from './profile'

export const AVATAR_SIZE = 512

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não deu para abrir essa imagem. Tente outra.'))
    }
    img.src = url
  })
}

export async function toAvatarJpeg(file: Blob): Promise<Blob> {
  const img = await loadImage(file)
  const { sx, sy, side } = squareCrop(img.naturalWidth, img.naturalHeight)
  if (side < 64) throw new Error('A imagem é pequena demais. Use uma com pelo menos 64 px.')
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Seu navegador não conseguiu preparar a imagem.')
  ctx.fillStyle = '#ffffff' // PNG com fundo transparente vira fundo branco
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)
  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não deu para preparar a imagem.'))), 'image/jpeg', 0.85),
  )
}

/** Lado maior das fotos da galeria do profissional. */
export const GALLERY_MAX_SIDE = 1600

/**
 * Prepara uma foto da galeria: mantém o formato, reduz para no máximo
 * 1600 px no lado maior e regrava em JPEG (sem o local e os dados da câmera).
 */
export async function toGalleryJpeg(file: Blob): Promise<Blob> {
  const img = await loadImage(file)
  const { naturalWidth: w, naturalHeight: h } = img
  if (Math.min(w, h) < 200) throw new Error('A foto é pequena demais. Use uma com pelo menos 200 px.')
  const scale = Math.min(1, GALLERY_MAX_SIDE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Seu navegador não conseguiu preparar a imagem.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não deu para preparar a imagem.'))), 'image/jpeg', 0.85),
  )
}
