// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos do dashboard
// ─────────────────────────────────────────────────────────────────────────────

function atualizarProgresso(idBarra, idTexto, porcentagem) {
  const barra = document.getElementById(idBarra);
  const texto = document.getElementById(idTexto);
  const valor = Math.min(100, Math.max(0, porcentagem));
  if (barra) barra.style.width = `${valor}%`;
  if (texto) texto.textContent = `${Math.round(valor)}%`;
}

const _statusById = id =>
  (statusCache || []).find(s => s.id === id) ?? null;

const _statusCod = id =>
  _statusById(id)?.codigo ?? null;

const _prioridadeById = id =>
  (prioridadesCache || []).find(p => p.id === id) ?? null;

const _prioridadeCod = id =>
  _prioridadeById(id)?.codigo ?? null;

const _dispById = id =>
  (disponibilidadesCache || []).find(d => d.id === id) ?? null;

const _dispCod = id =>
  _dispById(id)?.codigo ?? null;

// ─────────────────────────────────────────────────────────────────────────────
// Linha do tempo — unifica todos os caches usando created_at / updated_at
// ─────────────────────────────────────────────────────────────────────────────

function _tempoLabel(timestamp) {
  const diffMin = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  return diffMin < 1
    ? "agora"
    : diffMin < 60
      ? `há ${diffMin} min`
      : diffMin < 1440
        ? `há ${Math.round(diffMin / 60)}h`
        : `há ${Math.round(diffMin / 1440)}d`;
}

function _addEventoCriacaoAtualizacao(eventos, item, { criado, atualizado }) {
  if (item.created_at) {
    eventos.push({ ...criado, timestamp: new Date(item.created_at).getTime() });
  }
  if (item.updated_at && item.created_at && item.updated_at !== item.created_at) {
    eventos.push({ ...atualizado, timestamp: new Date(item.updated_at).getTime() });
  }
}

async function _buscarLista(caminho) {
  try {
    const r = await fazerRequisicao(caminho);
    if (!r.ok) throw new Error("API falhou");
    return await r.json();
  } catch {
    console.warn(`(Timeline) não foi possível carregar ${caminho}`);
    return [];
  }
}

async function carregarLinhaTempo() {
  const linhaTempo = document.getElementById("liveTimeline");
  if (!linhaTempo) return;
  linhaTempo.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">Carregando...</p>`;

  // Listas que não possuem cache global compartilhado
  const [manutencoesLista, abastecimentosLista] = await Promise.all([
    _buscarLista("/manutencoes/"),
    _buscarLista("/abastecimentos/"),
  ]);

  const eventos = [];

  // ── Ocorrências ─────────────────────────────────────────────────────────
  (ocorrenciasCache || []).forEach(o => {
    const sCod = _statusCod(o.status);
    const statusObj = (statusCache || []).find(s => s.id === o.status);
    const pac = o.nome_paciente ? ` | Paciente: ${o.nome_paciente}` : "";

    let icone = "ph-pencil-simple";
    let classeIcone = "timeline-icon-blue";
    let desc = `Status atualizado para: ${statusObj?.nome ?? "-"}.`;

    if (sCod === "EM_ATENDIMENTO") {
      icone = "ph-clock";
      classeIcone = "timeline-icon-blue";
      desc = "Equipe médica em atendimento no local.";
    } else if (sCod === "FINALIZADO") {
      icone = "ph-check-circle";
      classeIcone = "timeline-icon-green";
      desc = "Atendimento concluído.";
    }

    _addEventoCriacaoAtualizacao(eventos, o, {
      criado: {
        titulo: `Ocorrência aberta: ${o.titulo}`,
        desc: `Local: ${o.local_informado ?? "N/A"}${pac}`,
        icone: "ph-warning-octagon",
        classeIcone: "timeline-icon-red",
      },
      atualizado: {
        titulo: `Ocorrência: ${o.titulo}`,
        desc,
        icone,
        classeIcone,
      },
    });
  });

  // ── Funcionários ────────────────────────────────────────────────────────
  (funcionariosCache || []).forEach(f => {
    _addEventoCriacaoAtualizacao(eventos, f, {
      criado: {
        titulo: `Funcionário cadastrado: ${f.nome}`,
        desc: "Novo funcionário adicionado à frota.",
        icone: "ph-user-plus",
        classeIcone: "timeline-icon-green",
      },
      atualizado: {
        titulo: `Funcionário atualizado: ${f.nome}`,
        desc: "Dados do funcionário foram alterados.",
        icone: "ph-user-check",
        classeIcone: "timeline-icon-blue",
      },
    });
  });

  // ── CNHs ────────────────────────────────────────────────────────────────
  (cnhsCache || []).forEach(c => {
    const func = (funcionariosCache || []).find(f => f.matricula === c.funcionario);
    const nome = func?.nome ?? `funcionário #${c.funcionario}`;

    _addEventoCriacaoAtualizacao(eventos, c, {
      criado: {
        titulo: `CNH cadastrada: ${nome}`,
        desc: `Categoria ${c.categoria}.`,
        icone: "ph-identification-card",
        classeIcone: "timeline-icon-green",
      },
      atualizado: {
        titulo: `CNH atualizada: ${nome}`,
        desc: `Categoria ${c.categoria}.`,
        icone: "ph-identification-card",
        classeIcone: "timeline-icon-blue",
      },
    });
  });

  // ── Registros profissionais ────────────────────────────────────────────
  (profissionaisSaudeCache || []).forEach(p => {
    const func = (funcionariosCache || []).find(f => f.matricula === p.funcionario);
    const nome = func?.nome ?? `funcionário #${p.funcionario}`;
    const cargo = (cargosCache || []).find(c => c.id === p.cargo);

    _addEventoCriacaoAtualizacao(eventos, p, {
      criado: {
        titulo: `Registro profissional cadastrado: ${nome}`,
        desc: `Cargo: ${cargo?.nome ?? "-"}.`,
        icone: "ph-certificate",
        classeIcone: "timeline-icon-green",
      },
      atualizado: {
        titulo: `Registro profissional atualizado: ${nome}`,
        desc: `Cargo: ${cargo?.nome ?? "-"}.`,
        icone: "ph-certificate",
        classeIcone: "timeline-icon-blue",
      },
    });
  });

  // ── Veículos ────────────────────────────────────────────────────────────
  (veiculosCache || []).forEach(v => {
    _addEventoCriacaoAtualizacao(eventos, v, {
      criado: {
        titulo: `Veículo cadastrado: ${v.placa}`,
        desc: `${v.marca ?? ""} ${v.modelo ?? ""}`.trim(),
        icone: "ph-ambulance",
        classeIcone: "timeline-icon-green",
      },
      atualizado: {
        titulo: `Veículo atualizado: ${v.placa}`,
        desc: `Disponibilidade: ${(disponibilidadesCache || []).find(d => d.id === v.disponibilidade)?.nome ?? "-"}.`,
        icone: "ph-ambulance",
        classeIcone: "timeline-icon-blue",
      },
    });
  });

  // ── Equipes ─────────────────────────────────────────────────────────────
  (equipesCache || []).forEach(eq => {
    _addEventoCriacaoAtualizacao(eventos, eq, {
      criado: {
        titulo: `Equipe criada: ${eq.nome_equipe}`,
        desc: "Nova equipe médica formada.",
        icone: "ph-users-four",
        classeIcone: "timeline-icon-green",
      },
      atualizado: {
        titulo: `Equipe atualizada: ${eq.nome_equipe}`,
        desc: "Composição ou status da equipe alterado.",
        icone: "ph-users-four",
        classeIcone: "timeline-icon-blue",
      },
    });
  });

  // ── Manutenções ─────────────────────────────────────────────────────────
  manutencoesLista.forEach(m => {
    const placa = m.veiculo_placa ?? (_veiculoById(m.veiculo)?.placa ?? `#${m.veiculo}`);

    _addEventoCriacaoAtualizacao(eventos, m, {
      criado: {
        titulo: `Manutenção registrada: ${placa}`,
        desc: m.oficina ? `Oficina: ${m.oficina}.` : "Veículo encaminhado para manutenção.",
        icone: "ph-wrench",
        classeIcone: "timeline-icon-yellow",
      },
      atualizado: {
        titulo: `Manutenção finalizada: ${placa}`,
        desc: "Veículo liberado da manutenção.",
        icone: "ph-check-circle",
        classeIcone: "timeline-icon-green",
      },
    });
  });

  // ── Abastecimentos ──────────────────────────────────────────────────────
  abastecimentosLista.forEach(a => {
    const placa = a.veiculo_placa ?? (_veiculoById(a.veiculo)?.placa ?? `#${a.veiculo}`);

    if (a.created_at) {
      eventos.push({
        titulo: `Abastecimento registrado: ${placa}`,
        desc: `${Number(a.quantidade_litros).toFixed(2).replace(".", ",")} L de ${a.tipo_combustivel ?? "-"}.`,
        icone: "ph-gas-pump",
        classeIcone: "timeline-icon-blue",
        timestamp: new Date(a.created_at).getTime(),
      });
    }
  });

  eventos.sort((a, b) => b.timestamp - a.timestamp);
  eventos.splice(20); // limita quantidade exibida

  linhaTempo.innerHTML = "";

  if (eventos.length === 0) {
    linhaTempo.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">Nenhum evento recente.</p>`;
    return;
  }

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
          <span class="timeline-time">${_tempoLabel(ev.timestamp)}</span>
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
      typeof carregarCacheOcorrencias        === "function" ? carregarCacheOcorrencias()        : Promise.resolve(),
      typeof carregarPrioridades             === "function" ? carregarPrioridades()              : Promise.resolve(),
      typeof carregarStatus                  === "function" ? carregarStatus()                   : Promise.resolve(),
      typeof carregarCacheDisponibilidades   === "function" ? carregarCacheDisponibilidades()    : Promise.resolve(),
      typeof carregarCacheEquipes            === "function" ? carregarCacheEquipes()             : Promise.resolve(),
      typeof carregarCacheCnhs               === "function" ? carregarCacheCnhs()                : Promise.resolve(),
      typeof carregarCacheProfissionaisSaude === "function" ? carregarCacheProfissionaisSaude()  : Promise.resolve(),
      typeof carregarCacheCargos             === "function" ? carregarCacheCargos()              : Promise.resolve(),
    ]);

    // ── Ocorrências (somente aguardando contam como "ativas") ──────────────
    const totalOcor  = ocorrenciasCache.length;
    const ativasOcor = ocorrenciasCache.filter(o => _statusCod(o.status) === "AGUARDANDO").length;

    // ── Veículos ────────────────────────────────────────────────────────────
    // Frota ativa total (já filtrada pelo backend: ativo=True)
    const totalFrotaAtiva = veiculosCache.length;

    // "Total de Veículos": exclui indisponíveis e em manutenção
    const totalVeic = veiculosCache.filter(v => {
      const cod = _dispCod(v.disponibilidade);
      return cod === "DISPONIVEL";
    }).length;

    const emRotaVeic = veiculosCache.filter(v => {
      const cod = _dispCod(v.disponibilidade);
      return cod === "EM_ROTA" || cod === "ATENDENDO";
    }).length;

    const operacionaisVeic = veiculosCache.filter(v => {
      const cod = _dispCod(v.disponibilidade);
      console.log(v.placa, cod);
      return cod === "DISPONIVEL";
    }).length;

    // ── Funcionários ─────────────────────────────────────────────────────────
    const totalFunc       = funcionariosCache.length;
    const disponiveisFunc = funcionariosCache.filter(f => _dispCod(f.disponibilidade) === "DISPONIVEL").length;

    // ── Contadores ───────────────────────────────────────────────────────────
    const el = id => document.getElementById(id);
    if (el("totalOcorrencias")) el("totalOcorrencias").textContent = ativasOcor;
    if (el("viaturasRota"))     el("viaturasRota").textContent     = emRotaVeic;
    if (el("equipeDisponivel")) el("equipeDisponivel").textContent  = disponiveisFunc;
    if (el("totalViaturas"))    el("totalViaturas").textContent     = totalVeic;

    // ── Barras de progresso (com delay para a animação CSS funcionar) ──────
    // Todas usam a frota/efetivo ativo total como denominador, evitando >100%.
    setTimeout(() => {
      atualizarProgresso("progressOcorrencias", "progressTextOcorrencias",
        totalOcor > 0 ? (ativasOcor / totalOcor) * 100 : 0);

      atualizarProgresso("progressRota", "progressTextRota",
        totalFrotaAtiva > 0 ? (emRotaVeic / totalFrotaAtiva) * 100 : 0);

      atualizarProgresso("progressEquipe", "progressTextEquipe",
        totalFunc > 0 ? (disponiveisFunc / totalFunc) * 100 : 0);

      atualizarProgresso("progressFrota", "progressTextFrota",
        totalFrotaAtiva > 0 ? (operacionaisVeic / totalFrotaAtiva) * 100 : 0);

        console.log(operacionaisVeic, totalFrotaAtiva);
    }, 100);

    // ── Alertas críticos ─────────────────────────────────────────────────────
    const alertList = el("alertList");
    if (alertList) {
      const alertas = [];

      ocorrenciasCache.forEach(o => {
        const sCod   = _statusCod(o.status);
        const pCod   = _prioridadeCod(o.prioridade);
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

    await carregarLinhaTempo();

  } catch (erro) {
    console.error("Erro ao carregar o dashboard:", erro);
  }
}