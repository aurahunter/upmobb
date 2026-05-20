import {
  listarContratos,
  obterContrato,
  criarContrato,
  obterModelosDisponiveis,
  obterStatusOpcoes,
  STATUS_LABEL,
} from './contracts.requests.js';

const estado = {
  busca: '',
  status: '',
  ordenarPor: 'contratanteNome',
  direcao: 'asc',
  pagina: 1,
  porPagina: 8,
  carregando: false,
  erro: null,
  resultado: null,
};

const elementos = {};

function $(id) {
  return document.getElementById(id);
}

function formatarData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderizarPrevia(paragrafos) {
  const frag = document.createDocumentFragment();
  let i = 0;

  while (i < paragrafos.length) {
    const linha = paragrafos[i];

    if (linha.trim().startsWith('-')) {
      const ul = document.createElement('ul');
      while (i < paragrafos.length && paragrafos[i].trim().startsWith('-')) {
        const itens = paragrafos[i].split('\n').filter((l) => l.trim().startsWith('-'));
        for (const item of itens.length ? itens : [paragrafos[i]]) {
          const li = document.createElement('li');
          li.innerHTML = formatarTextoInline(item.replace(/^\s*-\s*/, ''));
          ul.appendChild(li);
        }
        i += 1;
      }
      frag.appendChild(ul);
      continue;
    }

    const bloco = linha.split('\n');
    const listas = [];
    const textos = [];

    for (const b of bloco) {
      if (b.trim().startsWith('-')) listas.push(b);
      else textos.push(b);
    }

    if (textos.join('').trim()) {
      const p = document.createElement('p');
      p.innerHTML = formatarTextoInline(textos.join(' '));
      frag.appendChild(p);
    }

    if (listas.length) {
      const ul = document.createElement('ul');
      for (const item of listas) {
        const li = document.createElement('li');
        li.innerHTML = formatarTextoInline(item.replace(/^\s*-\s*/, ''));
        ul.appendChild(li);
      }
      frag.appendChild(ul);
    }

    i += 1;
  }

  return frag;
}

function formatarTextoInline(texto) {
  const esc = document.createElement('div');
  esc.textContent = texto;
  let html = esc.innerHTML;
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return html;
}

function classeStatus(status) {
  return `status status--${status}`;
}

async function carregarLista() {
  estado.carregando = true;
  estado.erro = null;
  renderizarConteudo();

  try {
    estado.resultado = await listarContratos({
      busca: estado.busca,
      status: estado.status,
      ordenarPor: estado.ordenarPor,
      direcao: estado.direcao,
      pagina: estado.pagina,
      porPagina: estado.porPagina,
    });
  } catch (e) {
    estado.erro = e.message || 'Erro ao carregar.';
    estado.resultado = null;
  } finally {
    estado.carregando = false;
    renderizarConteudo();
    atualizarPaginacao();
  }
}

function indicadorOrdem(col) {
  if (estado.ordenarPor !== col) return '↕';
  return estado.direcao === 'asc' ? '↑' : '↓';
}

function renderizarTabela(itens) {
  const wrap = document.createElement('div');
  wrap.className = 'tabela-wrap';

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th class="ordenavel" data-col="modelo">Modelo <span class="indicador-ordem">${indicadorOrdem('modelo')}</span></th>
        <th class="ordenavel ordenavel--ativa" data-col="contratanteNome">Contratante <span class="indicador-ordem">${indicadorOrdem('contratanteNome')}</span></th>
        <th class="ordenavel" data-col="documento">Documento <span class="indicador-ordem">${indicadorOrdem('documento')}</span></th>
        <th>Endereço</th>
        <th class="ordenavel" data-col="status">Status <span class="indicador-ordem">${indicadorOrdem('status')}</span></th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const thead = table.querySelector('thead');
  thead.querySelectorAll('.ordenavel').forEach((th) => {
    if (th.dataset.col === estado.ordenarPor) th.classList.add('ordenavel--ativa');
    else th.classList.remove('ordenavel--ativa');
  });

  const tbody = table.querySelector('tbody');
  for (const c of itens) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(c.modelo)}</td>
      <td>${escapeHtml(c.contratanteNome)}</td>
      <td>${escapeHtml(c.documento)}</td>
      <td>${escapeHtml(c.enderecoResumo)}</td>
      <td><span class="${classeStatus(c.status)}">${escapeHtml(STATUS_LABEL[c.status] || c.status)}</span></td>
      <td class="acoes">
        <button type="button" class="btn btn--link" data-acao="detalhes" data-id="${c.id}">Detalhes</button>
        <button type="button" class="btn btn--link" data-acao="previa" data-id="${c.id}">Prévia</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  wrap.appendChild(table);
  return wrap;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

function renderizarConteudo() {
  const area = elementos.areaConteudo;
  area.innerHTML = '';

  if (estado.carregando) {
    area.innerHTML = `
      <div class="estado estado--carregando">
        <div class="spinner" aria-hidden="true"></div>
        <p>Carregando contratos...</p>
      </div>`;
    elementos.paginacao.hidden = true;
    return;
  }

  if (estado.erro) {
    const div = document.createElement('div');
    div.className = 'estado estado--erro';
    div.innerHTML = `<p>${escapeHtml(estado.erro)}</p>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--primario';
    btn.textContent = 'Tentar novamente';
    btn.addEventListener('click', () => carregarLista());
    div.appendChild(btn);
    area.appendChild(div);
    elementos.paginacao.hidden = true;
    return;
  }

  const itens = estado.resultado?.itens ?? [];
  if (!itens.length) {
    area.innerHTML = `
      <div class="estado">
        <p>Nenhum contrato encontrado.</p>
        <p style="font-size:0.9rem;color:var(--cor-texto-suave)">Ajuste a busca ou o filtro de status.</p>
      </div>`;
    elementos.paginacao.hidden = true;
    return;
  }

  area.appendChild(renderizarTabela(itens));
  elementos.paginacao.hidden = false;
}

function atualizarPaginacao() {
  const r = estado.resultado;
  if (!r || estado.carregando || estado.erro) {
    elementos.paginacao.hidden = true;
    return;
  }

  const { total, pagina, totalPaginas, porPagina } = r;
  const inicio = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const fim = Math.min(pagina * porPagina, total);

  elementos.paginacaoInfo.textContent =
    `Exibindo ${inicio}–${fim} de ${total} · Página ${pagina} de ${totalPaginas}`;

  elementos.btnAnterior.disabled = pagina <= 1;
  elementos.btnProxima.disabled = pagina >= totalPaginas;
  elementos.paginacao.hidden = total === 0;
}

function alternarOrdenacao(col) {
  if (estado.ordenarPor === col) {
    estado.direcao = estado.direcao === 'asc' ? 'desc' : 'asc';
  } else {
    estado.ordenarPor = col;
    estado.direcao = 'asc';
  }
  estado.pagina = 1;
  carregarLista();
}

function abrirModal(id) {
  $(`modal-${id}`).hidden = false;
}

function fecharModal(id) {
  $(`modal-${id}`).hidden = true;
}

async function mostrarDetalhes(id) {
  const corpo = $('corpo-detalhes');
  corpo.innerHTML = '<p class="estado estado--carregando">Carregando...</p>';
  abrirModal('detalhes');

  try {
    const c = await obterContrato(id);
    corpo.innerHTML = `
      <dl>
        <div><dt>Modelo</dt><dd>${escapeHtml(c.modelo)}</dd></div>
        <div><dt>Contratante</dt><dd>${escapeHtml(c.contratanteNome)}</dd></div>
        <div><dt>Documento</dt><dd>${escapeHtml(c.tipoDocumento)} — ${escapeHtml(c.documento)}</dd></div>
        <div><dt>Endereço completo</dt><dd>${escapeHtml(c.enderecoCompleto)}</dd></div>
        <div><dt>Status</dt><dd><span class="${classeStatus(c.status)}">${escapeHtml(STATUS_LABEL[c.status])}</span></dd></div>
        <div><dt>Data de criação</dt><dd>${escapeHtml(formatarData(c.criadoEm))}</dd></div>
        <div><dt>E-mail do contratante</dt><dd>${escapeHtml(c.email)}</dd></div>
      </dl>`;
  } catch (e) {
    corpo.innerHTML = `<p class="estado estado--erro">${escapeHtml(e.message)}</p>`;
  }
}

async function mostrarPrevia(id) {
  const corpo = $('corpo-previa');
  corpo.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'estado';
  p.textContent = 'Carregando prévia...';
  corpo.appendChild(p);
  abrirModal('previa');

  try {
    const c = await obterContrato(id);
    corpo.innerHTML = '';
    corpo.appendChild(renderizarPrevia(c.previaParagrafos || []));
  } catch (e) {
    corpo.innerHTML = `<p class="estado estado--erro">${escapeHtml(e.message)}</p>`;
  }
}

const regrasValidacao = {
  modelo: (v) => (v ? '' : 'Selecione o modelo.'),
  contratanteNome: (v) => (v.trim() ? '' : 'Informe o nome do contratante.'),
  tipoDocumento: (v) => (v ? '' : 'Selecione o tipo de documento.'),
  documento: (v) => (v.trim() ? '' : 'Informe o documento.'),
  email: (v) => {
    if (!v.trim()) return 'Informe o e-mail.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'E-mail inválido.';
    return '';
  },
  cep: (v) => (v.trim() ? '' : 'Informe o CEP.'),
  endereco: (v) => (v.trim() ? '' : 'Informe o endereço.'),
  numero: (v) => (v.trim() ? '' : 'Informe o número.'),
  bairro: (v) => (v.trim() ? '' : 'Informe o bairro.'),
  cidade: (v) => (v.trim() ? '' : 'Informe a cidade.'),
  uf: (v) => {
    if (!v.trim()) return 'Informe a UF.';
    if (v.trim().length !== 2) return 'UF deve ter 2 letras.';
    return '';
  },
};

function limparErrosFormulario() {
  document.querySelectorAll('#form-criar .campo').forEach((el) => el.classList.remove('campo--erro'));
  document.querySelectorAll('#form-criar [data-erro]').forEach((el) => {
    el.hidden = true;
    el.textContent = '';
  });
}

function mostrarErroCampo(nome, msg) {
  const campo = document.querySelector(`#form-criar [name="${nome}"]`)?.closest('.campo');
  const span = document.querySelector(`#form-criar [data-erro="${nome}"]`);
  if (campo) campo.classList.add('campo--erro');
  if (span) {
    span.textContent = msg;
    span.hidden = !msg;
  }
}

function validarFormulario(form) {
  limparErrosFormulario();
  const dados = Object.fromEntries(new FormData(form));
  let valido = true;

  for (const [nome, regra] of Object.entries(regrasValidacao)) {
    const msg = regra(dados[nome] ?? '');
    if (msg) {
      mostrarErroCampo(nome, msg);
      valido = false;
    }
  }

  return { valido, dados };
}

function preencherSelectStatus() {
  const select = $('filtro-status');
  for (const { valor, rotulo } of obterStatusOpcoes()) {
    const opt = document.createElement('option');
    opt.value = valor;
    opt.textContent = rotulo;
    select.appendChild(opt);
  }
}

function preencherSelectModelos() {
  const select = $('campo-modelo');
  const vazio = document.createElement('option');
  vazio.value = '';
  vazio.textContent = 'Selecione';
  select.appendChild(vazio);
  for (const m of obterModelosDisponiveis()) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  }
}

let debounceBusca;
function configurarEventos() {
  $('busca').addEventListener('input', (e) => {
    clearTimeout(debounceBusca);
    debounceBusca = setTimeout(() => {
      estado.busca = e.target.value;
      estado.pagina = 1;
      carregarLista();
    }, 350);
  });

  $('filtro-status').addEventListener('change', (e) => {
    estado.status = e.target.value;
    estado.pagina = 1;
    carregarLista();
  });

  $('btn-recarregar').addEventListener('click', () => carregarLista());

  $('btn-pagina-anterior').addEventListener('click', () => {
    if (estado.pagina > 1) {
      estado.pagina -= 1;
      carregarLista();
    }
  });

  $('btn-pagina-proxima').addEventListener('click', () => {
    const total = estado.resultado?.totalPaginas ?? 1;
    if (estado.pagina < total) {
      estado.pagina += 1;
      carregarLista();
    }
  });

  elementos.areaConteudo.addEventListener('click', (e) => {
    const th = e.target.closest('th.ordenavel');
    if (th?.dataset.col) {
      alternarOrdenacao(th.dataset.col);
      return;
    }

    const btn = e.target.closest('[data-acao]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.acao === 'detalhes') mostrarDetalhes(id);
    if (btn.dataset.acao === 'previa') mostrarPrevia(id);
  });

  $('btn-novo-contrato').addEventListener('click', () => {
    $('form-criar').reset();
    limparErrosFormulario();
    abrirModal('criar');
  });

  document.querySelectorAll('[data-fechar-modal]').forEach((btn) => {
    btn.addEventListener('click', () => fecharModal(btn.dataset.fecharModal));
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.hidden = true;
    });
  });

  $('form-criar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { valido, dados } = validarFormulario(e.target);
    if (!valido) return;

    const overlay = $('overlay-salvando');
    const btnSalvar = $('btn-salvar');
    overlay.hidden = false;
    btnSalvar.disabled = true;

    try {
      await criarContrato({
        modelo: dados.modelo,
        contratanteNome: dados.contratanteNome.trim(),
        tipoDocumento: dados.tipoDocumento,
        documento: dados.documento.trim(),
        email: dados.email.trim(),
        cep: dados.cep.trim(),
        endereco: dados.endereco.trim(),
        numero: dados.numero.trim(),
        bairro: dados.bairro.trim(),
        cidade: dados.cidade.trim(),
        uf: dados.uf.trim().toUpperCase(),
      });
      fecharModal('criar');
      estado.pagina = 1;
      await carregarLista();
    } catch (err) {
      alert(err.message || 'Não foi possível salvar o contrato.');
    } finally {
      overlay.hidden = true;
      btnSalvar.disabled = false;
    }
  });
}

function init() {
  elementos.areaConteudo = $('area-conteudo');
  elementos.paginacao = $('paginacao');
  elementos.paginacaoInfo = $('paginacao-info');
  elementos.btnAnterior = $('btn-pagina-anterior');
  elementos.btnProxima = $('btn-pagina-proxima');

  preencherSelectStatus();
  preencherSelectModelos();
  configurarEventos();
  carregarLista();
}

init();
