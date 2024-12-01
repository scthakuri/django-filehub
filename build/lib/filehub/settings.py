import os
from django.conf import settings


DIRECTORY = getattr(settings, 'FILEMANAGER_DIRECTORY', 'uploads')

MEDIA_ROOT = getattr(settings, "FILEMANAGER_MEDIA_ROOT", os.path.join(settings.MEDIA_ROOT, DIRECTORY))

MEDIA_URL = getattr(settings, "FILEMANAGER_MEDIA_URL", os.path.join(settings.MEDIA_URL, DIRECTORY))

FILE_TYPE_CATEGORIES = getattr(settings, "FILE_TYPE_CATEGORIES", {
    'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
    'videos': ['mp4', 'webm', 'ogg', 'avi', 'mkv', 'mov', 'wmv', '3gp', 'mpeg', 'mpg4'],
    'musics': ['mp3', 'wav', 'flac', 'aac', 'wma', 'm4a', 'wma'],
    'archives': ['zip', 'rar', 'tar', 'gz']
})

FILES_SORTING = getattr(settings, "FILES_SORTING", {
    "name": "Name",
    "size": "Size",
    "date": "Modified"
})

FILES_SORTING_ORDER = getattr(settings, "FILES_SORTING_ORDER", {
    "asc": "Ascending",
    "desc": "Descending"
})

EMPTY_FOLDER_SIZE = getattr(settings, "EMPTY_FOLDER_SIZE", 1024)

STATIC_PATH = getattr(settings, "STATIC_PATH", os.path.join(settings.BASE_DIR, "static"))
STATIC_URL = getattr(settings, "STATIC_URL", "static/")
