// Script inline para carregar tema antes do render (evita flash azul)
export default function TemaScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  // Função para aplicar tema
  function applyTema(tema) {
    if (!tema || !tema.cores) return;
    const root = document.documentElement;
    root.style.setProperty('--tema-primaria', tema.cores.primaria);
    root.style.setProperty('--tema-secundaria', tema.cores.secundaria);
    root.style.setProperty('--tema-acento', tema.cores.acento);
    root.style.setProperty('--tema-sucesso', tema.cores.sucesso);
    root.style.setProperty('--tema-texto', tema.cores.texto);
    root.style.setProperty('--tema-texto-secundario', tema.cores.textoSecundario);
    root.style.setProperty('--tema-texto-link', tema.cores.textoLink || tema.cores.primaria);
    root.style.setProperty('--tema-texto-paragrafo', tema.cores.textoParagrafo || tema.cores.texto);
    root.style.setProperty('--tema-texto-titulo', tema.cores.textoTitulo || tema.cores.texto);
    root.style.setProperty('--tema-fundo', tema.cores.fundo);
    root.style.setProperty('--tema-fundo-secundario', tema.cores.fundoSecundario);
    
    // Salvar no localStorage para cache
    try {
      localStorage.setItem('tema_cache', JSON.stringify(tema));
      localStorage.setItem('tema_cache_time', Date.now().toString());
    } catch(e) {}
  }

  // Tentar carregar do cache primeiro (mais rápido)
  try {
    const cachedTema = localStorage.getItem('tema_cache');
    const cacheTime = localStorage.getItem('tema_cache_time');
    
    // Se tem cache e não é muito antigo (menos de 5 minutos), usar
    if (cachedTema && cacheTime && (Date.now() - parseInt(cacheTime)) < 300000) {
      const tema = JSON.parse(cachedTema);
      applyTema(tema);
    }
  } catch(e) {}

  // Carregar tema do servidor (requisição assíncrona)
  fetch('/api/tema?t=' + Date.now(), {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
    .then(res => res.json())
    .then(data => {
      if (data.tema) {
        applyTema(data.tema);
      }
    })
    .catch(() => {
      // Ignorar erros silenciosamente
    });
})();
        `.trim(),
      }}
    />
  )
}
