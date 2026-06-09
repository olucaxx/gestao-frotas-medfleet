from datetime import date, timedelta

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import (
    Cargo,
    CNH,
    Disponibilidade,
    Equipe,
    Funcionario,
    Ocorrencia,
    Prioridade,
    Status,
    TipoRegistro,
    Veiculo,
)
from api.services import disponibilidade as disp_svc

User = get_user_model()


class MedFleetBaseTestCase(TestCase):
    def setUp(self):
        self.disp_disponivel = Disponibilidade.objects.create(
            nome="Disponível", codigo="DISPONIVEL"
        )
        self.disp_indisponivel = Disponibilidade.objects.create(
            nome="Indisponível", codigo="INDISPONIVEL"
        )
        self.disp_atendendo = Disponibilidade.objects.create(
            nome="Em Atendimento", codigo="ATENDENDO"
        )
        Disponibilidade.objects.create(nome="Em Rota", codigo="EM_ROTA")

        self.status_aguardando = Status.objects.create(
            nome="Aguardando", codigo="AGUARDANDO"
        )
        self.status_atendimento = Status.objects.create(
            nome="Em Atendimento", codigo="EM_ATENDIMENTO"
        )
        self.status_finalizado = Status.objects.create(
            nome="Finalizado", codigo="FINALIZADO"
        )

        self.prioridade = Prioridade.objects.create(
            nome="Urgente", codigo="AMARELO"
        )

        tipo = TipoRegistro.objects.create(sigla="CRM")
        self.cargo = Cargo.objects.create(nome="Médico", tipo_registro=tipo)

        self.func1 = self._criar_funcionario("11111111111", "Ana")
        self.func2 = self._criar_funcionario("22222222222", "Bruno")
        self.condutor = self._criar_funcionario("33333333333", "Carlos")

        CNH.objects.create(
            funcionario=self.condutor,
            numero="CNH001",
            categoria="D",
            validade=date.today() + timedelta(days=365),
        )

        self.veiculo = Veiculo.objects.create(
            placa="ABC1234",
            marca="Mercedes",
            modelo="Sprinter",
            categoria="AMBULANCIA",
            cnh_necessaria="D",
            ano=2024,
            km=1000,
            disponibilidade=self.disp_disponivel,
        )

        self.funcionario_user = Funcionario.objects.create(
            cpf="99999999999",
            nome="Operador",
            data_nascimento="1990-01-01",
            telefone="11999999999",
            email="op@test.com",
            disponibilidade=self.disp_disponivel,
        )
        self.user = User.objects.create_user(
            username="operador",
            password="123456",
            funcionario=self.funcionario_user,
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _criar_funcionario(self, cpf, nome):
        return Funcionario.objects.create(
            cpf=cpf,
            nome=nome,
            data_nascimento="1990-01-01",
            telefone="11999999999",
            email=f"{nome.lower()}@test.com",
            disponibilidade=self.disp_disponivel,
        )

    def _criar_equipe(self, nome="Equipe Alfa"):
        equipe = Equipe.objects.create(
            nome_equipe=nome,
            condutor=self.condutor,
            veiculo=self.veiculo,
            disponibilidade=self.disp_disponivel,
        )
        equipe.profissionais.set([self.condutor, self.func1, self.func2])
        disp_svc.vincular_membros_equipe(
            equipe,
            [self.condutor, self.func1, self.func2],
            self.veiculo,
            self.condutor,
        )
        return equipe


class EquipeTests(MedFleetBaseTestCase):
    def test_criar_equipe_vincula_membros(self):
        equipe = self._criar_equipe()
        self.func1.refresh_from_db()
        self.veiculo.refresh_from_db()
        self.assertEqual(self.func1.equipe_atribuida_id, equipe.id)
        self.assertEqual(self.veiculo.equipe_atribuida_id, equipe.id)
        self.assertEqual(self.func1.disponibilidade.codigo, "DISPONIVEL")

    def test_excluir_equipe_desvincula_membros(self):
        equipe = self._criar_equipe()
        equipe_id = equipe.id
        response = self.client.delete(f"/api/equipes/{equipe_id}/")
        self.assertEqual(response.status_code, 204)
        self.func1.refresh_from_db()
        self.assertIsNone(self.func1.equipe_atribuida)


class OcorrenciaTests(MedFleetBaseTestCase):
    def test_nao_inicia_sem_equipe(self):
        ocorrencia = Ocorrencia.objects.create(
            titulo="Teste",
            prioridade=self.prioridade,
            status=self.status_aguardando,
            local_informado="Rua A",
            horario_chamado="2026-06-08T10:00:00Z",
            created_by=self.user,
        )
        response = self.client.patch(
            f"/api/ocorrencias/{ocorrencia.id}/",
            {"status": self.status_atendimento.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_inicia_com_equipe_e_muda_estado(self):
        equipe = self._criar_equipe()
        ocorrencia = Ocorrencia.objects.create(
            titulo="Teste",
            prioridade=self.prioridade,
            status=self.status_aguardando,
            local_informado="Rua A",
            horario_chamado="2026-06-08T10:00:00Z",
            equipe=equipe,
            created_by=self.user,
        )
        response = self.client.patch(
            f"/api/ocorrencias/{ocorrencia.id}/",
            {"status": self.status_atendimento.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        equipe.refresh_from_db()
        self.func1.refresh_from_db()
        self.assertEqual(equipe.disponibilidade.codigo, "ATENDENDO")
        self.assertEqual(self.func1.disponibilidade.codigo, "INDISPONIVEL")

    def test_finalizar_restaura_equipe(self):
        equipe = self._criar_equipe()
        ocorrencia = Ocorrencia.objects.create(
            titulo="Teste",
            prioridade=self.prioridade,
            status=self.status_aguardando,
            local_informado="Rua A",
            horario_chamado="2026-06-08T10:00:00Z",
            equipe=equipe,
            created_by=self.user,
        )
        self.client.patch(
            f"/api/ocorrencias/{ocorrencia.id}/",
            {"status": self.status_atendimento.id},
            format="json",
        )
        response = self.client.patch(
            f"/api/ocorrencias/{ocorrencia.id}/",
            {"status": self.status_finalizado.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        equipe.refresh_from_db()
        self.assertEqual(equipe.disponibilidade.codigo, "DISPONIVEL")
