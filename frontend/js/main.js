const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html";
}

const API = "http://127.0.0.1:8000/api";

// Função para requisições com autenticação
async function fazerRequisicao(caminho, opcoes = {}) {
    const token = localStorage.getItem("token");

    if (!opcoes.headers) {
        opcoes.headers = {};
    }

    if (token) {
        opcoes.headers["Authorization"] = `Token ${token}`;
    }

    const response = await fetch(API + caminho, opcoes);

    if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
    }

    return response;
}

window.fazerRequisicao = fazerRequisicao;

// IDs de edição e cache local temporário
let funcionarioEditandoId = null;
let manutencaoEditandoId = null;
let abastecimentoEditandoId = null;
let currentFuncionarioFilter = null;

let veiculosCache = [];
let funcionariosCache = [];
let ocorrenciasCache = [];
let equipesCache = [];
let prioridadesCache = [];
let statusCache = [];
let equipeMedicaCache = [];

// Gerenciamento de Cliques no Menu Lateral
document.querySelectorAll(".sidebar-nav-main a, .sidebar-submenu a").forEach(link => {
  link.onclick = (e) => {
    e.preventDefault();
    const isSubmenu = link.closest(".sidebar-submenu");
    const target = link.getAttribute("data-target");

    if (isSubmenu) {
      currentFuncionarioFilter = link.getAttribute("data-filter");
      document.querySelectorAll(".sidebar-submenu a").forEach(s => s.classList.toggle("active", s === link));
      
      const parent = document.querySelector('[data-target="funcionariosPage"]');
      if (parent) {
        document.querySelectorAll(".sidebar-nav-main a:not(.sidebar-submenu a)").forEach(l => l.classList.remove("active"));
        parent.classList.add("active");
      }
      mostrarPagina("funcionariosPage");
    } else {
      if (target === "funcionariosPage") {
        currentFuncionarioFilter = null;
        document.querySelectorAll(".sidebar-submenu a").forEach(s => s.classList.remove("active"));
      }
      mostrarPagina(target);
    }
  };
});

// Navegação entre telas SPA
function mostrarPagina(idPagina) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === idPagina));
  
  document.querySelectorAll(".sidebar-nav-main a:not(.sidebar-submenu a)").forEach(link => {
    link.classList.toggle("active", link.getAttribute("data-target") === idPagina);
  });

  const submenu = document.getElementById("funcionariosSubmenu");
  if (submenu) {
    submenu.classList.toggle("open", idPagina === "funcionariosPage");
  }

  carregarDadosPagina(idPagina);
}

// Mapeamento e controle dos painéis de detalhes deslizantes
const panelMap = {
  veiculos:     { sidebar: 'veiculosSidebar',     detail: 'veiculosDetail' },
  funcionarios: { sidebar: 'funcionariosSidebar', detail: 'funcionariosDetail' },
  ocorrencias:  { sidebar: 'ocorrenciasSidebar',  detail: 'ocorrenciasDetail' },
  equipeMedica: { sidebar: 'equipeMedicaSidebar', detail: 'equipeMedicaDetail' }
};

function mostrarDetalhes(secao) {
  const map = panelMap[secao];
  if (map) {
    document.getElementById(map.sidebar)?.classList.add('hidden');
    document.getElementById(map.detail)?.classList.remove('hidden');
  }
}

function fecharDetalhes(secao) {
  const map = panelMap[secao];
  if (map) {
    document.getElementById(map.detail)?.classList.add('hidden');
    document.getElementById(map.sidebar)?.classList.remove('hidden');
  }
}

// Inicialização e controle do Tema (Dark Mode)
function initTheme() {
  const saved = localStorage.getItem('medfleet-theme');
  const isLight = saved === 'light';
  document.documentElement.classList.toggle('dark', !isLight);
  const toggle = document.getElementById('themeToggleSwitch');
  if (toggle) toggle.checked = !isLight;
}

const themeToggle = document.getElementById('themeToggleSwitch');
if (themeToggle) {
  themeToggle.onchange = () => {
    const isDark = themeToggle.checked;
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('medfleet-theme', isDark ? 'dark' : 'light');
  };
}
initTheme();

// Preenchimento de Selects Dinâmicos (Substitui os autocompletes)
function preencherSelect(idSelect, itens, textoPadrao, obterValor, obterTexto) {
  const select = document.getElementById(idSelect);
  if (!select) return;
  select.innerHTML = `<option value="">${textoPadrao}</option>`;
  itens.forEach(item => {
    const opcao = document.createElement("option");
    opcao.value = obterValor(item);
    opcao.textContent = obterTexto(item);
    select.appendChild(opcao);
  });
}

window.preencherSelect = preencherSelect;

const obterValorInput = (id) => document.getElementById(id).value;

function carregarDadosPagina(idPagina) {
  if (idPagina === "dashboardPage") carregarDashboard();
  if (idPagina === "veiculosPage") carregarVeiculos();
  if (idPagina === "funcionariosPage") carregarFuncionarios(currentFuncionarioFilter);
  if (idPagina === "ocorrenciasPage") carregarOcorrencias();
  if (idPagina === "manutencoesPage") carregarManutencoes();
  if (idPagina === "abastecimentosPage") carregarAbastecimentos();
  if (idPagina === "equipeMedicaPage") carregarEquipes();
}

// Inicialização ao carregar a página
document.addEventListener("DOMContentLoaded", async () => {
  await carregarCacheFuncionarios();
  carregarDashboard();

  const logoutBtn = document.getElementById("logoutLink");
  if (logoutBtn) {
    logoutBtn.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      window.location.href = "login.html";
    };
  }

  inicializarToggleInferiorSidebar();
});

// Painel inferior da Sidebar Retrátil
function inicializarToggleInferiorSidebar() {
  const btn = document.getElementById("sidebarBottomToggleBtn");
  const content = document.getElementById("sidebarBottomContent");
  const icon = document.getElementById("sidebarBottomToggleIcon");
  const label = document.getElementById("sidebarBottomToggleLabel");
  if (!btn || !content || !icon) return;

  const toggle = (collapsed) => {
    content.classList.toggle("collapsed", collapsed);
    icon.classList.toggle("ph-caret-up", collapsed);
    icon.classList.toggle("ph-caret-down", !collapsed);
    if (label) label.style.display = collapsed ? "" : "none";
    localStorage.setItem("medfleet_sidebar_bottom_collapsed", collapsed);
  };

  toggle(localStorage.getItem("medfleet_sidebar_bottom_collapsed") === "true");
  btn.onclick = () => toggle(!content.classList.contains("collapsed"));
}

// Sistema de Alertas Visuais (Toast)
function mostrarToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icons = {
    success: "ph-check-circle",
    warning: "ph-warning-circle",
    error: "ph-x-circle",
    info: "ph-info",
    emergency: "ph-x-circle"
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="ph ${icons[type] || icons.success}"></i></div>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

window.mostrarToast = mostrarToast;

const COD_DISPONIVEL = "DISPONIVEL";

function numId(valor) {
  return valor === null? null : Number(valor);
}

function getDispCodigo(disponibilidadeId) {
  const disp = (disponibilidadesCache || []).find(d => numId(d.id) === numId(disponibilidadeId));
  return disp?.codigo ?? "";
}

function getEquipeById(equipeId) {
  return (equipesCache || []).find(e => numId(e.id) === numId(equipeId)) ?? null;
}

function funcionarioElegivelParaEquipe(funcionario, equipeEditandoId = null) {
  if (!funcionario) return false;
  const equipeAtual = numId(funcionario.equipe_atribuida);
  if (equipeEditandoId && equipeAtual === numId(equipeEditandoId)) return true;
  if (equipeAtual !== null) return false;
  return getDispCodigo(funcionario.disponibilidade) === COD_DISPONIVEL;
}

function veiculoElegivelParaEquipe(veiculo, equipeEditandoId = null) {
  if (!veiculo) return false;
  const equipeAtual = numId(veiculo.equipe_atribuida);
  if (equipeEditandoId && equipeAtual === numId(equipeEditandoId)) return true;
  if (equipeAtual !== null) return false;
  return getDispCodigo(veiculo.disponibilidade) === COD_DISPONIVEL;
}

function equipeElegivelParaOcorrencia(equipe, ocorrenciaEditandoId = null) {
  if (!equipe) return false;
  if (getDispCodigo(equipe.disponibilidade) !== COD_DISPONIVEL) return false;
  const ativa = (ocorrenciasCache || []).some(o => {
    if (ocorrenciaEditandoId && numId(o.id) === numId(ocorrenciaEditandoId)) return false;
    if (numId(o.equipe) !== numId(equipe.id)) return false;
    const cod = (statusCache || []).find(s => numId(s.id) === numId(o.status))?.codigo ?? "";
    return cod === "AGUARDANDO" || cod === "EM_ATENDIMENTO";
  });
  return !ativa;
}

function renderBadgeEquipeHtml(equipeNome) {
  if (!equipeNome) return "";
  return `<span class="status-badge badge-equipe"><i class="ph ph-users-four"></i> ${equipeNome}</span>`;
}

function classeBadgePorCodigo(codigo) {
  const map = {
    DISPONIVEL:    "badge-available",
    INDISPONIVEL:  "badge-maintenance",
    EM_ROTA:       "badge-route",
    ATENDENDO:     "badge-route",
    EM_MANUTENCAO: "badge-maintenance",
  };
  return map[codigo] ?? "badge-available";
}

function iconeBadgePorCodigo(codigo) {
  const map = {
    DISPONIVEL:    "ph-check-circle",
    INDISPONIVEL:  "ph-wrench",
    EM_ROTA:       "ph-navigation-arrow",
    ATENDENDO:     "ph-first-aid",
    EM_MANUTENCAO: "ph-wrench",
  };
  return map[codigo] ?? "ph-check-circle";
}

window.numId = numId;
window.getDispCodigo = getDispCodigo;
window.getEquipeById = getEquipeById;
window.funcionarioElegivelParaEquipe = funcionarioElegivelParaEquipe;
window.veiculoElegivelParaEquipe = veiculoElegivelParaEquipe;
window.equipeElegivelParaOcorrencia = equipeElegivelParaOcorrencia;
window.renderBadgeEquipeHtml = renderBadgeEquipeHtml;
window.classeBadgePorCodigo = classeBadgePorCodigo;
window.iconeBadgePorCodigo = iconeBadgePorCodigo;
