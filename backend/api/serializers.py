from datetime import date

from rest_framework import serializers

from .models import (
    Veiculo,
    Funcionario,
    CNH,
    ProfissionalSaude,
    Equipe,
    Ocorrencia,
    TipoRegistro,
    Cargo,
    Prioridade,
    Status,
    Paciente,
    Disponibilidade,
    Atendente
)


class VeiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Veiculo
        fields = '__all__'


class FuncionarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Funcionario
        fields = '__all__'


class CNHSerializer(serializers.ModelSerializer):
    class Meta:
        model = CNH
        fields = '__all__'


class CargoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cargo
        fields = '__all__'


class TipoRegistroSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoRegistro
        fields = '__all__'


class PrioridadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prioridade
        fields = '__all__'


class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = '__all__'


class DisponibilidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disponibilidade
        fields = '__all__'


class PacienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paciente
        fields = '__all__'


class ProfissionalSaudeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfissionalSaude
        fields = '__all__'

    def validate(self, data):
        cargo = data.get('cargo')
        numero_registro = data.get('numero_registro')

        if cargo.tipo_registro and not numero_registro:
            raise serializers.ValidationError(
                "numero de registro obrigatorio"
            )

        if not cargo.tipo_registro and numero_registro:
            raise serializers.ValidationError(
                "esse cargo nao exige registro"
            )

        return data


class EquipeSerializer(serializers.ModelSerializer):
    profissionais = serializers.PrimaryKeyRelatedField(
        queryset=Funcionario.objects.all(),
        many=True
    )

    class Meta:
        model = Equipe
        fields = '__all__'

    def validate(self, data):
        condutor = data.get('condutor')
        profissionais = data.get('profissionais', [])
        veiculo = data.get('veiculo')

        if not self.instance and len(profissionais) == 0:
            raise serializers.ValidationError(
                "equipe precisa de pelo menos 1 profissional"
            )

        profissionais_funcionarios = [
            prof.funcionario for prof in profissionais
        ]

        if condutor not in profissionais_funcionarios:
            raise serializers.ValidationError(
                "condutor deve fazer parte dos profissionais"
            )

        try:
            cnh = condutor.cnh
        except CNH.DoesNotExist:
            raise serializers.ValidationError(
                "condutor nao possui cnh"
            )

        if cnh.validade < date.today():
            raise serializers.ValidationError(
                "cnh vencida"
            )

        ordem_categoria = {
            "A": 1,
            "B": 2,
            "C": 3,
            "D": 4,
            "E": 5
        }

        categoria_condutor = ordem_categoria.get(cnh.categoria)
        categoria_veiculo = ordem_categoria.get(veiculo.cnh_necessaria)

        if categoria_condutor < categoria_veiculo:
            raise serializers.ValidationError(
                "categoria da cnh incompativel"
            )

        equipes_veiculo = Equipe.objects.filter(
            veiculo=veiculo
        )

        if self.instance:
            equipes_veiculo = equipes_veiculo.exclude(
                id=self.instance.id
            )

        if equipes_veiculo.exists():
            raise serializers.ValidationError(
                "veiculo ja pertence a outra equipe"
            )

        for prof in profissionais:
            equipes_prof = Equipe.objects.filter(
                profissionais=prof
            )

            if self.instance:
                equipes_prof = equipes_prof.exclude(
                    id=self.instance.id
                )

            if equipes_prof.exists():
                raise serializers.ValidationError(
                    f"profissional '{prof.nome}' ja pertence a outra equipe"
                )

        return data

    def create(self, validated_data):
        profissionais = validated_data.pop('profissionais')

        equipe = Equipe.objects.create(**validated_data)

        equipe.profissionais.set(profissionais)

        disp_ocupado = Disponibilidade.objects.get(
            nome="OCUPADO"
        )

        for prof in profissionais:
            funcionario = prof.funcionario

            funcionario.disponibilidade = disp_ocupado
            funcionario.save()

        return equipe

    def update(self, instance, validated_data):
        novos_profissionais = validated_data.pop(
            'profissionais',
            None
        )

        equipe = super().update(instance, validated_data)

        if novos_profissionais is not None:
            disp_disponivel = Disponibilidade.objects.get(
                nome="DISPONIVEL"
            )

            disp_ocupado = Disponibilidade.objects.get(
                nome="OCUPADO"
            )

            antigos = set(
                instance.profissionais.all()
            )

            novos = set(
                novos_profissionais
            )

            removidos = antigos - novos
            adicionados = novos - antigos

            for prof in removidos:
                funcionario = prof.funcionario

                funcionario.disponibilidade = disp_disponivel
                funcionario.save()

            for prof in adicionados:
                funcionario = prof.funcionario

                funcionario.disponibilidade = disp_ocupado
                funcionario.save()

            equipe.profissionais.set(
                novos_profissionais
            )

        return equipe


class OcorrenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ocorrencia
        fields = '__all__'

    def validate(self, data):
        hc = data.get('horario_chamado')
        ha = data.get('horario_atendimento')
        hh = data.get('horario_chegada_hospital')

        if ha and hc and ha < hc:
            raise serializers.ValidationError(
                "atendimento antes do chamado"
            )

        if hh and ha and hh < ha:
            raise serializers.ValidationError(
                "chegada antes do atendimento"
            )

        return data

    def create(self, validated_data):
        validated_data['created_by'] = (
            self.context['request'].user
        )

        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['updated_by'] = (
            self.context['request'].user
        )

        novo_status = validated_data.get(
            'status',
            instance.status
        )

        nova_equipe = validated_data.get(
            'equipe',
            instance.equipe
        )

        disp_atendendo = Disponibilidade.objects.get(
            nome="ATENDENDO"
        )

        disp_disponivel = Disponibilidade.objects.get(
            nome="DISPONIVEL"
        )

        if instance.status.nome == "FINALIZADO":
            raise serializers.ValidationError(
                "ocorrencia finalizada nao pode ser alterada"
            )

        if instance.equipe and nova_equipe != instance.equipe:
            raise serializers.ValidationError(
                "nao pode trocar equipe"
            )

        atribuindo_equipe = (
            instance.equipe is None and
            nova_equipe is not None
        )

        if atribuindo_equipe:
            if nova_equipe.disponibilidade.nome != "DISPONIVEL":
                raise serializers.ValidationError(
                    "equipe nao disponivel"
                )

            nova_equipe.disponibilidade = disp_atendendo
            nova_equipe.save()

            nova_equipe.veiculo.disponibilidade = disp_atendendo
            nova_equipe.veiculo.save()

        instance = super().update(
            instance,
            validated_data
        )

        if atribuindo_equipe:
            instance.condutor = nova_equipe.condutor

            instance.veiculo = nova_equipe.veiculo

            instance.save()

            instance.profissionais.set(
                nova_equipe.profissionais.all()
            )

        if (
            instance.status.nome != "FINALIZADO" and
            novo_status.nome == "FINALIZADO"
        ):
            if instance.equipe:
                equipe = instance.equipe

                equipe.disponibilidade = disp_disponivel
                equipe.save()

                equipe.veiculo.disponibilidade = disp_disponivel
                equipe.veiculo.save()

        return instance


class AtendenteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Atendente
        fields = ['id', 'username', 'password', 'funcionario', 'created_at']

    def create(self, validated_data):
        password = validated_data.pop('password')

        user = Atendente(**validated_data)
        user.set_password(password)
        user.save()

        return user
    