const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html";
}

const API = "http://127.0.0.1:8000/api";

// Função para requisições com autenticação
async function fazerRequisicao(caminho, opcoes = {}) {
  const token = localStorage.getItem("token");
  if (!opcoes.headers) opcoes.headers = {};
  if (token) {
    opcoes.headers["Authorization"] = `Token ${token}`;
  }
  return fetch(API + caminho, opcoes);
}
window.fazerRequisicao = fazerRequisicao;

// IDs de edição e cache local temporário
let funcionarioEditandoId = null;
let manutencaoEditandoId = null;
let abastecimentoEditandoId = null;
let ocorrenciaEditandoId = null;
let currentFuncionarioFilter = null;

let veiculosCache = [];
let funcionariosCache = [];
let ocorrenciasCache = [
  { id: 1, titulo: "Mal súbito", prioridade: "Alta", status: "Ativa", veiculo_nome: "AMB-1020", equipe_nome: "Dr. Marcos Paulo", paciente: "João das Neves", endereco: "Av. Paulista, 1000", descricao: "Paciente inconsciente na rua.", data: "2026-05-19" },
  { id: 2, titulo: "Acidente de Trânsito", prioridade: "Crítica", status: "Em Atendimento", veiculo_nome: "HOS-4B21", equipe_nome: "Enf. Joana Silva", paciente: "Desconhecido", endereco: "Rodovia Castelo Branco, km 15", descricao: "Colisão entre dois carros.", data: "2026-05-18" }
];

let equipeEditandoId = null;
let equipesCache = [
  { id: 1, nome: "Equipe Plantão Alpha", data: "2026-05-22", turno: "Manhã", membros: [1, 3, 4], obs: "Equipe principal para atendimento de urgências do período matutino." },
  { id: 2, nome: "Equipe UTI Especial", data: "2026-05-23", turno: "Integral", membros: [2, 3, 5], obs: "Equipe de apoio para UTI Móvel." }
];
let membrosSelecionadosIds = [];

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
