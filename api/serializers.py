from rest_framework import serializers
<<<<<<< HEAD
from .models import Motorista, Veiculo
=======
from .models import Motorista, Veiculo, Enfermeiro, Equipe, Chamado
>>>>>>> 7ec6becc6952a04a06ea8539eadbed1983198d23

class MotoristaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Motorista
        fields = '__all__'

class VeiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Veiculo
<<<<<<< HEAD
=======
        fields = '__all__'

class EnfermeiroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enfermeiro
        fields = '__all__'

class EquipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipe
        fields = '__all__'

class ChamadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chamado
>>>>>>> 7ec6becc6952a04a06ea8539eadbed1983198d23
        fields = '__all__'