import os
import re


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
    file_full_path = file.get_full_path()
    file_name, file_extension = os.path.splitext(file.file_name)
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


