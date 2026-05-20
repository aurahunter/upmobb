export const STATUS = {
  NAO_ENVIADO: 'nao_enviado',
  AGUARDANDO_ASSINATURA: 'aguardando_assinatura',
  ASSINADO: 'assinado',
  CANCELADO: 'cancelado',
};

export const STATUS_LABEL = {
  [STATUS.NAO_ENVIADO]: 'Não enviado',
  [STATUS.AGUARDANDO_ASSINATURA]: 'Aguardando assinatura',
  [STATUS.ASSINADO]: 'Assinado',
  [STATUS.CANCELADO]: 'Cancelado',
};

const MODELOS = [
  'Prestação de Serviços',
  'Locação Residencial',
  'Compra e Venda',
  'Parceria Comercial',
  'Confidencialidade',
];

const NOMES = [
  'Ana Silva', 'Bruno Costa', 'Carla Mendes', 'Diego Alves', 'Elena Rocha',
  'Felipe Nunes', 'Gabriela Dias', 'Henrique Lima', 'Isabela Freitas', 'João Pedro',
  'Karina Souza', 'Lucas Martins', 'Mariana Teixeira', 'Nicolas Barros', 'Olivia Campos',
  'Paulo Ribeiro', 'Quésia Araújo', 'Rafael Gomes', 'Sofia Carvalho', 'Thiago Pires',
  'Úrsula Lopes', 'Vitor Cunha', 'Wagner Melo', 'Ximena Duarte', 'Yasmin Farias',
  'Zeca Oliveira', 'Amanda Rocha', 'Bernardo Lira', 'Camila Borges', 'Daniel Prado',
];

const CIDADES = [
  { cidade: 'São Paulo', uf: 'SP', bairro: 'Centro' },
  { cidade: 'Rio de Janeiro', uf: 'RJ', bairro: 'Copacabana' },
  { cidade: 'Belo Horizonte', uf: 'MG', bairro: 'Savassi' },
  { cidade: 'Curitiba', uf: 'PR', bairro: 'Batel' },
  { cidade: 'Porto Alegre', uf: 'RS', bairro: 'Moinhos' },
];

function gerarDocumento(i, tipo) {
  if (tipo === 'CNPJ') {
    const base = String(10000000 + i).padStart(8, '0');
    return `${base.slice(0, 2)}.${base.slice(2, 5)}.${base.slice(5, 8)}/${String(1000 + (i % 9000)).padStart(4, '0')}-00`;
  }
  const n = String(100000000 + i * 7919).slice(0, 9);
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${i % 10}`;
}

function previaPorModelo(modelo, contratante) {
  const map = {
    'Prestação de Serviços': [
      `Contrato de prestação de serviços entre as partes.`,
      `O contratante **${contratante}** declara ciência das cláusulas abaixo.`,
      `- Prazo de vigência conforme anexo`,
      `- Pagamento em até 30 dias`,
      `- Rescisão mediante aviso prévio`,
    ],
    'Locação Residencial': [
      `Termo de locação residencial.`,
      `Locatário: **${contratante}**.`,
      `- Valor do aluguel atualizado anualmente`,
      `- IPTU e condomínio conforme acordado`,
    ],
    default: [
      `Instrumento particular referente ao modelo **${modelo}**.`,
      `Parte contratante: **${contratante}**.`,
      `- Documentação válida em território nacional`,
      `- Foro da comarca da sede do contratante`,
    ],
  };
  return map[modelo] || map.default;
}

function criarContratoSeed(i) {
  const tipoDocumento = i % 3 === 0 ? 'CNPJ' : 'CPF';
  const nome = NOMES[i % NOMES.length];
  const modelo = MODELOS[i % MODELOS.length];
  const loc = CIDADES[i % CIDADES.length];
  const statusKeys = Object.values(STATUS);
  const status = statusKeys[i % statusKeys.length];
  const dia = String((i % 28) + 1).padStart(2, '0');
  const mes = String((i % 12) + 1).padStart(2, '0');

  return {
    id: String(i + 1),
    modelo,
    contratanteNome: nome,
    tipoDocumento,
    documento: gerarDocumento(i + 1, tipoDocumento),
    email: `${nome.split(' ')[0].toLowerCase()}.${i}@email.com`,
    cep: `${String(10000 + (i % 90000)).padStart(5, '0')}-${String(100 + (i % 900)).padStart(3, '0')}`,
    endereco: `Rua ${['das Flores', 'Brasil', 'Paulista', 'Independência'][i % 4]}`,
    numero: String(100 + (i % 800)),
    bairro: loc.bairro,
    cidade: loc.cidade,
    uf: loc.uf,
    status,
    criadoEm: `2025-${mes}-${dia}T10:${String(i % 60).padStart(2, '0')}:00`,
    previaParagrafos: previaPorModelo(modelo, nome),
  };
}

let contratos = Array.from({ length: 32 }, (_, i) => criarContratoSeed(i));

function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enderecoCompleto(c) {
  return `${c.endereco}, ${c.numero} — ${c.bairro}, ${c.cidade}/${c.uf} — CEP ${c.cep}`;
}

function normalizar(texto) {
  return (texto || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export async function listarContratos({
  busca = '',
  status = '',
  ordenarPor = 'contratanteNome',
  direcao = 'asc',
  pagina = 1,
  porPagina = 8,
} = {}) {
  await delay(500);

  let lista = [...contratos];
  const termo = normalizar(busca.trim());

  if (termo) {
    lista = lista.filter((c) => {
      const campos = [c.contratanteNome, c.documento, c.modelo].map(normalizar);
      return campos.some((v) => v.includes(termo));
    });
  }

  if (status) {
    lista = lista.filter((c) => c.status === status);
  }

  const colunasValidas = ['modelo', 'contratanteNome', 'documento', 'status', 'criadoEm'];
  const col = colunasValidas.includes(ordenarPor) ? ordenarPor : 'contratanteNome';
  const dir = direcao === 'desc' ? -1 : 1;

  lista.sort((a, b) => {
    let va = a[col];
    let vb = b[col];
    if (col === 'status') {
      va = STATUS_LABEL[a.status] || '';
      vb = STATUS_LABEL[b.status] || '';
    }
    va = normalizar(String(va));
    vb = normalizar(String(vb));
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });

  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const itens = lista.slice(inicio, inicio + porPagina).map((c) => ({
    ...c,
    enderecoResumo: enderecoCompleto(c),
  }));

  return {
    itens,
    total,
    pagina: paginaAtual,
    porPagina,
    totalPaginas,
  };
}

export async function obterContrato(id) {
  await delay(300);
  const c = contratos.find((x) => x.id === id);
  if (!c) throw new Error('Contrato não encontrado.');
  return {
    ...c,
    enderecoCompleto: enderecoCompleto(c),
  };
}

export async function criarContrato(dados) {
  await delay(600);
  const novo = {
    id: String(Date.now()),
    ...dados,
    status: STATUS.NAO_ENVIADO,
    criadoEm: new Date().toISOString(),
    previaParagrafos: previaPorModelo(dados.modelo, dados.contratanteNome),
  };
  contratos = [novo, ...contratos];
  return {
    ...novo,
    enderecoResumo: enderecoCompleto(novo),
  };
}

export function obterModelosDisponiveis() {
  return [...MODELOS];
}

export function obterStatusOpcoes() {
  return Object.entries(STATUS_LABEL).map(([valor, rotulo]) => ({ valor, rotulo }));
}
