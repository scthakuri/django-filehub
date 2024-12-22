import os
from io import BytesIO

from PIL import Image
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import models
from filehub.settings import EMPTY_FOLDER_SIZE, MEDIA_URL
from django.db.models import Sum, Value, IntegerField
from django.db.models.functions import Coalesce
from filehub.core import FolderManager
from django.core.exceptions import ValidationError

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
        relative_path = ""

        # If a new folder name is provided, use it for the path
        folder_name = new_folder_name if new_folder_name is not None else ""

        # Traverse the parent hierarchy to build the relative path
        current_folder = self
        while current_folder:
            relative_path = f"{current_folder.folder_name}/{relative_path}"
            current_folder = current_folder.parent

        # Remove the trailing slash
        relative_path = relative_path.rstrip('/')
        relative_path = f"{relative_path}/{folder_name}"
        return relative_path

    def get_full_path(self, folder_name=None):
        """
        Generate the full path for the MediaFolder instance based on its id.
        """
        relative_path = self.get_relative_path(folder_name)
        return os.path.join(MEDIA_URL, relative_path)

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
            size=Coalesce(Sum('mediafile__file_size', default=0), 0, output_field=IntegerField()) + Value(EMPTY_FOLDER_SIZE, output_field=IntegerField())
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

    def get_relative_path(self) -> str:
        if self.folder is None:
            return self.file_name

        return self.folder.get_relative_path(self.file_name)

    def get_full_path(self) -> str | bytes:
        if self.folder is None:
            return os.path.join(MEDIA_URL, self.file_name)

        return self.folder.get_full_path(self.file_name)

    def get_thumbnail_name(self) -> str:
        return f"{self.id}.jpg"

    def update_image_attributes(self):
        try:
            if self.file_type == 'images':
                file_path = os.path.join(settings.BASE_DIR, self.get_full_path().lstrip('/'))
                if not os.path.exists(file_path):
                    print(f"File does not exist: {file_path}")
                    return

                with Image.open(file_path) as img:
                    if img.mode != 'RGB':
                        img = img.convert('RGB')

                    width, height = img.size
                    self.width = width
                    self.height = height
                    self.save()

                    # Generate Thumbnail
                    img.thumbnail((200, 160))
                    thumb_io = BytesIO()
                    img.save(thumb_io, format='JPEG')

                    # Save the thumbnail file to the storage system
                    thumb_path = FolderManager.get_thumb(self)
                    os.makedirs(os.path.dirname(thumb_path), exist_ok=True)

                    with default_storage.open(thumb_path, 'wb') as thumb_file_output:
                        thumb_file_output.write(thumb_io.getvalue())
                    print(f"Thumbnail generated for #{self.id}")
        except ValidationError as e:
            print(f"Error generating thumbnail: {str(e)}")
