import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MediaFolder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('folder_name', models.CharField(max_length=255)),
                ('upload_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('modify_date', models.DateTimeField(auto_now=True, null=True)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='filehub.mediafolder')),
                ('upload_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='MediaFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_name', models.CharField(max_length=255)),
                ('file_type', models.CharField(blank=True, max_length=50, null=True)),
                ('file_size', models.PositiveIntegerField(blank=True, default=0)),
                ('width', models.PositiveIntegerField(blank=True, default=0)),
                ('height', models.PositiveIntegerField(blank=True, default=0)),
                ('upload_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('modify_date', models.DateTimeField(auto_now=True, null=True)),
                ('upload_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('folder', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='filehub.mediafolder')),
            ],
        ),
    ]
