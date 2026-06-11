from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Veiculo,
    Funcionario,
    CNH,
    ProfissionalSaude,
    Equipe,
    Ocorrencia,
    Cargo,
    TipoRegistro,
    Prioridade,
    Status,
    Disponibilidade,
    Atendente,
    Manutencao,
    Abastecimento,
    STATUS_MANUTENCAO_EM,
    STATUS_MANUTENCAO_FINALIZADA,
)

from .services import disponibilidade as disp_svc
from .serializers import (
    VeiculoSerializer,
    FuncionarioSerializer,
    CNHSerializer,
    ProfissionalSaudeSerializer,
    EquipeSerializer,
    OcorrenciaSerializer,
    CargoSerializer,
    TipoRegistroSerializer,
    PrioridadeSerializer,
    StatusSerializer,
    DisponibilidadeSerializer,
    AtendenteSerializer,
    ManutencaoSerializer,
    ManutencaoFinalizarSerializer,
    AbastecimentoSerializer,
)


class VeiculoViewSet(viewsets.ModelViewSet):
    queryset = Veiculo.objects.all()
    serializer_class = VeiculoSerializer
    lookup_field = "placa"

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        qs = Veiculo.objects.filter(ativo=True)
        if self.request.query_params.get('disponivel') == 'true':
            qs = qs.filter(disponibilidade__codigo=disp_svc.COD_DISPONIVEL)
        return qs


class FuncionarioViewSet(viewsets.ModelViewSet):
    queryset = Funcionario.objects.select_related("disponibilidade")
    serializer_class = FuncionarioSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        qs = Funcionario.objects.filter(ativo=True)
        if self.request.query_params.get('disponivel') == 'true':
            qs = qs.filter(disponibilidade__codigo=disp_svc.COD_DISPONIVEL)
        return qs


class CNHViewSet(viewsets.ModelViewSet):
    queryset = CNH.objects.select_related("funcionario")
    serializer_class = CNHSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfissionalSaudeViewSet(viewsets.ModelViewSet):
    queryset = ProfissionalSaude.objects.select_related(
        "funcionario", "cargo", "cargo__tipo_registro"
    )
    serializer_class = ProfissionalSaudeSerializer


class EquipeViewSet(viewsets.ModelViewSet):
    queryset = Equipe.objects.select_related(
        "condutor", "veiculo", "disponibilidade"
    ).prefetch_related("profissionais")
    serializer_class = EquipeSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('disponivel') == 'true':
            qs = qs.filter(disponibilidade__codigo=disp_svc.COD_DISPONIVEL)
        return qs

    def destroy(self, request, *args, **kwargs):
        equipe = self.get_object()

        if disp_svc.equipe_em_atendimento(equipe):
            return Response(
                {"detail": "equipe em atendimento nao pode ser excluida"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if disp_svc.ocorrencia_ativa_com_equipe(equipe):
            return Response(
                {"detail": "equipe vinculada a ocorrencia ativa nao pode ser excluida"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        disp_svc.desvincular_membros_equipe(equipe)
        return super().destroy(request, *args, **kwargs)


class OcorrenciaViewSet(viewsets.ModelViewSet):
    queryset = Ocorrencia.objects.select_related(
        "prioridade", "status", "equipe", "condutor", "veiculo",
    ).prefetch_related("profissionais")
    serializer_class = OcorrenciaSerializer


class CargoViewSet(viewsets.ModelViewSet):
    queryset = Cargo.objects.select_related("tipo_registro")
    serializer_class = CargoSerializer


class TipoRegistroViewSet(viewsets.ModelViewSet):
    queryset = TipoRegistro.objects.all()
    serializer_class = TipoRegistroSerializer


class PrioridadeViewSet(viewsets.ModelViewSet):
    queryset = Prioridade.objects.all()
    serializer_class = PrioridadeSerializer


class StatusViewSet(viewsets.ModelViewSet):
    queryset = Status.objects.all()
    serializer_class = StatusSerializer


class DisponibilidadeViewSet(viewsets.ModelViewSet):
    queryset = Disponibilidade.objects.all()
    serializer_class = DisponibilidadeSerializer


class AtendenteViewSet(viewsets.ModelViewSet):
    queryset = Atendente.objects.all()
    serializer_class = AtendenteSerializer


class ManutencaoViewSet(viewsets.ModelViewSet):
    queryset = Manutencao.objects.select_related("veiculo").filter(ativo=True)
    serializer_class = ManutencaoSerializer

    def get_queryset(self):
        qs = Manutencao.objects.select_related("veiculo").filter(ativo=True)

        # Filtrar por veículo (placa ou id)
        veiculo_placa = self.request.query_params.get('veiculo_placa')
        veiculo_id = self.request.query_params.get('veiculo')
        if veiculo_placa:
            qs = qs.filter(veiculo__placa=veiculo_placa)
        elif veiculo_id:
            qs = qs.filter(veiculo_id=veiculo_id)

        return qs.order_by('-data')

    def update(self, request, *args, **kwargs):
        """Bloqueia PUT/PATCH comuns — use a action /finalizar/."""
        return Response(
            {"detail": "manutencao nao pode ser editada. use /finalizar/ para concluir."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == STATUS_MANUTENCAO_EM:
            return Response(
                {"detail": "nao e possivel excluir uma manutencao ativa. finalize primeiro."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='finalizar')
    def finalizar(self, request, pk=None):
        """Finaliza uma manutenção ativa e libera o veículo se não houver outras ativas."""
        manutencao = self.get_object()

        serializer = ManutencaoFinalizarSerializer(
            manutencao, data={}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Retorna a manutenção atualizada com todos os campos
        return Response(
            ManutencaoSerializer(manutencao).data,
            status=status.HTTP_200_OK,
        )


class AbastecimentoViewSet(viewsets.ModelViewSet):
    queryset = Abastecimento.objects.select_related("veiculo").filter(ativo=True)
    serializer_class = AbastecimentoSerializer

    def get_queryset(self):
        qs = Abastecimento.objects.select_related("veiculo").filter(ativo=True)

        veiculo_placa = self.request.query_params.get('veiculo_placa')
        veiculo_id = self.request.query_params.get('veiculo')
        if veiculo_placa:
            qs = qs.filter(veiculo__placa=veiculo_placa)
        elif veiculo_id:
            qs = qs.filter(veiculo_id=veiculo_id)

        return qs.order_by('-data')

    def update(self, request, *args, **kwargs):
        return Response(
            {"detail": "abastecimento nao pode ser editado."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)