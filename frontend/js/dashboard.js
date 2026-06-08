// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos do dashboard
// ─────────────────────────────────────────────────────────────────────────────

function atualizarProgresso(idBarra, idTexto, porcentagem) {
  const barra = document.getElementById(idBarra);
  const texto = document.getElementById(idTexto);
  if (barra) barra.style.width = `${porcentagem}%`;
  if (texto) texto.textContent = `${Math.round(porcentagem)}%`;
}

const _dispCod      = id => (disponibilidadesCache || []).find(d => d.id === id)?.codigo ?? "";
const _statusCod    = id => (statusCache            || []).find(s => s.id === id)?.codigo ?? "";
const _prioridadeCod = id => (prioridadesCache      || []).find(p => p.id === id)?.codigo ?? "";

// ─────────────────────────────────────────────────────────────────────────────
// Linha do tempo
// ─────────────────────────────────────────────────────────────────────────────

function carregarLinhaTempo() {
  const linhaTempo = document.getElementById("liveTimeline");
  if (!linhaTempo) return;
  linhaTempo.innerHTML = "";

  const eventos = [];

  // ── Ocorrências ────────────────────────────────────────────────────────────
  ocorrenciasCache.forEach(o => {
    const sCod = _statusCod(o.status);

    let icone      = "ph-warning-octagon";
    let classeIcone = "timeline-icon-red";
    let desc = `Paciente: ${o.nome_paciente ?? "Não informado"} | Local: ${o.local_informado ?? "N/A"}`;

    if (sCod === "EM_ATENDIMENTO") {
      icone       = "ph-clock";
      classeIcone = "timeline-icon-blue";
      desc        = "Equipe médica em atendimento no local.";
    } else if (sCod === "FINALIZADO") {
      icone       = "ph-check-circle";
      classeIcone = "timeline-icon-green";
      desc        = "Atendimento concluído. Viatura retornando à base.";
    }

    const horario   = o.horario_chamado ? new Date(o.horario_chamado) : new Date();
    const diffMin   = Math.max(0, Math.round((Date.now() - horario.getTime()) / 60000));
    const tempoLabel = diffMin < 60
      ? `há ${diffMin} min`
      : diffMin < 1440
        ? `há ${Math.round(diffMin / 60)}h`
        : `há ${Math.round(diffMin / 1440)}d`;

    eventos.push({
      titulo: `Ocorrência: ${o.titulo}`,
      desc,
      tempo: tempoLabel,
      icone,
      classeIcone,
      timestamp: horario.getTime()
    });
  });

  // ── Funcionários (3 mais recentes) ────────────────────────────────────────
  funcionariosCache.slice(0, 3).forEach((f, i) => {
    const dCod  = _dispCod(f.disponibilidade);
    const disp  = (disponibilidadesCache || []).find(d => d.id === f.disponibilidade);
    const emRota = dCod === "EM_ROTA";

    eventos.push({
      titulo:      `Profissional: ${f.nome}`,
      desc:        `Status atualizado para: ${disp?.nome ?? "Disponível"}.`,
      tempo:       `há ${15 + i * 18} min`,
      icone:       emRota ? "ph-navigation-arrow" : "ph-user-check",
      classeIcone: emRota ? "timeline-icon-blue"  : "timeline-icon-green",
      timestamp:   Date.now() - (15 + i * 18) * 60000
    });
  });

  // ── Veículos (2 mais recentes) ────────────────────────────────────────────
  veiculosCache.slice(0, 2).forEach((v, i) => {
    const dCod = _dispCod(v.disponibilidade);
    const disp = (disponibilidadesCache || []).find(d => d.id === v.disponibilidade);

    let icone      = "ph-ambulance";
    let classeIcone = "timeline-icon-green";
    if      (dCod === "EM_ROTA")       { icone = "ph-navigation-arrow"; classeIcone = "timeline-icon-blue";   }
    else if (dCod === "INDISPONIVEL")  { icone = "ph-wrench";           classeIcone = "timeline-icon-yellow"; }

    eventos.push({
      titulo:      `Ambulância: ${v.placa}`,
      desc:        `Viatura (${v.modelo ?? "Padrão"}) | Status: ${disp?.nome ?? "Disponível"}.`,
      tempo:       `há ${8 + i * 15} min`,
      icone,
      classeIcone,
      timestamp:   Date.now() - (8 + i * 15) * 60000
    });
  });

  eventos.sort((a, b) => b.timestamp - a.timestamp);

  eventos.forEach(ev => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.innerHTML = `
      <div class="timeline-icon ${ev.classeIcone}">
        <i class="ph ${ev.icone}"></i>
      </div>
      <div class="timeline-content">
        <div class="timeline-meta">
          <span class="timeline-title">${ev.titulo}</span>
          <span class="timeline-time">${ev.tempo}</span>
        </div>
        <p class="timeline-desc">${ev.desc}</p>
      </div>
    `;
    linhaTempo.appendChild(item);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard principal
// ─────────────────────────────────────────────────────────────────────────────

async function carregarDashboard() {
  try {
    // Carrega tudo em paralelo — funções definidas nos outros arquivos JS
    await Promise.all([
      carregarCacheVeiculos(),
      carregarCacheFuncionarios(),
      typeof carregarCacheOcorrencias      === "function" ? carregarCacheOcorrencias()       : Promise.resolve(),
      typeof carregarPrioridades           === "function" ? carregarPrioridades()             : Promise.resolve(),
      typeof carregarStatus                === "function" ? carregarStatus()                  : Promise.resolve(),
      typeof carregarCacheDisponibilidades === "function" ? carregarCacheDisponibilidades()   : Promise.resolve()
    ]);

    // ── Ocorrências ────────────────────────────────────────────────────────
    const totalOcor  = ocorrenciasCache.length;
    const ativasOcor = ocorrenciasCache.filter(o => {
      const cod = _statusCod(o.status);
      return cod === "AGUARDANDO" || cod === "EM_ATENDIMENTO";
    }).length;

    // ── Veículos ───────────────────────────────────────────────────────────
    const totalVeic        = veiculosCache.length;
    const emRotaVeic       = veiculosCache.filter(v => _dispCod(v.disponibilidade) === "EM_ROTA").length;
    const operacionaisVeic = veiculosCache.filter(v => _dispCod(v.disponibilidade) !== "INDISPONIVEL").length;

    // ── Funcionários ───────────────────────────────────────────────────────
    const totalFunc       = funcionariosCache.length;
    const disponiveisFunc = funcionariosCache.filter(f => _dispCod(f.disponibilidade) === "DISPONIVEL").length;

    // ── Contadores ─────────────────────────────────────────────────────────
    const el = id => document.getElementById(id);
    if (el("totalOcorrencias")) el("totalOcorrencias").textContent = ativasOcor;
    if (el("viaturasRota"))     el("viaturasRota").textContent     = emRotaVeic;
    if (el("equipeDisponivel")) el("equipeDisponivel").textContent  = disponiveisFunc;
    if (el("totalViaturas"))    el("totalViaturas").textContent     = totalVeic;

    // ── Barras de progresso (com delay para a animação CSS funcionar) ──────
    setTimeout(() => {
      atualizarProgresso("progressOcorrencias", "progressTextOcorrencias",
        totalOcor > 0  ? (ativasOcor        / totalOcor)  * 100 : 0);
      atualizarProgresso("progressRota",        "progressTextRota",
        totalVeic > 0  ? (emRotaVeic        / totalVeic)  * 100 : 0);
      atualizarProgresso("progressEquipe",      "progressTextEquipe",
        totalFunc > 0  ? (disponiveisFunc   / totalFunc)  * 100 : 0);
      atualizarProgresso("progressFrota",       "progressTextFrota",
        totalVeic > 0  ? (operacionaisVeic  / totalVeic)  * 100 : 0);
    }, 100);

    // ── Alertas críticos ───────────────────────────────────────────────────
    const alertList = el("alertList");
    if (alertList) {
      const alertas = [];

      ocorrenciasCache.forEach(o => {
        const sCod   = _statusCod(o.status);
        const pCod   = _prioridadeCod(o.prioridade);
        const pNome  = (prioridadesCache || []).find(p => p.id === o.prioridade)?.nome ?? "";
        const ativa  = sCod === "AGUARDANDO" || sCod === "EM_ATENDIMENTO";
        const pac    = o.nome_paciente ? ` — ${o.nome_paciente}` : "";
        const nav    = `mostrarPagina('ocorrenciasPage');selecionarOcorrencia(${o.id});`;

        if (ativa && pCod === "VERMELHO") {
          alertas.push(`
            <li onclick="${nav}" style="cursor:pointer;">
              <i class="ph ph-warning-octagon" style="color:#ef4444;font-size:18px;flex-shrink:0;"></i>
              <div><strong>Emergência:</strong> ${o.titulo}${pac}.</div>
            </li>`);
        } else if (ativa && pCod === "LARANJA") {
          alertas.push(`
            <li onclick="${nav}" style="cursor:pointer;">
              <i class="ph ph-warning" style="color:#f59e0b;font-size:18px;flex-shrink:0;"></i>
              <div><strong>Muito Urgente:</strong> ${o.titulo} pendente de atendimento.</div>
            </li>`);
        } else if (ativa && (pCod === "AMARELO")) {
          alertas.push(`
            <li onclick="${nav}" style="cursor:pointer;">
              <i class="ph ph-warning" style="color:#eab308;font-size:18px;flex-shrink:0;"></i>
              <div><strong>Urgente:</strong> ${o.titulo} aguardando despacho.</div>
            </li>`);
        }
      });

      veiculosCache.forEach(v => {
        if (_dispCod(v.disponibilidade) === "INDISPONIVEL") {
          alertas.push(`
            <li onclick="mostrarPagina('manutencoesPage');" style="cursor:pointer;">
              <i class="ph ph-wrench" style="color:#f59e0b;font-size:18px;flex-shrink:0;"></i>
              <div><strong>Veículo Indisponível:</strong> ${v.placa} (${v.marca ?? ""} ${v.modelo ?? ""}) fora de serviço.</div>
            </li>`);
        }
      });

      if (alertas.length === 0) {
        alertas.push(`
          <li>
            <i class="ph ph-check-circle" style="color:#10b981;font-size:18px;flex-shrink:0;"></i>
            <div>Tudo sob controle. Nenhum alerta crítico operacional ativo.</div>
          </li>`);
      }

      alertList.innerHTML = alertas.join("");
    }

    carregarLinhaTempo();

  } catch (erro) {
    console.error("Erro ao carregar o dashboard:", erro);
  }
}