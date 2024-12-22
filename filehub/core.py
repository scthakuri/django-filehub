import os
import shutil

from filehub.settings import MEDIA_ROOT, FILE_TYPE_CATEGORIES, MEDIA_URL
from django.db import transaction
from filehub.utils import get_ext
from filehub.settings import STATIC_PATH, STATIC_URL
from urllib.parse import urlparse
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import re


class FolderManager:
    @staticmethod
    def get_static_url():
        return STATIC_URL

    @staticmethod
    def get_static_root():
        return STATIC_PATH

    @staticmethod
    def get_media_root():
        return MEDIA_ROOT

    @staticmethod
    def get_thumb(file_instance=None):
        if file_instance:
            return os.path.join(MEDIA_ROOT, "thumbs", f"{file_instance.id}.jpg")
        return os.path.join(MEDIA_ROOT, "thumbs")

    @staticmethod
    def get_thumb_url(file_instance=None):
        if file_instance:
            return os.path.join(MEDIA_URL, "thumbs", f"{file_instance.id}.jpg")
        return os.path.join(MEDIA_URL, "thumbs")

    @staticmethod
    def get_file_category(file_path):
        """
        Returns the file type category (image, video, audio, archive, document, or other)
        based on the file's content using `python-magic`.
        """

        file_extension = get_ext(file_path)
        for category, extensions in FILE_TYPE_CATEGORIES.items():
            print(f"{file_extension} => {extensions}")
            if file_extension in extensions:
                return category

        return 'files'

    @staticmethod
    @transaction.atomic
    def create_folder(model_instance):
        try:
            # Check if the folder already exists
            folder_path = os.path.join(FolderManager.get_media_root(), model_instance.get_relative_path())
            if os.path.exists(folder_path):
                raise Exception("Folder already exists, creation aborted.")

            # Create the folder
            os.makedirs(folder_path)

            # Save in the database if the folder is created successfully
            model_instance.save()

        except Exception as e:
            # If an error occurs, roll back the transaction
            transaction.set_rollback(True)
            raise Exception(f"Error creating folder: {str(e)}")

    @staticmethod
    @transaction.atomic
    def get_folder_from_static_path(instance, path: str):
        folder_instance = None
        path_parts = path.split('/')

        parent_folder_instance = None
        last_folder_instance = None

        for folder_name in path_parts:
            try:
                if parent_folder_instance is None:
                    folder_instance, created = instance.objects.update_or_create(
                        folder_name=folder_name,
                        parent=None
                    )
                else:
                    folder_instance, created = instance.objects.update_or_create(
                        folder_name=folder_name,
                        parent=parent_folder_instance
                    )
                if created:
                    FolderManager.create_folder(folder_instance)
            except Exception:
                pass
            last_folder_instance = folder_instance
            parent_folder_instance = folder_instance
        return last_folder_instance

    @staticmethod
    @transaction.atomic
    def delete_folder(model_instance, db_delete=True):
        try:
            # Get the folder path before deleting the model instance
            folder_path = os.path.join(FolderManager.get_media_root(), model_instance.get_relative_path())

            # Check if the folder exists before deleting
            if os.path.exists(folder_path):
                shutil.rmtree(folder_path)

        except Exception as e:
            # If an error occurs, roll back the transaction
            transaction.set_rollback(True)
            raise Exception(f"Error deleting folder: {str(e)}")

        # Delete from the database if the folder is deleted successfully
        if model_instance.id is not None and db_delete:
            model_instance.delete()

    @staticmethod
    @transaction.atomic
    def rename_folder(previous_instance, updated_instance):
        try:
            old_folder_path = os.path.join(FolderManager.get_media_root(), previous_instance.get_relative_path())
            new_folder_path = os.path.join(FolderManager.get_media_root(), updated_instance.get_relative_path())

            # Check if the new folder name already exists
            if os.path.exists(new_folder_path):
                raise Exception("New folder name already exists")

            # Check if the old folder exists before renaming
            if not os.path.exists(old_folder_path):
                raise Exception("Folder doesn't exists")

            os.rename(old_folder_path, new_folder_path)
            updated_instance.save()
        except Exception as e:
            # If an error occurs, roll back the transaction
            transaction.set_rollback(True)
            raise Exception(f"Error renaming folder: {str(e)}")

    @staticmethod
    @transaction.atomic
    def delete_file(file_instance, db_delete=True):
        try:
            # Get the folder path before deleting the model instance
            file_path = os.path.join(FolderManager.get_media_root(), file_instance.get_relative_path())

            # Check if the folder exists before deleting
            if os.path.exists(file_path):
                os.remove(file_path)

            # Also remove thumbnail
            thumbnail_path = os.path.join(FolderManager.get_media_root(), "thumbs", file_instance.get_thumbnail_name())
            if os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)

        except Exception as e:
            # If an error occurs, roll back the transaction
            transaction.set_rollback(True)
            raise Exception(f"Error deleting folder: {str(e)}")

        # Delete from the database if the folder is deleted successfully
        if file_instance.id is not None and db_delete:
            file_instance.delete()

    @staticmethod
    @transaction.atomic
    def create_file(folder_instance, file_name, content=""):
        try:
            # Create the file path
            file_path = os.path.join(FolderManager.get_media_root(), folder_instance.get_relative_path(file_name))

            # Save the file with content
            with open(file_path, 'w') as file:
                file.write(content)

            # Calculate file size after writing
            return os.path.getsize(file_path)
        except Exception as e:
            # If an error occurs, raise a validation error and rollback the transaction
            raise Exception(f"Error creating file: {str(e)}")

    @staticmethod
    @transaction.atomic
    def rename_file(previous_instance, updated_instance):
        try:
            old_file_path = os.path.join(FolderManager.get_media_root(), previous_instance.get_relative_path())
            new_file_path = os.path.join(FolderManager.get_media_root(), updated_instance.get_relative_path())

            # Check if the new folder name already exists
            if os.path.exists(new_file_path):
                raise Exception("File name already exists")

            # Check if the old folder exists before renaming
            if not os.path.exists(old_file_path):
                raise Exception("File doesn't exists")

            os.rename(old_file_path, new_file_path)
            updated_instance.save()
        except Exception as e:
            # If an error occurs, roll back the transaction
            transaction.set_rollback(True)
            raise Exception(f"Error renaming file: {str(e)}")

    @staticmethod
    @transaction.atomic
    def upload_url(url, folder_instance, filename=None):
        try:
            import requests

            a = urlparse(url)

            file_name = filename if filename else os.path.basename(a.path)
            # Retrieve the folder instance
            if folder_instance is None:
                file_path = os.path.join(FolderManager.get_media_root(), file_name)
            else:
                file_path = os.path.join(FolderManager.get_media_root(), folder_instance.get_relative_path(file_name))

            response = requests.get(url)
            response.raise_for_status()
            file_size = int(response.headers.get('Content-Length', 0))
            image_data = response.content

            default_storage.save(file_path, ContentFile(image_data))

            # Create the file instance in the database
            return file_size, file_name
        except Exception as e:
            # If an error occurs, raise a validation error and rollback the transaction
            raise Exception(f"Error uploading file: {str(e)}")

    @staticmethod
    @transaction.atomic
    def clean_filename(filename):
        original_file_name, file_extension = os.path.splitext(filename)
        original_file_name = original_file_name
        original_file_name = original_file_name.replace(' ', '_')
        original_file_name = original_file_name.replace('-', '_')
        original_file_name = re.sub(r'[^\w\s.-]', '', original_file_name)
        original_file_name = re.sub(r'[\[\](){}]', '', original_file_name)
        return original_file_name + file_extension

    @staticmethod
    @transaction.atomic
    def upload_file_by_path(file, file_path=None, folder_instance=None):
        try:
            if file_path is None:
                return FolderManager.upload_file(file)

            original_file_name, file_extension = os.path.splitext(file.name)
            original_file_name = FolderManager.clean_filename(original_file_name)
            file_name = original_file_name + file_extension

            # Retrieve the folder instance
            if not folder_instance:
                file_path = os.path.join(FolderManager.get_media_root(), file_name)
            else:
                file_path = os.path.join(FolderManager.get_media_root(), folder_instance.get_relative_path(file_name))

            # Check if the file already exists, add numeric suffix if needed
            counter = 1
            while os.path.exists(file_path):
                file_name = f"{original_file_name}-{counter}{file_extension}"
                file_path = os.path.join(FolderManager.get_media_root(), file_name)
                counter += 1

            # Reset file pointer after reading
            file.seek(0)

            # Calculate file size before saving
            file_size = len(file.read())

            # Reset file pointer after reading
            file.seek(0)

            # Save the file to disk
            with open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

            # Create the file instance in the database
            return file_size, file_name
        except Exception as e:
            # If an error occurs, raise a validation error and rollback the transaction
            raise Exception(f"Error uploading file: {str(e)}")

    @staticmethod
    @transaction.atomic
    def upload_file(file, folder_instance=None):
        try:
            original_file_name, file_extension = os.path.splitext(file.name)
            original_file_name = FolderManager.clean_filename(original_file_name)
            file_name = original_file_name + file_extension

            # Retrieve the folder instance
            if folder_instance is None:
                file_path = os.path.join(FolderManager.get_media_root(), file_name)
            else:
                file_path = os.path.join(FolderManager.get_media_root(), folder_instance.get_relative_path(file_name))

            # Check if the file already exists, add numeric suffix if needed
            counter = 1
            while os.path.exists(file_path):
                file_name = f"{original_file_name}-{counter}{file_extension}"
                if folder_instance is None:
                    file_path = os.path.join(FolderManager.get_media_root(), file_name)
                else:
                    file_path = os.path.join(FolderManager.get_media_root(),
                                             folder_instance.get_relative_path(file_name))
                counter += 1

            # Reset file pointer after reading
            file.seek(0)

            # Calculate file size before saving
            file_size = len(file.read())

            # Reset file pointer after reading
            file.seek(0)

            # Save the file to disk
            with open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

            # Create the file instance in the database
            return file_size, file_name
        except Exception as e:
            # If an error occurs, raise a validation error and rollback the transaction
            raise Exception(f"Error uploading file: {str(e)}")
