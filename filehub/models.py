from django.db import models

from filehub.settings import EMPTY_FOLDER_SIZE
from userauth.models import User
from django.db.models import Sum, Value, IntegerField
from django.db.models.functions import Coalesce
from filehub.core import FolderManager
from django.core.exceptions import ValidationError


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
            super().delete(*args, **kwargs)
            FolderManager.delete_folder(self)
        except ValidationError as e:
            print(f"Error deleting MediaFolder instance: {str(e)}")


class MediaFile(models.Model):
    file_name = models.CharField(max_length=255)
    folder = models.ForeignKey(MediaFolder, on_delete=models.CASCADE, null=True, blank=True)
    file_type = models.CharField(max_length=50, blank=True, null=True)
    file_size = models.PositiveIntegerField(default=0, blank=True)
    upload_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    upload_date = models.DateTimeField(auto_now_add=True, null=True)
    modify_date = models.DateTimeField(auto_now=True, null=True)

    def __str__(self) -> str:
        return self.file_name

    def get_relative_path(self) -> str:
        if self.folder is None:
            return self.file_name

        return self.folder.get_relative_path(self.file_name)

    def delete(self, *args, **kwargs):
        try:
            super().delete(*args, **kwargs)
            FolderManager.delete_file(self)
        except ValidationError as e:
            print(f"Error deleting MediaFolder instance: {str(e)}")
