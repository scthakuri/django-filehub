import os
from io import BytesIO

from PIL import Image
from django.core.files.storage import default_storage
from django.db import models

import filehub.settings
from filehub.settings import EMPTY_FOLDER_SIZE
from django.db.models import Sum, Value, IntegerField
from django.db.models.functions import Coalesce
from filehub.core import FolderManager
from django.core.exceptions import ValidationError
from django.conf import settings

from django.contrib.auth import get_user_model
User = get_user_model()


# Create your models here.
class MediaFolder(models.Model):
    folder_name = models.CharField(max_length=255)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE)
    upload_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    upload_date = models.DateTimeField(auto_now_add=True, null=True)
    modify_date = models.DateTimeField(auto_now=True, null=True)

    def __str__(self):
        return self.folder_name

    def get_relative_path(self, new_folder_name=None):
        """
        Generate the relative file path for the MediaFolder instance based on its id.
        """
        folder_name = new_folder_name if new_folder_name is not None else ""
        relative_path = f"{self.id}/{folder_name}"
        return FolderManager.get_root_directory() + relative_path

    def get_full_path(self, folder_name=None):
        """
        Generate the full path for the MediaFolder instance based on its id.
        """
        relative_path = self.get_relative_path(folder_name)
        return os.path.join(settings.MEDIA_URL, relative_path)

    def get_breadcrumb(self):
        """
        Generate the breadcrumb path
        """
        output = []

        # Traverse the parent hierarchy to build the relative path
        current_folder = self
        while current_folder:
            output.append({
                "id": current_folder.id,
                "name": current_folder.folder_name
            })
            current_folder = current_folder.parent

        return output[::-1]

    def get_size(self) -> int:
        total_size = MediaFolder.objects.filter(parent=self).aggregate(
            size=Coalesce(
                Sum('mediafile__file_size', default=0),
                0, output_field=IntegerField()
            ) + Value(EMPTY_FOLDER_SIZE, output_field=IntegerField())
        ).get('size', 0)

        for child_folder in MediaFolder.objects.filter(parent=self):
            total_size += child_folder.get_size()

        return int(total_size)

    def delete(self, *args, **kwargs):
        try:
            FolderManager.delete_folder(self)
            super().delete(*args, **kwargs)
        except ValidationError as e:
            print(f"Error deleting MediaFolder instance: {str(e)}")

    @classmethod
    def get_accessible_folders(cls, user, parent_folder=None):
        """Get folders accessible to the user based on settings"""
        access_mode = filehub.settings.FILEHUB_ACCESS_MODE

        folders = cls.objects.filter(parent=parent_folder)

        if access_mode == 'own':
            folders = folders.filter(upload_by=user)

        elif access_mode == 'role_based':
            role_field = filehub.settings.FILEHUB_ROLE_FIELD
            if hasattr(user, role_field):
                user_role = getattr(user, role_field)
                folders = folders.filter(**{f'upload_by__{role_field}': user_role})
            else:
                folders = folders.filter(upload_by=user)
        elif access_mode == 'all':
            pass

        return folders



class MediaFile(models.Model):
    file_name = models.CharField(max_length=255)
    folder = models.ForeignKey(MediaFolder, on_delete=models.CASCADE, null=True, blank=True)
    file_type = models.CharField(max_length=50, blank=True, null=True)
    file_size = models.PositiveIntegerField(default=0, blank=True)
    width = models.PositiveIntegerField(default=0, blank=True)
    height = models.PositiveIntegerField(default=0, blank=True)
    upload_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    upload_date = models.DateTimeField(auto_now_add=True, null=True)
    modify_date = models.DateTimeField(auto_now=True, null=True)

    def __str__(self) -> str:
        return self.file_name

    @classmethod
    def get_accessible_files(cls, user, folder=None):
        access_mode = filehub.settings.FILEHUB_ACCESS_MODE

        files = cls.objects.filter(folder=folder)

        if access_mode == 'own':
            files = files.filter(upload_by=user)

        elif access_mode == 'role_based':
            role_field = filehub.settings.FILEHUB_ROLE_FIELD
            if hasattr(user, role_field):
                user_role = getattr(user, role_field)
                files = files.filter(**{f'upload_by__{role_field}': user_role})
            else:
                files = files.filter(upload_by=user)

        elif access_mode == 'all':
            pass

        return files

    def get_relative_path(self) -> str:
        if self.folder is None:
            return FolderManager.get_root_directory() + self.file_name
        return self.folder.get_relative_path(self.file_name)

    def get_full_path(self) -> str | bytes:
        if self.folder is None:
            return os.path.join(settings.MEDIA_URL, self.get_relative_path())
        return self.folder.get_full_path(self.file_name)

    def get_thumbnail_name(self) -> str:
        return f"{self.id}.jpg"

    def update_image_attributes(self, file=None):
        try:
            if self.file_type == 'image' or self.file_type == 'images':
                file_path = self.get_relative_path()

                thumb_dir = os.path.join(settings.MEDIA_ROOT, "thumbs")
                os.makedirs(thumb_dir, exist_ok=True)

                _, extension = os.path.splitext(file_path)
                thumb_path = os.path.join(thumb_dir, f"{self.id}{extension}")

                if os.path.exists(thumb_path):
                    print(f"Thumb for #{self.id} already exists.")
                    return

                if file:
                    pillowImage = Image.open(file)
                else:
                    try:
                        default_storage.open(file_path, 'rb')
                        pillowImage = Image.open(default_storage.open(file_path, 'rb'))
                    except FileNotFoundError:
                        print(f"File {file_path} not found. Deleting the object.")
                        return

                if pillowImage:
                    self.width, self.height = pillowImage.size
                    self.save()

                    if pillowImage.mode != 'RGB':
                        pillowImage = pillowImage.convert('RGB')

                    pillowImage.thumbnail((200, 160))

                    pillowImage.save(thumb_path)
                    print(f"Generated thumbnail for {self.id}.")

        except Exception as e:
            print(f"Error generating thumbnail for {self.id}: {str(e)}\n")
