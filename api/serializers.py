from rest_framework import serializers
from .models import Motorista, Veiculo, Enfermeiro, Equipe, Chamado

class MotoristaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Motorista
        fields = '__all__'

class VeiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Veiculo
        fields = '__all__'

class EnfermeiroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enfermeiro
        fields = '__all__'

class EquipeSerializer(serializers.ModelSerializer):
    enfermeiros = serializers.PrimaryKeyRelatedField(
        queryset=Enfermeiro.objects.all(),
        many=True
    )

    class Meta:
        model = Equipe
        fields = '__all__'

    def validate(self, data):
        motorista = data.get('motorista')
        enfermeiros = data.get('enfermeiros', [])

        if len(enfermeiros) == 0:
            raise serializers.ValidationError("a equipe precisa de pelo menos 1 enfermeiro")

        equipes = Equipe.objects.filter(motorista=motorista)

        for equipe in equipes:
            if set(equipe.enfermeiros.all()) == set(enfermeiros):
                raise serializers.ValidationError("essa equipe ja foi criada")

        if Equipe.objects.filter(motorista=motorista, ativa=True).exists():
            raise serializers.ValidationError("motorista em outra equipe ativa")

        for enf in enfermeiros:
            if Equipe.objects.filter(enfermeiros=enf, ativa=True).exists():
                raise serializers.ValidationError(
                    f"enfermeiro '{enf.nome}' em outra equipe ativa" 
                )

        return data

class ChamadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chamado
        fields = '__all__'

    def validate(self, data):
        equipe = data.get('equipe')

        if equipe and not equipe.disponivel:
            raise serializers.ValidationError("equipe nao disponivel")

        return data
    
    def update(self, instance, validated_data):
        if instance.finalizado:
            raise serializers.ValidationError("alteracoes bloequadas: chamado finalizado")
        
        nova_equipe = validated_data.get('equipe', instance.equipe)
        # pega equpe dos dados, mas se nao tiver usa da propria instancia
        finalizado = validated_data.get('finalizado', instance.finalizado)

        if instance.equipe is None and nova_equipe is not None:
            if not nova_equipe.disponivel:
                raise serializers.ValidationError("equipe nao disponivel")
            
            nova_equipe.disponivel = False
            nova_equipe.save()

        if not instance.finalizado and finalizado:
            if instance.equipe:
                instance.equipe.disponivel = True
                instance.equipe.save()

        return super().update(instance, validated_data)