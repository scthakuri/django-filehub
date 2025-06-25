import os
from django.conf import settings

# Filemanager Debug
FILEMANAGER_DEBUG = True
"""
A boolean flag that determines whether the file manager is running in debug mode.
When set to `True`, the file manager will display additional debug information
and error messages. This flag should be set to `False` in production environments.
"""

# Filemanager version
FILEMANAGER_VERSION = "3.1.8"
"""
The version of the file manager application. This version number is displayed
in the file manager interface and can be used for tracking changes and updates.
"""


# FileHub Login URL
FILEHUB_LOGIN_URL = getattr(settings, 'FILEHUB_LOGIN_URL', '/admin/')
"""
The URL for the login page of the file manager. This can be configured in the 
Django settings as `FILEHUB_LOGIN_URL`. The default value is '/admin/'.
"""

# Directory for File Manager Storage
DIRECTORY = getattr(settings, 'FILEMANAGER_DIRECTORY', 'uploads')
"""
The directory where uploaded files are stored. The default value is 'uploads'.
This directory will be used as a subdirectory within the `MEDIA_ROOT`.
"""

THUMB_DIRECTORY = getattr(settings, 'THUMB_DIRECTORY', 'thumbs')
"""
The directory where thumbnail images are stored. The default value is 'thumbs'.
This directory will be used as a subdirectory within the `MEDIA_ROOT`.
"""

# Root Path for File Manager Media Files
MEDIA_ROOT = getattr(settings, "FILEMANAGER_MEDIA_ROOT", DIRECTORY + "/")
"""
The root directory for media files. It combines `MEDIA_ROOT` from settings 
with the `FILEMANAGER_DIRECTORY`. The default is `os.path.join(MEDIA_ROOT, 'uploads')`.
"""

# URL for File Manager Media Files
MEDIA_URL = getattr(settings, "FILEMANAGER_MEDIA_URL", os.path.join(settings.MEDIA_URL, DIRECTORY))
"""
The URL path for media files in the file manager. It combines `MEDIA_URL` from settings 
with the `FILEMANAGER_DIRECTORY`. The default is `os.path.join(MEDIA_URL, 'uploads')`.
"""

# File Manager Directory URL
UPLOAD_DIRECTORY_URL = MEDIA_URL + "/"
"""
The complete URL for the file manager directory, constructed from the `MEDIA_URL` 
and `FILEMANAGER_DIRECTORY`. This URL will be used to access the file manager 
interface for browsing files.
"""

# File Type Categories
FILE_TYPE_CATEGORIES = getattr(settings, "FILE_TYPE_CATEGORIES", {
    'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
    'videos': ['mp4', 'webm', 'ogg', 'avi', 'mkv', 'mov', 'wmv', '3gp', 'mpeg', 'mpg4'],
    'musics': ['mp3', 'wav', 'flac', 'aac', 'wma', 'm4a', 'wma'],
    'archives': ['zip', 'rar', 'tar', 'gz'],
    'documents': ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'odt', 'ods'],
})
"""
A dictionary that defines the categories of file types allowed in the file manager.
Each category contains a list of file extensions that belong to that category. 
Default categories include 'images', 'videos', 'musics', and 'archives'.
"""

# Sorting Options for Files
FILES_SORTING = getattr(settings, "FILES_SORTING", {
    "name": "Name",
    "size": "Size",
    "date": "Modified"
})
"""
Defines the sorting options for files in the file manager. The keys represent 
the fields by which files can be sorted, and the values are the human-readable 
names of those fields. Default sorting options are by 'name', 'size', and 'date'.
"""

# Sorting Order for Files
FILES_SORTING_ORDER = getattr(settings, "FILES_SORTING_ORDER", {
    "asc": "Ascending",
    "desc": "Descending"
})
"""
Defines the sorting order for files in the file manager. Files can be sorted 
either in ascending ('asc') or descending ('desc') order. These options 
control the direction of sorting for each field.
"""

# Empty Folder Size Limit
EMPTY_FOLDER_SIZE = getattr(settings, "EMPTY_FOLDER_SIZE", 1024)
"""
The size limit (in bytes) for empty folders in the file manager. If the size 
of a folder is smaller than this value, it will be considered empty.
The default is 1024 bytes (1 KB).
"""

# Static Path for File Manager Assets
STATIC_PATH = getattr(settings, "STATIC_PATH", os.path.join(settings.BASE_DIR, "static"))
"""
The path to the static assets (e.g., CSS, JavaScript files) used by the file manager. 
This path is combined with the base directory to locate static files. 
The default is `os.path.join(BASE_DIR, 'static')`.
"""

# Static URL for File Manager Assets
STATIC_URL = getattr(settings, "STATIC_URL", "static/")
"""
The URL path for accessing static assets in the file manager. 
This is used for loading JavaScript, CSS, and other assets in the file manager. 
The default value is 'static/'.
"""

# Theme Color for the File Manager
FILEHUB_THEME_COLOR = getattr(settings, "FILEHUB_THEME_COLOR", "#009688")
"""
The primary theme color for the file manager's UI. This color can be customized 
in the settings by setting `FILEHUB_THEME_COLOR`. The default color is "#009688".
"""

# File Manager Access Settings
FILEHUB_ACCESS_MODE = getattr(settings, "FILEHUB_ACCESS_MODE", 'all')  # Options: 'own', 'role_based', 'all'
FILEHUB_ROLE_FIELD = getattr(settings, "FILEHUB_ROLE_FIELD", 'role')  # Field name in the role model that contains the role value

