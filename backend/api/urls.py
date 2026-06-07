from rest_framework.routers import DefaultRouter
from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token

from .views import *

router = DefaultRouter()

router.register(r'veiculos', VeiculoViewSet)
router.register(r'funcionarios', FuncionarioViewSet)
router.register(r'cnhs', CNHViewSet)
router.register(r'profissionais-saude', ProfissionalSaudeViewSet)
router.register(r'equipes', EquipeViewSet)
router.register(r'ocorrencias', OcorrenciaViewSet)
router.register(r'cargos', CargoViewSet)
router.register(r'tipos-registro', TipoRegistroViewSet)
router.register(r'prioridades', PrioridadeViewSet)
router.register(r'status', StatusViewSet)
router.register(r'disponibilidades', DisponibilidadeViewSet)
router.register(r'manutencoes', ManutencaoViewSet)
router.register(r'abastecimentos', AbastecimentoViewSet)

urlpatterns = router.urls + [
    path('api/token/', obtain_auth_token),
]