from django.apps import AppConfig


class FilehubConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "filehub"

    def ready(self):
        import filehub.signals
