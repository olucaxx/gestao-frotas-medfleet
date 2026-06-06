function atualizarProgresso(idBarra, idTexto, porcentagem) {
  const barra = document.getElementById(idBarra);
  const texto = document.getElementById(idTexto);
  if (barra) barra.style.width = `${porcentagem}%`;
  if (texto) texto.textContent = `${Math.round(porcentagem)}%`;
}

function carregarLinhaTempo() {
  const linhaTempo = document.getElementById("liveTimeline");
  if (!linhaTempo) return;
  linhaTempo.innerHTML = "";

  const eventos = [];

  // Ocorrências operacionais
  ocorrenciasCache.forEach((o, index) => {
    let icone = "ph-warning-octagon";
    let classeIcone = "timeline-icon-red";
    let desc = `Paciente: ${o.paciente || "Não informado"} | Local: ${o.endereco || "N/A"}`;

    if (o.status === "Em Atendimento") {
      icone = "ph-clock";
      classeIcone = "timeline-icon-blue";
      desc = `Equipe ${o.equipe_nome || "médica"} em atendimento rápido no local.`;
    } else if (o.status === "Finalizada") {
      icone = "ph-check-circle";
      classeIcone = "timeline-icon-green";
      desc = "Atendimento concluído. Viatura em processo de retorno.";
    }

    eventos.push({
      titulo: `Ocorrência: ${o.titulo}`,
      desc,
      tempo: `há ${5 + index * 12} min`,
      icone,
      classeIcone,
      timestamp: Date.now() - (5 + index * 12) * 60000
    });
  });

  // Funcionários cadastrados
  funcionariosCache.slice(0, 3).forEach((f, index) => {
    const emRota = f.status === "Em Rota";
    eventos.push({
      titulo: `${f.cargo}: ${f.nome}`,
      desc: `Profissional operacional com status atualizado para: ${f.status || "Disponível"}.`,
      tempo: `há ${15 + index * 18} min`,
      icone: emRota ? "ph-navigation-arrow" : "ph-user-check",
      classeIcone: emRota ? "timeline-icon-blue" : "timeline-icon-green",
      timestamp: Date.now() - (15 + index * 18) * 60000
    });
  });

  // Veículos/Ambulâncias
  if (typeof veiculosCache !== "undefined" && veiculosCache.length > 0) {
    veiculosCache.slice(0, 2).forEach((v, index) => {
      const statusCiclo = index % 4 === 1 ? "Em rota" : index % 4 === 2 ? "Emergência" : index % 4 === 3 ? "Manutenção" : "Disponível";
      const statusAtual = v.status || statusCiclo;

      let icone = "ph-ambulance";
      let classeIcone = "timeline-icon-green";

      if (statusAtual === "Em rota" || statusAtual === "Emergência") {
        icone = "ph-navigation-arrow";
        classeIcone = "timeline-icon-blue";
      } else if (statusAtual === "Manutenção") {
        icone = "ph-wrench";
        classeIcone = "timeline-icon-yellow";
      }

      eventos.push({
        titulo: `Ambulância: ${v.placa}`,
        desc: `Viatura (${v.modelo || "Padrão"}) monitorada no sistema | Status: ${statusAtual}.`,
        tempo: `há ${8 + index * 15} min`,
        icone,
        classeIcone,
        timestamp: Date.now() - (8 + index * 15) * 60000
      });
    });
  } else {
    eventos.push({
      titulo: "Viatura AMB-1020",
      desc: "Check-list operacional matutino finalizado sem inconformidades.",
      tempo: "há 2h",
      icone: "ph-wrench",
      classeIcone: "timeline-icon-yellow",
      timestamp: Date.now() - 120 * 60000
    });
  }

  // Ordena por data mais recente
  eventos.sort((a, b) => b.timestamp - a.timestamp);

  // Insere elementos na linha do tempo
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

async function carregarDashboard() {
  try {
    await Promise.all([
      carregarCacheVeiculos(),
      carregarCacheFuncionarios()
    ]);

    const totalOcor = ocorrenciasCache.length;
    const ativasOcor = ocorrenciasCache.filter(o => o.status === "Ativa" || o.status === "Em Atendimento").length;
    
    const totalVeic = veiculosCache.length;
    const emRotaVeic = veiculosCache.filter((v, idx) => {
      const s = v.status || (idx % 4 === 1 ? "Em rota" : idx % 4 === 2 ? "Emergência" : idx % 4 === 3 ? "Manutenção" : "Disponível");
      return s === "Em rota" || s === "Emergência";
    }).length;

    const disponiveisFunc = funcionariosCache.filter(f => f.status === "Disponível").length;
    const totalFunc = funcionariosCache.length;

    const operacionaisVeic = veiculosCache.filter((v, idx) => {
      const s = v.status || (idx % 4 === 1 ? "Em rota" : idx % 4 === 2 ? "Emergência" : idx % 4 === 3 ? "Manutenção" : "Disponível");
      return s !== "Manutenção";
    }).length;

    // Atualiza os contadores na tela
    const el = id => document.getElementById(id);
    if (el("totalOcorrencias")) el("totalOcorrencias").textContent = ativasOcor;
    if (el("viaturasRota")) el("viaturasRota").textContent = emRotaVeic;
    if (el("equipeDisponivel")) el("equipeDisponivel").textContent = disponiveisFunc;
    if (el("totalViaturas")) el("totalViaturas").textContent = totalVeic;

    // Calcula as porcentagens
    const pctOcor = totalOcor > 0 ? (ativasOcor / totalOcor) * 100 : 0;
    const pctRota = totalVeic > 0 ? (emRotaVeic / totalVeic) * 100 : 0;
    const pctEquipe = totalFunc > 0 ? (disponiveisFunc / totalFunc) * 100 : 0;
    const pctFrota = totalVeic > 0 ? (operacionaisVeic / totalVeic) * 100 : 0;

    // Renderiza as barras de progresso
    setTimeout(() => {
      atualizarProgresso("progressOcorrencias", "progressTextOcorrencias", pctOcor);
      atualizarProgresso("progressRota", "progressTextRota", pctRota);
      atualizarProgresso("progressEquipe", "progressTextEquipe", pctEquipe);
      atualizarProgresso("progressFrota", "progressTextFrota", pctFrota);
    }, 100);

    // Lista de Alertas Críticos
    const alertList = document.getElementById("alertList");
    if (alertList) {
      alertList.innerHTML = "";
      const alertas = [];

      ocorrenciasCache.forEach(o => {
        if (o.status === "Ativa" && o.prioridade === "Crítica") {
          alertas.push(`<li onclick="mostrarPagina('ocorrenciasPage'); selecionarOcorrencia(${o.id});" style="cursor: pointer;"><i class="ph ph-warning-octagon" style="color: #ef4444; font-size: 18px; flex-shrink: 0;"></i> <div><strong>Urgência Crítica:</strong> ${o.titulo} para paciente ${o.paciente}.</div></li>`);
        } else if (o.status === "Ativa" && o.prioridade === "Alta") {
          alertas.push(`<li onclick="mostrarPagina('ocorrenciasPage'); selecionarOcorrencia(${o.id});" style="cursor: pointer;"><i class="ph ph-warning" style="color: #f59e0b; font-size: 18px; flex-shrink: 0;"></i> <div><strong>Demanda Alta:</strong> ${o.titulo} pendente de atendimento.</div></li>`);
        }
      });

      veiculosCache.forEach((v, idx) => {
        const s = v.status || (idx % 4 === 1 ? "Em rota" : idx % 4 === 2 ? "Emergência" : idx % 4 === 3 ? "Manutenção" : "Disponível");
        if (s === "Manutenção") {
          alertas.push(`<li onclick="mostrarPagina('manutencoesPage');" style="cursor: pointer;"><i class="ph ph-wrench" style="color: #f59e0b; font-size: 18px; flex-shrink: 0;"></i> <div><strong>Manutenção Preventiva:</strong> Viatura ${v.placa} (${v.modelo}) na oficina.</div></li>`);
        }
      });

      if (alertas.length === 0) {
        alertas.push(`<li><i class="ph ph-check-circle" style="color: #10b981; font-size: 18px; flex-shrink: 0;"></i> <div>Tudo sob controle. Nenhum alerta crítico operacional ativo.</div></li>`);
      }

      alertList.innerHTML = alertas.join("");
    }

    carregarLinhaTempo();
  } catch (erro) {
    console.error("Erro ao carregar o dashboard:", erro);
  }
}
