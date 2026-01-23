// Script inline para carregar tema antes do render (evita flash azul)
export default function TemaScript() {
  return (
    <>
      {/* Estilo crítico inline para esconder conteúdo até tema carregar */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html { visibility: hidden; }
            html.tema-carregado { visibility: visible; }
          `,
        }}
      />
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
    
    // Marcar tema como carregado
    document.documentElement.classList.add('tema-carregado');
  }

  // Tentar carregar do cache primeiro (síncrono - mais rápido)
  let temaAplicado = false;
  try {
    const cachedTema = localStorage.getItem('tema_cache');
    const cacheTime = localStorage.getItem('tema_cache_time');
    
    // Se tem cache e não é muito antigo (menos de 5 minutos), usar IMEDIATAMENTE
    if (cachedTema && cacheTime && (Date.now() - parseInt(cacheTime)) < 300000) {
      try {
        const tema = JSON.parse(cachedTema);
        applyTema(tema);
        temaAplicado = true;
      } catch(e) {
        // Se cache inválido, remover
        localStorage.removeItem('tema_cache');
        localStorage.removeItem('tema_cache_time');
      }
    }
  } catch(e) {}

  // Se não aplicou do cache, buscar do servidor de forma assíncrona mas com timeout
  if (!temaAplicado) {
    let timeoutId = setTimeout(function() {
      // Timeout de segurança: mostrar conteúdo mesmo se não carregou tema (após 500ms)
      document.documentElement.classList.add('tema-carregado');
    }, 500); // 500ms de timeout máximo para evitar flash azul
    
    fetch('/api/tema?t=' + Date.now(), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
      .then(res => res.json())
      .then(data => {
        clearTimeout(timeoutId);
        if (data.tema) {
          applyTema(data.tema);
        }
        // Mostrar conteúdo após aplicar tema
        document.documentElement.classList.add('tema-carregado');
      })
      .catch(() => {
        clearTimeout(timeoutId);
        // Se falhar, mostrar conteúdo mesmo assim (evita ficar travado)
        document.documentElement.classList.add('tema-carregado');
      });
  } else {
    // Se já aplicou do cache, mostrar imediatamente
    document.documentElement.classList.add('tema-carregado');
    
    // Atualizar tema do servidor em background (para sincronizar mudanças)
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
  }
})();
        `.trim(),
        }}
      />
    </>
  )
}
