from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password

from api.models import Funcionario, Atendente, Disponibilidade


class Command(BaseCommand):
    def handle(self, *args, **kwargs):

        disp, _ = Disponibilidade.objects.get_or_create(
            nome="Disponivel",
            codigo="DISPONIVEL"
        )

        funcionario, _ = Funcionario.objects.get_or_create(
            cpf="12345678901",
            defaults={
                "nome": "Admin Sistema",
                "data_nascimento": "1990-01-01",
                "telefone": "14999999999",
                "email": "admin@email.com",
                "disponibilidade": disp
            }
        )

        Atendente.objects.get_or_create(
            username="admin",
            defaults={
                "password": make_password("123456"),
                "funcionario": funcionario,
                "is_active": True,
                "is_staff": True,
                "is_superuser": True
            }
        )

        self.stdout.write(self.style.SUCCESS("Seed criado com sucesso"))