from datetime import date

from django.utils import timezone
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
    Disponibilidade,
    Atendente,
    Manutencao,
    Abastecimento,
    STATUS_MANUTENCAO_EM,
    STATUS_MANUTENCAO_FINALIZADA,
)
from .services import disponibilidade as disp_svc


class VeiculoSerializer(serializers.ModelSerializer):
    equipe_nome = serializers.SerializerMethodField()
    disponibilidade_controlada = serializers.SerializerMethodField()
    disponibilidade = serializers.PrimaryKeyRelatedField(
        queryset=Disponibilidade.objects.all(),
        required=False
    )

    class Meta:
        model = Veiculo
        fields = '__all__'
        read_only_fields = ['equipe_atribuida', 'equipe_nome', 'disponibilidade_controlada']

    def get_equipe_nome(self, obj):
        return obj.equipe_atribuida.nome_equipe if obj.equipe_atribuida else None

    def get_disponibilidade_controlada(self, obj):
        return disp_svc.disponibilidade_veiculo_bloqueada(obj)

    def validate(self, data):
        instance = self.instance
        nova_disp = data.get('disponibilidade')

        if instance and disp_svc.disponibilidade_veiculo_bloqueada(instance):
            if nova_disp and nova_disp != instance.disponibilidade:
                raise serializers.ValidationError(
                    "disponibilidade de veiculo bloqueada (vinculado a equipe ou em manutencao)"
                )

        return data

    def create(self, validated_data):
        validated_data['disponibilidade'] = Disponibilidade.objects.get(
            codigo=disp_svc.COD_DISPONIVEL
        )
        return super().create(validated_data)


class FuncionarioSerializer(serializers.ModelSerializer):
    equipe_nome = serializers.SerializerMethodField()
    disponibilidade_controlada = serializers.SerializerMethodField()
    disponibilidade = serializers.PrimaryKeyRelatedField(
        queryset=Disponibilidade.objects.all(),
        required=False
    )

    class Meta:
        model = Funcionario
        fields = '__all__'
        read_only_fields = ['equipe_atribuida', 'equipe_nome', 'disponibilidade_controlada']

    def get_equipe_nome(self, obj):
        return obj.equipe_atribuida.nome_equipe if obj.equipe_atribuida else None

    def get_disponibilidade_controlada(self, obj):
        return disp_svc.membro_vinculado_a_equipe(obj)

    def validate(self, data):
        instance = self.instance
        nova_disp = data.get('disponibilidade')

        if instance and disp_svc.membro_vinculado_a_equipe(instance):
            if nova_disp and nova_disp != instance.disponibilidade:
                raise serializers.ValidationError(
                    "disponibilidade de funcionario vinculado a equipe e controlada automaticamente"
                )

        return data

    def create(self, validated_data):
        validated_data['disponibilidade'] = Disponibilidade.objects.get(
            codigo=disp_svc.COD_DISPONIVEL
        )
        return super().create(validated_data)


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
        read_only_fields = ['disponibilidade']

    def validate(self, data):
        condutor = data.get('condutor', getattr(self.instance, 'condutor', None))
        profissionais = data.get(
            'profissionais',
            list(self.instance.profissionais.all()) if self.instance else []
        )
        veiculo = data.get('veiculo', getattr(self.instance, 'veiculo', None))

        if self.instance and disp_svc.equipe_em_atendimento(self.instance):
            raise serializers.ValidationError(
                "equipe em atendimento nao pode ser alterada"
            )

        if not self.instance and len(profissionais) == 0:
            raise serializers.ValidationError(
                "equipe precisa de pelo menos 1 profissional"
            )

        if condutor not in profissionais:
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

        ok, msg = disp_svc.validar_membros_equipe(
            condutor, profissionais, veiculo, self.instance
        )
        if not ok:
            raise serializers.ValidationError(msg)

        if 'disponibilidade' in data:
            raise serializers.ValidationError(
                "disponibilidade da equipe e controlada automaticamente"
            )

        return data

    def create(self, validated_data):
        profissionais = validated_data.pop('profissionais')
        validated_data.pop('disponibilidade', None)
        validated_data['disponibilidade'] = Disponibilidade.objects.get(
            codigo=disp_svc.COD_DISPONIVEL
        )

        condutor = validated_data['condutor']
        veiculo = validated_data['veiculo']

        equipe = Equipe.objects.create(**validated_data)
        equipe.profissionais.set(profissionais)
        disp_svc.vincular_membros_equipe(equipe, profissionais, veiculo, condutor)

        return equipe

    def update(self, instance, validated_data):
        novos_profissionais = validated_data.pop('profissionais', None)
        validated_data.pop('disponibilidade', None)

        veiculo_antigo = instance.veiculo

        condutor = validated_data.get('condutor', instance.condutor)
        veiculo = validated_data.get('veiculo', instance.veiculo)

        equipe = super().update(instance, validated_data)

        if veiculo_antigo != veiculo:
            veiculo_antigo.equipe = None
            veiculo_antigo.save()

        if novos_profissionais is not None:
            equipe.profissionais.set(novos_profissionais)
            disp_svc.vincular_membros_equipe(
                equipe, novos_profissionais, veiculo, condutor
            )
        else:
            disp_svc.vincular_membros_equipe(
                equipe,
                list(equipe.profissionais.all()),
                veiculo,
                condutor,
            )

        return equipe


class OcorrenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ocorrencia
        fields = '__all__'
        read_only_fields = [
            "created_by",
            "updated_by"
        ]

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

        instance = self.instance
        novo_status = data.get('status', getattr(instance, 'status', None))
        nova_equipe = data.get('equipe', getattr(instance, 'equipe', None))

        if novo_status and novo_status.codigo == "EM_ATENDIMENTO":
            equipe_ref = nova_equipe or (instance.equipe if instance else None)
            if not equipe_ref:
                raise serializers.ValidationError(
                    "ocorrencia so pode ser iniciada com uma equipe vinculada"
                )

            ok, msg = disp_svc.equipe_disponivel_para_ocorrencia(
                equipe_ref,
                ocorrencia_id=instance.id if instance else None,
            )
            if not ok:
                raise serializers.ValidationError(msg)

        if nova_equipe and (not instance or not instance.equipe):
            ok, msg = disp_svc.equipe_disponivel_para_ocorrencia(
                nova_equipe,
                ocorrencia_id=instance.id if instance else None,
            )
            if not ok:
                raise serializers.ValidationError(msg)

        return data

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        status_inicial = validated_data.get('status')
        ocorrencia = super().create(validated_data)

        if ocorrencia.equipe:
            disp_svc.vincular_ocorrencia_a_equipe(ocorrencia, ocorrencia.equipe)

            if status_inicial and status_inicial.codigo == "EM_ATENDIMENTO":
                disp_svc.iniciar_atendimento_equipe(ocorrencia.equipe)

        return ocorrencia

    def update(self, instance, validated_data):
        validated_data['updated_by'] = self.context['request'].user

        novo_status = validated_data.get('status', instance.status)
        nova_equipe = validated_data.get('equipe', instance.equipe)
        status_anterior = instance.status.codigo

        if instance.status.codigo == "FINALIZADO":
            raise serializers.ValidationError(
                "ocorrencia finalizada nao pode ser alterada"
            )

        atribuindo_equipe = (
            instance.equipe is None and
            nova_equipe is not None
        )

        if atribuindo_equipe:
            ok, msg = disp_svc.equipe_disponivel_para_ocorrencia(
                nova_equipe, ocorrencia_id=instance.id
            )
            if not ok:
                raise serializers.ValidationError(msg)

        iniciando_atendimento = (
            status_anterior == "AGUARDANDO" and
            novo_status.codigo == "EM_ATENDIMENTO"
        )

        equipe_ref = nova_equipe or instance.equipe

        if iniciando_atendimento:
            if not equipe_ref:
                raise serializers.ValidationError(
                    "ocorrencia so pode ser iniciada com uma equipe vinculada"
                )
            if not validated_data.get('horario_atendimento') and not instance.horario_atendimento:
                validated_data['horario_atendimento'] = timezone.now()

        instance = super().update(instance, validated_data)

        if atribuindo_equipe:
            disp_svc.vincular_ocorrencia_a_equipe(instance, nova_equipe)

        if iniciando_atendimento and equipe_ref:
            disp_svc.iniciar_atendimento_equipe(equipe_ref)
            disp_svc.vincular_ocorrencia_a_equipe(instance, equipe_ref)

        if (
            status_anterior != "FINALIZADO" and
            novo_status.codigo == "FINALIZADO" and
            instance.equipe
        ):
            disp_svc.finalizar_atendimento_equipe(instance.equipe)

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


class ManutencaoSerializer(serializers.ModelSerializer):
    veiculo_placa = serializers.CharField(source="veiculo.placa", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Manutencao
        fields = '__all__'
        # status is writable only via the dedicated finalizar action
        read_only_fields = ['status', 'veiculo_placa', 'status_display']

    def validate(self, data):
        # Não permite edição após criação — apenas POST é válido neste serializer
        if self.instance is not None:
            raise serializers.ValidationError(
                "manutencao nao pode ser editada apos criacao"
            )
        return data

    def create(self, validated_data):
        veiculo = validated_data['veiculo']

        # Inicia o processo de manutenção no veículo
        disp_svc.iniciar_manutencao_veiculo(veiculo)

        # Recarrega o veículo para garantir estado atualizado
        validated_data['veiculo'].refresh_from_db()

        return super().create(validated_data)


class ManutencaoFinalizarSerializer(serializers.ModelSerializer):
    """Serializer exclusivo para a ação de finalizar uma manutenção."""

    class Meta:
        model = Manutencao
        fields = ['id', 'status', 'veiculo_placa', 'status_display']
        read_only_fields = ['id', 'veiculo_placa', 'status_display']

    veiculo_placa = serializers.CharField(source="veiculo.placa", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    def validate(self, data):
        if self.instance.status == STATUS_MANUTENCAO_FINALIZADA:
            raise serializers.ValidationError("manutencao ja finalizada")
        return data

    def update(self, instance, validated_data):
        instance.status = STATUS_MANUTENCAO_FINALIZADA
        instance.save(update_fields=['status'])

        # Verifica se pode liberar o veículo
        disp_svc.finalizar_manutencao_veiculo(instance.veiculo)

        return instance


class AbastecimentoSerializer(serializers.ModelSerializer):
    veiculo_placa = serializers.CharField(source="veiculo.placa", read_only=True)

    class Meta:
        model = Abastecimento
        fields = '__all__'
        read_only_fields = ['veiculo_placa']

    def validate(self, data):
        # Abastecimento é apenas registro histórico — sem edição
        if self.instance is not None:
            raise serializers.ValidationError(
                "abastecimento nao pode ser editado apos criacao"
            )
        return data