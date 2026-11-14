// Teste rápido do app publicado: confere se as páginas e os arquivos do PWA respondem.
// Uso: npm run smoke -- https://seu-app.vercel.app

const base = (process.argv[2] || '').replace(/\/$/, '')
if (!/^https?:\/\//.test(base)) {
  console.error('Informe o endereço: npm run smoke -- https://seu-app.vercel.app')
  process.exit(1)
}

const checks = [
  { path: '/', expect: 'text/html', contains: '<div id="root">' },
  // Links diretos precisam abrir o app (e não um 404) graças ao rewrite do vercel.json
  { path: '/entrar', expect: 'text/html', contains: '<div id="root">' },
  { path: '/saude/perto', expect: 'text/html', contains: '<div id="root">' },
  { path: '/pro/pacientes/qualquer-id', expect: 'text/html', contains: '<div id="root">' },
  { path: '/manifest.webmanifest', expect: 'manifest', contains: '"Skyro"' },
  { path: '/sw.js', expect: 'javascript', contains: 'workbox' },
  { path: '/pwa-512.png', expect: 'image/png' },
]

let failed = 0
for (const c of checks) {
  try {
    const res = await fetch(base + c.path, { redirect: 'follow' })
    const type = res.headers.get('content-type') || ''
    const body = c.contains ? await res.text() : ''
    const ok = res.ok && type.includes(c.expect) && (!c.contains || body.includes(c.contains))
    console.log(`${ok ? '✓' : '✗'} ${c.path}  (${res.status}, ${type.split(';')[0]})`)
    if (!ok) failed++
  } catch (e) {
    console.log(`✗ ${c.path}  (${e.message})`)
    failed++
  }
}

// O build precisa ter recebido as variáveis do Supabase; sem elas o app mostra "Falta configurar".
try {
  const html = await (await fetch(base + '/')).text()
  const js = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1]
  const bundle = js ? await (await fetch(base + js)).text() : ''
  const hasUrl = /https:\/\/[a-z0-9]+\.supabase\.co/.test(bundle)
  console.log(`${hasUrl ? '✓' : '✗'} variáveis do Supabase embutidas no build`)
  if (!hasUrl) failed++
} catch (e) {
  console.log(`✗ não deu para conferir o bundle (${e.message})`)
  failed++
}

console.log(failed ? `\n${failed} verificação(ões) falharam.` : '\nTudo certo.')
process.exit(failed ? 1 : 0)
