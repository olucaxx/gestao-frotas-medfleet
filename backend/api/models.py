from django.db import models
from django.core.validators import MinValueValidator
from django.db.models import PROTECT
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class Disponibilidade(models.Model):
    nome = models.CharField(max_length=50, unique=True)
    codigo = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.nome


class TipoRegistro(models.Model):
    sigla = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return self.sigla


class Cargo(models.Model):
    nome = models.CharField(max_length=50, unique=True)
    tipo_registro = models.ForeignKey(TipoRegistro, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.nome


class Veiculo(models.Model):
    placa = models.CharField(max_length=10, unique=True)

    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=100)
    categoria = models.CharField(max_length=20)
    cnh_necessaria = models.CharField(max_length=2) # se precisar de B e o motorista tiver C, é valido

    ano = models.IntegerField()
    km = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    disponibilidade = models.ForeignKey(Disponibilidade, on_delete=PROTECT)
    equipe_atribuida = models.ForeignKey(
        'Equipe',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='veiculos_vinculados'
    )

    def __str__(self):
        return self.placa


class Funcionario(models.Model):
    matricula = models.BigAutoField(primary_key=True)
    cpf = models.CharField(max_length=11,unique=True)
    nome = models.CharField(max_length=100)
    data_nascimento = models.DateField()

    telefone = models.CharField(max_length=20)
    email = models.EmailField(max_length=100)

    disponibilidade = models.ForeignKey(Disponibilidade, on_delete=PROTECT)
    equipe_atribuida = models.ForeignKey(
        'Equipe',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='funcionarios_vinculados'
    )

    def __str__(self):
        return self.nome
    
    
class Atendente(AbstractUser):
    funcionario = models.OneToOneField(
        Funcionario,
        on_delete=models.CASCADE
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )


class CNH(models.Model):
    funcionario = models.OneToOneField(Funcionario, on_delete=models.CASCADE, related_name="cnh")

    numero = models.CharField(max_length=20, unique=True)
    categoria = models.CharField(max_length=10)
    validade = models.DateField()

    def __str__(self):
        return f"{self.funcionario.nome} - {self.numero}"


class ProfissionalSaude(models.Model):
    funcionario = models.OneToOneField(Funcionario, on_delete=models.CASCADE, related_name="profissional_saude")

    cargo = models.ForeignKey(Cargo, on_delete=PROTECT)
    numero_registro = models.CharField(max_length=30, blank=True, null=True)

    def __str__(self):
        return self.funcionario.nome
    

class Equipe(models.Model):
    nome_equipe = models.CharField(max_length=50)
    
    condutor = models.ForeignKey(
        Funcionario,
        on_delete=PROTECT,
        related_name='equipes_como_condutor'
    )
    profissionais = models.ManyToManyField(
        Funcionario,
        related_name='equipes_como_profissional'
    )
    
    veiculo = models.ForeignKey(Veiculo, on_delete=PROTECT)
    disponibilidade = models.ForeignKey(Disponibilidade, on_delete=PROTECT)

    def __str__(self):
        return self.nome_equipe
    
    
class Prioridade(models.Model):
    nome = models.CharField(max_length=50, unique=True)
    codigo = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.nome
    
    
class Status(models.Model):
    nome = models.CharField(max_length=20, unique=True)
    codigo = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.nome


class Ocorrencia(models.Model):
    titulo = models.CharField(max_length=100)

    observacoes = models.TextField(
        blank=True,
        null=True
    )

    prioridade = models.ForeignKey(
        Prioridade,
        on_delete=PROTECT
    )

    status = models.ForeignKey(
        Status,
        on_delete=PROTECT
    )

    local_informado = models.CharField(
        max_length=255
    )

    destino = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    horario_chamado = models.DateTimeField()

    horario_atendimento = models.DateTimeField(
        blank=True,
        null=True
    )

    horario_chegada_hospital = models.DateTimeField(
        blank=True,
        null=True
    )

    equipe = models.ForeignKey(
        Equipe,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    condutor = models.ForeignKey(
        Funcionario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ocorrencias_como_condutor"
    )

    veiculo = models.ForeignKey(
        Veiculo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    profissionais = models.ManyToManyField(
        ProfissionalSaude,
        blank=True
    )

    nome_paciente = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    telefone_paciente = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='ocorrencias_criadas',
        null=True
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='ocorrencias_atualizadas',
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.titulo} ({self.id})"
    
class Manutencao(models.Model):
    veiculo = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name="manutencoes")
    data = models.DateField()
    descricao = models.TextField(blank=True, null=True)
    custo = models.DecimalField(max_digits=10, decimal_places=2)
    oficina = models.CharField(max_length=150, blank=True, null=True)

    def __str__(self):
        return f"Manutenção - {self.veiculo.placa} - {self.descricao} ({self.id})"


class Abastecimento(models.Model):
    veiculo = models.ForeignKey(Veiculo, on_delete=models.CASCADE, related_name="abastecimentos")
    data = models.DateField()
    quantidade_litros = models.DecimalField(max_digits=6, decimal_places=2)
    custo_total = models.DecimalField(max_digits=10, decimal_places=2)
    tipo_combustivel = models.CharField(max_length=50)

    def __str__(self):
        return f"Abastecimento - {self.veiculo.placa} - {self.data} ({self.id})" 
    