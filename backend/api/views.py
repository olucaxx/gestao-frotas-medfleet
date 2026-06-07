from rest_framework import viewsets

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
    Paciente,
    Disponibilidade,
    Atendente,
    Manutencao,
    Abastecimento
)

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
    PacienteSerializer,
    DisponibilidadeSerializer,
    AtendenteSerializer,
    ManutencaoSerializer,
    AbastecimentoSerializer
)


class VeiculoViewSet(viewsets.ModelViewSet):
    queryset = Veiculo.objects.all()
    serializer_class = VeiculoSerializer
    lookup_field = "placa"


class FuncionarioViewSet(viewsets.ModelViewSet):
    queryset = Funcionario.objects.select_related(
        "disponibilidade"
    )

    serializer_class = FuncionarioSerializer


class CNHViewSet(viewsets.ModelViewSet):
    queryset = CNH.objects.select_related(
        "funcionario"
    )

    serializer_class = CNHSerializer


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


class OcorrenciaViewSet(viewsets.ModelViewSet):
    queryset = Ocorrencia.objects.select_related(
        "prioridade",
        "status",
        "equipe",
        "condutor",
        "veiculo",
        "paciente"
    ).prefetch_related(
        "profissionais"
    )

    serializer_class = OcorrenciaSerializer


class PacienteViewSet(viewsets.ModelViewSet):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer


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

class AbastecimentoViewSet(viewsets.ModelViewSet):
    queryset = Abastecimento.objects.select_related("veiculo")
    serializer_class = AbastecimentoSerializer