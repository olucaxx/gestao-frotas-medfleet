from rest_framework import viewsets, status
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
    Abastecimento
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
    AbastecimentoSerializer
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
        return qs


class FuncionarioViewSet(viewsets.ModelViewSet):
    queryset = Funcionario.objects.select_related(
        "disponibilidade"
    )

    serializer_class = FuncionarioSerializer
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def get_queryset(self):
        return Funcionario.objects.filter(ativo=True)


class CNHViewSet(viewsets.ModelViewSet):
    queryset = CNH.objects.select_related(
        "funcionario"
    )

    serializer_class = CNHSerializer
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfissionalSaudeViewSet(viewsets.ModelViewSet):
    queryset = ProfissionalSaude.objects.select_related(
        "funcionario",
        "cargo",
        "cargo__tipo_registro"
    )

    serializer_class = ProfissionalSaudeSerializer


class EquipeViewSet(viewsets.ModelViewSet):
    queryset = Equipe.objects.select_related(
        "condutor",
        "veiculo",
        "disponibilidade"
    ).prefetch_related(
        "profissionais"
    )

    serializer_class = EquipeSerializer

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
        "prioridade",
        "status",
        "equipe",
        "condutor",
        "veiculo",
    ).prefetch_related(
        "profissionais"
    )

    serializer_class = OcorrenciaSerializer


class CargoViewSet(viewsets.ModelViewSet):
    queryset = Cargo.objects.select_related(
        "tipo_registro"
    )

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
    queryset = Manutencao.objects.select_related("veiculo")
    serializer_class = ManutencaoSerializer
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

class AbastecimentoViewSet(viewsets.ModelViewSet):
    queryset = Abastecimento.objects.select_related("veiculo")
    serializer_class = AbastecimentoSerializer
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)