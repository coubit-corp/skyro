// Quando uma versão nova é publicada com a aba aberta, os arquivos antigos do app deixam de existir.

const RELOAD_KEY = 'skyro:recarregou-por-versao'

/** true quando o erro é um arquivo do app que não existe mais (versão nova publicada com a aba aberta). */
export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch dynamically|module script/i.test(
    message,
  )
}

/**
 * Recarrega a página uma única vez para buscar a versão nova.
 * Se já recarregou há pouco e o erro voltou, não tenta de novo (evita laço).
 */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < 30_000) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // Sem sessionStorage: recarrega mesmo assim; no pior caso aparece a tela de erro
  }
  window.location.reload()
  return true
}
