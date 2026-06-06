let ocorrenciaSelecionadaId = null;

function carregarOcorrencias() {
  const lista = document.getElementById("ocorrenciasList");
  if (!lista) return;
  lista.innerHTML = "";

  const badgeTotal = document.getElementById("badgeTotalOcorrencias");
  if (badgeTotal) badgeTotal.textContent = ocorrenciasCache.length;

  ocorrenciasCache.forEach(o => {
    const cartao = document.createElement("div");
    cartao.className = "tracking-card";
    cartao.dataset.id = o.id;
    cartao.classList.toggle("selected", o.id === ocorrenciaSelecionadaId);

    const statusConfig = {
      "Ativa": { classe: "badge-emergency", icone: "ph-warning-circle" },
      "Em Atendimento": { classe: "badge-route", icone: "ph-clock" },
      "Finalizada": { classe: "badge-available", icone: "ph-check-circle" }
    };

    const config = statusConfig[o.status] || statusConfig["Finalizada"];

    cartao.innerHTML = `
      <div class="tc-header">
        <h3 style="font-size: 14px;">${o.titulo.substring(0, 20)}...</h3>
        <span class="status-badge ${config.classe}">
          <i class="ph ${config.icone}"></i> ${o.status}
        </span>
      </div>
      <div style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">
        <i class="ph ph-calendar"></i> ${o.data} | Prioridade: ${o.prioridade}
      </div>
    `;

    cartao.onclick = () => selecionarOcorrencia(o.id);
    lista.appendChild(cartao);
  });

  fecharDetalhes('ocorrencias');
}

function selecionarOcorrencia(id) {
  ocorrenciaSelecionadaId = id;
  const o = ocorrenciasCache.find(oc => oc.id === id);
  if (!o) return;

  document.querySelectorAll("#ocorrenciasList .tracking-card").forEach(cartao => {
    cartao.classList.toggle("selected", Number(cartao.dataset.id) === Number(id));
  });

  const el = idDoc => document.getElementById(idDoc);
  if (el("detailOcorrenciaTitulo")) el("detailOcorrenciaTitulo").textContent = o.titulo || 'Sem Título';
  
  if (el("detailOcorrenciaStatus")) {
    const statusConfig = {
      "Ativa": { classe: "badge-emergency", icone: "ph-warning-circle" },
      "Em Atendimento": { classe: "badge-route", icone: "ph-clock" },
      "Finalizada": { classe: "badge-available", icone: "ph-check-circle" }
    };
    const config = statusConfig[o.status] || statusConfig["Finalizada"];
    el("detailOcorrenciaStatus").className = `status-badge ${config.classe}`;
    el("detailOcorrenciaStatus").innerHTML = `<i class="ph ${config.icone}"></i> ${o.status}`;
  }
  
  if (el("detailOcorrenciaPrioridade")) el("detailOcorrenciaPrioridade").textContent = o.prioridade || '-';
  if (el("detailOcorrenciaData")) el("detailOcorrenciaData").textContent = o.data || '-';
  if (el("detailOcorrenciaPaciente")) el("detailOcorrenciaPaciente").textContent = o.paciente || '-';
  if (el("detailOcorrenciaEndereco")) el("detailOcorrenciaEndereco").textContent = o.endereco || '-';
  if (el("detailOcorrenciaVeiculo")) el("detailOcorrenciaVeiculo").textContent = o.veiculo_nome || 'Não vinculado';
  if (el("detailOcorrenciaEquipe")) el("detailOcorrenciaEquipe").textContent = o.equipe_nome || 'Não vinculado';
  if (el("detailOcorrenciaDescricao")) el("detailOcorrenciaDescricao").textContent = o.descricao || '-';

  if (el("btnEditOcorrencia")) el("btnEditOcorrencia").onclick = () => editarOcorrencia(o.id);
  if (el("btnDeleteOcorrencia")) {
    el("btnDeleteOcorrencia").onclick = () => {
      if (confirm(`Tem certeza que deseja remover a ocorrência "${o.titulo}"?`)) {
        deletarOcorrencia(o.id);
      }
    };
  }

  const btnResolver = el("btnResolverOcorrencia");
  if (btnResolver) {
    btnResolver.onclick = () => {
      o.status = "Finalizada";
      carregarOcorrencias();
    };
  }

  mostrarDetalhes('ocorrencias');
}

document.getElementById("addOcorrenciaBtn").onclick = () => {
  ocorrenciaEditandoId = null;
  limparFormularioOcorrencia();
  document.getElementById("saveOcorrencia").innerHTML = '<i class="ph ph-paper-plane-right"></i> Salvar Ocorrência';
  document.getElementById("ocorrenciaModal").classList.remove("hidden");
};

function limparFormularioOcorrencia() {
  ["inputOcorrenciaTitulo", "inputOcorrenciaPaciente", "inputOcorrenciaPrioridade", "inputOcorrenciaEndereco", "inputOcorrenciaStatus", "inputOcorrenciaVeiculo", "inputOcorrenciaEquipe", "inputOcorrenciaDescricao"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = (el.tagName === "SELECT") ? el.options[0].value : "";
      el.dataset.id = "";
    }
  });
  document.getElementById("ocorrenciaModal").classList.add("hidden");
}

document.getElementById("cancelOcorrencia").onclick = limparFormularioOcorrencia;
const btnFecharModalOcorrencia = document.getElementById("closeOcorrenciaModal");
if (btnFecharModalOcorrencia) btnFecharModalOcorrencia.onclick = limparFormularioOcorrencia;

document.getElementById("saveOcorrencia").onclick = () => {
  const dados = {
    titulo: obterValorInput("inputOcorrenciaTitulo"),
    paciente: obterValorInput("inputOcorrenciaPaciente"),
    prioridade: obterValorInput("inputOcorrenciaPrioridade"),
    endereco: obterValorInput("inputOcorrenciaEndereco"),
    status: obterValorInput("inputOcorrenciaStatus"),
    veiculo_nome: obterValorInput("inputOcorrenciaVeiculo"),
    equipe_nome: obterValorInput("inputOcorrenciaEquipe"),
    descricao: obterValorInput("inputOcorrenciaDescricao"),
    data: new Date().toISOString().split('T')[0]
  };

  if (ocorrenciaEditandoId) {
    const idx = ocorrenciasCache.findIndex(o => o.id == ocorrenciaEditandoId);
    if (idx > -1) {
      ocorrenciasCache[idx] = { ...ocorrenciasCache[idx], ...dados, data: ocorrenciasCache[idx].data };
    }
  } else {
    const novoId = ocorrenciasCache.length > 0 ? Math.max(...ocorrenciasCache.map(o => o.id)) + 1 : 1;
    ocorrenciasCache.push({ id: novoId, ...dados });
    ocorrenciaSelecionadaId = novoId;
  }

  limparFormularioOcorrencia();
  carregarOcorrencias();
};

function editarOcorrencia(id) {
  const o = ocorrenciasCache.find(oc => oc.id == id);
  if (!o) return;

  const campoVal = (idCampo, valor) => {
    const el = document.getElementById(idCampo);
    if (el) el.value = valor || "";
  };

  campoVal("inputOcorrenciaTitulo", o.titulo);
  campoVal("inputOcorrenciaPaciente", o.paciente);
  campoVal("inputOcorrenciaPrioridade", o.prioridade || "Baixa");
  campoVal("inputOcorrenciaEndereco", o.endereco);
  campoVal("inputOcorrenciaStatus", o.status || "Ativa");
  campoVal("inputOcorrenciaVeiculo", o.veiculo_nome);
  campoVal("inputOcorrenciaEquipe", o.equipe_nome);
  campoVal("inputOcorrenciaDescricao", o.descricao);

  ocorrenciaEditandoId = id;
  document.getElementById("saveOcorrencia").innerHTML = '<i class="ph ph-pencil-simple"></i> Atualizar Ocorrência';
  document.getElementById("ocorrenciaModal").classList.remove("hidden");
}

function deletarOcorrencia(id) {
  ocorrenciasCache = ocorrenciasCache.filter(o => o.id != id);
  if (ocorrenciaSelecionadaId == id) ocorrenciaSelecionadaId = null;
  carregarOcorrencias();
}
