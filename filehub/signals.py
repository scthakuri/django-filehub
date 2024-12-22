import os
from io import BytesIO

from PIL import Image
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver
from django.core.files.storage import default_storage

from filehub.core import FolderManager
from filehub.models import MediaFile, MediaFolder


@receiver(pre_delete, sender=MediaFile)
def delete_media_file(sender, instance, **kwargs):
    try:
        FolderManager.delete_file(instance, False)
    except ValidationError as e:
        print(f"Error deleting MediaFolder instance: {str(e)}")


@receiver(pre_delete, sender=MediaFolder)
def delete_media_file(sender, instance, **kwargs):
    try:
        FolderManager.delete_folder(instance, False)
    except ValidationError as e:
        print(f"Error deleting MediaFolder instance: {str(e)}")


@receiver(post_save, sender=MediaFile)
def generate_thumbnail(sender, instance, created, **kwargs):
    if created:
        instance.update_image_attributes()
