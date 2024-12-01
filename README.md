# django_filehub

`django_filehub` is a Django-based file management app that simplifies file handling within your Django projects. It supports file uploads, storage, and retrieval, making it easy to integrate robust file management features into your applications.

## Features

- **File Uploads**: Seamlessly handle file uploads in your Django project.
- **File Storage**: Organize and store files with customizable configurations.
- **File Retrieval**: Efficiently access and manage uploaded files.
- **File Categories**: Automatically categorize files based on type.
- **Sorting Options**: Flexible sorting by name, size, or date, with ascending/descending order.
- **Custom Fields**: Use `ImagePickerField` and `ImagePickerWidget` for advanced image selection in forms.

## Installation

Install `django_filehub` using `pip`:

```bash
pip install django_filehub
```

## Configuration

Add the following settings to your Django project's `settings.py`:
```python
# Login URL for file access control
FILEHUB_LOGIN_URL = "/login/"

# Media file configurations
MEDIA_ROOT = "path/to/media"  # Set your media root directory
MEDIA_URL = "/media/"  # Define your media URL

# File type categories
FILE_TYPE_CATEGORIES = {
    'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
    'videos': ['mp4', 'webm', 'ogg', 'avi', 'mkv', 'mov', 'wmv', '3gp', 'mpeg', 'mpg4'],
    'musics': ['mp3', 'wav', 'flac', 'aac', 'wma', 'm4a'],
    'archives': ['zip', 'rar', 'tar', 'gz']
}

# File sorting options
FILES_SORTING = {
    "name": "Name",
    "size": "Size",
    "date": "Modified"
}

# Sorting order
FILES_SORTING_ORDER = {
    "asc": "Ascending",
    "desc": "Descending"
}
```

## Custom Fields
Django Filehub also supports the following custom field and widget for advanced image selection:

### ImagePickerField
A custom Django model field for storing image file paths as text.

```python
from django_filehub.fields import ImagePickerField

class ExampleModel(models.Model):
    image = ImagePickerField()
```

### ImagePickerWidget
A custom Django form widget for selecting images from a file picker.

```python
from django_filehub.widgets import ImagePickerWidget
from django import forms

class ExampleForm(forms.Form):
    image = forms.CharField(widget=ImagePickerWidget())
```

## Usage
 - Install and configure the app as described above.
 - Add the necessary `MEDIA_ROOT` and `MEDIA_URL` in your settings.
 - Use `ImagePickerField` and `ImagePickerWidget` in your models and forms for advanced file selection capabilities.

## Contributing
Contributions are welcome! If you'd like to report issues, suggest new features, or contribute to the development, please submit a pull request or open an issue.
