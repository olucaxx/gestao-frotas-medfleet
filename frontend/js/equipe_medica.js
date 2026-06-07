let equipeSelecionadaId = null;
let equipeEditandoId = null;
let profissionaisSelecionadosIds = [];

const ENDPOINTS_EQUIPE = {
  equipes: "/equipes/"
};

function num(valor) {
  const n = Number(valor);
  return Number.isNaN(n) ? null : n;
}

function extrairId(valor) {
  if (valor && typeof valor === "object") {
    return valor.id ?? valor.matricula ?? null;
  }
  return valor;
}

function avisar(msg, tipo = "warning") {
  if (typeof mostrarToast === "function") {
    mostrarToast(msg, tipo);
  } else {
    alert(msg);
  }
}

function getFuncionarioByMatricula(matricula) {
  const lista = typeof funcionariosCache !== "undefined" ? funcionariosCache : [];
  return lista.find(f => num(f.matricula) === num(matricula)) || null;
}

function getCnhByFuncionarioId(funcionarioId) {
  const lista = typeof cnhsCache !== "undefined" ? cnhsCache : [];
  return lista.find(c => num(c.funcionario) === num(funcionarioId)) || null;
}

function getVeiculoById(veiculoId) {
  const lista = typeof veiculosCache !== "undefined" ? veiculosCache : [];
  return lista.find(v => num(v.id) === num(veiculoId)) || null;
}

function getDisponibilidadeById(disponibilidadeId) {
  const lista = typeof disponibilidadesCache !== "undefined" ? disponibilidadesCache : [];
  return lista.find(d => num(d.id) === num(disponibilidadeId)) || null;
}

function getProfissionalSaudeByFuncionarioId(funcionarioId) {
  const lista = typeof profissionaisSaudeCache !== "undefined" ? profissionaisSaudeCache : [];
  return lista.find(p => num(p.funcionario) === num(funcionarioId)) || null;
}

function getCargoById(cargoId) {
  const lista = typeof cargosCache !== "undefined" ? cargosCache : [];
  return lista.find(c => num(c.id) === num(cargoId)) || null;
}

function getCargoDoFuncionario(funcionarioId) {
  const prof = getProfissionalSaudeByFuncionarioId(funcionarioId);
  return prof ? getCargoById(prof.cargo) : null;
}

function getEquipeProfissionaisIds(eq) {
  const profissionais = Array.isArray(eq?.profissionais) ? eq.profissionais : [];
  return profissionais
    .map(p => extrairId(p))
    .filter(id => id !== null && id !== undefined);
}

function categoriaScore(cat) {
  const c = String(cat || "").trim().toUpperCase();
  const ordem = { A: 1, B: 2, C: 3, D: 4, E: 5 };
  return ordem[c] || 0;
}

function condutorAptoParaVeiculo(funcionarioId, veiculoId) {
  const cnh = getCnhByFuncionarioId(funcionarioId);
  const veiculo = getVeiculoById(veiculoId);
  if (!cnh || !veiculo) return false;
  return categoriaScore(cnh.categoria) >= categoriaScore(veiculo.cnh_necessaria);
}

function classeBadgeDisponibilidade(disponibilidade) {
  const texto = String(disponibilidade?.nome || disponibilidade?.codigo || disponibilidade || "").toUpperCase();

  if (texto.includes("ATEND")) return "badge-route";
  if (texto.includes("INAT")) return "badge-maintenance";
  return "badge-available";
}

function textoDisponibilidade(disponibilidade) {
  if (!disponibilidade) return "-";
  return disponibilidade.nome || disponibilidade.codigo || "-";
}

function popularSelect(selectId, itens, getValue, getLabel, placeholder = "selecione...") {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = `<option value="">${placeholder}</option>`;

  itens.forEach(item => {
    const option = document.createElement("option");
    option.value = getValue(item);
    option.textContent = getLabel(item);
    select.appendChild(option);
  });
}

function labelCondutor(funcionario) {
  const cnh = getCnhByFuncionarioId(funcionario.matricula);
  const cnhTexto = cnh ? `CNH ${cnh.categoria}` : "Sem CNH";
  return `${funcionario.nome} (${funcionario.matricula}) - ${cnhTexto}`;
}

function labelVeiculo(veiculo) {
  return `${veiculo.marca || ""} ${veiculo.modelo || ""} - ${veiculo.placa}`.trim();
}

function labelProfissional(funcionario) {
  const prof = getProfissionalSaudeByFuncionarioId(funcionario.matricula);
  const cargo = prof ? getCargoById(prof.cargo) : null;
  return cargo ? `${funcionario.nome} - ${cargo.nome}` : `${funcionario.nome}`;
  }

async function carregarCacheEquipes() {
  try {
    const resposta = await fazerRequisicao("/equipes/");

    if (!resposta.ok) {
      throw new Error("API falhou");
    }

    equipesCache = await resposta.json();

  } catch (erro) {
    console.warn("(Equipes) Backend offline ou com erro.");
  }
}

async function carregarDependenciasEquipe() {
  await Promise.all([
    typeof carregarCacheFuncionarios === "function" ? carregarCacheFuncionarios() : Promise.resolve(),
    typeof carregarCacheCnhs === "function" ? carregarCacheCnhs() : Promise.resolve(),
    typeof carregarCacheVeiculos === "function" ? carregarCacheVeiculos() : Promise.resolve(),
    typeof carregarCacheDisponibilidades === "function" ? carregarCacheDisponibilidades() : Promise.resolve(),
    typeof carregarCacheProfissionaisSaude === "function" ? carregarCacheProfissionaisSaude() : Promise.resolve(),
    typeof carregarCacheCargos === "function" ? carregarCacheCargos() : Promise.resolve()
  ]);

  atualizarSelectsEquipe();
}

function atualizarSelectsEquipe() {
  const funcionarios = typeof funcionariosCache !== "undefined" ? funcionariosCache : [];
  const veiculos = typeof veiculosCache !== "undefined" ? veiculosCache : [];
  const disponibilidades = typeof disponibilidadesCache !== "undefined" ? disponibilidadesCache : [];

  popularSelect(
    "inputEquipeCondutor",
    funcionarios,
    f => f.matricula,
    labelCondutor
  );

  popularSelect(
    "inputEquipeVeiculo",
    veiculos,
    v => v.id,
    labelVeiculo
  );

  popularSelect(
    "inputEquipeDisponibilidade",
    disponibilidades,
    d => d.id,
    d => d.nome || d.codigo || "sem nome"
  );

  atualizarSelectProfissionaisEquipe();
}

function atualizarSelectProfissionaisEquipe() {
  const select = document.getElementById("inputEquipeMembroBuscar");
  if (!select) return;

  const funcionarios = typeof funcionariosCache !== "undefined" ? funcionariosCache : [];
  const condutorId = num(document.getElementById("inputEquipeCondutor")?.value);

  select.innerHTML = '<option value="">selecione um profissional...</option>';

  funcionarios
    .filter(f => num(f.matricula) !== condutorId)
    .filter(f => !profissionaisSelecionadosIds.some(id => num(id) === num(f.matricula)))
    .forEach(f => {
      const option = document.createElement("option");
      option.value = f.matricula;
      option.textContent = labelProfissional(f);
      select.appendChild(option);
    });
}

function renderizarChipsProfissionais() {
  const container = document.getElementById("equipeMembrosChipsContainer");
  if (!container) return;

  container.innerHTML = "";

  if (profissionaisSelecionadosIds.length === 0) {
    container.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">nenhum profissional selecionado</span>`;
    return;
  }

  profissionaisSelecionadosIds.forEach(id => {
    const f = getFuncionarioByMatricula(id);
    if (!f) return;

    const prof = getProfissionalSaudeByFuncionarioId(id);
    const cargo = prof ? getCargoById(prof.cargo) : null;

    const chip = document.createElement("div");
    chip.style.display = "inline-flex";
    chip.style.alignItems = "center";
    chip.style.gap = "6px";
    chip.style.background = "var(--bg-main)";
    chip.style.border = "1px solid var(--border)";
    chip.style.borderRadius = "20px";
    chip.style.padding = "6px 12px";
    chip.style.fontSize = "13px";
    chip.style.color = "var(--text)";

    chip.innerHTML = `
      <span style="font-weight: 500;">${f.nome}${cargo ? ` (${cargo.nome})` : ""}</span>
      <i class="ph ph-x" style="cursor:pointer;color:#ef4444;font-weight:bold;" onclick="removerMembroDeEquipe(${f.matricula})"></i>
    `;

    container.appendChild(chip);
  });
}

window.removerMembroDeEquipe = function (id) {
  const selectCondutor = document.getElementById("inputEquipeCondutor")

  if (num(id) === num(selectCondutor.value)) {
      avisar("o condutor não pode ser removido da equipe.", "warning");
      return;
  }

  profissionaisSelecionadosIds = profissionaisSelecionadosIds.filter(mId => num(mId) !== num(id));
  renderizarChipsProfissionais();
  atualizarSelectProfissionaisEquipe();
};

async function carregarEquipes() {
  if (typeof carregarCacheEquipes === "function") {
    await carregarCacheEquipes();
  }

  await carregarDependenciasEquipe();

  const lista = document.getElementById("equipeMedicaList");
  if (!lista) return;
  lista.innerHTML = "";

  const equipes = typeof equipesCache !== "undefined" ? equipesCache : [];

  equipes.forEach(eq => {
    const condutorId = extrairId(eq.condutor);
    const veiculoId = extrairId(eq.veiculo);
    const disponibilidadeId = extrairId(eq.disponibilidade);

    const condutor = getFuncionarioByMatricula(condutorId);
    const veiculo = getVeiculoById(veiculoId);
    const disponibilidade = getDisponibilidadeById(disponibilidadeId);

    const condutorApto = condutorAptoParaVeiculo(condutorId, veiculoId);
    const badgeStatus = disponibilidade
      ? `<span class="status-badge ${classeBadgeDisponibilidade(disponibilidade)}"><i class="ph ph-users"></i> ${textoDisponibilidade(disponibilidade)}</span>`
      : `<span class="status-badge badge-available"><i class="ph ph-users"></i> -</span>`;

    const cartao = document.createElement("div");
    cartao.className = "tracking-card";
    cartao.dataset.id = eq.id;
    cartao.classList.toggle("selected", num(eq.id) === num(equipeSelecionadaId));

    cartao.innerHTML = `
      <div class="tc-header">
        <h3 style="font-size: 15px;">${eq.nome_equipe || "sem nome"}</h3>
        ${badgeStatus}
      </div>

      <div style="font-size: 13px; color: var(--text-light); margin-top: 10px; display: flex; flex-direction: column; gap: 4px;">
        <div><i class="ph ph-user"></i> condutor: ${condutor ? condutor.nome : "-"}</div>
        <div><i class="ph ph-ambulance"></i> veículo: ${veiculo ? veiculo.placa : "-"}</div>
        <div><i class="ph ph-users"></i> ${getEquipeProfissionaisIds(eq).length} profissionais</div>
      </div>

      <div style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span class="status-badge ${condutorApto ? "badge-available" : "badge-emergency"}">
          <i class="ph ph-steering-wheel"></i> ${condutorApto ? "condutor apto" : "condutor incompatível"}
        </span>
      </div>
    `;

    cartao.onclick = () => selecionarEquipe(eq.id);
    lista.appendChild(cartao);
  });

  if (typeof fecharDetalhes === "function") fecharDetalhes("equipeMedica");
}

function selecionarEquipe(id) {
  equipeSelecionadaId = id;

  const eq = (typeof equipesCache !== "undefined" ? equipesCache : []).find(e => num(e.id) === num(id));
  if (!eq) return;

  document.querySelectorAll("#equipeMedicaList .tracking-card").forEach(cartao => {
    cartao.classList.toggle("selected", num(cartao.dataset.id) === num(id));
  });

  const condutorId = extrairId(eq.condutor);
  const veiculoId = extrairId(eq.veiculo);
  const disponibilidadeId = extrairId(eq.disponibilidade);

  const condutor = getFuncionarioByMatricula(condutorId);
  const veiculo = getVeiculoById(veiculoId);
  const disponibilidade = getDisponibilidadeById(disponibilidadeId);
  const condutorCnh = getCnhByFuncionarioId(condutorId);
  const apto = condutorAptoParaVeiculo(condutorId, veiculoId);

  const el = idDoc => document.getElementById(idDoc);

  if (el("detailEquipeNome")) el("detailEquipeNome").textContent = eq.nome_equipe || "-";

  if (el("detailEquipeStatus")) {
    const statusEl = el("detailEquipeStatus");
    statusEl.className = `status-badge ${classeBadgeDisponibilidade(disponibilidade)}`;
    statusEl.innerHTML = `<i class="ph ph-users"></i> ${textoDisponibilidade(disponibilidade)}`;
  }

  if (el("detailEquipeCondutor")) {
    el("detailEquipeCondutor").textContent = condutor
      ? `${condutor.nome}`
      : "-";
  }

  if (el("detailEquipeVeiculo")) {
    el("detailEquipeVeiculo").textContent = veiculo
      ? `${veiculo.marca || ""} ${veiculo.modelo || ""} - ${veiculo.placa}`
      : "-";
  }

  if (el("detailEquipeDisponibilidade")) {
    el("detailEquipeDisponibilidade").textContent = textoDisponibilidade(disponibilidade);
  }

  const containerListaProfissionais = el("detailEquipeMembrosList");
  if (containerListaProfissionais) {
    containerListaProfissionais.innerHTML = "";
    const profissionaisIds = getEquipeProfissionaisIds(eq);

    if (profissionaisIds.length === 0) {
      containerListaProfissionais.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">nenhum profissional cadastrado</span>`;
    } else {
      profissionaisIds.forEach(matricula => {
        const f = getFuncionarioByMatricula(matricula);
        if (!f) return;

        const prof = getProfissionalSaudeByFuncionarioId(matricula);
        const cargo = prof ? getCargoById(prof.cargo) : null;

        const item = document.createElement("div");
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.justifyContent = "space-between";
        item.style.padding = "10px 14px";
        item.style.background = "var(--bg-card)";
        item.style.border = "1px solid var(--border)";
        item.style.borderRadius = "10px";

        item.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;">
            <i class="ph ph-user-circle" style="font-size:24px;color:var(--text-light);"></i>
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--text);">${f.nome}</div>
              <div style="font-size:12px;color:var(--text-light);">${cargo ? cargo.nome : "sem cargo"}</div>
            </div>
          </div>
          <div>
            ${cargo ? `<span class="status-badge badge-route">${cargo.nome}</span>` : ""}
          </div>
        `;

        containerListaProfissionais.appendChild(item);
      });
    }
  }

  if (el("btnEditEquipe")) el("btnEditEquipe").onclick = () => editarEquipe(eq.id);
  if (el("btnDeleteEquipe")) {
    el("btnDeleteEquipe").onclick = () => {
      if (confirm(`tem certeza que deseja remover a equipe "${eq.nome_equipe}"?`)) {
        deletarEquipe(eq.id);
      }
    };
  }

  if (typeof mostrarDetalhes === "function") mostrarDetalhes("equipeMedica");
}

function limparFormularioEquipe() {
  const nome = document.getElementById("inputEquipeNome");
  const condutor = document.getElementById("inputEquipeCondutor");
  const veiculo = document.getElementById("inputEquipeVeiculo");
  const disponibilidade = document.getElementById("inputEquipeDisponibilidade");
  const membro = document.getElementById("inputEquipeMembroBuscar");

  if (nome) nome.value = "";
  if (condutor) condutor.value = "";
  if (veiculo) veiculo.value = "";
  if (disponibilidade) disponibilidade.value = "";
  if (membro) membro.value = "";

  equipeEditandoId = null;
  profissionaisSelecionadosIds = [];

  const btn = document.getElementById("saveEquipeMedica");
  if (btn) btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Equipe';

  renderizarChipsProfissionais();
  atualizarSelectProfissionaisEquipe();

  const modal = document.getElementById("equipeMedicaModal");
  if (modal) modal.classList.add("hidden");
}

function abrirEquipeModal() {
  limparFormularioEquipe();
  const btn = document.getElementById("saveEquipeMedica");
  if (btn) btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Equipe';

  const modal = document.getElementById("equipeMedicaModal");
  if (modal) modal.classList.remove("hidden");
}

function editarEquipe(id) {
  const eq = (typeof equipesCache !== "undefined" ? equipesCache : []).find(e => num(e.id) === num(id));
  if (!eq) return;

  const nome = document.getElementById("inputEquipeNome");
  const condutor = document.getElementById("inputEquipeCondutor");
  const veiculo = document.getElementById("inputEquipeVeiculo");
  const disponibilidade = document.getElementById("inputEquipeDisponibilidade");
  const membro = document.getElementById("inputEquipeMembroBuscar");

  if (nome) nome.value = eq.nome_equipe || "";
  if (condutor) condutor.value = extrairId(eq.condutor) || "";
  if (veiculo) veiculo.value = extrairId(eq.veiculo) || "";
  if (disponibilidade) disponibilidade.value = extrairId(eq.disponibilidade) || "";
  if (membro) membro.value = "";

  equipeEditandoId = eq.id;

  const condutorId = extrairId(eq.condutor);
  profissionaisSelecionadosIds = getEquipeProfissionaisIds(eq).filter(m => num(m) !== num(condutorId));

  if (!profissionaisSelecionadosIds.includes(condutor.value)) {
    profissionaisSelecionadosIds.push(condutor.value);
  }

  atualizarSelectProfissionaisEquipe();
  renderizarChipsProfissionais();

  const btn = document.getElementById("saveEquipeMedica");
  if (btn) btn.innerHTML = '<i class="ph ph-pencil-simple"></i> Atualizar Equipe';

  const modal = document.getElementById("equipeMedicaModal");
  if (modal) modal.classList.remove("hidden");
}

async function salvarEquipe() {
  const nome = String(document.getElementById("inputEquipeNome")?.value || "").trim();
  const condutorId = num(document.getElementById("inputEquipeCondutor")?.value);
  const veiculoId = num(document.getElementById("inputEquipeVeiculo")?.value);
  const disponibilidadeId = num(document.getElementById("inputEquipeDisponibilidade")?.value);

  const profissionaisIds = [...new Set(
    profissionaisSelecionadosIds.map(num).filter(id => id !== null)
  )];

  if (!profissionaisIds.includes(condutorId)) {
    profissionaisIds.push(condutorId);
  }

  if (!nome) return avisar("informe o nome da equipe", "warning");
  if (!condutorId) return avisar("selecione um condutor", "warning");
  if (!veiculoId) return avisar("selecione um veículo", "warning");
  if (!disponibilidadeId) return avisar("selecione a disponibilidade", "warning");
  if (profissionaisIds.length === 0) return avisar("adicione pelo menos 1 profissional", "warning");

  if (!condutorAptoParaVeiculo(condutorId, veiculoId)) {
    return avisar("o condutor precisa ter CNH igual ou superior à exigida pelo veículo", "error");
  }

  const dados = {
    nome_equipe: nome,
    condutor: condutorId,
    profissionais: profissionaisIds,
    veiculo: veiculoId,
    disponibilidade: disponibilidadeId
  };

  const url = equipeEditandoId
    ? `${ENDPOINTS_EQUIPE.equipes}${equipeEditandoId}/`
    : ENDPOINTS_EQUIPE.equipes;

  const metodo = equipeEditandoId ? "PUT" : "POST";

  const resposta = await fazerRequisicao(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });

  if (!resposta.ok) {
    const erro = await resposta.json();
    const mensagem = erro?.non_field_errors?.[0] || "Erro desconhecido";
    return avisar(mensagem, "error");
  }

  equipeEditandoId = null;
  limparFormularioEquipe();
  await carregarEquipes();
}

async function deletarEquipe(id) {
  const resposta = await fazerRequisicao(`${ENDPOINTS_EQUIPE.equipes}${id}/`, {
    method: "DELETE"
  });

  if (!resposta.ok) throw new Error("erro ao excluir equipe");

  if (num(equipeSelecionadaId) === num(id)) equipeSelecionadaId = null;
  await carregarEquipes();
}

function bindEquipeEvents() {
  const btnAdd = document.getElementById("addEquipeBtn");
  if (btnAdd) {
    btnAdd.onclick = async () => {
      await carregarDependenciasEquipe();
      abrirEquipeModal();
    };
  }

  const btnCancel = document.getElementById("cancelEquipeMedica");
  if (btnCancel) btnCancel.onclick = limparFormularioEquipe;

  const btnClose = document.getElementById("closeEquipeMedicaModal");
  if (btnClose) btnClose.onclick = limparFormularioEquipe;

  const btnSave = document.getElementById("saveEquipeMedica");
  if (btnSave) btnSave.onclick = salvarEquipe;

  const selectCondutor = document.getElementById("inputEquipeCondutor");
  if (selectCondutor) {
    selectCondutor.onchange = () => {
      const idCondutor = num(selectCondutor.value);
      if (!idCondutor) return;

      if (!profissionaisSelecionadosIds.some(id => num(id) === idCondutor)) {
        profissionaisSelecionadosIds.push(idCondutor);
      }
      
      renderizarChipsProfissionais();
      atualizarSelectProfissionaisEquipe();
    };
  }

  const selectProfissional = document.getElementById("inputEquipeMembroBuscar");
  if (selectProfissional) {
    selectProfissional.onchange = () => {
      const valor = num(selectProfissional.value);
      if (!valor) return;

      if (!profissionaisSelecionadosIds.some(id => num(id) === valor)) {
        profissionaisSelecionadosIds.push(valor);
      }

      selectProfissional.value = "";
      renderizarChipsProfissionais();
      atualizarSelectProfissionaisEquipe();
    };
  }
}

window.carregarEquipes = carregarEquipes;
window.selecionarEquipe = selecionarEquipe;
window.editarEquipe = editarEquipe;
window.deletarEquipe = deletarEquipe;
window.limparFormularioEquipe = limparFormularioEquipe;
window.abrirEquipeModal = abrirEquipeModal;

bindEquipeEvents();