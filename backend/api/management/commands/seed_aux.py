from django.core.management.base import BaseCommand
from api.models import *

class Command(BaseCommand):
    def handle(self, *args, **kwargs):

        Disponibilidade.objects.get_or_create(nome="Disponivel", codigo="DISPONIVEL")
        Disponibilidade.objects.get_or_create(nome="Atendendo", codigo="ATENDENDO")
        Disponibilidade.objects.get_or_create(nome="Inativa", codigo="INATIVA")

        Status.objects.get_or_create(nome="Aberto", codigo="ABERTO")
        Status.objects.get_or_create(nome="Em Atendimento", codigo="EM_ATENDIMENTO")
        Status.objects.get_or_create(nome="Finalizado", codigo="FINALIZADO")

        Cargo.objects.get_or_create(nome="Medico")
        Cargo.objects.get_or_create(nome="Enfermeiro")
        Cargo.objects.get_or_create(nome="Tecnico de Enfermagem")
        
        TipoRegistro.objects.get_or_create(nome="CRM")
        TipoRegistro.objects.get_or_create(nome="COREN")

        self.stdout.write("seed dos tipos/categorias/utilitarios realizado")