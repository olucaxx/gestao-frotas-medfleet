let veiculoSelecionadoPlaca = null;
let veiculoEditandoPlaca = null;
let disponibilidadesCache = [];

// ─── Controle de disponibilidade do veículo ──────────────────────────────────

function atualizarControleDisponibilidadeVeiculo(veiculo = null) {
  const select = document.getElementById("inputDisponibilidade");
  const hint = document.getElementById("hintVeiculoDisponibilidade");
  const vinculado = veiculo?.disponibilidade_controlada
    || veiculo?.equipe_atribuida
    || _veiculoEmManutencao(veiculo);

  if (select) select.disabled = !!vinculado;
  if (hint) {
    hint.classList.toggle("hidden", !vinculado);
    hint.style.display = vinculado ? "block" : "none";
  }
}

function _veiculoEmManutencao(veiculo) {
  if (!veiculo) return false;
  const dispCod = getDispCodigo(veiculo.disponibilidade);
  return dispCod === "EM_MANUTENCAO";
}

// ─── Cache de disponibilidades ───────────────────────────────────────────────

async function carregarCacheDisponibilidades() {
  try {
    const resposta = await fazerRequisicao("/disponibilidades/");
    if (!resposta.ok) throw new Error("Erro ao carregar disponibilidades");
    disponibilidadesCache = await resposta.json();
  } catch (erro) {
    console.warn("(Disponibilidade) Backend offline ou com erro.");
  }
}

async function carregarDisponibilidades() {
  await carregarCacheDisponibilidades();

  const select = document.getElementById("inputDisponibilidade");
  if (!select) return;

  select.innerHTML = '<option value="">Selecione...</option>';
  disponibilidadesCache.forEach(d => {
    select.innerHTML += `<option value="${d.id}">${d.nome}</option>`;
  });
}

// ─── Cache de veículos ───────────────────────────────────────────────────────

async function carregarCacheVeiculos() {
  try {
    const resposta = await fazerRequisicao("/veiculos/");
    if (!resposta.ok) throw new Error("API falhou");
    veiculosCache = await resposta.json();
  } catch (erro) {
    console.warn("(Veiculos) Backend offline ou com erro.");
  }
}

// ─── Lista de veículos ───────────────────────────────────────────────────────

async function carregarVeiculos() {
  await carregarDisponibilidades();
  await carregarCacheVeiculos();

  const lista = document.getElementById("veiculosList");
  if (!lista) return;
  lista.innerHTML = "";

  veiculosCache.forEach((v) => {
    const cartao = document.createElement("div");
    cartao.className = "tracking-card";
    cartao.dataset.placa = v.placa;
    cartao.classList.toggle("selected", v.placa === veiculoSelecionadoPlaca);

    const statusAtual = disponibilidadesCache.find(d => d.id === v.disponibilidade) ?? {
      codigo: "DISPONIVEL",
      nome: "Disponível"
    };
    const dispCod = statusAtual?.codigo ?? "";
    const badgeEquipe = v.equipe_nome ? renderBadgeEquipeHtml(v.equipe_nome) : "";

    cartao.innerHTML = `
      <div class="tc-header">
        <h3>${v.placa}</h3>
        <span class="status-badge ${classeBadgePorCodigo(dispCod)}">
          <i class="ph ${iconeBadgePorCodigo(dispCod)}"></i> ${statusAtual?.nome ?? "-"}
        </span>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin:6px 0;display:flex;flex-wrap:wrap;gap:6px;">
        ${badgeEquipe}
      </div>
      <div class="tc-image">
        <img src="assets/ambulance.png" alt="Ambulância" />
      </div>
    `;

    cartao.onclick = () => selecionarVeiculo(v.placa, statusAtual);
    lista.appendChild(cartao);
  });

  fecharDetalhes('veiculos');
}

// ─── Painel de detalhes do veículo ───────────────────────────────────────────

function selecionarVeiculo(placa, statusAtual) {
  veiculoSelecionadoPlaca = placa;

  const v = veiculosCache.find(ve => ve.placa === placa);
  if (!v) return;

  document.querySelectorAll("#veiculosList .tracking-card")
    .forEach(cartao => {
      cartao.classList.toggle("selected", cartao.querySelector("h3").textContent === placa);
    });

  const el = idDoc => document.getElementById(idDoc);

  if (el("detailPlate")) el("detailPlate").textContent = v.placa;

  if (el("detailStatus")) {
    const statusEl = el("detailStatus");
    const dispCod = statusAtual?.codigo ?? "";
    statusEl.className = `status-badge ${classeBadgePorCodigo(dispCod)}`;
    statusEl.innerHTML = `<i class="ph ${iconeBadgePorCodigo(dispCod)}"></i> ${statusAtual?.nome ?? "-"}`;
  }

  if (el("detailModelo"))       el("detailModelo").textContent       = `${v.marca || ''} ${v.modelo || ''}`;
  if (el("detailCategoria"))    el("detailCategoria").textContent    = v.categoria || 'Não definida';
  if (el("detailAno"))          el("detailAno").textContent          = v.ano || '-';
  if (el("detailKm"))           el("detailKm").textContent           = `${v.km || 0} km`;
  if (el("detailCnh"))          el("detailCnh").textContent          = v.cnh_necessaria || "-";

  const disponibilidadeObj = disponibilidadesCache.find(d => d.id == v.disponibilidade);
  if (el("detailDisponibilidade"))
    el("detailDisponibilidade").textContent = disponibilidadeObj ? disponibilidadeObj.nome : "-";

  if (el("detailVeiculoEquipe"))
    el("detailVeiculoEquipe").textContent = v.equipe_nome || "Sem equipe";

  if (el("btnEditVeiculo"))    el("btnEditVeiculo").onclick    = () => editarVeiculo(v.placa);
  if (el("btnDeleteVeiculo"))  el("btnDeleteVeiculo").onclick  = () => {
    if (confirm(`Tem certeza que deseja remover o veículo ${v.placa}?`)) deletarVeiculo(v.placa);
  };

  mostrarDetalhes('veiculos');

  // Recarrega aba de manutenção/abastecimento se estiver ativa
  _recarregarAbasAtivas(v);
}

function _recarregarAbasAtivas(veiculo) {
  const tabManut = document.querySelector("#veiculosDetail .details-tabs .tab[data-tab='manutencaoVeiculo']");
  const tabAbast = document.querySelector("#veiculosDetail .details-tabs .tab[data-tab='abastecimentoVeiculo']");

  if (tabManut?.classList.contains("active")) carregarManutencoesDoVeiculo(veiculo.placa, veiculo);
  if (tabAbast?.classList.contains("active")) carregarAbastecimentosDoVeiculo(veiculo.placa);
}

// ─── Tabs do painel de detalhe ───────────────────────────────────────────────

function initTabsVeiculos() {
  document.querySelectorAll("#veiculosDetail .details-tabs .tab").forEach(botao => {
    botao.addEventListener("click", () => {
      document.querySelectorAll("#veiculosDetail .details-tabs .tab")
        .forEach(t => t.classList.remove("active"));
      document.querySelectorAll("#veiculosDetail .tab-content")
        .forEach(c => { c.classList.remove("active"); c.classList.add("hidden"); });

      botao.classList.add("active");
      const alvo = document.getElementById(botao.dataset.tab);
      if (alvo) { alvo.classList.remove("hidden"); alvo.classList.add("active"); }

      // Carrega dados ao trocar de aba
      const placa = veiculoSelecionadoPlaca;
      const veiculo = placa ? veiculosCache.find(v => v.placa === placa) : null;
      if (!placa) return;

      if (botao.dataset.tab === "manutencaoVeiculo")    carregarManutencoesDoVeiculo(placa, veiculo);
      if (botao.dataset.tab === "abastecimentoVeiculo") carregarAbastecimentosDoVeiculo(placa);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANUTENÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

async function carregarManutencoesDoVeiculo(placa, veiculo) {
  const container = document.getElementById("veiculoManutencoesList");
  if (!container) return;

  container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">Carregando...</p>`;

  try {
    const r = await fazerRequisicao(`/manutencoes/?veiculo_placa=${placa}`);
    if (!r.ok) throw new Error("API falhou");
    const lista = await r.json();
    _renderizarListaManutencoes(container, lista, veiculo);
  } catch (e) {
    console.error(e);
    container.innerHTML = `<p style="color:#ef4444;font-size:13px;">Erro ao carregar manutenções.</p>`;
  }
}

function _renderizarListaManutencoes(container, lista, veiculo) {
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;
                  padding:2rem;color:var(--text-muted);">
        <i class="ph ph-wrench" style="font-size:48px;"></i>
        <p style="font-size:13px;">Nenhuma manutenção registrada.</p>
      </div>`;
    return;
  }

  lista.forEach(m => {
    const ativa = m.status === "EM_MANUTENCAO";
    const badgeClass = ativa ? "badge-emergency" : "badge-available";
    const badgeIcon  = ativa ? "ph-wrench" : "ph-check-circle";
    const badgeLabel = ativa ? "Em Manutenção" : "Finalizada";

    const item = document.createElement("div");
    item.style.cssText = `
      background:var(--bg-main);
      border:1px solid var(--border);
      border-radius:12px;
      padding:16px;
      display:flex;
      flex-direction:column;
      gap:8px;
    `;

    const custo = Number(m.custo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const data  = m.data ? new Date(m.data + "T00:00:00").toLocaleDateString("pt-BR") : "-";

    item.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:14px;font-weight:700;color:var(--text);">
          <i class="ph ph-calendar" style="margin-right:4px;"></i>${data}
        </span>
        <span class="status-badge ${badgeClass}">
          <i class="ph ${badgeIcon}"></i> ${badgeLabel}
        </span>
      </div>
      ${m.oficina ? `<div style="font-size:13px;color:var(--text-light);"><i class="ph ph-buildings" style="margin-right:4px;"></i>${m.oficina}</div>` : ""}
      ${m.descricao ? `<div style="font-size:13px;color:var(--text);line-height:1.5;">${m.descricao}</div>` : ""}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
        <span style="font-size:13px;font-weight:600;color:var(--text);">
          <i class="ph ph-currency-dollar" style="margin-right:4px;"></i>${custo}
        </span>
        <div style="display:flex;gap:8px;">
          ${ativa ? `
            <button
              class="btn-outline-primary"
              style="padding:6px 14px;font-size:12px;border-radius:8px;"
              onclick="finalizarManutencao(${m.id})"
            >
              <i class="ph ph-check-circle"></i> Finalizar
            </button>
          ` : ""}
          <button
            class="btn-outline-danger"
            style="padding:6px 14px;font-size:12px;border-radius:8px;"
            onclick="deletarManutencao(${m.id}, '${veiculoSelecionadoPlaca}')"
            ${ativa ? "disabled title='Finalize antes de excluir'" : ""}
          >
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
    `;

    container.appendChild(item);
  });
}

// ─── Modal de nova manutenção ─────────────────────────────────────────────────

function abrirManutencaoModal() {
  const placa = veiculoSelecionadoPlaca;
  if (!placa) return mostrarToast("Selecione um veículo primeiro.", "warning");

  // Limpa os campos
  ["inputManutData", "inputManutCusto", "inputManutOficina", "inputManutDescricao"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  document.getElementById("manutencaoModal")?.classList.remove("hidden");
}

async function salvarManutencao() {
  const placa   = veiculoSelecionadoPlaca;
  const veiculo = veiculosCache.find(v => v.placa === placa);
  if (!veiculo) return mostrarToast("Veículo não encontrado.", "error");

  const data    = document.getElementById("inputManutData")?.value;
  const custo   = document.getElementById("inputManutCusto")?.value;
  const oficina = document.getElementById("inputManutOficina")?.value.trim();
  const descr   = document.getElementById("inputManutDescricao")?.value.trim();

  if (!data)  return mostrarToast("Informe a data da manutenção.", "warning");
  if (!custo) return mostrarToast("Informe o custo.", "warning");

  const payload = {
    veiculo: veiculo.id,
    data,
    custo: Number(custo),
    oficina: oficina || null,
    descricao: descr || null,
  };

  try {
    const r = await fazerRequisicao("/manutencoes/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      const msg = err?.non_field_errors?.[0] ?? err?.detail ?? Object.values(err)?.[0]?.[0] ?? "Erro ao salvar manutenção.";
      return mostrarToast(msg, "error");
    }

    document.getElementById("manutencaoModal")?.classList.add("hidden");
    mostrarToast("Manutenção registrada! Veículo marcado como Em Manutenção.", "success");

    // Recarrega veículos e manutenções
    await carregarCacheVeiculos();
    await carregarVeiculos();

    // Re-seleciona o veículo e vai para aba de manutenção
    const vAtualizado = veiculosCache.find(v => v.placa === placa);
    const dispAtual   = disponibilidadesCache.find(d => d.id === vAtualizado?.disponibilidade);
    selecionarVeiculo(placa, dispAtual);
    _ativarAba("manutencaoVeiculo");

  } catch (e) {
    console.error(e);
    mostrarToast("Erro de conexão.", "error");
  }
}

async function finalizarManutencao(manutencaoId) {
  if (!confirm("Finalizar esta manutenção? O veículo será liberado se não houver outras manutenções ativas.")) return;

  try {
    const r = await fazerRequisicao(`/manutencoes/${manutencaoId}/finalizar/`, {
      method: "POST",
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return mostrarToast(err?.detail ?? "Erro ao finalizar manutenção.", "error");
    }

    mostrarToast("Manutenção finalizada!", "success");

    const placa = veiculoSelecionadoPlaca;
    await carregarCacheVeiculos();
    await carregarDisponibilidades();

    const vAtualizado = veiculosCache.find(v => v.placa === placa);
    const dispAtual   = disponibilidadesCache.find(d => d.id === vAtualizado?.disponibilidade);

    // Atualiza a lista lateral sem fechar o painel de detalhes
    _atualizarCartaoLista(placa, dispAtual);
    selecionarVeiculo(placa, dispAtual);
    _ativarAba("manutencaoVeiculo");

  } catch (e) {
    console.error(e);
    mostrarToast("Erro de conexão.", "error");
  }
}

async function deletarManutencao(manutencaoId, placa) {
  if (!confirm("Excluir este registro de manutenção?")) return;

  try {
    const r = await fazerRequisicao(`/manutencoes/${manutencaoId}/`, { method: "DELETE" });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return mostrarToast(err?.detail ?? "Erro ao excluir manutenção.", "error");
    }

    mostrarToast("Manutenção removida.", "success");
    carregarManutencoesDoVeiculo(placa, veiculosCache.find(v => v.placa === placa));

  } catch (e) {
    console.error(e);
    mostrarToast("Erro de conexão.", "error");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABASTECIMENTO
// ═══════════════════════════════════════════════════════════════════════════════

async function carregarAbastecimentosDoVeiculo(placa) {
  const container = document.getElementById("veiculoAbastecimentosList");
  if (!container) return;

  container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">Carregando...</p>`;

  try {
    const r = await fazerRequisicao(`/abastecimentos/?veiculo_placa=${placa}`);
    if (!r.ok) throw new Error("API falhou");
    const lista = await r.json();
    _renderizarListaAbastecimentos(container, lista);
  } catch (e) {
    console.error(e);
    container.innerHTML = `<p style="color:#ef4444;font-size:13px;">Erro ao carregar abastecimentos.</p>`;
  }
}

function _renderizarListaAbastecimentos(container, lista) {
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;
                  padding:2rem;color:var(--text-muted);">
        <i class="ph ph-gas-pump" style="font-size:48px;"></i>
        <p style="font-size:13px;">Nenhum abastecimento registrado.</p>
      </div>`;
    return;
  }

  lista.forEach(a => {
    const item = document.createElement("div");
    item.style.cssText = `
      background:var(--bg-main);
      border:1px solid var(--border);
      border-radius:12px;
      padding:16px;
      display:flex;
      flex-direction:column;
      gap:8px;
    `;

    const custo  = Number(a.custo_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const litros = Number(a.quantidade_litros).toFixed(2).replace(".", ",");
    const data   = a.data ? new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR") : "-";
    const tipo   = a.tipo_combustivel
      ? a.tipo_combustivel.charAt(0).toUpperCase() + a.tipo_combustivel.slice(1)
      : "-";

    item.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:14px;font-weight:700;color:var(--text);">
          <i class="ph ph-calendar" style="margin-right:4px;"></i>${data}
        </span>
        <span class="status-badge badge-route">
          <i class="ph ph-gas-pump"></i> ${tipo}
        </span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
        <span style="font-size:13px;color:var(--text-light);">
          <i class="ph ph-drop" style="margin-right:4px;"></i>${litros} L
        </span>
        <span style="font-size:13px;font-weight:600;color:var(--text);">
          <i class="ph ph-currency-dollar" style="margin-right:4px;"></i>${custo}
        </span>
      </div>
    `;

    container.appendChild(item);
  });
}

// ─── Modal de novo abastecimento ─────────────────────────────────────────────

function abrirAbastecimentoModal() {
  const placa = veiculoSelecionadoPlaca;
  if (!placa) return mostrarToast("Selecione um veículo primeiro.", "warning");

  ["inputAbastData", "inputAbastLitros", "inputAbastValor"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const sel = document.getElementById("inputAbastTipo");
  if (sel) sel.value = "";

  document.getElementById("abastecimentoModal")?.classList.remove("hidden");
}

async function salvarAbastecimento() {
  const placa   = veiculoSelecionadoPlaca;
  const veiculo = veiculosCache.find(v => v.placa === placa);
  if (!veiculo) return mostrarToast("Veículo não encontrado.", "error");

  const data   = document.getElementById("inputAbastData")?.value;
  const tipo   = document.getElementById("inputAbastTipo")?.value;
  const litros = document.getElementById("inputAbastLitros")?.value;
  const valor  = document.getElementById("inputAbastValor")?.value;

  if (!data)   return mostrarToast("Informe a data.", "warning");
  if (!tipo)   return mostrarToast("Selecione o tipo de combustível.", "warning");
  if (!litros) return mostrarToast("Informe a quantidade de litros.", "warning");
  if (!valor)  return mostrarToast("Informe o valor total.", "warning");

  const payload = {
    veiculo: veiculo.id,
    data,
    tipo_combustivel: tipo,
    quantidade_litros: Number(litros),
    custo_total: Number(valor),
  };

  try {
    const r = await fazerRequisicao("/abastecimentos/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      const msg = err?.non_field_errors?.[0] ?? err?.detail ?? Object.values(err)?.[0]?.[0] ?? "Erro ao registrar abastecimento.";
      return mostrarToast(msg, "error");
    }

    document.getElementById("abastecimentoModal")?.classList.add("hidden");
    mostrarToast("Abastecimento registrado!", "success");
    carregarAbastecimentosDoVeiculo(placa);
    _ativarAba("abastecimentoVeiculo");

  } catch (e) {
    console.error(e);
    mostrarToast("Erro de conexão.", "error");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRUD de veículo (cadastro / edição / deleção)
// ═══════════════════════════════════════════════════════════════════════════════

document.getElementById("addVeiculoBtn").onclick = () => {
  veiculoEditandoPlaca = null;
  limparFormularioVeiculo();
  atualizarControleDisponibilidadeVeiculo(null);
  document.getElementById("saveVeiculo").innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Veículo';
  document.getElementById("veiculoModal").classList.remove("hidden");
};

document.getElementById("cancelVeiculo").onclick = limparFormularioVeiculo;
document.getElementById("closeVeiculoModal").onclick = limparFormularioVeiculo;

document.getElementById("saveVeiculo").onclick = async () => {
  const dispSelect = document.getElementById("inputDisponibilidade");

  const dados = {
    placa:         obterValorInput("inputPlaca").toUpperCase(),
    marca:         obterValorInput("inputMarca").toUpperCase(),
    modelo:        obterValorInput("inputModelo").toUpperCase(),
    categoria:     obterValorInput("inputCategoria"),
    cnh_necessaria: obterValorInput("inputCnh").toUpperCase(),
    ano:           Number(obterValorInput("inputAno")),
    km:            Number(obterValorInput("inputKm")),
  };

  if (!dados.placa) return mostrarToast("Informe a placa do veículo.", "warning");

  if (!dispSelect?.disabled) {
    dados.disponibilidade = Number(obterValorInput("inputDisponibilidade"));
  }
  if (!dados.disponibilidade && !veiculoEditandoPlaca) {
    return mostrarToast("Selecione a disponibilidade.", "warning");
  }

  const caminho = veiculoEditandoPlaca ? `/veiculos/${veiculoEditandoPlaca}/` : `/veiculos/`;
  const metodo  = veiculoEditandoPlaca ? "PUT" : "POST";

  try {
    const resposta = await fazerRequisicao(caminho, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      const msg  = erro?.non_field_errors?.[0]
        ?? erro?.detail
        ?? Object.values(erro)?.[0]?.[0]
        ?? "Erro ao salvar veículo.";
      return mostrarToast(msg, "error");
    }

    const eraEdicao = !!veiculoEditandoPlaca;
    limparFormularioVeiculo();
    mostrarToast(eraEdicao ? "Veículo atualizado!" : "Veículo criado!", "success");
    await carregarVeiculos();

  } catch (e) {
    console.error(e);
    mostrarToast("Erro de conexão ao salvar veículo.", "error");
  }
};

function limparFormularioVeiculo() {
  veiculoEditandoPlaca = null;

  const placaInput = document.getElementById("inputPlaca");
  if (placaInput) placaInput.disabled = false;

  ["inputPlaca", "inputMarca", "inputModelo", "inputCategoria",
   "inputCnh", "inputAno", "inputKm", "inputDisponibilidade"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ""; el.dataset.id = ""; }
  });

  document.getElementById("veiculoModal").classList.add("hidden");
}

function editarVeiculo(placa) {
  const v = veiculosCache.find(ve => ve.placa == placa);
  if (!v) return;

  const campoVal = (idCampo, valor) => {
    const el = document.getElementById(idCampo);
    if (el) el.value = valor || "";
  };

  campoVal("inputPlaca",         v.placa);
  campoVal("inputMarca",         v.marca);
  campoVal("inputModelo",        v.modelo);
  campoVal("inputCategoria",     v.categoria);
  campoVal("inputCnh",           v.cnh_necessaria);
  campoVal("inputAno",           v.ano);
  campoVal("inputKm",            v.km);
  campoVal("inputDisponibilidade", v.disponibilidade);

  veiculoEditandoPlaca = placa;
  atualizarControleDisponibilidadeVeiculo(v);

  document.getElementById("inputPlaca").disabled = true;
  document.getElementById("saveVeiculo").innerHTML =
    '<i class="ph ph-pencil-simple"></i> Atualizar Veículo';
  document.getElementById("veiculoModal").classList.remove("hidden");
}

async function deletarVeiculo(placa) {
  try {
    const resposta = await fazerRequisicao(`/veiculos/${placa}/`, { method: "DELETE" });
    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      return mostrarToast(erro?.detail ?? "Erro ao excluir veículo.", "error");
    }
    mostrarToast("Veículo removido.", "success");
    await carregarVeiculos();
  } catch (erro) {
    console.error(erro);
    mostrarToast("Erro de conexão ao excluir veículo.", "error");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bindings dos modais de manutenção e abastecimento
// ═══════════════════════════════════════════════════════════════════════════════

// Botões "Nova Manutenção" e "Novo Abastecimento" nas abas
document.getElementById("btnAddManutencao")?.addEventListener("click", abrirManutencaoModal);
document.getElementById("btnAddAbastecimento")?.addEventListener("click", abrirAbastecimentoModal);

// Modal de manutenção
document.getElementById("saveManutencaoModal")?.addEventListener("click", salvarManutencao);
document.getElementById("cancelManutencaoModal")?.addEventListener("click", () => {
  document.getElementById("manutencaoModal")?.classList.add("hidden");
});
document.getElementById("closeManutencaoModal")?.addEventListener("click", () => {
  document.getElementById("manutencaoModal")?.classList.add("hidden");
});

// Modal de abastecimento
document.getElementById("saveAbastecimentoModal")?.addEventListener("click", salvarAbastecimento);
document.getElementById("cancelAbastecimentoModal")?.addEventListener("click", () => {
  document.getElementById("abastecimentoModal")?.classList.add("hidden");
});
document.getElementById("closeAbastecimentoModal")?.addEventListener("click", () => {
  document.getElementById("abastecimentoModal")?.classList.add("hidden");
});

// ─── Helpers internos ────────────────────────────────────────────────────────

function _ativarAba(tabId) {
  const botao = document.querySelector(`#veiculosDetail .details-tabs .tab[data-tab="${tabId}"]`);
  if (botao) botao.click();
}

function _atualizarCartaoLista(placa, dispAtual) {
  const cartao = document.querySelector(`#veiculosList .tracking-card[data-placa="${placa}"]`);
  if (!cartao) return;

  const dispCod = dispAtual?.codigo ?? "";
  const badge   = cartao.querySelector(".status-badge");
  if (badge) {
    badge.className = `status-badge ${classeBadgePorCodigo(dispCod)}`;
    badge.innerHTML = `<i class="ph ${iconeBadgePorCodigo(dispCod)}"></i> ${dispAtual?.nome ?? "-"}`;
  }
}

// Funções legadas de manutenção (podem ser removidas — mantidas por compatibilidade)
async function carregarManutencoes() { /* noop — gerenciado por veículo */ }
async function carregarAbastecimentos() { /* noop — gerenciado por veículo */ }

// ─── Exports globais ─────────────────────────────────────────────────────────
window.carregarCacheVeiculos      = carregarCacheVeiculos;
window.carregarCacheDisponibilidades = carregarCacheDisponibilidades;
window.carregarDisponibilidades   = carregarDisponibilidades;
window.carregarManutencoes        = carregarManutencoes;
window.carregarAbastecimentos     = carregarAbastecimentos;
window.finalizarManutencao        = finalizarManutencao;
window.deletarManutencao          = deletarManutencao;

// ─── Inicialização ────────────────────────────────────────────────────────────
initTabsVeiculos();