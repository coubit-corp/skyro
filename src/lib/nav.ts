// Qual aba do menu fica ativa em cada endereço.

export interface NavMatch {
  to: string
  /** Só fica ativo no caminho exato (não nas subpáginas). */
  end?: boolean
  /** Outros começos de caminho que também ativam a aba (ex.: a ficha do paciente). */
  alsoActiveOn?: string[]
}

function startsWithPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/**
 * true se a aba deve aparecer ativa. Sem "end", vale o caminho e as subpáginas
 * ("/saude" ativa em "/saude/perto"); com "end", só o caminho exato, mais os
 * caminhos de "alsoActiveOn".
 */
export function isNavActive(pathname: string, item: NavMatch): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (item.end ? path === item.to : startsWithPath(path, item.to)) return true
  return (item.alsoActiveOn ?? []).some((prefix) => startsWithPath(path, prefix))
}
