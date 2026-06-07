from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password

from api.models import Funcionario, Atendente, Disponibilidade


class Command(BaseCommand):
    def handle(self, *args, **kwargs):

        disponibilidade = Disponibilidade.objects.get(codigo="DISPONIVEL")
 
        funcionario, _ = Funcionario.objects.get_or_create(
            cpf="00000000001",
            defaults={
                "nome": "Joao da Silva",
                "data_nascimento": "1990-01-01",
                "telefone": "14999999999",
                "email": "joao@email.com",
                "disponibilidade": disponibilidade,
            }
        )

        Atendente.objects.get_or_create(
            username="joao.silva",
            defaults={
                "password": make_password("123456"),
                "funcionario": funcionario,
                "is_active": True,
                "is_staff": True,
                "is_superuser": True
            }
        )

        self.stdout.write(self.style.SUCCESS("Seed criado com sucesso"))