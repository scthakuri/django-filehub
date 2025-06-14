import imghdr
import re
import os
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.db import transaction
from filehub import settings
from urllib.parse import urlparse
from filehub.utils import get_ext
from django.conf import settings as main_settings


class FolderManager:

    @staticmethod
    def get_root_directory():
        """
        Returns the root directory for media files.
        """
        return settings.DIRECTORY + "/"

    @staticmethod
    def is_django_default_storage():
        """
        Returns the root directory for media files.
        """
        storages = main_settings.STORAGES.get("default")
        if storages:
            return storages.get("BACKEND") == "django.core.files.storage.FileSystemStorage"
        return False

    @staticmethod
    def get_media_root():
        """
        Returns the root directory for media files.
        """
        return settings.MEDIA_ROOT

    @staticmethod
    def get_media_url():
        """
        Returns the URL for accessing media files.
        """
        return settings.UPLOAD_DIRECTORY_URL

    @staticmethod
    def get_static_url():
        """
        Returns the URL for static files.
        """
        return settings.STATIC_URL

    @staticmethod
    def get_static_root():
        """
        Returns the root directory for static files.
        """
        return settings.STATIC_PATH

    @staticmethod
    def get_file_category(file_path):
        """
        Returns the file type category (image, video, audio, archive, document, or other)
        based on the file's content using `python-magic`.
        """
        file_extension = get_ext(file_path)
        for category, extensions in settings.FILE_TYPE_CATEGORIES.items():
            if file_extension in extensions:
                return category
        return 'files'

    @staticmethod
    @transaction.atomic
    def create_folder(folder_instance):
        """
        Creates a folder in the storage system if it doesn't exist and saves the folder instance.
        """
        try:
            folder_path = folder_instance.get_relative_path()
            if FolderManager.is_django_default_storage():
                os.makedirs(os.path.join(main_settings.MEDIA_ROOT, folder_path), exist_ok=True)
        except Exception as e:
            folder_instance.delete()
            raise Exception(f"Error creating folder: {str(e)}")

    @staticmethod
    @transaction.atomic
    def create_folder_by_path(folder_path: str, parent_folder=None):
        """
        Creates a folder in the storage system if it doesn't exist and saves the folder instance.
        """
        try:
            from filehub.models import MediaFolder
            folder_path = folder_path.strip("/")
            folder_path_obj = folder_path.split("/")
            for folder_name in folder_path_obj:
                if folder_name:
                    parent_folder, _ = MediaFolder.objects.get_or_create(
                        folder_name=folder_name,
                        parent=parent_folder
                    )
            if parent_folder:
                FolderManager.create_folder(parent_folder)
            return parent_folder
        except Exception as e:
            print(f"Error creating folder: {str(e)}")

    @staticmethod
    def delete_orfan_folder(folder_instance):
        """
        Deletes a folder instance without deleting the folder from the storage system.
        """
        try:
            folder_path = folder_instance.get_relative_path()

            def remove_directory(directory):
                directories, files = default_storage.listdir(directory)
                for file in files:
                    try:
                        default_storage.delete(f'{directory}{file}')
                    except Exception:
                        pass

                for directory in directories:
                    remove_directory(f'{directory}{directory}/')

            remove_directory(folder_path)
        except Exception:
            pass

    @staticmethod
    @transaction.atomic
    def delete_folder(folder_instance):
        """
        Deletes a folder from the storage system and removes the folder instance.
        """
        try:
            folder_path = folder_instance.get_relative_path()
            if FolderManager.is_django_default_storage():
                import shutil
                shutil.rmtree(os.path.join(main_settings.MEDIA_ROOT, folder_path))
            else:
                default_storage.delete(folder_path)
        except Exception as e:
            print(f"Error deleting folder: {str(e)}")

    @staticmethod
    @transaction.atomic
    def delete_file(file_instance):
        """
        Deletes a file from the storage system and removes the file instance.
        """

        try:
            file_path = file_instance.get_relative_path()
            default_storage.delete(file_path)
        except Exception as e:
            print(f"Error deleting file: {str(e)}")

    @staticmethod
    @transaction.atomic
    def upload_url(url, folder_instance, filename=None):
        """
        Downloads a file from a URL and uploads it to the storage system.
        """
        import requests
        a = urlparse(url)
        file_name = filename if filename else os.path.basename(a.path)

        if folder_instance:
            folder_path = folder_instance.get_relative_path()
        else:
            folder_path = FolderManager.get_root_directory()

        if FolderManager.is_django_default_storage():
            full_path = os.path.join(main_settings.MEDIA_ROOT, folder_path)
            os.makedirs(full_path, exist_ok=True)

        response = requests.get(url)
        response.raise_for_status()

        image_data = response.content
        detected_format = imghdr.what(None, h=image_data)
        extension = f".{detected_format}" if detected_format else ""

        if extension and not file_name.lower().endswith(extension):
            file_name += extension

        original_file_name, file_extension = os.path.splitext(file_name)
        counter = 1
        file_path = Path(folder_path, file_name)
        while default_storage.exists(file_path.as_posix()):
            file_name = f"{original_file_name}-{counter}{file_extension}"
            file_path = Path(folder_path, file_name)
            counter += 1

        file_size = int(response.headers.get('Content-Length', 0))
        default_storage.save(file_path, ContentFile(image_data))
        return file_size, file_name

    @staticmethod
    @transaction.atomic
    def clean_filename(filename):
        """
        Cleans and sanitizes the filename to ensure it's safe for storage.
        """
        original_file_name, file_extension = os.path.splitext(filename)
        original_file_name = original_file_name.replace(' ', '_')
        original_file_name = original_file_name.replace('-', '_')
        original_file_name = re.sub(r'[^\w\s.-]', '', original_file_name)
        original_file_name = re.sub(r'[\[\](){}]', '', original_file_name)
        return original_file_name + file_extension

    @staticmethod
    @transaction.atomic
    def upload_file(file, folder_instance=None):
        """
        Uploads a file to the storage system, checking for existing files and handling naming conflicts.
        """
        original_file_name, file_extension = os.path.splitext(file.name)
        original_file_name = FolderManager.clean_filename(original_file_name)
        file_name = original_file_name + file_extension

        if folder_instance:
            folder_path = folder_instance.get_relative_path()
        else:
            folder_path = FolderManager.get_root_directory()

        if FolderManager.is_django_default_storage():
            full_path = os.path.join(main_settings.MEDIA_ROOT, folder_path)
            os.makedirs(full_path, exist_ok=True)

        counter = 1
        file_path = Path(folder_path, file_name)
        while default_storage.exists(file_path.as_posix()):
            file_name = f"{original_file_name}-{counter}{file_extension}"
            file_path = Path(folder_path, file_name)
            counter += 1

        with default_storage.open(file_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        file_size = file.size
        return file_size, file_name

    @staticmethod
    @transaction.atomic
    def upload_to_filemanager(file, folder_instance=None, user=None):
        """
        Uploads a file to the storage system and creates a file instance.
        :param file:
        :param folder_instance:
        :return: MediaFile
        """

        from filehub.models import MediaFile

        if isinstance(file, str):
            if not file.startswith("http"):
                raise Exception("Invalid URL")
            file_size, file_name = FolderManager.upload_url(file, folder_instance)
        else:
            file_size, file_name = FolderManager.upload_file(file, folder_instance)

        file_type = FolderManager.get_file_category(file_name)
        return MediaFile.objects.create(
            file_name=file_name,
            folder=folder_instance,
            file_type=file_type,
            file_size=file_size,
            upload_by=user
        )

    @staticmethod
    @transaction.atomic
    def rename_file(previous_instance, updated_instance):
        """
        Renames a file in the storage system and updates the file instance.
        """
        try:
            old_file_path = previous_instance.get_relative_path()
            new_file_path = updated_instance.get_relative_path()

            if default_storage.exists(new_file_path):
                raise Exception("File name already exists")

            if not default_storage.exists(old_file_path):
                raise Exception("File doesn't exist")

            if FolderManager.is_django_default_storage():
                os.rename(
                    os.path.join(main_settings.MEDIA_ROOT, old_file_path),
                    os.path.join(main_settings.MEDIA_ROOT, new_file_path)
                )
            else:
                with default_storage.open(old_file_path, 'rb') as old_file:
                    file_content = old_file.read()
                    default_storage.save(new_file_path, ContentFile(file_content))
                default_storage.delete(old_file_path)
        except Exception as e:
            raise Exception(f"Error renaming file: {str(e)}")
