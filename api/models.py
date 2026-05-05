from django.db import models
from django.core.validators import MinValueValidator, RegexValidator
from django.db.models import PROTECT # importante para nao deletarmos informacoes importantes

cpf_validator = RegexValidator(
    regex=r'^\d{11}$',
    message="o CPF deve conter exatamente 11 digitos numericos"
)

class Motorista(models.Model):
    cpf = models.CharField(max_length=11, primary_key=True, validators=[cpf_validator]) # so aceita numeros com esse validador
    nome = models.CharField(max_length=100)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    data_nascimento = models.DateField()
    cnh = models.CharField(max_length=20, unique=True, blank=True, null=True)
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

class Enfermeiro(models.Model):
    coren = models.CharField(max_length=20, unique=True)
    nome = models.CharField(max_length=100)
    cpf = models.CharField(max_length=11, unique=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nome} (COREN: {self.coren})"

class Equipe(models.Model):
    nome_equipe = models.CharField(max_length=50)
    motorista = models.ForeignKey(Motorista, on_delete=PROTECT)
    enfermeiros = models.ManyToManyField(Enfermeiro) # cria a tabela intermediaria automaticamente
    disponivel = models.BooleanField(default=True) # para impedir que seja utilizado quando ta ocupado/inativo
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome_equipe

class Chamado(models.Model):
    descricao = models.TextField()
    data_hora = models.DateTimeField(auto_now_add=True)
    veiculo = models.ForeignKey(Veiculo, on_delete=PROTECT)
    equipe = models.ForeignKey(Equipe, on_delete=PROTECT, null=True, blank=True)
    localizacao = models.CharField(max_length=255)
    finalizado = models.BooleanField(default=False)

    def __str__(self):
        return f"Chamado {self.id} - {self.localizacao}"