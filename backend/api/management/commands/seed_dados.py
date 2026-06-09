from django.core.management.base import BaseCommand

from api.models import Disponibilidade, TipoRegistro, Cargo, Prioridade, Status


class Command(BaseCommand):
    def handle(self, *args, **kwargs):

        # Disponibilidades
        disponibilidades = [
            ("Disponível",      "DISPONIVEL"),
            ("Indisponível",    "INDISPONIVEL"),
            ("Em Rota",         "EM_ROTA"),
            ("Em Atendimento",  "ATENDENDO"),
        ]
        for nome, codigo in disponibilidades:
            Disponibilidade.objects.get_or_create(codigo=codigo, defaults={"nome": nome})

        # Tipos de Registro
        tipos = ["CRM", "COREN"]
        for sigla in tipos:
            TipoRegistro.objects.get_or_create(sigla=sigla)

        # Cargos
        crm   = TipoRegistro.objects.get(sigla="CRM")   
        coren = TipoRegistro.objects.get(sigla="COREN")

        Cargo.objects.get_or_create(nome="Médico",     defaults={"tipo_registro": crm})
        Cargo.objects.get_or_create(nome="Enfermeiro", defaults={"tipo_registro": coren})
        Cargo.objects.get_or_create(nome="Motorista",  defaults={"tipo_registro": None})

        # Prioridades
        prioridades = [ 
            ("Emergência",    "VERMELHO"),
            ("Muito Urgente", "LARANJA"),
            ("Urgente",       "AMARELO"),
            ("Pouco Urgente", "VERDE"),
            ("Não Urgente",   "AZUL"),
        ]
        for nome, codigo in prioridades:
            Prioridade.objects.get_or_create(codigo=codigo, defaults={"nome": nome})

        # Status
        status_list = [
            ("Aguardando",      "AGUARDANDO"),
            ("Em Atendimento",  "EM_ATENDIMENTO"),
            ("Finalizado",      "FINALIZADO"),
        ]
        for nome, codigo in status_list:
            Status.objects.get_or_create(codigo=codigo, defaults={"nome": nome})

        self.stdout.write(self.style.SUCCESS("Seed concluído."))