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
    http://stackoverflow.com/questions/1094841/reusable-library-to-get-human-readable-version-of-file-size
    """
    for x in ['bytes', 'KB', 'MB', 'GB']:
        if 1024.0 > num > -1024.0:
            return "%3.1f %s" % (num, x)
        num /= 1024.0
    return "%3.1f %s" % (num, 'TB')
