let veiculoSelecionadoPlaca = null;
let veiculoEditandoPlaca = null;
let disponibilidadesCache = [];


async function carregarCacheDisponibilidades() {
  try {
    const resposta = await fazerRequisicao("/disponibilidades/");
    if (!resposta.ok) throw new Error("Erro ao carregar disponibilidades");
    disponibilidadesCache = await resposta.json()
  } catch (erro) {
    console.warn("(Disponibilidade) Backend offline ou com erro.");
  }
}

async function carregarDisponibilidades() {
  try {
    carregarCacheDisponibilidades();
    const select = document.getElementById("inputDisponibilidade");

    if (!select) return;

    select.innerHTML =
      '<option value="">Selecione...</option>';

    disponibilidadesCache.forEach(d => {
      select.innerHTML += `
        <option value="${d.id}">
          ${d.nome}
        </option>
      `;
    });

  } catch (erro) {
    console.error(erro);
  }
}

async function carregarCacheVeiculos() {
  try {
    const resposta = await fazerRequisicao("/veiculos/");
    if (!resposta.ok) throw new Error("API falhou");
    veiculosCache = await resposta.json();
  } catch (erro) {
    console.warn("(Veiculos) Backend offline ou com erro.");
  }
}

async function carregarVeiculos() {
  await carregarDisponibilidades();
  await carregarCacheVeiculos();

  const lista = document.getElementById("veiculosList");
  if (!lista) return;
  lista.innerHTML = "";

  veiculosCache.forEach((v, index) => {
    const cartao = document.createElement("div");
    cartao.className = "tracking-card";
    cartao.dataset.placa = v.placa;
    cartao.classList.toggle("selected", v.placa === veiculoSelecionadoPlaca);

    const statusAtual = disponibilidadesCache.find(d => d.id === v.disponibilidade);

    cartao.innerHTML = `
      <div class="tc-header">
        <h3>${v.placa}</h3>
        <span class="status-badge ${statusAtual.codigo}">
          <i class="${statusAtual.codigo}"></i> ${statusAtual.nome}
        </span>
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

function selecionarVeiculo(placa, statusAtual) {
  veiculoSelecionadoPlaca = placa;

  const v = veiculosCache.find(
    ve => ve.placa === placa
  );

  if (!v) return;

  document.querySelectorAll("#veiculosList .tracking-card")
    .forEach(cartao => {
      cartao.classList.toggle(
        "selected",
        cartao.querySelector("h3").textContent === placa
      );
    });

  const el = idDoc => document.getElementById(idDoc);
  if (el("detailPlate")) el("detailPlate").textContent = v.placa;
  
  if (el("detailStatus")) {
    const statusEl = el("detailStatus");
    statusEl.className = `status-badge ${statusAtual.codigo}`;
    statusEl.innerHTML = `<i class="ph ${statusAtual.codigo}"></i> ${statusAtual.nome}`;
  }

  if (el("detailModelo")) el("detailModelo").textContent = `${v.marca || ''} ${v.modelo || ''}`;
  if (el("detailCategoria")) el("detailCategoria").textContent = v.categoria || 'Não definida';
  if (el("detailAno")) el("detailAno").textContent = v.ano || '-';
  if (el("detailKm")) el("detailKm").textContent = `${v.km || 0} km`;
  if (el("detailCnh"))
  el("detailCnh").textContent =
      v.cnh_necessaria || "-";

  const disponibilidadeObj =
    disponibilidadesCache.find(
        d => d.id == v.disponibilidade
    );

  if (el("detailDisponibilidade")) {
      el("detailDisponibilidade").textContent =
          disponibilidadeObj
              ? disponibilidadeObj.nome
              : "-";
  }

  if (el("btnEditVeiculo")) el("btnEditVeiculo").onclick = () => editarVeiculo(v.placa);
  if (el("btnDeleteVeiculo")) {
    el("btnDeleteVeiculo").onclick = () => {
      if (confirm(`Tem certeza que deseja remover o veículo ${v.placa}?`)) {
        deletarVeiculo(v.placa);
      }
    };
  }

  mostrarDetalhes('veiculos');
}

document.getElementById("addVeiculoBtn").onclick = () => {
  veiculoEditandoPlaca = null;
  limparFormularioVeiculo();
  document.getElementById("saveVeiculo").innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Veículo';
  document.getElementById("veiculoModal").classList.remove("hidden");
};

document.getElementById("cancelVeiculo").onclick = limparFormularioVeiculo;
document.getElementById("closeVeiculoModal").onclick = limparFormularioVeiculo;

document.getElementById("saveVeiculo").onclick = async () => {

  const dados = {
    placa: obterValorInput("inputPlaca").toUpperCase(),
    marca: obterValorInput("inputMarca").toUpperCase(),
    modelo: obterValorInput("inputModelo").toUpperCase(),
    categoria: obterValorInput("inputCategoria"),
    cnh_necessaria: obterValorInput("inputCnh").toUpperCase(),
    ano: Number(obterValorInput("inputAno")),
    km: Number(obterValorInput("inputKm")),
    disponibilidade: Number(obterValorInput("inputDisponibilidade"))
  };

  const caminho = veiculoEditandoPlaca
      ? `/veiculos/${veiculoEditandoPlaca}/`
      : `/veiculos/`;

  const metodo = veiculoEditandoPlaca
      ? "PUT"
      : "POST";

  const resposta = await fazerRequisicao(caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(dados)
  });

  if (!resposta.ok) {
    console.log(await resposta.text());
    throw new Error("Erro ao salvar veículo");
  }

  limparFormularioVeiculo();
  carregarVeiculos();
};

function limparFormularioVeiculo() {
  veiculoEditandoPlaca = null;

  const placaInput = document.getElementById("inputPlaca");

  if (placaInput) {
    placaInput.disabled = false;
  }

  [
  "inputPlaca",
  "inputMarca",
  "inputModelo",
  "inputCategoria",
  "inputCnh",
  "inputAno",
  "inputKm",
  "inputDisponibilidade"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = "";
      el.dataset.id = "";
    }
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

  campoVal("inputPlaca", v.placa);
  campoVal("inputMarca", v.marca);
  campoVal("inputModelo", v.modelo);
  campoVal("inputCategoria", v.categoria);
  campoVal("inputCnh", v.cnh_necessaria);
  campoVal("inputAno", v.ano);
  campoVal("inputKm", v.km);
  campoVal("inputDisponibilidade", v.disponibilidade);

  veiculoEditandoPlaca = placa;

  document.getElementById("inputPlaca").disabled = true;

  document.getElementById("saveVeiculo").innerHTML =
    '<i class="ph ph-pencil-simple"></i> Atualizar Veículo';

  document.getElementById("veiculoModal").classList.remove("hidden");
}

async function deletarVeiculo(placa) {
  try {
    const resposta = await fazerRequisicao(`/veiculos/${placa}/`, { method: "DELETE" });
    if (!resposta.ok) throw new Error("Erro na API");
  } catch (erro) {
    console.warn("Backend offline.");
  }
  carregarVeiculos();
}

// ----------------------------------------------------
// Seção de Manutenções
// ----------------------------------------------------
let usandoMockManutencoes = false;
let manutencoesCache = [
  { id: 1, veiculo_placa: "AMB-1020", data: "2026-05-10", status: "Concluída", veiculo_id: 1 },
  { id: 2, veiculo_placa: "HOS-4B21", data: "2026-05-15", status: "Em Andamento", veiculo_id: 2 },
  { id: 3, veiculo_placa: "MED-9C44", data: "2026-05-20", status: "Agendada", veiculo_id: 3 }
];

async function carregarManutencoes() {
  await carregarCacheVeiculos();

  let dados = [];
  try {
    if (usandoMockManutencoes) {
      dados = manutencoesCache;
    } else {
      dados = await fazerRequisicao("/manutencoes").then(r => {
        if (!r.ok) throw new Error("API falhou");
        return r.json();
      });
    }
  } catch (erro) {
    console.warn("Backend offline, usando dados mockados de manutenções");
    usandoMockManutencoes = true;
    dados = manutencoesCache;
  }

  const lista = document.getElementById("manutencoesList");
  if (!lista) return;
  lista.innerHTML = "";

  dados.forEach(m => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <p>${m.veiculo_placa} - ${m.data} - ${m.status}</p>
      <button onclick="editarManutencao(${m.id})">Editar</button>
      <button onclick="deletarManutencao(${m.id})">Excluir</button>
    `;
    lista.appendChild(div);
  });
}

document.getElementById("addManutencaoBtn").onclick = () => {
  manutencaoEditandoId = null;
  document.getElementById("manutencaoForm").classList.remove("hidden");
};

document.getElementById("cancelManutencao").onclick = () => {
  document.getElementById("manutencaoForm").classList.add("hidden");
};

document.getElementById("saveManutencao").onclick = async () => {
  const veiculoId = document.getElementById("inputVeiculoManut").value;
  if (!veiculoId) return mostrarToast("Selecione um veículo válido", "warning");

  const veiculo = veiculosCache.find(v => v.id == veiculoId);
  const placa = veiculo ? veiculo.placa : "";

  const dados = {
    veiculo_id: veiculoId,
    veiculo_placa: placa,
    data: inputDataManut.value,
    status: inputStatusManut.value
  };

  const caminho = manutencaoEditandoId ? `/manutencoes/${manutencaoEditandoId}` : "/manutencoes";

  try {
    const resposta = await fazerRequisicao(caminho, {
      method: manutencaoEditandoId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });
    if (!resposta.ok) throw new Error("API falhou");
  } catch (erro) {
    console.warn("Backend offline, salvando manutenção no cache local");
    if (manutencaoEditandoId) {
      const idx = manutencoesCache.findIndex(m => m.id == manutencaoEditandoId);
      if (idx > -1) manutencoesCache[idx] = { ...manutencoesCache[idx], ...dados };
    } else {
      const novoId = manutencoesCache.length > 0 ? Math.max(...manutencoesCache.map(m => m.id)) + 1 : 1;
      manutencoesCache.push({ id: novoId, ...dados });
    }
  }

  document.getElementById("manutencaoForm").classList.add("hidden");
  carregarManutencoes();
};

async function editarManutencao(id) {
  let m;
  try {
    if (usandoMockManutencoes) {
      m = manutencoesCache.find(m => m.id == id);
    } else {
      const dados = await fazerRequisicao("/manutencoes").then(r => r.json());
      m = dados.find(m => m.id == id);
    }
  } catch (erro) {
    m = manutencoesCache.find(m => m.id == id);
  }
  if (!m) return;

  const inputVeiculoManutSelect = document.getElementById("inputVeiculoManut");
  if (inputVeiculoManutSelect) {
    inputVeiculoManutSelect.value = m.veiculo_id || "";
  }
  inputDataManut.value = m.data;
  inputStatusManut.value = m.status;

  manutencaoEditandoId = id;
  document.getElementById("manutencaoForm").classList.remove("hidden");
}

async function deletarManutencao(id) {
  try {
    const resposta = await fazerRequisicao(`/manutencoes/${id}`, { method: "DELETE" });
    if (!resposta.ok) throw new Error("Erro na API");
  } catch (erro) {
    console.warn("Backend offline, removendo manutenção do cache local");
    manutencoesCache = manutencoesCache.filter(m => m.id != id);
  }
  carregarManutencoes();
}

window.carregarCacheVeiculos = carregarCacheVeiculos;
window.carregarDisponibilidades = carregarDisponibilidades;