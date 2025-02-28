import os
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver

from filehub.core import FolderManager
from filehub.models import MediaFile, MediaFolder


@receiver(pre_delete, sender=MediaFile)
def delete_media_file(sender, instance, **kwargs):
    try:
        FolderManager.delete_file(instance)

        # Delete thumbnail
        basename, file_extension = os.path.splitext(instance.file_name)
        thumbnail_url = os.path.join(settings.MEDIA_ROOT, "thumbs", f"{instance.id}{file_extension}")
        if os.path.exists(thumbnail_url):
            os.remove(thumbnail_url)
    except ValidationError as e:
        print(f"Error deleting MediaFolder instance: {str(e)}")


@receiver(pre_delete, sender=MediaFolder)
def delete_media_folder(sender, instance, **kwargs):
    try:
        if not FolderManager.is_django_default_storage():
            FolderManager.delete_orfan_folder(instance)
        FolderManager.delete_folder(instance)
    except ValidationError as e:
        print(f"Error deleting MediaFolder instance: {str(e)}")


@receiver(post_save, sender=MediaFile)
def generate_thumbnail(sender, instance, created, **kwargs):
    if created:
        instance.update_image_attributes()
