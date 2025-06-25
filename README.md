<h1 align="center" id="title">Django FileHub</h1>

<p align="center"><img src="https://socialify.git.ci/scthakuri/django-filehub/image?font=Inter&amp;forks=1&amp;issues=1&amp;language=1&amp;name=1&amp;owner=1&amp;pattern=Circuit%20Board&amp;pulls=1&amp;stargazers=1&amp;theme=Light" alt="project-image"></p>

FileHub is a Django-based file management app that simplifies file handling within your Django projects. It supports file uploads, storage, and retrieval, making it easy to integrate robust file management features into your applications.

## Features

- **File Uploads**: Seamlessly handle file uploads in your Django project.
- **File Storage**: Organize and store files with customizable configurations.
- **File Retrieval**: Efficiently access and manage uploaded files.
- **File Categories**: Automatically categorize files based on type.
- **Sorting Options**: Flexible sorting by name, size, or date, with ascending/descending order.
- **Custom Fields**: Use `ImagePickerField` and `ImagePickerWidget` for advanced image selection in forms.

## Installation

1. Install django-filehub using [pip](https://pip.pypa.io/en/stable/) (or any other way to install python package) from [PyPI](https://pypi.org/).

```bash
pip install django-filehub
```

2. Add `filehub` to INSTALLED_APPS in `settings.py` for your project:

```python
INSTALLED_APPS = (
    ...
    'filehub',
    ...
)
```

3. Add `filehub.urls` to `urls.py` for your project:

```python
urlpatterns = patterns('',
    ...
    path('admin/', include('filehub.urls')),
    ...
)
```

4. Make migrations to add necessary database tables

```bash
python manage.py migrate
```

## Configuration

### 1. **Login URL for File Access Control**

To secure file access, define a login URL that redirects unauthorized users to the login page:

```python
FILEHUB_LOGIN_URL = "/login/"
```

- Description:
    - This URL will be used as a fallback for unauthorized access to media files.
    - Users attempting to access restricted files will be redirected to this URL.

### 2. **Media File Settings**

Django requires `MEDIA_URL` and `MEDIA_ROOT` to manage uploaded files. Add the following settings:

```python
MEDIA_URL = "media/"
MEDIA_ROOT = "path/to/media"
```

- MEDIA_URL:
    - Specifies the base public URL to serve media files.
    - Example: If `MEDIA_URL = "media/"`, uploaded files will be accessible at http://yourdomain.com/media/.

- MEDIA_ROOT:
    - Defines the absolute path to the directory where media files are stored.
    - Replace `"path/to/media"` with the full path to your desired directory.


### 3. **Upload Directory Configuration**

Define the directory where files will be uploaded within the `MEDIA_ROOT` directory. By default, this is set to `uploads`, but you can change it as needed.

```python
DIRECTORY = "uploads"
```

- Description:
    - This setting determines the subdirectory inside the `MEDIA_ROOT` where uploaded files will be stored.
    - The default value is `"uploads"`, meaning that files will be uploaded to `MEDIA_ROOT/uploads/`.
    - You can change this value to any directory name you prefer (e.g., `"files"`, `"documents"`, etc.).
    - Ensure the specified directory exists within the `MEDIA_ROOT` or Django will create it when files are uploaded.

### 4. **File Type Categories**

Organize files into specific categories based on their extensions. Add the following dictionary to define supported file types:

```python
FILE_TYPE_CATEGORIES = {
    'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
    'videos': ['mp4', 'webm', 'ogg', 'avi', 'mkv', 'mov', 'wmv', '3gp', 'mpeg', 'mpg4'],
    'musics': ['mp3', 'wav', 'flac', 'aac', 'wma', 'm4a'],
    'archives': ['zip', 'rar', 'tar', 'gz']
}
```

- Description:
    - This dictionary categorizes files by type and extension for better organization.
    - Each key represents a category (e.g., `images`, `videos`), and the value is a list of associated file extensions.

### 5. **Theme Color Configuration**

You can customize the theme color of the Filehub file manager interface by setting the `FILEHUB_THEME_COLOR`.

```python
FILEHUB_THEME_COLOR = "#3498db"
```

- Description:
    - This setting allows you to change the theme color of the Filehub file manager interface.
    - The color is specified using a Hex color code. You can set it to any valid Hex color (e.g., `#3498db` for blue, `#e74c3c` for red).
    - This provides a way to customize the visual appearance of the file manager to better match your site's theme.

## Custom Fields

Django Filehub also supports the following custom field and widget for advanced image selection:

### 1. **FilePickerField**

`FilePickerField` is a custom Django model field used to store a selected file (with metadata) in JSON format. It provides support for file type categories (e.g., images, videos, archives) and file extension restrictions.

#### Example Usage:

```python
from filehub.fields import FilePickerField

class Document(models.Model):
    file = FilePickerField(file_type=['images', 'archives'], file_ext=['pdf'])
```

* **Description**:

  * Stores a single file (typically as a JSON object with metadata like name, size, type, etc.).
  * Supports validation using `file_type` (mapped to categories like images, videos, etc.) and `file_ext`.
  * Automatically warns if unsupported attributes like `max_length` are used.
  * Ideal for selecting or linking externally uploaded files with validation logic.

---

### 2. **GalleryPickerField**

`GalleryPickerField` is a custom Django model field used to store a gallery of selected files (typically images) as a list of JSON objects.

#### Example Usage:

```python
from filehub.fields import GalleryPickerField

class Album(models.Model):
    gallery = GalleryPickerField(min_items=2, max_items=5, sortable=True)
```

* **Description**:

  * Stores multiple files (usually images) as a JSON array.
  * Each entry in the array represents a file with metadata.
  * Supports file type categories and file extension filtering similar to `FilePickerField`.
  * Best suited for image galleries, multi-file selection, or grouped file displays.



### 3. **ImagePickerField**

`ImagePickerField` is a custom Django model field used to store image file paths as text. This field makes it easier to handle image selections by allowing you to store the image path in your model without the need for manually handling file uploads.

#### Example Usage:

```python
from filehub.fields import ImagePickerField

class ExampleModel(models.Model):
    image = ImagePickerField()
```

- Description:
    - The ImagePickerField stores the file path of the selected image in your model as a text field.
    - It does not directly handle the image upload process; rather, it works with an image picker interface that allows the user to choose images.
    - This is particularly useful when you want to allow users to select images from a pre-defined set or directory rather than uploading new images each time.

### 4. **ImagePickerWidget**

`ImagePickerWidget` is a custom Django form widget designed to allow users to select images via a file picker interface in forms. It is typically used alongside the `ImagePickerField` in Django forms to enhance the image selection experience.

```python
from filehub.widgets import ImagePickerWidget
from django import forms

class ExampleForm(forms.Form):
    image = forms.CharField(widget=ImagePickerWidget())
```

- Description:
    - The ImagePickerWidget is a custom form widget that renders a file picker interface in the form, allowing users to select an image.
    - It works by rendering a text field where users can either enter an image path or use the widget’s file picker to select an image.
    - This widget is designed to work with the ImagePickerField model field, which stores the image file path.


## Additional Notes

### Serving Media Files via AWS S3 Buckets

To serve media files via AWS S3 in your Django project, you'll need to configure `django-storages` to handle the interaction with S3.

#### 1. Install django-storages

First, you need to install `django-storages` to manage media files with AWS S3:

```bash
pip install "django-storages[s3]"
```

#### 2. Configure AWS S3 in Django Settings

In your `settings.py`, add the following configurations:

```bash
# AWS S3 Configuration for Serving Media Files
AWS_ACCESS_KEY_ID = 'your-access-key-id'
AWS_SECRET_ACCESS_KEY = 'your-secret-access-key'
AWS_STORAGE_BUCKET_NAME = 'your-bucket-name'
AWS_S3_REGION_NAME = 'your-region'  # e.g., 'us-east-1'
AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com"  # Customize if using CloudFront
AWS_S3_FILE_OVERWRITE = False  # Prevent overwriting files with the same name
AWS_DEFAULT_ACL = 'public-read'  # Files will be publicly accessible

# Optionally, if you want to use a custom URL for your media files:
AWS_S3_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'  # Adjust if using CloudFront
```

Make sure to replace placeholders like `'your-access-key-id'`, `'your-secret-access-key'`, and `'your-bucket-name'` with your actual AWS credentials and settings.

#### 3. Set MEDIA_URL (Required) and STATIC_URL (Optional)

Configure the URLs for both static and media files:

```bash
# URL for serving Media files
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'

# URL for serving Static files (Optional)
STATIC_URL = f'https://{AWS_S3_STATIC_CUSTOM_DOMAIN}/static/'  # Optional
```

If you do not wish to use a custom `STATIC_URL` and prefer using the default Django static setup, you can skip setting `STATIC_URL`. This is optional.

#### 4. Run collectstatic for Static Files

To upload static files to your S3 bucket, run the following command:

```bash
python manage.py collectstatic
```

This command will gather all static files and push them to your S3 bucket under the static/ folder.

For more configuration settings, [check AWS config here](https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html)

#### 5. Filemanager in Tinymce Editor

From v3.0.1, Filemanager can be easily integrate in tinymce editor.

```python
TINYMCE_DEFAULT_CONFIG = {
    ...
    plugins: [... filehub ....],
    toolbar: [... filehub ....],
    "external_filemanager_path": "/admin/fm/select/", # Path of your filemanager
    "filemanager_title": "Filemanager",
    "external_plugins": {
        "filehub": "/static/filehub/tinymce/plugin.min.js",
    },
}
```

### Serving Media Files in Development

During development, you can serve media files by adding the following to your `urls.py`:

```bash
from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### Serving Media Files in Production

In production, use a web server like **Nginx** or **Apache** to serve media files efficiently. Ensure the `MEDIA_ROOT` directory is properly configured.

## Contributing
Contributions are welcome! If you'd like to report issues, suggest new features, or contribute to the development, please submit a pull request or open an issue.
