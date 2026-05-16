from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

from .models import (
    Motorista, Veiculo, Profissional, Equipe,
    Ocorrencia, Cargo, TipoRegistro,
    Prioridade, Status, Paciente, Disponibilidade
)

from .serializers import (
    MotoristaSerializer, VeiculoSerializer, ProfissionalSerializer,
    EquipeSerializer, OcorrenciaSerializer,
    CargoSerializer, TipoRegistroSerializer,
    PrioridadeSerializer, StatusSerializer,
    PacienteSerializer, DisponibilidadeSerializer
)

class MotoristaViewSet(viewsets.ModelViewSet):
    queryset = Motorista.objects.all()
    serializer_class = MotoristaSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

class VeiculoViewSet(viewsets.ModelViewSet):
    queryset = Veiculo.objects.all()
    serializer_class = VeiculoSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

class ProfissionalViewSet(viewsets.ModelViewSet):
    queryset = Profissional.objects.all()
    serializer_class = ProfissionalSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

class EquipeViewSet(viewsets.ModelViewSet):
    queryset = Equipe.objects.all()
    serializer_class = EquipeSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

class OcorrenciaViewSet(viewsets.ModelViewSet):
    queryset = Ocorrencia.objects.all()
    serializer_class = OcorrenciaSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

class PacienteViewSet(viewsets.ModelViewSet):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
class CargoViewSet(viewsets.ModelViewSet):
    queryset = Cargo.objects.all()
    serializer_class = CargoSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

class TipoRegistroViewSet(viewsets.ModelViewSet):
    queryset = TipoRegistro.objects.all()
    serializer_class = TipoRegistroSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

class PrioridadeViewSet(viewsets.ModelViewSet):
    queryset = Prioridade.objects.all()
    serializer_class = PrioridadeSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

class StatusViewSet(viewsets.ModelViewSet):
    queryset = Status.objects.all()
    serializer_class = StatusSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

class DisponibilidadeViewSet(viewsets.ModelViewSet):
    queryset = Disponibilidade.objects.all()
    serializer_class = DisponibilidadeSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]