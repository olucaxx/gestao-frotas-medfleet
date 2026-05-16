from django.db import models
from django.core.validators import MinValueValidator, RegexValidator
from django.db.models import PROTECT # importante para nao deletarmos informacoes importantes
from django.contrib.auth.models import AbstractUser

cpf_validator = RegexValidator(
    regex=r'^\d{11}$',
    message="o CPF deve conter exatamente 11 digitos numericos"
)


class Motorista(models.Model):
    cpf = models.CharField(max_length=11, validators=[cpf_validator], unique=True) # so aceita numeros com esse validador
    nome = models.CharField(max_length=100)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    data_nascimento = models.DateField()
    cnh = models.CharField(max_length=20, unique=True, blank=True, null=True) # criar tabela para isso logo
    email = models.EmailField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome


class Veiculo(models.Model):
    placa = models.CharField(max_length=10, unique=True)
    marca = models.CharField(max_length=50, blank=True, null=True)
    modelo = models.CharField(max_length=100, blank=True, null=True)
    categoria = models.CharField(max_length=20, blank=True, null=True)
    ano = models.IntegerField(blank=True, null=True)
    km = models.IntegerField(default=0, validators=[MinValueValidator(0)]) # nao permite mais km negativo
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.placa


class TipoRegistro(models.Model):
    nome = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.nome
    

class Cargo(models.Model):
    nome = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.nome


class Profissional(models.Model):
    cpf = models.CharField(max_length=11, validators=[cpf_validator], unique=True)
    nome = models.CharField(max_length=100)

    cargo = models.ForeignKey(Cargo, on_delete=PROTECT)

    tipo_registro = models.ForeignKey(TipoRegistro, on_delete=PROTECT, null=True, blank=True)
    numero_registro = models.CharField(max_length=30, blank=True, null=True)
    
    telefone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    def __str__(self):
        return self.nome


class Disponibilidade(models.Model):
    nome = models.CharField(max_length=50, unique=True)
    codigo = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.nome


class Equipe(models.Model):
    nome_equipe = models.CharField(max_length=50)
    motorista = models.ForeignKey(Motorista, on_delete=PROTECT)
    profissionais = models.ManyToManyField(Profissional)
    veiculo = models.ForeignKey(Veiculo, on_delete=PROTECT)
    disponibilidade = models.ForeignKey(Disponibilidade, on_delete=PROTECT)

    created_at = models.DateTimeField(auto_now_add=True)

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
    
    
class Paciente(models.Model):
    nome = models.CharField(max_length=100)
    data_nascimento = models.DateField(blank=True, null=True)
    cpf = models.CharField(max_length=11, validators=[cpf_validator], blank=True, null=True, unique=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.nome
    

class Ocorrencia(models.Model):
    titulo = models.CharField(max_length=100)
    observacoes = models.TextField(blank=True, null=True)

    prioridade = models.ForeignKey(Prioridade, on_delete=models.PROTECT)
    status = models.ForeignKey(Status, on_delete=models.PROTECT)

    local_informado = models.CharField(max_length=255)
    destino = models.CharField(max_length=255, blank=True, null=True)

    horario_chamado = models.DateTimeField()
    horario_atendimento = models.DateTimeField(blank=True, null=True)
    horario_chegada_hospital = models.DateTimeField(blank=True, null=True)

    equipe = models.ForeignKey(Equipe, on_delete=models.PROTECT, null=True, blank=True)

    motorista = models.ForeignKey(Motorista, on_delete=PROTECT, null=True, blank=True)
    veiculo = models.ForeignKey(Veiculo, on_delete=PROTECT, null=True, blank=True)
    profissionais = models.ManyToManyField(Profissional, blank=True)

    paciente = models.ForeignKey('Paciente', on_delete=models.PROTECT, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.titulo} ({self.id})"


class Atendente(AbstractUser):
    cpf = models.CharField(max_length=11, validators=[cpf_validator], unique=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"Atendente: {self.username} (CPF: {self.cpf})"