let equipeSelecionadaId = null;

function carregarEquipes() {
  const lista = document.getElementById("equipeMedicaList");
  if (!lista) return;
  lista.innerHTML = "";

  equipesCache.forEach(eq => {
    const cartao = document.createElement("div");
    cartao.className = "tracking-card";
    cartao.dataset.id = eq.id;
    cartao.classList.toggle("selected", eq.id === equipeSelecionadaId);

    const condutoresAptos = eq.membros.filter(mId => {
      const f = funcionariosCache.find(func => func.id == mId);
      return f && f.apto_dirigir === "Sim";
    }).length;

    cartao.innerHTML = `
      <div class="tc-header">
        <h3 style="font-size: 15px;">${eq.nome}</h3>
        <span class="status-badge badge-route">
          <i class="ph ph-clock"></i> ${eq.turno}
        </span>
      </div>
      <div style="font-size: 13px; color: var(--text-light); margin-top: 10px; display: flex; flex-direction: column; gap: 4px;">
        <div><i class="ph ph-calendar"></i> ${eq.data}</div>
        <div><i class="ph ph-users"></i> ${eq.membros.length} Membros</div>
      </div>
      <div style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span class="status-badge ${condutoresAptos > 0 ? 'badge-available' : 'badge-emergency'}">
          <i class="ph ph-steering-wheel"></i> ${condutoresAptos} Condutor(es)
        </span>
      </div>
    `;

    cartao.onclick = () => selecionarEquipe(eq.id);
    lista.appendChild(cartao);
  });

  fecharDetalhes('equipeMedica');
}

function selecionarEquipe(id) {
  equipeSelecionadaId = id;
  const eq = equipesCache.find(e => e.id === id);
  if (!eq) return;

  document.querySelectorAll("#equipeMedicaList .tracking-card").forEach(cartao => {
    cartao.classList.toggle("selected", Number(cartao.dataset.id) === Number(id));
  });

  const el = idDoc => document.getElementById(idDoc);
  if (el("detailEquipeNome")) el("detailEquipeNome").textContent = eq.nome || 'Sem Nome';
  if (el("detailEquipeData")) el("detailEquipeData").textContent = eq.data || '-';
  if (el("detailEquipeTurno")) el("detailEquipeTurno").textContent = eq.turno || '-';
  if (el("detailEquipeObs")) el("detailEquipeObs").textContent = eq.obs || 'Nenhuma observação cadastrada.';

  const containerListaMembros = el("detailEquipeMembrosList");
  if (containerListaMembros) {
    containerListaMembros.innerHTML = "";
    eq.membros.forEach(mId => {
      const f = funcionariosCache.find(func => func.id == mId);
      if (f) {
        const item = document.createElement("div");
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.justifyContent = "space-between";
        item.style.padding = "10px 14px";
        item.style.background = "var(--bg-card)";
        item.style.border = "1px solid var(--border)";
        item.style.borderRadius = "10px";

        const badgeCargos = {
          "Médico": "badge-available",
          "Enfermeiro": "badge-route",
          "Socorrista": "badge-maintenance",
          "Motorista": "badge-inactive"
        };
        const classeBadgeCargo = badgeCargos[f.cargo] || "badge-inactive";

        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="ph ph-user-circle" style="font-size: 24px; color: var(--text-light);"></i>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text);">${f.nome}</div>
              <div style="font-size: 12px; color: var(--text-light);">${f.cargo} ${f.registro ? '(' + f.registro + ')' : ''}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${f.apto_dirigir === "Sim" ? '<span class="status-badge badge-available"><i class="ph ph-steering-wheel"></i> Apto a Dirigir</span>' : ''}
            <span class="status-badge ${classeBadgeCargo}">${f.cargo}</span>
          </div>
        `;
        containerListaMembros.appendChild(item);
      }
    });
  }

  if (el("btnEditEquipe")) el("btnEditEquipe").onclick = () => editarEquipe(eq.id);
  if (el("btnDeleteEquipe")) {
    el("btnDeleteEquipe").onclick = () => {
      if (confirm(`Tem certeza que deseja remover a equipe "${eq.nome}"?`)) {
        deletarEquipe(eq.id);
      }
    };
  }

  mostrarDetalhes('equipeMedica');
}

document.getElementById("addEquipeBtn").onclick = () => {
  equipeEditandoId = null;
  limparFormularioEquipe();
  document.getElementById("saveEquipeMedica").innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Equipe';
  document.getElementById("equipeMedicaModal").classList.remove("hidden");
};

function limparFormularioEquipe() {
  document.getElementById("inputEquipeNome").value = "";
  document.getElementById("inputEquipeData").value = "";
  document.getElementById("inputEquipeTurno").value = "Manhã";
  document.getElementById("inputEquipeObs").value = "";
  membrosSelecionadosIds = [];
  renderizarChipsMembros();
  atualizarSelectMembrosEquipe();
  document.getElementById("equipeMedicaModal").classList.add("hidden");
}

document.getElementById("cancelEquipeMedica").onclick = limparFormularioEquipe;
document.getElementById("closeEquipeMedicaModal").onclick = limparFormularioEquipe;

function renderizarChipsMembros() {
  const container = document.getElementById("equipeMembrosChipsContainer");
  if (!container) return;
  container.innerHTML = "";

  if (membrosSelecionadosIds.length === 0) {
    container.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">Nenhum profissional selecionado</span>`;
    return;
  }

  membrosSelecionadosIds.forEach(id => {
    const f = funcionariosCache.find(func => func.id == id);
    if (f) {
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

      const eMotorista = f.apto_dirigir === "Sim";
      chip.innerHTML = `
        <span style="font-weight: 500;">${f.nome} (${f.cargo})</span>
        ${eMotorista ? '<i class="ph ph-steering-wheel" title="Apto a dirigir" style="color: var(--status-available);"></i>' : ''}
        <i class="ph ph-x" style="cursor: pointer; color: #ef4444; font-weight: bold;" onclick="removerMembroDeEquipe(${f.id})"></i>
      `;
      container.appendChild(chip);
    }
  });
}

window.removerMembroDeEquipe = function(id) {
  membrosSelecionadosIds = membrosSelecionadosIds.filter(mId => mId != id);
  renderizarChipsMembros();
  atualizarSelectMembrosEquipe();
};

function inicializarAutocompleteEquipe() {
  const select = document.getElementById("inputEquipeMembroBuscar");
  if (!select) return;

  select.onchange = (e) => {
    const valor = e.target.value;
    if (valor) {
      membrosSelecionadosIds.push(Number(valor));
      renderizarChipsMembros();
      atualizarSelectMembrosEquipe();
    }
  };
}

document.getElementById("saveEquipeMedica").onclick = () => {
  const nome = document.getElementById("inputEquipeNome").value.trim();
  const data = document.getElementById("inputEquipeData").value;
  const turno = document.getElementById("inputEquipeTurno").value;
  const obs = document.getElementById("inputEquipeObs").value.trim();

  if (!nome) return mostrarToast("Por favor, informe o nome da equipe.", "warning");
  if (!data) return mostrarToast("Por favor, selecione uma data.", "warning");
  if (membrosSelecionadosIds.length === 0) return mostrarToast("Por favor, adicione pelo menos 1 membro à equipe.", "warning");

  const temCondutor = membrosSelecionadosIds.some(id => {
    const f = funcionariosCache.find(func => func.id == id);
    return f && f.apto_dirigir === "Sim";
  });

  if (!temCondutor) {
    return mostrarToast("Atenção: A equipe precisa ter no mínimo 1 pessoa apta a dirigir!", "error");
  }

  const dadosEquipe = {
    nome,
    data,
    turnos: turno, // backward compatibility
    turno,
    obs,
    membros: [...membrosSelecionadosIds]
  };

  if (equipeEditandoId) {
    const idx = equipesCache.findIndex(e => e.id == equipeEditandoId);
    if (idx > -1) equipesCache[idx] = { ...equipesCache[idx], ...dadosEquipe };
  } else {
    const novoId = equipesCache.length > 0 ? Math.max(...equipesCache.map(e => e.id)) + 1 : 1;
    equipesCache.push({ id: novoId, ...dadosEquipe });
    equipeSelecionadaId = novoId;
  }

  limparFormularioEquipe();
  carregarEquipes();
};

function editarEquipe(id) {
  const eq = equipesCache.find(e => e.id == id);
  if (!eq) return;

  document.getElementById("inputEquipeNome").value = eq.nome || "";
  document.getElementById("inputEquipeData").value = eq.data || "";
  document.getElementById("inputEquipeTurno").value = eq.turno || "Manhã";
  document.getElementById("inputEquipeObs").value = eq.obs || "";

  membrosSelecionadosIds = [...eq.membros];
  renderizarChipsMembros();
  atualizarSelectMembrosEquipe();

  equipeEditandoId = id;
  document.getElementById("saveEquipeMedica").innerHTML = '<i class="ph ph-pencil-simple"></i> Atualizar Equipe';
  document.getElementById("equipeMedicaModal").classList.remove("hidden");
}

function deletarEquipe(id) {
  equipesCache = equipesCache.filter(e => e.id != id);
  if (equipeSelecionadaId == id) equipeSelecionadaId = null;
  carregarEquipes();
}
