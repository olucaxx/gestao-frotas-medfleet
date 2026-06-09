let funcionarioSelecionadoId = null;
let cnhEditandoId = null;
let registroEditandoId = null;

const ENDPOINTS_FUNCIONARIO = {
  funcionarios: "/funcionarios/",
  cnhs: "/cnhs/",
  profissionaisSaude: "/profissionais-saude/",
  cargos: "/cargos/",
  tiposRegistro: "/tipos-registro/" 
};

function num(valor) {
  const n = Number(valor);
  return Number.isNaN(n) ? null : n;
}

function fmtDateBR(dataISO) {
  if (!dataISO) return "-";
  const partes = String(dataISO).split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataISO;
}

function normalizarValorInput(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function getDisponibilidadeNome(disponibilidadeId) {
  const disp = (typeof disponibilidadesCache !== "undefined" ? disponibilidadesCache : []).find(
    d => num(d.id) === num(disponibilidadeId)
  );
  return disp ? (disp.nome || disp.codigo || "-") : "-";
}

function atualizarControleDisponibilidadeFuncionario(funcionario = null) {
  const select = document.getElementById("inputFuncDisponibilidade");
  const hint = document.getElementById("hintFuncDisponibilidade");
  const vinculado = funcionario?.disponibilidade_controlada || funcionario?.equipe_atribuida;
  if (select) select.disabled = !!vinculado;
  if (hint) {
    hint.classList.toggle("hidden", !vinculado);
    hint.style.display = vinculado ? "block" : "none";
  }
}

function getTipoRegistroById(tipoRegistroId) {
  const tipos = typeof tiposRegistroCache !== "undefined" ? tiposRegistroCache : [];
  return tipos.find(t => num(t.id) === num(tipoRegistroId)) || null;
}

function getCargoById(cargoId) {
  const cargos = typeof cargosCache !== "undefined" ? cargosCache : [];
  return cargos.find(c => num(c.id) === num(cargoId)) || null;
}

function getCnhByFuncionarioId(funcionarioId) {
  const cnhs = typeof cnhsCache !== "undefined" ? cnhsCache : [];
  return cnhs.find(c => num(c.funcionario) === num(funcionarioId)) || null;
}

function getProfissionalSaudeByFuncionarioId(funcionarioId) {
  const profs = typeof profissionaisSaudeCache !== "undefined" ? profissionaisSaudeCache : [];
  return profs.find(p => num(p.funcionario) === num(funcionarioId)) || null;
}

function getCargoDoFuncionario(funcionarioId) {
  const prof = getProfissionalSaudeByFuncionarioId(funcionarioId);
  return prof ? getCargoById(prof.cargo) : null;
}

function getTipoRegistroDoCargo(cargo) {
  if (!cargo) return null;
  const tipoId = typeof cargo.tipo_registro === "object" && cargo.tipo_registro !== null
    ? cargo.tipo_registro.id
    : cargo.tipo_registro;
  return getTipoRegistroById(tipoId);
}

async function carregarCacheFuncionarios() {
  try {
    const resposta = await fazerRequisicao(ENDPOINTS_FUNCIONARIO.funcionarios);
    if (!resposta.ok) throw new Error("API falhou");
    funcionariosCache = await resposta.json();
  } catch (erro) {
    console.warn("(Funcionarios) Backend offline ou com erro.");
  }
}

async function carregarCacheCnhs() {
  try {
    const resposta = await fazerRequisicao(ENDPOINTS_FUNCIONARIO.cnhs);
    if (!resposta.ok) throw new Error("API falhou");
    cnhsCache = await resposta.json();
  } catch (erro) {
    console.warn("(CNH) Backend offline ou com erro.");
  }
}

async function carregarCacheProfissionaisSaude() {
  try {
    const resposta = await fazerRequisicao(ENDPOINTS_FUNCIONARIO.profissionaisSaude);
    if (!resposta.ok) throw new Error("API falhou");
    profissionaisSaudeCache = await resposta.json();
  } catch (erro) {
    console.warn("(ProfissionaisSaude) Backend offline ou com erro.");
  }
}

async function carregarCacheCargos() {
  try {
    const resposta = await fazerRequisicao(ENDPOINTS_FUNCIONARIO.cargos);
    if (!resposta.ok) throw new Error("API falhou");
    cargosCache = await resposta.json();
  } catch (erro) {
    console.warn("(Cargos) Backend offline ou com erro.");
  }
}

async function carregarCacheTiposRegistro() {
  try {
    const resposta = await fazerRequisicao(ENDPOINTS_FUNCIONARIO.tiposRegistro);
    if (!resposta.ok) throw new Error("API falhou");
    tiposRegistroCache = await resposta.json();
  } catch (erro) {
    console.warn("(TiposRegistro) Backend offline ou com erro.");
  }
}

async function carregarDependenciasFuncionarios() {
  await Promise.all([
    carregarCacheFuncionarios(),
    carregarCacheCnhs(),
    carregarCacheProfissionaisSaude(),
    carregarCacheCargos(),
    carregarCacheTiposRegistro(),
    typeof carregarDisponibilidades === "function" ? carregarDisponibilidades() : Promise.resolve()
  ]);

  atualizarSelectsFuncionario();
}

function atualizarSelectsFuncionario() {
  preencherSelect(
    "inputFuncDisponibilidade",
    typeof disponibilidadesCache !== "undefined" ? disponibilidadesCache : [],
    "Selecione...",
    d => d.id,
    d => d.nome || d.codigo || "Sem nome"
  );

  preencherSelect(
    "inputCnhFuncionario",
    typeof funcionariosCache !== "undefined" ? funcionariosCache : [],
    "Selecione...",
    f => f.matricula,
    f => `${f.nome} (${f.cpf})`
  );

  preencherSelect(
    "inputProfFuncionario",
    typeof funcionariosCache !== "undefined" ? funcionariosCache : [],
    "Selecione...",
    f => f.matricula,
    f => `${f.nome} (${f.cpf})`
  );

  const cargoSelect = document.getElementById("inputProfCargo");
  if (cargoSelect) {
    cargoSelect.innerHTML = '<option value="">Selecione...</option>';
    (typeof cargosCache !== "undefined" ? cargosCache : []).forEach(cargo => {
      const tipo = getTipoRegistroDoCargo(cargo);
      const option = document.createElement("option");
      option.value = cargo.id;
      option.textContent = tipo ? `${cargo.nome} - ${tipo.sigla}` : cargo.nome;
      cargoSelect.appendChild(option);
    });
  }
}

async function carregarFuncionarios(filtroCargo = null) {
  await carregarDependenciasFuncionarios();

  const lista = document.getElementById("funcionariosList");
  if (!lista) return;
  lista.innerHTML = "";

  const filtroNormalizado = filtroCargo !== null && filtroCargo !== undefined && filtroCargo !== ""
    ? String(filtroCargo)
    : null;

  const filtrados = (typeof funcionariosCache !== "undefined" ? funcionariosCache : []).filter(f => {
    if (!filtroNormalizado) return true;
    const cargo = getCargoDoFuncionario(f.matricula);
    if (!cargo) return false;
    return String(cargo.id) === filtroNormalizado || cargo.nome === filtroNormalizado;
  });

  const tituloEl = document.getElementById("funcionariosPageTitle");
  const subtituloEl = document.getElementById("funcionariosPageSubtitle");
  if (tituloEl) tituloEl.textContent = filtroNormalizado ? `${filtroNormalizado}s` : "Funcionários";
  if (subtituloEl) {
    subtituloEl.textContent = filtroNormalizado
      ? `Listando todos os ${filtroNormalizado.toLowerCase()}s vinculados à frota hospitalar`
      : "Todos os profissionais vinculados à frota hospitalar";
  }

  filtrados.forEach(f => {
    const cargo = getCargoDoFuncionario(f.matricula);
    const dispCod = getDispCodigo(f.disponibilidade);
    const dispNome = getDisponibilidadeNome(f.disponibilidade);
    const badgeEquipe = f.equipe_nome ? renderBadgeEquipeHtml(f.equipe_nome) : "";

    const badgeStatus = `<span class="status-badge ${classeBadgePorCodigo(dispCod)}"><i class="ph ${iconeBadgePorCodigo(dispCod)}"></i> ${dispNome}</span>`;

    const cartao = document.createElement("div");
    cartao.className = "tracking-card";
    cartao.dataset.id = f.matricula;
    cartao.classList.toggle("selected", num(f.matricula) === num(funcionarioSelecionadoId));

    cartao.innerHTML = `
      <div class="tc-header">
        <h3>${f.nome || "Sem nome"}</h3>
        ${badgeStatus}
      </div>
      <div style="font-size: 12px; color: var(--text-muted); margin-top: 5px; display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
        <span>${cargo ? cargo.nome : "Sem cargo"}</span>
        ${badgeEquipe}
      </div>
      <div class="tc-image" style="display: flex; justify-content: center; align-items: center; padding: 1rem 0;">
        <i class="ph ph-user-circle" style="font-size: 64px; color: var(--text-muted);"></i>
      </div>
    `;

    cartao.onclick = () => selecionarFuncionario(f.matricula);
    lista.appendChild(cartao);
  });

  if (typeof fecharDetalhes === "function") fecharDetalhes("funcionarios");
}

function selecionarFuncionario(matricula) {
  funcionarioSelecionadoId = matricula;

  const f = (typeof funcionariosCache !== "undefined" ? funcionariosCache : []).find(func => num(func.matricula) === num(matricula));
  if (!f) return;

  document.querySelectorAll("#funcionariosList .tracking-card").forEach(cartao => {
    cartao.classList.toggle("selected", num(cartao.dataset.id) === num(matricula));
  });

  const cnh = getCnhByFuncionarioId(matricula);
  const prof = getProfissionalSaudeByFuncionarioId(matricula);
  const cargo = prof ? getCargoById(prof.cargo) : null;
  const tipoRegistro = getTipoRegistroDoCargo(cargo);
  const dispNome = getDisponibilidadeNome(f.disponibilidade);

  const el = id => document.getElementById(id);

  if (el("detailFuncNome")) el("detailFuncNome").textContent = f.nome || "-";
  if (el("detailFuncCpf")) el("detailFuncCpf").textContent = f.cpf || "-";
  if (el("detailFuncNascimento")) el("detailFuncNascimento").textContent = fmtDateBR(f.data_nascimento);
  if (el("detailFuncTelefone")) el("detailFuncTelefone").textContent = f.telefone || "-";
  if (el("detailFuncEmail")) el("detailFuncEmail").textContent = f.email || "-";
  if (el("detailFuncDisponibilidade")) el("detailFuncDisponibilidade").textContent = dispNome;
  if (el("detailFuncEquipe")) {
    el("detailFuncEquipe").textContent = f.equipe_nome || "Sem equipe";
  }

  if (el("detailFuncStatus")) {
    const dispCod = getDispCodigo(f.disponibilidade);
    el("detailFuncStatus").className = `status-badge ${classeBadgePorCodigo(dispCod)}`;
    el("detailFuncStatus").innerHTML = `<i class="ph ${iconeBadgePorCodigo(dispCod)}"></i> ${dispNome}`;
  }

  if (el("detailCnhNumero")) el("detailCnhNumero").textContent = cnh?.numero || "-";
  if (el("detailCnhCategoria")) el("detailCnhCategoria").textContent = cnh?.categoria || "-";
  if (el("detailCnhValidade")) el("detailCnhValidade").textContent = fmtDateBR(cnh?.validade);

  if (el("detailCargoNome")) el("detailCargoNome").textContent = cargo?.nome || "-";
  if (el("detailTipoRegistro")) el("detailTipoRegistro").textContent = tipoRegistro?.sigla || "-";
  if (el("detailNumeroRegistro")) el("detailNumeroRegistro").textContent = prof?.numero_registro || "-";

  if (el("btnEditFuncionario")) el("btnEditFuncionario").onclick = () => editarFuncionario(f.matricula);
  if (el("btnDeleteFuncionario")) {
    el("btnDeleteFuncionario").onclick = () => {
      if (confirm(`Tem certeza que deseja remover o funcionário ${f.nome}?`)) {
        deletarFuncionario(f.matricula);
      }
    };
  }

  if (el("btnEditCnh")) el("btnEditCnh").onclick = () => editarCnh(f.matricula);
  if (el("btnDeleteCnh")) {
    el("btnDeleteCnh").onclick = () => {
      if (cnh && confirm(`Tem certeza que deseja remover a CNH de ${f.nome}?`)) {
        deletarCnh(cnh.id);
      }
    };
  }

  if (el("btnEditRegistro")) el("btnEditRegistro").onclick = () => editarProfissionalSaude(f.matricula);
  if (el("btnDeleteRegistro")) {
    el("btnDeleteRegistro").onclick = () => {
      if (prof && confirm(`Tem certeza que deseja remover o registro profissional de ${f.nome}?`)) {
        deletarProfissionalSaude(prof.id);
      }
    };
  }

  if (typeof mostrarDetalhes === "function") mostrarDetalhes("funcionarios");
}

function limparFormularioFuncionario() {
  ["inputFuncNome", "inputFuncCpf", "inputFuncNascimento", "inputFuncTelefone", "inputFuncEmail"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const disp = document.getElementById("inputFuncDisponibilidade");
  if (disp) disp.value = "";

  funcionarioEditandoId = null;
  const btn = document.getElementById("saveFuncionario");
  if (btn) btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Funcionário';

  const modal = document.getElementById("funcionarioModal");
  if (modal) modal.classList.add("hidden");
}

function abrirFuncionarioModal() {
  funcionarioEditandoId = null;
  limparFormularioFuncionario();
  atualizarControleDisponibilidadeFuncionario(null);
  const btn = document.getElementById("saveFuncionario");
  if (btn) btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Funcionário';
  const modal = document.getElementById("funcionarioModal");
  if (modal) modal.classList.remove("hidden");
}

function editarFuncionario(matricula) {
  const f = (typeof funcionariosCache !== "undefined" ? funcionariosCache : []).find(func => num(func.matricula) === num(matricula));
  if (!f) return;

  const campoVal = (idCampo, valor) => {
    const el = document.getElementById(idCampo);
    if (el) el.value = valor ?? "";
  };

  campoVal("inputFuncNome", f.nome);
  campoVal("inputFuncCpf", f.cpf);
  campoVal("inputFuncNascimento", f.data_nascimento);
  campoVal("inputFuncTelefone", f.telefone);
  campoVal("inputFuncEmail", f.email);
  campoVal("inputFuncDisponibilidade", f.disponibilidade);

  funcionarioEditandoId = f.matricula;
  atualizarControleDisponibilidadeFuncionario(f);

  const btn = document.getElementById("saveFuncionario");
  if (btn) btn.innerHTML = '<i class="ph ph-pencil-simple"></i> Atualizar Funcionário';

  const modal = document.getElementById("funcionarioModal");
  if (modal) modal.classList.remove("hidden");
}

async function salvarFuncionario() {
  const dados = {
    nome: normalizarValorInput("inputFuncNome"),
    cpf: normalizarValorInput("inputFuncCpf"),
    data_nascimento: normalizarValorInput("inputFuncNascimento"),
    telefone: normalizarValorInput("inputFuncTelefone"),
    email: normalizarValorInput("inputFuncEmail")
  };

  const dispSelect = document.getElementById("inputFuncDisponibilidade");
  if (!dispSelect?.disabled) {
    dados.disponibilidade = normalizarValorInput("inputFuncDisponibilidade");
  }

  if (!dados.nome) return mostrarToast("Informe o nome do funcionário.", "warning");
  if (!dados.cpf) return mostrarToast("Informe o CPF.", "warning");
  if (!dados.disponibilidade && !funcionarioEditandoId) {
    return mostrarToast("Selecione a disponibilidade.", "warning");
  }

  const caminho = funcionarioEditandoId
    ? `${ENDPOINTS_FUNCIONARIO.funcionarios}${funcionarioEditandoId}/`
    : ENDPOINTS_FUNCIONARIO.funcionarios;

  const metodo = funcionarioEditandoId ? "PUT" : "POST";

  try {
    const resposta = await fazerRequisicao(caminho, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      const msg = erro?.non_field_errors?.[0]
        ?? erro?.detail
        ?? Object.values(erro)?.[0]?.[0]
        ?? "Erro ao salvar funcionário.";
      return mostrarToast(msg, "error");
    }

    const eraEdicao = !!funcionarioEditandoId;
    funcionarioEditandoId = null;
    limparFormularioFuncionario();
    mostrarToast(eraEdicao ? "Funcionário atualizado!" : "Funcionário criado!", "success");
    await carregarDependenciasFuncionarios();
    await carregarFuncionarios();
  } catch (e) {
    console.error(e);
    mostrarToast("Erro de conexão ao salvar funcionário.", "error");
  }
}

async function deletarFuncionario(matricula) {
  try {
    const resposta = await fazerRequisicao(`${ENDPOINTS_FUNCIONARIO.funcionarios}${matricula}/`, { method: "DELETE" });
    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      return mostrarToast(erro?.detail ?? "Erro ao excluir funcionário.", "error");
    }

    if (num(funcionarioSelecionadoId) === num(matricula)) funcionarioSelecionadoId = null;
    mostrarToast("Funcionário removido.", "success");
    await carregarDependenciasFuncionarios();
    await carregarFuncionarios();
  } catch (e) {
    console.error(e);
    mostrarToast("Erro de conexão ao excluir funcionário.", "error");
  }
}

function limparFormularioCnh() {
  ["inputCnhFuncionario", "inputCnhNumero", "inputCnhCategoria", "inputCnhValidade"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  cnhEditandoId = null;
  const sel = document.getElementById("inputCnhFuncionario");
  if (sel) sel.disabled = false;

  const btn = document.getElementById("saveCnh");
  if (btn) btn.innerHTML = "Salvar CNH";

  const modal = document.getElementById("cnhModal");
  if (modal) modal.classList.add("hidden");
}

function abrirCnhModal(funcionarioId = null) {
  limparFormularioCnh();
  if (funcionarioId !== null && funcionarioId !== undefined) {
    const sel = document.getElementById("inputCnhFuncionario");
    if (sel) sel.value = funcionarioId;
  }
  const modal = document.getElementById("cnhModal");
  if (modal) modal.classList.remove("hidden");
}

function editarCnh(funcionarioId) {
  const cnh = getCnhByFuncionarioId(funcionarioId);
  cnhEditandoId = cnh ? cnh.id : null;

  const sel = document.getElementById("inputCnhFuncionario");
  if (sel) {
    sel.value = funcionarioId;
    sel.disabled = !!cnh;
  }

  const setVal = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.value = valor ?? "";
  };

  setVal("inputCnhNumero", cnh?.numero || "");
  setVal("inputCnhCategoria", cnh?.categoria || "");
  setVal("inputCnhValidade", cnh?.validade || "");

  const btn = document.getElementById("saveCnh");
  if (btn) btn.innerHTML = cnh ? "Atualizar CNH" : "Salvar CNH";

  const modal = document.getElementById("cnhModal");
  if (modal) modal.classList.remove("hidden");
}

async function salvarCnh() {
  const dados = {
    funcionario: funcionarioSelecionadoId,
    numero: normalizarValorInput("inputCnhNumero"),
    categoria: normalizarValorInput("inputCnhCategoria"),
    validade: normalizarValorInput("inputCnhValidade")
  };

  const caminho = cnhEditandoId ? `${ENDPOINTS_FUNCIONARIO.cnhs}${cnhEditandoId}/` : ENDPOINTS_FUNCIONARIO.cnhs;
  const metodo = cnhEditandoId ? "PUT" : "POST";

  const resposta = await fazerRequisicao(caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    return mostrarToast(erro?.detail ?? "Erro ao salvar CNH.", "error");
  }

  const eraEdicao = !!cnhEditandoId;
  cnhEditandoId = null;
  limparFormularioCnh();
  mostrarToast(eraEdicao ? "CNH atualizada!" : "CNH salva!", "success");
  await carregarDependenciasFuncionarios();
  await carregarFuncionarios();
}

async function deletarCnh(cnhId) {
  try {
    const resposta = await fazerRequisicao(`${ENDPOINTS_FUNCIONARIO.cnhs}${cnhId}/`, { method: "DELETE" });
    if (!resposta.ok) return mostrarToast("Erro ao excluir CNH.", "error");

    cnhEditandoId = null;
    mostrarToast("CNH removida.", "success");
    await carregarDependenciasFuncionarios();
    await carregarFuncionarios();
  } catch (e) {
    console.error(e);
    mostrarToast("Erro de conexão ao excluir CNH.", "error");
  }
}

function atualizarNumeroRegistroProfissional() {
  const cargoId = num(normalizarValorInput("inputProfCargo"));
  const cargo = getCargoById(cargoId);
  const tipoRegistro = getTipoRegistroDoCargo(cargo);

  const groupNumero = document.getElementById("groupNumeroRegistro");
  const inputNumero = document.getElementById("inputNumeroRegistro");
  const labelTipo = document.getElementById("labelTipoRegistro");

  if (groupNumero) groupNumero.classList.toggle("hidden", !tipoRegistro);
  if (inputNumero) {
    inputNumero.required = !!tipoRegistro;
    if (!tipoRegistro) inputNumero.value = "";
  }
  if (labelTipo) labelTipo.textContent = tipoRegistro?.sigla || "-";
}

function limparFormularioRegistro() {
  const cargo = document.getElementById("inputCargoRegistro");
  if (cargo) cargo.value = "";

  const numero = document.getElementById("inputNumeroRegistro");
  if (numero) numero.value = "";

  const tipo = document.getElementById("tipoRegistroLabel");
  if (tipo) tipo.value = "";

  registroEditandoId = null;

  const modal = document.getElementById("registroModal");
  if (modal) modal.classList.add("hidden");
}

function abrirProfissionalSaudeModal(funcionarioId = null) {
  limparFormularioRegistro();
  if (funcionarioId !== null && funcionarioId !== undefined) {
    const sel = document.getElementById("inputProfFuncionario");
    if (sel) sel.value = funcionarioId;
  }
  const modal = document.getElementById("profissionalSaudeModal");
  if (modal) modal.classList.remove("hidden");
}

function atualizarTipoRegistroSelecionado() {

    const cargoId = Number(
        document.getElementById("inputCargoRegistro").value
    );

    const cargo = cargosCache.find(
        c => Number(c.id) === cargoId
    );

    const tipoRegistro =
        typeof cargo?.tipo_registro === "object"
            ? cargo.tipo_registro
            : tiposRegistroCache.find(
                t => Number(t.id) === Number(cargo?.tipo_registro)
            );

    document.getElementById("tipoRegistroLabel").value =
        tipoRegistro?.sigla || "";
}

function editarProfissionalSaude(funcionarioId) {
  const prof = getProfissionalSaudeByFuncionarioId(funcionarioId);

  registroEditandoId = prof ? prof.id : null;

  const cargoSelect = document.getElementById("inputCargoRegistro");
  if (cargoSelect) {
    cargoSelect.innerHTML = '<option value="">Selecione...</option>';

    cargosCache.forEach(cargo => {
      const option = document.createElement("option");
      option.value = cargo.id;
      option.textContent = cargo.nome;
      cargoSelect.appendChild(option);
    });

    cargoSelect.value = prof?.cargo || "";
  }

  const numeroInput = document.getElementById("inputNumeroRegistro");
  if (numeroInput) {
    numeroInput.value = prof?.numero_registro || "";
  }

  atualizarTipoRegistroSelecionado();

  document.getElementById("registroModal").classList.remove("hidden");
}

async function salvarProfissionalSaude() {

  const dados = {
    funcionario: funcionarioSelecionadoId,
    cargo: Number(document.getElementById("inputCargoRegistro").value),
    numero_registro: document.getElementById("inputNumeroRegistro").value.trim()
  };

  const url = registroEditandoId
    ? `${ENDPOINTS_FUNCIONARIO.profissionaisSaude}${registroEditandoId}/`
    : ENDPOINTS_FUNCIONARIO.profissionaisSaude;

  const metodo = registroEditandoId ? "PUT" : "POST";

  const resposta = await fazerRequisicao(url, {
    method: metodo,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(dados)
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    return mostrarToast(erro?.detail ?? "Erro ao salvar registro profissional.", "error");
  }

  document.getElementById("registroModal").classList.add("hidden");

  const eraEdicao = !!registroEditandoId;
  registroEditandoId = null;
  mostrarToast(eraEdicao ? "Registro atualizado!" : "Registro salvo!", "success");

  await carregarDependenciasFuncionarios();
  await carregarFuncionarios();

  if (funcionarioSelecionadoId) {
    selecionarFuncionario(funcionarioSelecionadoId);
  }
}

async function deletarProfissionalSaude(profissionalId) {
  try {
    const resposta = await fazerRequisicao(`${ENDPOINTS_FUNCIONARIO.profissionaisSaude}${profissionalId}/`, { method: "DELETE" });
    if (!resposta.ok) return mostrarToast("Erro ao excluir registro profissional.", "error");

    registroEditandoId = null;
    mostrarToast("Registro profissional removido.", "success");
    await carregarDependenciasFuncionarios();
    await carregarFuncionarios();
  } catch (e) {
    console.error(e);
    mostrarToast("Erro de conexão ao excluir registro.", "error");
  }
}

function initTabsFuncionarios() {
  document.querySelectorAll("#funcionariosPage .details-tabs .tab").forEach(botao => {
    botao.addEventListener("click", () => {
      const painel = botao.closest(".vehicle-details-panel") || document;

      painel.querySelectorAll(".details-tabs .tab").forEach(t => t.classList.remove("active"));
      painel.querySelectorAll(".tab-content").forEach(c => {
        c.classList.remove("active");
        c.classList.add("hidden");
      });

      botao.classList.add("active");

      const alvo = painel.querySelector(`#${botao.dataset.tab}`) || document.getElementById(botao.dataset.tab);
      if (alvo) {
        alvo.classList.remove("hidden");
        alvo.classList.add("active");
      }
    });
  });
}

function bindFuncionarioEvents() {
  const btnAdd = document.getElementById("addFuncionarioBtn");
  if (btnAdd) {
    btnAdd.onclick = () => {
      abrirFuncionarioModal();
      carregarDependenciasFuncionarios().catch(console.error);
    };
  }

  const btnCancel = document.getElementById("cancelFuncionario");
  if (btnCancel) btnCancel.onclick = limparFormularioFuncionario;

  const btnClose = document.getElementById("closeFuncionarioModal");
  if (btnClose) btnClose.onclick = limparFormularioFuncionario;

  const btnSave = document.getElementById("saveFuncionario");
  if (btnSave) btnSave.onclick = salvarFuncionario;

  const btnEdit = document.getElementById("btnEditFuncionario");
  if (btnEdit) btnEdit.onclick = () => funcionarioSelecionadoId ? editarFuncionario(funcionarioSelecionadoId) : null;

  const btnDelete = document.getElementById("btnDeleteFuncionario");
  if (btnDelete) btnDelete.onclick = () => {
    if (funcionarioSelecionadoId && confirm("Tem certeza que deseja excluir este funcionário?")) {
      deletarFuncionario(funcionarioSelecionadoId);
    }
  };

  const btnEditCnh = document.getElementById("btnEditCnh");
  if (btnEditCnh) btnEditCnh.onclick = () => funcionarioSelecionadoId ? editarCnh(funcionarioSelecionadoId) : null;

  const btnDeleteCnh = document.getElementById("btnDeleteCnh");
  if (btnDeleteCnh) btnDeleteCnh.onclick = () => {
    const cnh = funcionarioSelecionadoId ? getCnhByFuncionarioId(funcionarioSelecionadoId) : null;
    if (cnh && confirm("Tem certeza que deseja excluir esta CNH?")) {
      deletarCnh(cnh.id);
    }
  };

  const btnEditProf = document.getElementById("btnEditProfissionalSaude");
  if (btnEditProf) btnEditProf.onclick = () => funcionarioSelecionadoId ? editarProfissionalSaude(funcionarioSelecionadoId) : null;

  const btnDeleteProf = document.getElementById("btnDeleteProfissionalSaude");
  if (btnDeleteProf) btnDeleteProf.onclick = () => {
    const prof = funcionarioSelecionadoId ? getProfissionalSaudeByFuncionarioId(funcionarioSelecionadoId) : null;
    if (prof && confirm("Tem certeza que deseja excluir este registro profissional?")) {
      deletarProfissionalSaude(prof.id);
    }
  };

  const selectCargo = document.getElementById("inputProfCargo");
  if (selectCargo) selectCargo.onchange = atualizarNumeroRegistroProfissional;

  const btnAddCnh = document.getElementById("btnAddCnh");
  if (btnAddCnh) btnAddCnh.onclick = async () => {
    await carregarDependenciasFuncionarios();
    abrirCnhModal(funcionarioSelecionadoId);
  };

  const btnSaveCnh = document.getElementById("saveCnh");
  if (btnSaveCnh) btnSaveCnh.onclick = salvarCnh;

  const btnCancelCnh = document.getElementById("cancelCnh");
  if (btnCancelCnh) btnCancelCnh.onclick = limparFormularioCnh;

  const btnCloseCnh = document.getElementById("closeCnhModal");
  if (btnCloseCnh) btnCloseCnh.onclick = limparFormularioCnh;

  const btnAddProf = document.getElementById("btnAddProfissionalSaude");
  if (btnAddProf) btnAddProf.onclick = async () => {
    await carregarDependenciasFuncionarios();
    abrirProfissionalSaudeModal(funcionarioSelecionadoId);
  };

  const btnSaveProf = document.getElementById("saveProfissionalSaude");
  if (btnSaveProf) btnSaveProf.onclick = salvarProfissionalSaude;

  const btnCancelProf = document.getElementById("cancelRegistro");
  if (btnCancelProf) btnCancelProf.onclick = limparFormularioRegistro;

  const btnCloseProf = document.getElementById("closeProfissionalSaudeModal");
  if (btnCloseProf) btnCloseProf.onclick = limparFormularioRegistro;
}

document
  .getElementById("inputCargoRegistro")
  ?.addEventListener("change", atualizarTipoRegistroSelecionado);

document
  .getElementById("saveRegistro")
  ?.addEventListener("click", salvarProfissionalSaude);

window.carregarCacheFuncionarios = carregarCacheFuncionarios;
window.carregarCacheCnhs = carregarCacheCnhs;
window.carregarCacheProfissionaisSaude = carregarCacheProfissionaisSaude;
window.carregarCacheCargos = carregarCacheCargos;
window.carregarCacheTiposRegistro = carregarCacheTiposRegistro;
window.carregarDependenciasFuncionarios = carregarDependenciasFuncionarios;
window.carregarFuncionarios = carregarFuncionarios;
window.selecionarFuncionario = selecionarFuncionario;
window.editarFuncionario = editarFuncionario;
window.deletarFuncionario = deletarFuncionario;
window.editarCnh = editarCnh;
window.deletarCnh = deletarCnh;
window.editarProfissionalSaude = editarProfissionalSaude;
window.deletarProfissionalSaude = deletarProfissionalSaude;
window.limparFormularioFuncionario = limparFormularioFuncionario;
window.limparFormularioCnh = limparFormularioCnh;
window.limparFormularioRegistro = limparFormularioRegistro;
window.atualizarNumeroRegistroProfissional = atualizarNumeroRegistroProfissional;

initTabsFuncionarios();
bindFuncionarioEvents();