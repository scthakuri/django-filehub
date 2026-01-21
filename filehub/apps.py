from django.apps import AppConfig


class FilehubConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "filehub"

    def ready(self):
        import filehub.signals
        try:
            from rest_framework import serializers
            from filehub.fields import FilePickerField, GalleryPickerField, ImagePickerField
            from filehub.serializers import (
                FilePickerSerializerField,
                GalleryPickerSerializerField,
                ImagePickerSerializerField
            )

            serializers.ModelSerializer.serializer_field_mapping[FilePickerField] = FilePickerSerializerField
            serializers.ModelSerializer.serializer_field_mapping[GalleryPickerField] = GalleryPickerSerializerField
            serializers.ModelSerializer.serializer_field_mapping[ImagePickerField] = ImagePickerSerializerField
        except ImportError:
            pass
