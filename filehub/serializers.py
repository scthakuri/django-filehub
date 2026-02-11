from rest_framework import serializers
from django.core.files.uploadedfile import UploadedFile
from filehub.core import FolderManager
import os


class FilePickerSerializerField(serializers.Field):

    def __init__(self, *args, **kwargs):
        self.upload_to = kwargs.pop('upload_to', None)
        self.file_ext = kwargs.pop('file_ext', [])
        kwargs.pop('encoder', None)
        kwargs.pop('decoder', None)
        super().__init__(*args, **kwargs)

    def bind(self, field_name, parent):
        super().bind(field_name, parent)

        if hasattr(parent, 'Meta') and hasattr(parent.Meta, 'model'):
            model = parent.Meta.model
            try:
                model_field = model._meta.get_field(field_name)
                if hasattr(model_field, 'upload_to') and model_field.upload_to and not self.upload_to:
                    self.upload_to = model_field.upload_to
                if hasattr(model_field, 'file_ext') and model_field.file_ext and not self.file_ext:
                    self.file_ext = model_field.file_ext
            except:
                pass

    def to_internal_value(self, data):
        if data is None or data == '':
            return None

        if isinstance(data, UploadedFile):
            folder_instance = None
            if self.upload_to:
                upload_path = self.upload_to
                if callable(upload_path):
                    instance = getattr(self.parent, 'instance', None)
                    upload_path = upload_path(instance, data.name)
                    if upload_path and not upload_path.endswith('/'):
                        upload_path = os.path.dirname(upload_path)

                if upload_path:
                    folder_instance = FolderManager.create_folder_by_path(upload_path)

            media_file = FolderManager.upload_to_filemanager(
                data,
                folder_instance=folder_instance,
                user=self.context.get('request').user if self.context.get('request') else None
            )

            return {
                'url': media_file.get_url(),
                'name': media_file.file_name,
                'size': media_file.file_size,
                'type': media_file.file_type,
                'id': media_file.id
            }

        elif isinstance(data, str):
            if data.startswith('http'):
                folder_instance = None
                if self.upload_to:
                    upload_path = self.upload_to
                    if callable(upload_path):
                        instance = getattr(self.parent, 'instance', None)
                        # For URLs, we might not have a clean filename easily, but we try base name
                        filename = os.path.basename(data.split('?')[0])
                        upload_path = upload_path(instance, filename)
                        if upload_path and not upload_path.endswith('/'):
                            upload_path = os.path.dirname(upload_path)

                    if upload_path:
                        folder_instance = FolderManager.create_folder_by_path(upload_path)

                media_file = FolderManager.upload_to_filemanager(
                    data,
                    folder_instance=folder_instance,
                    user=self.context.get('request').user if self.context.get('request') else None
                )

                return {
                    'url': media_file.get_url(),
                    'name': media_file.file_name,
                    'size': media_file.file_size,
                    'type': media_file.file_type,
                    'id': media_file.id
                }
            else:
                return data

        elif isinstance(data, dict):
            return data

        return None

    def to_representation(self, value):
        if not value:
            return {}
        return value


class GalleryPickerSerializerField(serializers.JSONField):

    def __init__(self, *args, **kwargs):
        self.upload_to = kwargs.pop('upload_to', None)
        self.min_items = kwargs.pop('min_items', None)
        self.max_items = kwargs.pop('max_items', None)
        super().__init__(*args, **kwargs)

    def bind(self, field_name, parent):
        super().bind(field_name, parent)

        if hasattr(parent, 'Meta') and hasattr(parent.Meta, 'model'):
            model = parent.Meta.model
            try:
                model_field = model._meta.get_field(field_name)
                if hasattr(model_field, 'upload_to') and model_field.upload_to and not self.upload_to:
                    self.upload_to = model_field.upload_to
                if hasattr(model_field, 'min_items') and model_field.min_items and not self.min_items:
                    self.min_items = model_field.min_items
                if hasattr(model_field, 'max_items') and model_field.max_items and not self.max_items:
                    self.max_items = model_field.max_items
            except:
                pass

    def to_internal_value(self, data):
        if not data:
            return []
            
        if not isinstance(data, list):
            data = [data]

        result = []
        folder_instance = None
        if self.upload_to:
            upload_path = self.upload_to
            if callable(upload_path):
                # For basic gallery, we pass filename=None to get the directory
                instance = getattr(self.parent, 'instance', None)
                upload_path = upload_path(instance, None)
                if upload_path and not upload_path.endswith('/'):
                    upload_path = os.path.dirname(upload_path)
            
            if upload_path:
                folder_instance = FolderManager.create_folder_by_path(upload_path)

        for item in data:
            if isinstance(item, UploadedFile):
                media_file = FolderManager.upload_to_filemanager(
                    item,
                    folder_instance=folder_instance,
                    user=self.context.get('request').user if self.context.get('request') else None
                )

                result.append({
                    'url': media_file.get_url(),
                    'name': media_file.file_name,
                    'size': media_file.file_size,
                    'type': media_file.file_type,
                    'id': media_file.id
                })

            elif isinstance(item, str):
                if item.startswith('http'):
                    media_file = FolderManager.upload_to_filemanager(
                        item,
                        folder_instance=folder_instance,
                        user=self.context.get('request').user if self.context.get('request') else None
                    )

                    result.append({
                        'url': media_file.get_url(),
                        'name': media_file.file_name,
                        'size': media_file.file_size,
                        'type': media_file.file_type,
                        'id': media_file.id
                    })
                else:
                    try:
                        import json
                        parsed = json.loads(item)
                        result.append(parsed)
                    except (json.JSONDecodeError, TypeError):
                        pass

            elif isinstance(item, dict):
                result.append(item)

        if self.min_items is not None and len(result) < self.min_items:
            raise serializers.ValidationError(f"You must provide at least {self.min_items} item(s).")

        if self.max_items is not None and len(result) > self.max_items:
            raise serializers.ValidationError(f"You can provide at most {self.max_items} item(s).")

        return result

    def to_representation(self, value):
        if not value:
            return []
        return value


class ImagePickerSerializerField(serializers.CharField):

    def __init__(self, *args, **kwargs):
        self.upload_to = kwargs.pop('upload_to', None)
        self.file_ext = kwargs.pop('file_ext', [])
        super().__init__(*args, **kwargs)

    def bind(self, field_name, parent):
        super().bind(field_name, parent)

        if hasattr(parent, 'Meta') and hasattr(parent.Meta, 'model'):
            model = parent.Meta.model
            try:
                model_field = model._meta.get_field(field_name)
                if hasattr(model_field, 'upload_to') and model_field.upload_to and not self.upload_to:
                    self.upload_to = model_field.upload_to
                if hasattr(model_field, 'file_ext') and model_field.file_ext and not self.file_ext:
                    self.file_ext = model_field.file_ext
            except:
                pass

    def to_internal_value(self, data):
        if data is None or data == '':
            return ""

        if isinstance(data, UploadedFile):
            folder_instance = None
            if self.upload_to:
                upload_path = self.upload_to
                if callable(upload_path):
                    instance = getattr(self.parent, 'instance', None)
                    upload_path = upload_path(instance, data.name)
                    if upload_path and not upload_path.endswith('/'):
                        upload_path = os.path.dirname(upload_path)

                if upload_path:
                    folder_instance = FolderManager.create_folder_by_path(upload_path)

            media_file = FolderManager.upload_to_filemanager(
                data,
                folder_instance=folder_instance,
                user=self.context.get('request').user if self.context.get('request') else None
            )

            return media_file.get_url()

        elif isinstance(data, str):
            if data.startswith('http'):
                folder_instance = None
                if self.upload_to:
                    upload_path = self.upload_to
                    if callable(upload_path):
                        instance = getattr(self.parent, 'instance', None)
                        filename = os.path.basename(data.split('?')[0])
                        upload_path = upload_path(instance, filename)
                        if upload_path and not upload_path.endswith('/'):
                            upload_path = os.path.dirname(upload_path)

                    if upload_path:
                        folder_instance = FolderManager.create_folder_by_path(upload_path)

                media_file = FolderManager.upload_to_filemanager(
                    data,
                    folder_instance=folder_instance,
                    user=self.context.get('request').user if self.context.get('request') else None
                )
                return media_file.get_url()

            return data

        return ""

    def to_representation(self, value):
        return value or ""