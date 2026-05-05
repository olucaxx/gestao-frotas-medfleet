from rest_framework.routers import DefaultRouter
from .views import (
    MotoristaViewSet,
    VeiculoViewSet,
    EnfermeiroViewSet,
    EquipeViewSet,
    ChamadoViewSet
)

router = DefaultRouter()
router.register(r'motoristas', MotoristaViewSet)
router.register(r'veiculos', VeiculoViewSet)
router.register(r'enfermeiros', EnfermeiroViewSet)
router.register(r'equipes', EquipeViewSet)
router.register(r'chamados', ChamadoViewSet)

urlpatterns = router.urls