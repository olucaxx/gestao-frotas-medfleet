from django.db import migrations, models
import django.db.models.deletion


def popular_equipe_atribuida(apps, schema_editor):
    Equipe = apps.get_model('api', 'Equipe')
    Funcionario = apps.get_model('api', 'Funcionario')
    Veiculo = apps.get_model('api', 'Veiculo')
    Disponibilidade = apps.get_model('api', 'Disponibilidade')

    Disponibilidade.objects.get_or_create(
        codigo='ATENDENDO',
        defaults={'nome': 'Em Atendimento'}
    )

    for equipe in Equipe.objects.all():
        if equipe.veiculo_id:
            Veiculo.objects.filter(pk=equipe.veiculo_id).update(
                equipe_atribuida_id=equipe.id
            )

        for func in equipe.profissionais.all():
            Funcionario.objects.filter(pk=func.matricula).update(
                equipe_atribuida_id=equipe.id
            )

        if equipe.condutor_id:
            Funcionario.objects.filter(pk=equipe.condutor_id).update(
                equipe_atribuida_id=equipe.id
            )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_remove_ocorrencia_paciente_ocorrencia_nome_paciente_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='funcionario',
            name='equipe_atribuida',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='funcionarios_vinculados',
                to='api.equipe',
            ),
        ),
        migrations.AddField(
            model_name='veiculo',
            name='equipe_atribuida',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='veiculos_vinculados',
                to='api.equipe',
            ),
        ),
        migrations.RunPython(popular_equipe_atribuida, migrations.RunPython.noop),
    ]
