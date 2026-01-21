# Django FileHub

<p align="center"><img src="https://socialify.git.ci/scthakuri/django-filehub/image?font=Inter&forks=1&issues=1&language=1&name=1&owner=1&pattern=Circuit%20Board&pulls=1&stargazers=1&theme=Light" alt="django-filehub"></p>

<p align="center">
  <a href="https://pypi.org/project/django-filehub/"><img src="https://img.shields.io/pypi/v/django-filehub.svg" alt="PyPI version"></a>
  <a href="https://pypi.org/project/django-filehub/"><img src="https://img.shields.io/pypi/pyversions/django-filehub.svg" alt="Python versions"></a>
  <a href="https://github.com/scthakuri/django-filehub/blob/main/LICENSE"><img src="https://img.shields.io/pypi/l/django-filehub.svg" alt="License"></a>
</p>

Django FileHub is a powerful file management application for Django projects. It provides a complete solution for handling file uploads, storage, organization, and retrieval with an intuitive web-based interface.

## Features

- **📁 File Management**: Upload, organize, and manage files with an intuitive interface
- **🖼️ Image Gallery**: Built-in image picker and gallery selector for forms
- **📂 File Categories**: Automatic categorization based on file types (images, videos, documents, etc.)
- **🔍 Smart Sorting**: Sort files by name, size, or date with ascending/descending options
- **🎨 Customizable Theme**: Configure theme colors to match your project's design
- **☁️ Cloud Storage**: Seamless integration with AWS S3 and other storage backends
- **🔒 Access Control**: Built-in authentication and authorization
- **📝 TinyMCE Integration**: Direct integration with TinyMCE editor
- **🎯 Custom Form Fields**: Specialized form fields and widgets for file selection

## Installation

### Using pip

```bash
pip install django-filehub
```

### Using uv

```bash
uv add django-filehub
```

### Using Poetry

```bash
poetry add django-filehub
```

### Using Pipenv

```bash
pipenv install django-filehub
```

## Quick Start

### 1. Add to Installed Apps

Add `filehub` to your `INSTALLED_APPS` in `settings.py`:

```python
INSTALLED_APPS = [
    # ... other apps
    'filehub',
    # ... other apps
]
```

### 2. Configure URLs

**Important**: Add FileHub URLs **before** the admin URLs in your project's `urls.py`:

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # FileHub URLs must come before admin
    path('filehub/', include('filehub.urls')),

    # Admin URLs
    path('admin/', admin.site.urls),

    # ... other URLs
]
```

### 3. Run Migrations

```bash
python manage.py migrate
```

### 4. Configure Media Files

Add the following to your `settings.py`:

```python
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

### 5. Serve Media Files in Development

Add this to your main `urls.py` for development:

```python
from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

## Configuration

### Basic Settings

#### Login URL

Define the login URL for file access control:

```python
FILEHUB_LOGIN_URL = '/accounts/login/'
```

Default: `'/admin/'`

This URL is used to redirect unauthorized users attempting to access restricted files.

#### Upload Directory

Specify the directory where files will be uploaded within `MEDIA_ROOT`:

```python
FILEMANAGER_DIRECTORY = 'uploads'
```

Default: `'uploads'`

Files will be stored in `MEDIA_ROOT/uploads/`.

#### Thumbnail Directory

Configure the directory for storing image thumbnails:

```python
THUMB_DIRECTORY = 'thumbs'
```

Default: `'thumbs'`

Thumbnails will be stored in `MEDIA_ROOT/thumbs/`.

### File Type Categories

Organize files by type using file extensions:

```python
FILE_TYPE_CATEGORIES = {
    'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'svg', 'ico'],
    'videos': ['mp4', 'webm', 'ogg', 'avi', 'mkv', 'mov', 'wmv', '3gp', 'mpeg', 'mpg4'],
    'musics': ['mp3', 'wav', 'flac', 'aac', 'wma', 'm4a'],
    'archives': ['zip', 'rar', 'tar', 'gz'],
    'documents': ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'odt', 'ods'],
}
```

You can customize these categories or add new ones based on your needs.

### Sorting Configuration

Configure available sorting options:

```python
FILES_SORTING = {
    "name": "Name",
    "size": "Size",
    "date": "Modified"
}

FILES_SORTING_ORDER = {
    "asc": "Ascending",
    "desc": "Descending"
}
```

### Theme Customization

Customize the FileHub interface color:

```python
FILEHUB_THEME_COLOR = '#009688'
```

Default: `'#009688'` (Teal)

Use any valid hex color code (e.g., `'#3498db'` for blue, `'#e74c3c'` for red).

### User Interface Settings

#### Auto-Close Upload Modal

Automatically close the upload modal after successful file upload:

```python
FILEHUB_AUTO_CLOSE_UPLOAD_MODAL = True
```

Default: `False`

When set to `True`, the upload modal will automatically close after files are successfully uploaded.

## Custom Form Fields

Django FileHub provides specialized form fields for file selection in your models.

### FilePickerField

Store a single file with metadata in JSON format:

```python
from django.db import models
from filehub.fields import FilePickerField

class Document(models.Model):
    title = models.CharField(max_length=200)
    file = FilePickerField(
        file_type=['images', 'documents'],
        file_ext=['pdf', 'docx']
    )
```

**Parameters:**

- `file_type`: List of allowed file type categories (e.g., `['images', 'videos']`)
- `file_ext`: List of allowed file extensions (e.g., `['pdf', 'jpg']`)

### GalleryPickerField

Store multiple files as a JSON array:

```python
from django.db import models
from filehub.fields import GalleryPickerField

class Album(models.Model):
    title = models.CharField(max_length=200)
    gallery = GalleryPickerField(
        min_items=2,
        max_items=10,
        sortable=True
    )
```

**Parameters:**

- `min_items`: Minimum number of files required
- `max_items`: Maximum number of files allowed
- `sortable`: Enable drag-and-drop sorting of files

### ImagePickerField

Store image file paths as text:

```python
from django.db import models
from filehub.fields import ImagePickerField

class Profile(models.Model):
    name = models.CharField(max_length=100)
    avatar = ImagePickerField()
```

This field stores the file path of the selected image and works seamlessly with the image picker interface.

### ImagePickerWidget

Use in Django forms for image selection:

```python
from django import forms
from filehub.widgets import ImagePickerWidget

class ProfileForm(forms.Form):
    avatar = forms.CharField(widget=ImagePickerWidget())
```

The widget renders an interactive file picker interface in your forms.

## Cloud Storage Integration

### AWS S3 Configuration

Django FileHub works seamlessly with AWS S3 for cloud file storage.

#### 1. Install django-storages

```bash
pip install "django-storages[s3]"
```

Or with uv:

```bash
uv add "django-storages[s3]"
```

#### 2. Configure AWS S3 Settings

Add to your `settings.py`:

```python
# AWS S3 Configuration
AWS_ACCESS_KEY_ID = 'your-access-key-id'
AWS_SECRET_ACCESS_KEY = 'your-secret-access-key'
AWS_STORAGE_BUCKET_NAME = 'your-bucket-name'
AWS_S3_REGION_NAME = 'us-east-1'  # Your AWS region
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'

# File handling
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = 'public-read'

# Media files URL
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
```

**Security Note**: Never commit AWS credentials to version control. Use environment variables:

```python
import os

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
```

#### 3. Configure Storage Backends

```python
# Default file storage
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Static files (optional)
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
```

#### 4. Collect Static Files

```bash
python manage.py collectstatic
```

For more configuration options, see [django-storages documentation](https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html).

## TinyMCE Editor Integration

Integrate FileHub with TinyMCE editor for rich content editing with file management.

### Configuration

Add to your `settings.py`:

```python
TINYMCE_DEFAULT_CONFIG = {
    'plugins': [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
        'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
        'fullscreen', 'insertdatetime', 'media', 'table', 'help',
        'wordcount', 'filehub'  # Add filehub plugin
    ],
    'toolbar': (
        'undo redo | blocks | bold italic backcolor | '
        'alignleft aligncenter alignright alignjustify | '
        'bullist numlist outdent indent | removeformat | '
        'filehub | help'  # Add filehub button
    ),
    'external_filemanager_path': '/filehub/select/',
    'filemanager_title': 'File Manager',
    'external_plugins': {
        'filehub': '/static/filehub/tinymce/plugin.min.js',
    },
}
```

This enables the FileHub button in your TinyMCE toolbar, allowing users to select and insert files directly from the file manager.

## Production Deployment

### Serving Media Files with Nginx

Configure Nginx to serve media files:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /media/ {
        alias /path/to/your/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Serving Media Files with Apache

Configure Apache with mod_wsgi:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com

    Alias /media/ /path/to/your/media/
    <Directory /path/to/your/media/>
        Require all granted
    </Directory>

    WSGIDaemonProcess yourproject python-path=/path/to/your/project
    WSGIProcessGroup yourproject
    WSGIScriptAlias / /path/to/your/project/wsgi.py
</VirtualHost>
```

## Advanced Configuration

### Complete Settings Reference

Here's a complete reference of all available settings:

```python
# Login and authentication
FILEHUB_LOGIN_URL = '/accounts/login/'

# File storage
FILEMANAGER_DIRECTORY = 'uploads'
THUMB_DIRECTORY = 'thumbs'

# File type categories
FILE_TYPE_CATEGORIES = {
    'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'svg', 'ico'],
    'videos': ['mp4', 'webm', 'ogg', 'avi', 'mkv', 'mov', 'wmv', '3gp', 'mpeg', 'mpg4'],
    'musics': ['mp3', 'wav', 'flac', 'aac', 'wma', 'm4a'],
    'archives': ['zip', 'rar', 'tar', 'gz'],
    'documents': ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'odt', 'ods'],
}

# Sorting options
FILES_SORTING = {
    "name": "Name",
    "size": "Size",
    "date": "Modified"
}

FILES_SORTING_ORDER = {
    "asc": "Ascending",
    "desc": "Descending"
}

# Theme customization
FILEHUB_THEME_COLOR = '#009688'

# UI behavior
FILEHUB_AUTO_CLOSE_UPLOAD_MODAL = False
```

## Usage Examples

### In Django Admin

```python
from django.contrib import admin
from django.db import models
from filehub.fields import ImagePickerField, GalleryPickerField
from filehub.widgets import ImagePickerWidget

class Article(models.Model):
    title = models.CharField(max_length=200)
    cover_image = ImagePickerField()
    gallery = GalleryPickerField(max_items=5)

class ArticleAdmin(admin.ModelAdmin):
    formfield_overrides = {
        ImagePickerField: {'widget': ImagePickerWidget},
    }

admin.site.register(Article, ArticleAdmin)
```

### In Django Forms

```python
from django import forms
from filehub.widgets import ImagePickerWidget

class ArticleForm(forms.ModelForm):
    cover_image = forms.CharField(
        widget=ImagePickerWidget(),
        label='Cover Image'
    )

    class Meta:
        model = Article
        fields = ['title', 'cover_image']
```

### In Templates

Access uploaded files in your templates:

```html
{% load static %}

<div class="article">
  <h1>{{ article.title }}</h1>

  {% if article.cover_image %}
  <img src="{{ article.cover_image }}" alt="{{ article.title }}" />
  {% endif %} {% if article.gallery %}
  <div class="gallery">
    {% for image in article.gallery %}
    <img src="{{ image.url }}" alt="{{ image.name }}" />
    {% endfor %}
  </div>
  {% endif %}
</div>
```

## Troubleshooting

### Media Files Not Loading

Ensure your media settings are correct:

1. Check `MEDIA_URL` and `MEDIA_ROOT` in settings
2. Verify URL patterns include media serving in development
3. Check file permissions on the media directory
4. Ensure the upload directory exists

### Upload Failures

Common causes and solutions:

1. **File size limits**: Check `FILE_UPLOAD_MAX_MEMORY_SIZE` in Django settings
2. **Permissions**: Ensure the web server has write permissions to `MEDIA_ROOT`
3. **Storage backend**: Verify AWS S3 credentials if using cloud storage

### TinyMCE Integration Issues

1. Ensure the FileHub static files are collected: `python manage.py collectstatic`
2. Verify the plugin path in `TINYMCE_DEFAULT_CONFIG`
3. Check browser console for JavaScript errors

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs**: Open an issue with details and reproduction steps
2. **Suggest Features**: Share your ideas for new features
3. **Submit Pull Requests**: Fix bugs or implement new features
4. **Improve Documentation**: Help make the docs better

### Development Setup

```bash
# Clone the repository
git clone https://github.com/scthakuri/django-filehub.git
cd django-filehub

# Install dependencies
pip install -e ".[dev]"

# Run tests
python manage.py test
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [GitHub Repository](https://github.com/scthakuri/django-filehub)
- **Issues**: [GitHub Issues](https://github.com/scthakuri/django-filehub/issues)
- **PyPI**: [django-filehub](https://pypi.org/project/django-filehub/)

## Changelog

### Version 3.2.0

- Added thumbnail directory configuration
- Enhanced file type categories with documents support
- Improved sorting options
- Added auto-close upload modal option
- Bug fixes and performance improvements

---

Made with ❤️ by [scthakuri](https://github.com/scthakuri)
