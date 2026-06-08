let ocorrenciaSelecionadaId = null;
let ocorrenciaEditandoId    = null;

// ─────────────────────────────────────────────────────────────────────────────
// Config visual por código de status
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG_OC = {
  AGUARDANDO:     { classe: "badge-emergency", icone: "ph-warning-circle" },
  EM_ATENDIMENTO: { classe: "badge-route",     icone: "ph-clock"          },
  FINALIZADO:     { classe: "badge-available", icone: "ph-check-circle"   }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de lookup
// ─────────────────────────────────────────────────────────────────────────────

const _statusById     = id => (statusCache      || []).find(s => s.id === id) ?? null;
const _prioridadeById = id => (prioridadesCache || []).find(p => p.id === id) ?? null;
const _equipeById     = id => (equipesCache     || []).find(e => e.id === id) ?? null;
const _veiculoById    = id => (veiculosCache    || []).find(v => v.id === id) ?? null;

// ─────────────────────────────────────────────────────────────────────────────
// Carga de dados
// ─────────────────────────────────────────────────────────────────────────────

async function carregarPrioridades() {
  try {
    const r = await fazerRequisicao("/prioridades/");
    if (!r.ok) throw new Error();
    prioridadesCache = await r.json();
  } catch { console.warn("(Prioridades) offline."); }
}

async function carregarStatus() {
  try {
    const r = await fazerRequisicao("/status/");
    if (!r.ok) throw new Error();
    statusCache = await r.json();
  } catch { console.warn("(Status) offline."); }
}

async function carregarCacheOcorrencias() {
  try {
    const r = await fazerRequisicao("/ocorrencias/");
    if (!r.ok) throw new Error();
    ocorrenciasCache = await r.json();
  } catch { console.warn("(Ocorrências) offline."); }
}

async function carregarDependenciasOcorrencias() {
  await Promise.all([
    carregarPrioridades(),
    carregarStatus(),
    typeof carregarCacheEquipes          === "function" ? carregarCacheEquipes()          : Promise.resolve(),
    typeof carregarCacheDisponibilidades === "function" ? carregarCacheDisponibilidades() : Promise.resolve(),
    typeof carregarCacheFuncionarios     === "function" ? carregarCacheFuncionarios()     : Promise.resolve(),
    typeof carregarCacheProfissionaisSaude === "function" ? carregarCacheProfissionaisSaude() : Promise.resolve(),
    typeof carregarCacheCargos           === "function" ? carregarCacheCargos()           : Promise.resolve(),
  ]);
}

async function carregarOcorrencias() {
  await carregarDependenciasOcorrencias();
  await carregarCacheOcorrencias();
  renderizarOcorrencias();
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderização da lista (card style do JS antigo)
// ─────────────────────────────────────────────────────────────────────────────

function renderizarOcorrencias() {
  const lista = document.getElementById("ocorrenciasList");
  if (!lista) return;
  lista.innerHTML = "";

  const badge = document.getElementById("badgeTotalOcorrencias");
  if (badge) badge.textContent = ocorrenciasCache.length;

  ocorrenciasCache.forEach(o => {
    const status     = _statusById(o.status);
    const prioridade = _prioridadeById(o.prioridade);
    const statusCod  = status?.codigo ?? "AGUARDANDO";
    const cfg        = STATUS_CFG_OC[statusCod] ?? STATUS_CFG_OC.AGUARDANDO;

    const titulo        = o.titulo ?? "Sem título";
    const tituloExibido = titulo.length > 22 ? titulo.slice(0, 22) + "…" : titulo;
    const data          = o.horario_chamado
      ? new Date(o.horario_chamado).toLocaleDateString("pt-BR")
      : "-";

    const cartao = document.createElement("div");
    cartao.className = "tracking-card";
    cartao.dataset.id = o.id;
    cartao.classList.toggle("selected", o.id === ocorrenciaSelecionadaId);

    cartao.innerHTML = `
      <div class="tc-header">
        <h3 style="font-size:14px;">${tituloExibido}</h3>
        <span class="status-badge ${cfg.classe}">
          <i class="ph ${cfg.icone}"></i> ${status?.nome ?? "Aguardando"}
        </span>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:10px;display:flex;flex-direction:column;gap:4px;">
        <div><i class="ph ph-calendar"></i> ${data} &nbsp;|&nbsp; <i class="ph ph-flag"></i> ${prioridade?.nome ?? "-"}</div>
        ${o.nome_paciente ? `<div><i class="ph ph-user"></i> ${o.nome_paciente}</div>` : ""}
        ${o.local_informado ? `<div><i class="ph ph-map-pin"></i> ${o.local_informado.slice(0, 35)}${o.local_informado.length > 35 ? "…" : ""}</div>` : ""}
      </div>
    `;

    cartao.onclick = () => selecionarOcorrencia(o.id);
    lista.appendChild(cartao);
  });

  fecharDetalhes("ocorrencias");
}

// ─────────────────────────────────────────────────────────────────────────────
// Painel de detalhes
// ─────────────────────────────────────────────────────────────────────────────

function selecionarOcorrencia(id) {
  ocorrenciaSelecionadaId = id;
  const o = ocorrenciasCache.find(oc => oc.id === id);
  if (!o) return;

  document.querySelectorAll("#ocorrenciasList .tracking-card").forEach(c => {
    c.classList.toggle("selected", Number(c.dataset.id) === Number(id));
  });

  const status     = _statusById(o.status);
  const prioridade = _prioridadeById(o.prioridade);
  const statusCod  = status?.codigo ?? "AGUARDANDO";
  const cfg        = STATUS_CFG_OC[statusCod] ?? STATUS_CFG_OC.AGUARDANDO;

  const el = key => document.getElementById(key);

  // ── Header ────────────────────────────────────────────────────────────────
  if (el("detailOcorrenciaTitulo"))
    el("detailOcorrenciaTitulo").textContent = o.titulo ?? "-";

  if (el("detailOcorrenciaStatus")) {
    el("detailOcorrenciaStatus").className   = `status-badge ${cfg.classe}`;
    el("detailOcorrenciaStatus").innerHTML   = `<i class="ph ${cfg.icone}"></i> ${status?.nome ?? "-"}`;
  }

  // ── Tab: Chamado ──────────────────────────────────────────────────────────
  if (el("detailOcorrenciaPrioridade"))
    el("detailOcorrenciaPrioridade").textContent = prioridade?.nome ?? "-";

  if (el("detailOcorrenciaData"))
    el("detailOcorrenciaData").textContent = o.horario_chamado
      ? new Date(o.horario_chamado).toLocaleString("pt-BR")
      : "-";

  if (el("detailOcorrenciaPacienteNome"))
    el("detailOcorrenciaPacienteNome").textContent = o.nome_paciente ?? "-";

  if (el("detailOcorrenciaPacienteTelefone"))
    el("detailOcorrenciaPacienteTelefone").textContent = o.telefone_paciente ?? "-";

  if (el("detailOcorrenciaEndereco"))
    el("detailOcorrenciaEndereco").textContent = o.local_informado ?? "-";

  if (el("detailOcorrenciaVeiculo")) {
    const veiculo = o.veiculo ? _veiculoById(o.veiculo) : null;
    el("detailOcorrenciaVeiculo").textContent = veiculo?.placa
      ?? (o.veiculo ? `#${o.veiculo}` : "Não vinculado");
  }

  if (el("detailOcorrenciaDescricao"))
    el("detailOcorrenciaDescricao").textContent = o.observacoes ?? "-";

  // ── Tab: Equipe ───────────────────────────────────────────────────────────
  _renderizarAbaEquipe(o);

  // ── Botão avançar status ──────────────────────────────────────────────────
  _atualizarBotaoStatus(el("btnResolverOcorrencia"), id, statusCod);

  // ── Editar / excluir (bloqueado se não for AGUARDANDO) ────────────────────
  const podeEditar = statusCod === "AGUARDANDO";

  if (el("btnEditOcorrencia")) {
    el("btnEditOcorrencia").disabled = !podeEditar;
    el("btnEditOcorrencia").title    = podeEditar
      ? ""
      : "Só é possível editar ocorrências ainda aguardando";
    el("btnEditOcorrencia").onclick = podeEditar ? () => editarOcorrencia(o.id) : null;
  }

  if (el("btnDeleteOcorrencia")) {
    el("btnDeleteOcorrencia").onclick = () => {
      if (confirm(`Remover a ocorrência "${o.titulo}"?`)) deletarOcorrencia(o.id);
    };
  }

  mostrarDetalhes("ocorrencias");

  // Ativar primeira aba sempre que abrir um detalhe
  const primeiraTab = document.querySelector("#ocorrenciasDetail .details-tabs .tab");
  if (primeiraTab) primeiraTab.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// Botão de avanço de status (muda conforme estado atual)
// ─────────────────────────────────────────────────────────────────────────────

function _atualizarBotaoStatus(btn, id, statusCod) {
  if (!btn) return;

  if (statusCod === "AGUARDANDO") {
    btn.innerHTML = '<i class="ph ph-play"></i> Iniciar Atendimento';
    btn.className = "btn-outline-primary";
    btn.disabled  = false;
    btn.onclick   = () => avancarStatus(id, "EM_ATENDIMENTO");

  } else if (statusCod === "EM_ATENDIMENTO") {
    btn.innerHTML = '<i class="ph ph-check-circle"></i> Finalizar';
    btn.className = "btn-outline-primary";
    btn.disabled  = false;
    btn.onclick   = () => avancarStatus(id, "FINALIZADO");

  } else {
    btn.innerHTML = '<i class="ph ph-check-circle"></i> Finalizado';
    btn.className = "btn-outline";
    btn.disabled  = true;
    btn.onclick   = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Aba Equipe — renderiza no container do painel de detalhes
// ─────────────────────────────────────────────────────────────────────────────

function _renderizarAbaEquipe(o) {
  const container = document.getElementById("detailOcorrenciaEquipeInfo");
  if (!container) return;

  const equipe = _equipeById(o.equipe);

  if (!equipe) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  padding:3rem;gap:12px;color:var(--text-muted);">
        <i class="ph ph-users-three" style="font-size:64px;"></i>
        <p style="font-size:14px;">Nenhuma equipe vinculada a esta ocorrência.</p>
      </div>`;
    return;
  }

  const condutorId = typeof equipe.condutor === "object"
    ? (equipe.condutor?.matricula ?? equipe.condutor?.id)
    : equipe.condutor;

  const veiculoId = typeof equipe.veiculo === "object"
    ? equipe.veiculo?.id
    : equipe.veiculo;

  const condutor = (funcionariosCache || []).find(f => f.matricula === condutorId);
  const veiculo  = _veiculoById(veiculoId);

  const profIds = Array.isArray(equipe.profissionais)
    ? equipe.profissionais.map(p => typeof p === "object" ? (p.matricula ?? p.id) : p)
    : [];

  const profHTML = profIds.length === 0
    ? `<span style="color:var(--text-muted);font-size:13px;">Nenhum profissional cadastrado</span>`
    : profIds.map(mat => {
        const f    = (funcionariosCache || []).find(fn => fn.matricula === mat);
        if (!f) return "";

        const prof  = typeof getProfissionalSaudeByFuncionarioId === "function"
          ? getProfissionalSaudeByFuncionarioId(mat) : null;
        const cargo = (prof && typeof getCargoById === "function")
          ? getCargoById(prof.cargo) : null;

        return `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
                      background:var(--bg-card);border:1px solid var(--border);border-radius:10px;">
            <i class="ph ph-user-circle" style="font-size:24px;color:var(--text-light);"></i>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:600;color:var(--text);">${f.nome}</div>
              <div style="font-size:12px;color:var(--text-light);">${cargo?.nome ?? "sem cargo"}</div>
            </div>
            ${cargo ? `<span class="status-badge badge-route" style="font-size:11px;">${cargo.nome}</span>` : ""}
          </div>`;
      }).join("");

  container.innerHTML = `
    <div class="vehicle-info-grid" style="margin-bottom:20px;">
      <div class="info-box">
        <p>Equipe</p>
        <h4>${equipe.nome_equipe ?? "-"}</h4>
      </div>
      <div class="info-box">
        <p>Condutor</p>
        <h4>${condutor?.nome ?? "-"}</h4>
      </div>
      <div class="info-box full-width">
        <p>Veículo</p>
        <h4>${veiculo
          ? `${veiculo.placa} — ${veiculo.marca ?? ""} ${veiculo.modelo ?? ""}`.trim()
          : "Não vinculado"}</h4>
      </div>
    </div>
    <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;
              color:var(--text-light);margin-bottom:10px;">Profissionais</p>
    <div style="display:flex;flex-direction:column;gap:8px;">${profHTML}</div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Avançar status via PATCH
// ─────────────────────────────────────────────────────────────────────────────

async function avancarStatus(id, novoCodigo) {
  const novoStatus = (statusCache || []).find(s => s.codigo === novoCodigo);
  if (!novoStatus) return mostrarToast("Status não encontrado", "error");

  try {
    const r = await fazerRequisicao(`/ocorrencias/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus.id })
    });

    if (!r.ok) {
      const err = await r.json();
      const msg = err?.non_field_errors?.[0] ?? err?.detail ?? "Erro ao avançar status";
      return mostrarToast(msg, "error");
    }

    mostrarToast("Status atualizado!", "success");
    await carregarCacheOcorrencias();
    renderizarOcorrencias();
    selecionarOcorrencia(id);

  } catch (e) {
    console.error(e);
    mostrarToast("Erro de conexão", "error");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal — selects dinâmicos
// ─────────────────────────────────────────────────────────────────────────────

function preencherSelectsOcorrencia() {
  preencherSelect("inputOcorrenciaPrioridade", prioridadesCache ?? [],
    "Selecione a prioridade…", p => p.id, p => p.nome);

  preencherSelect("inputOcorrenciaStatus", statusCache ?? [],
    "Selecione o status…", s => s.id, s => s.nome);

  // Apenas equipes disponíveis
  const disponiveis = (equipesCache ?? []).filter(e => {
    const disp = (disponibilidadesCache ?? []).find(d => d.id === e.disponibilidade);
    return !disp || disp.codigo === "DISPONIVEL";
  });

  preencherSelect("inputOcorrenciaEquipe", disponiveis,
    "Sem equipe (opcional)…", e => e.id, e => e.nome_equipe);
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal — abrir / limpar / editar / salvar / deletar
// ─────────────────────────────────────────────────────────────────────────────

function abrirModalOcorrencia() {
  ocorrenciaEditandoId = null;
  limparFormularioOcorrencia();

  // Pré-preencher com horário local atual (editável)
  const now    = new Date();
  const offset = now.getTimezoneOffset();
  const local  = new Date(now.getTime() - offset * 60000);
  const campo  = document.getElementById("inputOcorrenciaHorarioChamado");
  if (campo) campo.value = local.toISOString().slice(0, 16);

  // Pré-selecionar AGUARDANDO
  const aguardando = (statusCache ?? []).find(s => s.codigo === "AGUARDANDO");
  if (aguardando) {
    const sel = document.getElementById("inputOcorrenciaStatus");
    if (sel) sel.value = aguardando.id;
  }

  const btnSave = document.getElementById("saveOcorrencia");
  if (btnSave) btnSave.innerHTML = '<i class="ph ph-paper-plane-right"></i> Salvar Ocorrência';

  document.getElementById("ocorrenciaModal")?.classList.remove("hidden");
}

function limparFormularioOcorrencia() {
  ["inputOcorrenciaTitulo", "inputOcorrenciaPaciente", "inputOcorrenciaEndereco",
   "inputOcorrenciaDescricao", "inputOcorrenciaHorarioChamado"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  ["inputOcorrenciaPrioridade", "inputOcorrenciaStatus", "inputOcorrenciaEquipe"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = el.options[0]?.value ?? ""; el.disabled = false; }
  });

  ocorrenciaEditandoId = null;
  document.getElementById("ocorrenciaModal")?.classList.add("hidden");
}

function editarOcorrencia(id) {
  const o = ocorrenciasCache.find(oc => oc.id === id);
  if (!o) return;

  const set = (fieldId, val) => {
    const el = document.getElementById(fieldId);
    if (el) el.value = val ?? "";
  };

  set("inputOcorrenciaTitulo",    o.titulo);
  set("inputOcorrenciaPaciente",  o.nome_paciente);
  set("inputOcorrenciaEndereco",  o.local_informado);
  set("inputOcorrenciaDescricao", o.observacoes);
  set("inputOcorrenciaPrioridade", o.prioridade);
  set("inputOcorrenciaStatus",    o.status);
  set("inputOcorrenciaEquipe",    o.equipe ?? "");

  // Converter UTC → local para o input datetime-local
  if (o.horario_chamado) {
    const d      = new Date(o.horario_chamado);
    const offset = d.getTimezoneOffset();
    const local  = new Date(d.getTime() - offset * 60000);
    const campo  = document.getElementById("inputOcorrenciaHorarioChamado");
    if (campo) campo.value = local.toISOString().slice(0, 16);
  }

  // Bloquear equipe se: já saiu de AGUARDANDO OU equipe já foi vinculada
  const status         = _statusById(o.status);
  const equipeJaSet    = !!o.equipe;
  const naoAguardando  = status?.codigo !== "AGUARDANDO";
  const selectEquipe   = document.getElementById("inputOcorrenciaEquipe");
  if (selectEquipe) selectEquipe.disabled = equipeJaSet || naoAguardando;

  ocorrenciaEditandoId = id;
  const btnSave = document.getElementById("saveOcorrencia");
  if (btnSave) btnSave.innerHTML = '<i class="ph ph-pencil-simple"></i> Atualizar Ocorrência';

  document.getElementById("ocorrenciaModal")?.classList.remove("hidden");
}

async function salvarOcorrencia() {
  const titulo     = document.getElementById("inputOcorrenciaTitulo")?.value.trim();
  const prioridade = document.getElementById("inputOcorrenciaPrioridade")?.value;
  const status     = document.getElementById("inputOcorrenciaStatus")?.value;
  const local      = document.getElementById("inputOcorrenciaEndereco")?.value.trim();
  const horarioRaw = document.getElementById("inputOcorrenciaHorarioChamado")?.value;

  if (!titulo)     return mostrarToast("Informe o título da ocorrência", "warning");
  if (!prioridade) return mostrarToast("Selecione a prioridade", "warning");
  if (!status)     return mostrarToast("Selecione o status", "warning");
  if (!local)      return mostrarToast("Informe o endereço", "warning");
  if (!horarioRaw) return mostrarToast("Informe o horário do chamado", "warning");

  // Converter para ISO UTC antes de enviar
  const horario = new Date(horarioRaw).toISOString();

  const payload = {
    titulo,
    prioridade:      Number(prioridade),
    status:          Number(status),
    local_informado: local,
    horario_chamado: horario,
    nome_paciente: document.getElementById("inputOcorrenciaPaciente")?.value.trim() || null,
    observacoes:   document.getElementById("inputOcorrenciaDescricao")?.value.trim() || null
  };

  const equipeVal = document.getElementById("inputOcorrenciaEquipe")?.value;
  if (equipeVal) payload.equipe = Number(equipeVal);

  const url    = ocorrenciaEditandoId ? `/ocorrencias/${ocorrenciaEditandoId}/` : "/ocorrencias/";
  const method = ocorrenciaEditandoId ? "PUT" : "POST";

  try {
    const r = await fazerRequisicao(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const err = await r.json();
      const msg = err?.non_field_errors?.[0]
        ?? err?.detail
        ?? Object.values(err)?.[0]?.[0]
        ?? "Erro ao salvar ocorrência";
      return mostrarToast(msg, "error");
    }

    const saved   = await r.json();
    const savedId = saved.id ?? ocorrenciaEditandoId;

    limparFormularioOcorrencia();
    mostrarToast(ocorrenciaEditandoId ? "Ocorrência atualizada!" : "Ocorrência criada!", "success");

    await carregarCacheOcorrencias();
    renderizarOcorrencias();
    selecionarOcorrencia(savedId);

  } catch (e) {
    console.error(e);
    mostrarToast("Erro de conexão", "error");
  }
}

async function deletarOcorrencia(id) {
  try {
    const r = await fazerRequisicao(`/ocorrencias/${id}/`, { method: "DELETE" });
    if (!r.ok) throw new Error();
    ocorrenciaSelecionadaId = null;
    mostrarToast("Ocorrência removida", "success");
    await carregarCacheOcorrencias();
    renderizarOcorrencias();
  } catch {
    mostrarToast("Erro ao remover ocorrência", "error");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabs do painel de detalhe
// ─────────────────────────────────────────────────────────────────────────────

function initTabsOcorrencias() {
  document.querySelectorAll("#ocorrenciasDetail .details-tabs .tab").forEach(botao => {
    botao.addEventListener("click", () => {
      document.querySelectorAll("#ocorrenciasDetail .details-tabs .tab")
        .forEach(t => t.classList.remove("active"));
      document.querySelectorAll("#ocorrenciasDetail .tab-content")
        .forEach(c => { c.classList.remove("active"); c.classList.add("hidden"); });

      botao.classList.add("active");
      const alvo = document.getElementById(botao.dataset.tab);
      if (alvo) { alvo.classList.remove("hidden"); alvo.classList.add("active"); }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bindings
// ─────────────────────────────────────────────────────────────────────────────

document.getElementById("addOcorrenciaBtn")?.addEventListener("click", async () => {
  await carregarDependenciasOcorrencias();
  preencherSelectsOcorrencia();
  abrirModalOcorrencia();
});

document.getElementById("cancelOcorrencia")?.addEventListener("click",     limparFormularioOcorrencia);
document.getElementById("closeOcorrenciaModal")?.addEventListener("click", limparFormularioOcorrencia);
document.getElementById("saveOcorrencia")?.addEventListener("click",       salvarOcorrencia);

// ─────────────────────────────────────────────────────────────────────────────
// Exports globais
// ─────────────────────────────────────────────────────────────────────────────

window.carregarOcorrencias          = carregarOcorrencias;
window.carregarCacheOcorrencias     = carregarCacheOcorrencias;
window.carregarPrioridades          = carregarPrioridades;
window.carregarStatus               = carregarStatus;
window.selecionarOcorrencia         = selecionarOcorrencia;
window.renderizarOcorrencias        = renderizarOcorrencias;
window.preencherSelectsOcorrencia   = preencherSelectsOcorrencia;
window.carregarDependenciasOcorrencias = carregarDependenciasOcorrencias;

initTabsOcorrencias();