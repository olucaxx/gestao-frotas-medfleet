let ocorrenciaSelecionada = null;
let ocorrenciaEditandoId = null;

async function carregarOcorrencias() {
    try {
        const response = await fazerRequisicao("/ocorrencias/");

        if (!response.ok) {
            throw new Error("erro ao carregar ocorrências");
        }

        ocorrenciasCache = await response.json();

        renderizarOcorrencias();

    } catch (erro) {
        console.error("erro ao carregar ocorrências", erro);
    }
}

async function carregarPrioridades() {
    const r =
        await fazerRequisicao(
            "/prioridades/"
        );

    prioridadesCache =
        await r.json();
}

async function carregarStatus() {
    const r =
        await fazerRequisicao(
            "/status/"
        );

    statusCache =
        await r.json();
}

function renderizarOcorrencias() {

    const lista = document.getElementById("ocorrenciasList");

    if (!lista) return;

    lista.innerHTML = "";

    document.getElementById("badgeTotalOcorrencias").textContent =
        ocorrenciasCache.length;

    ocorrenciasCache.forEach(ocorrencia => {

        const prioridade =
            prioridadesCache?.find(
                p => p.id === ocorrencia.prioridade
            );

        const status =
            statusCache?.find(
                s => s.id === ocorrencia.status
            );

        const card = document.createElement("div");

        card.className = "tracking-card";

        card.innerHTML = `
            <h4>${ocorrencia.titulo ?? "-"}</h4>
            <p>${ocorrencia.nome_paciente ?? "-"}</p>
            <small>${prioridade?.nome ?? "-"}</small>
            <br>
            <small>${status?.nome ?? "-"}</small>
        `;

        card.onclick = () =>
            selecionarOcorrencia(ocorrencia.id);

        lista.appendChild(card);
    });
}

function selecionarOcorrencia(id) {

    const ocorrencia =
        ocorrenciasCache.find(
            o => o.id === id
        );

    if (!ocorrencia) return;

    ocorrenciaSelecionada = ocorrencia;

    const prioridade =
        prioridadesCache?.find(
            p => p.id === ocorrencia.prioridade
        );

    const status =
        statusCache?.find(
            s => s.id === ocorrencia.status
        );

    const equipe =
        equipesCache?.find(
            e => e.id === ocorrencia.equipe
        );

    document.getElementById("detailOcorrenciaTitulo").textContent =
        ocorrencia.titulo ?? "-";

    document.getElementById("detailOcorrenciaStatus").textContent =
        status?.nome ?? "-";

    document.getElementById("detailOcorrenciaPrioridade").textContent =
        prioridade?.nome ?? "-";

    document.getElementById("detailOcorrenciaData").textContent =
        ocorrencia.created_at ?? "-";

    document.getElementById("detailOcorrenciaEndereco").textContent =
        ocorrencia.local_informado ?? "-";

    document.getElementById("detailOcorrenciaDescricao").textContent =
        ocorrencia.observacoes ?? "-";

    if (
        document.getElementById(
            "detailOcorrenciaPacienteNome"
        )
    ) {
        document.getElementById(
            "detailOcorrenciaPacienteNome"
        ).textContent =
            ocorrencia.nome_paciente ?? "-";
    }

    if (
        document.getElementById(
            "detailOcorrenciaPacienteTelefone"
        )
    ) {
        document.getElementById(
            "detailOcorrenciaPacienteTelefone"
        ).textContent =
            ocorrencia.telefone_paciente ?? "-";
    }

    document.getElementById("detailOcorrenciaEquipe").textContent =
        equipe?.nome_equipe ?? "-";

    document.getElementById("ocorrenciasSidebar")
        .classList.add("hidden");

    document.getElementById("ocorrenciasDetail")
        .classList.remove("hidden");
}

function preencherSelectPrioridades() {

    const select =
        document.getElementById(
            "inputOcorrenciaPrioridade"
        );

    if (!select) return;

    select.innerHTML =
        `<option value="">Selecione</option>`;

    prioridadesCache.forEach(item => {

        const option =
            document.createElement("option");

        option.value = item.id;
        option.textContent = item.nome;

        select.appendChild(option);
    });
}

function preencherSelectStatus() {

    const select =
        document.getElementById(
            "inputOcorrenciaStatus"
        );

    if (!select) return;

    select.innerHTML =
        `<option value="">Selecione</option>`;

    statusCache.forEach(item => {

        const option =
            document.createElement("option");

        option.value = item.id;
        option.textContent = item.nome;

        select.appendChild(option);
    });
}

function preencherSelectEquipes() {

    const select =
        document.getElementById(
            "inputOcorrenciaEquipe"
        );

    if (!select) return;

    select.innerHTML =
        `<option value="">Selecione</option>`;

    equipesCache.forEach(item => {

        const option =
            document.createElement("option");

        option.value = item.id;
        option.textContent =
            item.nome_equipe;

        select.appendChild(option);
    });
}

function limparFormularioOcorrencia() {

    ocorrenciaEditandoId = null;

    document.getElementById(
        "inputOcorrenciaTitulo"
    ).value = "";

    document.getElementById(
        "inputOcorrenciaPaciente"
    ).value = "";

    document.getElementById(
        "inputOcorrenciaEndereco"
    ).value = "";

    document.getElementById(
        "inputOcorrenciaDescricao"
    ).value = "";
}

async function salvarOcorrencia() {

    try {

        const payload = {

            titulo:
                document.getElementById(
                    "inputOcorrenciaTitulo"
                ).value,

            nome_paciente:
                document.getElementById(
                    "inputOcorrenciaPaciente"
                ).value,

            local_informado:
                document.getElementById(
                    "inputOcorrenciaEndereco"
                ).value,

            horario_chamado:
                document.getElementById(
                    "inputOcorrenciaHorarioChamado"
                ).value,

            observacoes:
                document.getElementById(
                    "inputOcorrenciaDescricao"
                ).value,

            prioridade: Number(
                document.getElementById(
                    "inputOcorrenciaPrioridade"
                ).value
            ),

            status: Number(
                document.getElementById(
                    "inputOcorrenciaStatus"
                ).value
            )
        };

        const equipe =
            document.getElementById(
                "inputOcorrenciaEquipe"
            ).value;

        if (equipe) {
            payload.equipe =
                Number(equipe);
        }

        let response;

        if (ocorrenciaEditandoId) {

            response =
                await fazerRequisicao(
                    `/ocorrencias/${ocorrenciaEditandoId}/`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify(payload)
                    }
                );

        } else {

            response =
                await fazerRequisicao(
                    "/ocorrencias/",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify(payload)
                    }
                );
        }

        if (!response.ok) {
            console.error(
                await response.text()
            );
            return;
        }

        await carregarOcorrencias();

    } catch (erro) {

        console.error(erro);
    }
}

async function excluirOcorrencia(id) {

    try {

        await fazerRequisicao(
            `/ocorrencias/${id}/`,
            {
                method: "DELETE"
            }
        );

        await carregarOcorrencias();

    } catch (erro) {

        console.error(erro);
    }
}

document
.getElementById("saveOcorrencia")
?.addEventListener(
    "click",
    salvarOcorrencia
);

document
.getElementById(
    "btnDeleteOcorrencia"
)
?.addEventListener(
    "click",
    () => {

        if (
            !ocorrenciaSelecionada
        ) return;

        excluirOcorrencia(
            ocorrenciaSelecionada.id
        );
    }
);

document
    .getElementById("addOcorrenciaBtn")
    ?.addEventListener("click", () => {

        limparFormularioOcorrencia();

        document
            .getElementById("ocorrenciaModal")
            ?.classList.remove("hidden");
    });

document
    .getElementById("closeOcorrenciaModal")
    ?.addEventListener("click", () => {

        document
            .getElementById("ocorrenciaModal")
            ?.classList.add("hidden");
    });

document
    .getElementById("cancelOcorrencia")
    ?.addEventListener("click", () => {

        document
            .getElementById("ocorrenciaModal")
            ?.classList.add("hidden");
    });

document.addEventListener("DOMContentLoaded", async () => {

    await carregarFuncionarios();
    await carregarEquipes();
    await carregarVeiculos();

    await carregarPrioridades();
    await carregarStatus();

    await carregarOcorrencias();

    preencherSelectPrioridades();
    preencherSelectStatus();
    preencherSelectEquipes();
});