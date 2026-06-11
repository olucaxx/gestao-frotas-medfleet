from django.utils import timezone

from api.models import (
    Disponibilidade,
    Equipe,
    Funcionario,
    Ocorrencia,
    ProfissionalSaude,
    Veiculo,
)

COD_DISPONIVEL = "DISPONIVEL"
COD_INDISPONIVEL = "INDISPONIVEL"
COD_ATENDENDO = "ATENDENDO"
COD_EM_ROTA = "EM_ROTA"

STATUS_ATIVOS = ("AGUARDANDO", "EM_ATENDIMENTO")


def _get_disp(codigo):
    return Disponibilidade.objects.get(codigo=codigo)


def sincronizar_membros_equipe(equipe):
    """Propaga a disponibilidade da equipe para funcionários e veículo vinculados."""
    codigo_equipe = equipe.disponibilidade.codigo

    if codigo_equipe == COD_DISPONIVEL:
        disp_membros = _get_disp(COD_DISPONIVEL)
    elif codigo_equipe in (COD_ATENDENDO, COD_EM_ROTA):
        disp_membros = _get_disp(COD_INDISPONIVEL)
    else:
        disp_membros = _get_disp(COD_INDISPONIVEL)

    Funcionario.objects.filter(equipe_atribuida=equipe).update(
        disponibilidade=disp_membros
    )

    Veiculo.objects.filter(equipe_atribuida=equipe).update(
        disponibilidade=disp_membros
    )


def vincular_membros_equipe(equipe, profissionais, veiculo, condutor):
    """Atribui equipe_atribuida a todos os membros e sincroniza disponibilidade."""
    membros_ids = {p.matricula for p in profissionais}
    membros_ids.add(condutor.matricula)

    Funcionario.objects.filter(
        equipe_atribuida=equipe
    ).exclude(
        matricula__in=membros_ids
    ).update(equipe_atribuida=None, disponibilidade=_get_disp(COD_DISPONIVEL))

    for prof in profissionais:
        prof.equipe_atribuida = equipe
        prof.save(update_fields=["equipe_atribuida"])

    condutor.equipe_atribuida = equipe
    condutor.save(update_fields=["equipe_atribuida"])

    veiculo.equipe_atribuida = equipe
    veiculo.save(update_fields=["equipe_atribuida"])

    sincronizar_membros_equipe(equipe)


def desvincular_membros_equipe(equipe):
    """Remove vínculos e restaura disponibilidade manual (DISPONIVEL)."""
    disp_disponivel = _get_disp(COD_DISPONIVEL)

    Funcionario.objects.filter(equipe_atribuida=equipe).update(
        equipe_atribuida=None,
        disponibilidade=disp_disponivel,
    )

    Veiculo.objects.filter(equipe_atribuida=equipe).update(
        equipe_atribuida=None,
        disponibilidade=disp_disponivel,
    )


def equipe_em_atendimento(equipe):
    return equipe.disponibilidade.codigo in (COD_ATENDENDO, COD_EM_ROTA)


def ocorrencia_ativa_com_equipe(equipe, excluir_id=None):
    qs = Ocorrencia.objects.filter(
        equipe=equipe,
        status__codigo__in=STATUS_ATIVOS,
    )
    if excluir_id:
        qs = qs.exclude(id=excluir_id)
    return qs.exists()


def equipe_disponivel_para_ocorrencia(equipe, ocorrencia_id=None):
    if equipe.disponibilidade.codigo != COD_DISPONIVEL:
        return False, "equipe nao disponivel"

    if ocorrencia_ativa_com_equipe(equipe, excluir_id=ocorrencia_id):
        return False, "equipe ja vinculada a outra ocorrencia ativa"

    return True, None


def iniciar_atendimento_equipe(equipe):
    disp_atendendo = _get_disp(COD_ATENDENDO)
    equipe.disponibilidade = disp_atendendo
    equipe.save(update_fields=["disponibilidade"])
    sincronizar_membros_equipe(equipe)


def finalizar_atendimento_equipe(equipe):
    disp_disponivel = _get_disp(COD_DISPONIVEL)
    equipe.disponibilidade = disp_disponivel
    equipe.save(update_fields=["disponibilidade"])
    sincronizar_membros_equipe(equipe)


def verificar_integridade_equipe(equipe):
    """
    Verifica se a equipe ainda possui condutor e veiculo ativos.
    Caso um deles tenha sido removido/inativado, marca a equipe
    como INDISPONIVEL e sincroniza os membros restantes.
    """
    equipe.refresh_from_db()

    condutor_ativo = Funcionario.objects.filter(
        pk=equipe.condutor_id, ativo=True
    ).exists()

    veiculo_ativo = Veiculo.objects.filter(
        pk=equipe.veiculo_id, ativo=True
    ).exists()

    if not condutor_ativo or not veiculo_ativo:
        if equipe.disponibilidade.codigo != COD_INDISPONIVEL:
            equipe.disponibilidade = _get_disp(COD_INDISPONIVEL)
            equipe.save(update_fields=["disponibilidade"])

    sincronizar_membros_equipe(equipe)


def funcionario_elegivel_selecao(funcionario, equipe_edicao=None):
    if equipe_edicao and funcionario.equipe_atribuida_id == equipe_edicao.id:
        return True, None

    if funcionario.equipe_atribuida_id is not None:
        return False, f"funcionario '{funcionario.nome}' ja pertence a outra equipe"

    if funcionario.disponibilidade.codigo != COD_DISPONIVEL:
        return False, f"funcionario '{funcionario.nome}' nao esta disponivel"

    return True, None


def veiculo_elegivel_selecao(veiculo, equipe_edicao=None):
    if equipe_edicao and veiculo.equipe_atribuida_id == equipe_edicao.id:
        return True, None

    if veiculo.equipe_atribuida_id is not None:
        return False, "veiculo ja pertence a outra equipe"

    if veiculo.disponibilidade.codigo != COD_DISPONIVEL:
        return False, "veiculo nao esta disponivel"

    return True, None


def validar_membros_equipe(condutor, profissionais, veiculo, equipe_edicao=None):
    for prof in profissionais:
        ok, msg = funcionario_elegivel_selecao(prof, equipe_edicao)
        if not ok:
            return False, msg

    ok, msg = funcionario_elegivel_selecao(condutor, equipe_edicao)
    if not ok:
        return False, msg

    ok, msg = veiculo_elegivel_selecao(veiculo, equipe_edicao)
    if not ok:
        return False, msg

    return True, None


def profissionais_saude_da_equipe(equipe):
    matriculas = list(equipe.profissionais.values_list('matricula', flat=True))
    return ProfissionalSaude.objects.filter(funcionario_id__in=matriculas)


def vincular_ocorrencia_a_equipe(ocorrencia, equipe):
    ocorrencia.condutor = equipe.condutor
    ocorrencia.veiculo = equipe.veiculo
    ocorrencia.save(update_fields=["condutor", "veiculo"])
    ocorrencia.profissionais.set(profissionais_saude_da_equipe(equipe))


def membro_vinculado_a_equipe(obj):
    return obj.equipe_atribuida_id is not None