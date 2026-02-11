from django.apps import AppConfig


class FilehubConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "filehub"

    def ready(self):
        import filehub.signals
        print("DEBUG: FilehubConfig.ready() executed - registering DRF mappings")
        
        from rest_framework.serializers import ModelSerializer
        from filehub.fields import FilePickerField, GalleryPickerField, ImagePickerField
        from filehub.serializers import (
            FilePickerSerializerField,
            GalleryPickerSerializerField,
            ImagePickerSerializerField
        )

        # Register custom field mappings
        ModelSerializer.serializer_field_mapping[FilePickerField] = FilePickerSerializerField
        ModelSerializer.serializer_field_mapping[GalleryPickerField] = GalleryPickerSerializerField
        ModelSerializer.serializer_field_mapping[ImagePickerField] = ImagePickerSerializerField
