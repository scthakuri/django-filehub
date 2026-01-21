import os
from django.conf import settings

FILEMANAGER_VERSION = "3.2.2"

FILEHUB_LOGIN_URL = getattr(settings, 'FILEHUB_LOGIN_URL', '/admin/')

DIRECTORY = getattr(settings, 'FILEMANAGER_DIRECTORY', 'uploads')
THUMB_DIRECTORY = getattr(settings, 'THUMB_DIRECTORY', 'thumbs')

MEDIA_ROOT = getattr(settings, "FILEMANAGER_MEDIA_ROOT", DIRECTORY + "/")
MEDIA_URL = getattr(settings, "FILEMANAGER_MEDIA_URL", os.path.join(settings.MEDIA_URL, DIRECTORY))
UPLOAD_DIRECTORY_URL = MEDIA_URL + "/"

FILE_TYPE_CATEGORIES = getattr(settings, "FILE_TYPE_CATEGORIES", {
    'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'svg', 'ico'],
    'videos': ['mp4', 'webm', 'ogg', 'avi', 'mkv', 'mov', 'wmv', '3gp', 'mpeg', 'mpg4'],
    'musics': ['mp3', 'wav', 'flac', 'aac', 'wma', 'm4a', 'wma'],
    'archives': ['zip', 'rar', 'tar', 'gz'],
    'documents': ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'odt', 'ods'],
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
FILEHUB_THEME_COLOR = getattr(settings, "FILEHUB_THEME_COLOR", "#009688")

FILEHUB_ACCESS_MODE = getattr(settings, "FILEHUB_ACCESS_MODE", 'all')
FILEHUB_ROLE_FIELD = getattr(settings, "FILEHUB_ROLE_FIELD", 'role')
FILEHUB_AUTO_CLOSE_UPLOAD_MODAL = getattr(settings, "FILEHUB_AUTO_CLOSE_UPLOAD_MODAL", False)

