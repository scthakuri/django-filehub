import os
import re
from django.conf import settings


def get_ext(filename):
    """
    This function extracts the file extension from a given filename.

    Args:
    filename (str): The name of the file for which the extension needs to be extracted.

    Returns:
    str: The extracted file extension without the dot (.)

    Raises:
    ValueError: If the filename does not contain a valid file extension.

    Example:
    >>> get_ext("example.txt")
    'txt'
    """
    pattern = r"\.(?P<extension>[a-zA-Z0-9]+)$"
    match = re.search(pattern, filename)

    extension_without_dot = ""
    if match:
        extension_without_dot = match.group("extension")

    return extension_without_dot


def sizeof_fmt(num):
    """
    Format file sizes for a human beings.
    https://stackoverflow.com/questions/1094841/reusable-library-to-get-human-readable-version-of-file-size
    """
    for x in ['bytes', 'KB', 'MB', 'GB']:
        if 1024.0 > num > -1024.0:
            return "%3.1f %s" % (num, x)
        num /= 1024.0
    return "%3.1f %s" % (num, 'TB')


def generate_display_name(file_name: str, max_length: int = 15) -> str:
    """
    Generate a display name for a file. If the file name (including the extension)
    exceeds the max_length, it truncates the name and adds '...' in the middle, ensuring
    the total length is max_length.

    :param file_name: Full file name including extension
    :param max_length: Maximum length for the display name
    :return: Truncated display name if necessary
    """
    name, extension = os.path.splitext(file_name)
    if len(file_name) <= max_length:
        return file_name

    remaining_length = max_length - len(extension) - 3
    if remaining_length > 0:
        start = name[:remaining_length // 2]
        end = name[-(remaining_length // 2):]
        return f"{start}...{end}{extension}"
    else:
        return f"...{extension[-(max_length - 3):]}"


def file_response_format(file, request):
    """
    Format file response for the API.
    """
    from filehub.core import FolderManager

    file_full_path = file.get_full_path()
    file_name, file_extension = os.path.splitext(file.file_name)
    thumbnail_url = file_full_path
    if file.file_type == "images" or file.file_type == "image":
        thumbnail_url = str(os.path.join(settings.MEDIA_ROOT, "thumbs", f"{file.id}{file_extension}"))
        thumbnail_url = thumbnail_url.replace(str(settings.BASE_DIR), "")

    file_object = {
        'id': file.id,
        "name": file.file_name,
        "basename": file_name,
        "extension": file_extension,
        "display_name": generate_display_name(file.file_name, 20),
        "type": "file",
        "size": file.file_size,
        "category": file.file_type,
        "uri": file_full_path,
        "url": request.build_absolute_uri(file_full_path),
        "uploaded_at": file.upload_date.strftime("%Y-%m-%d %H:%M:%S"),
        "modify_date": file.modify_date.strftime("%Y-%m-%d %H:%M:%S"),
        "thumbnail": thumbnail_url,
    }

    if file.file_type == "images":
        file_object['width'] = file.width
        file_object['height'] = file.height
    return file_object


def folder_response_format(folder, request):
    """
    Format folder response for the API.
    """
    total_size = folder.get_size()
    file_full_path = folder.get_full_path()
    folder_object = {
        'id': folder.id,
        "name": folder.folder_name,
        "basename": folder.folder_name,
        "display_name": folder.folder_name,
        "type": "folder",
        "size": total_size,
        "category": "folder",
        "uri": file_full_path,
        "url": request.build_absolute_uri(file_full_path),
        "uploaded_at": folder.upload_date.strftime("%Y-%m-%d %H:%M:%S"),
        "modify_date": folder.modify_date.strftime("%Y-%m-%d %H:%M:%S"),
    }
    return folder_object


def get_file_type(file_name):
    """
    Determine the type of a file based on its extension.

    This function uses the `FILE_TYPE_CATEGORIES` configuration from Django settings
    to classify files into categories such as 'images', 'videos', 'musics', or 'archives'.
    If the file's extension does not match any category, it returns 'unknown'.

    Args:
        file_name (str): The name of the file, including its extension.

    Returns:
        str: The category of the file ('images', 'videos', 'musics', 'archives', or 'file').
    """
    _, ext = os.path.splitext(file_name)
    ext = ext.lower().lstrip('.')
    from filehub.settings import FILE_TYPE_CATEGORIES

    for category, extensions in FILE_TYPE_CATEGORIES.items():
        if ext in extensions:
            return category
    return 'file'


def sanitize_allowed_extensions(allowed_extensions):
    """
    Sanitize a list of allowed file extensions by splitting comma-separated strings,
    removing duplicates, trimming whitespace, and converting to lowercase.

    Args:
        allowed_extensions (list): A list of file extensions or comma-separated strings.

    Returns:
        list: A sanitized, sorted list of unique lowercase file extensions.
    """
    if not isinstance(allowed_extensions, list):
        raise ValueError("allowed_extensions must be a list")

    sanitized = set()
    for ext in allowed_extensions:
        if not ext:
            continue
        for part in str(ext).split(","):
            cleaned = part.strip().lower()
            if cleaned:
                sanitized.add(cleaned)

    return sorted(sanitized)





