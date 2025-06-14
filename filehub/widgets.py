import ast
import json
import os

from django import forms
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.contrib.admin import widgets as admin_widgets
from django.conf import settings
from filehub.settings import FILEMANAGER_DEBUG, FILE_TYPE_CATEGORIES


def get_file_size(value):
    try:
        file_path = os.path.join(settings.BASE_DIR, value)
        size = os.path.getsize(file_path)
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.2f} KB"
        elif size < 1024 * 1024 * 1024:
            return f"{size / 1024 / 1024:.2f} MB"
        return f"{size / 1024 / 1024 / 1024:.2f} GB"
    except Exception:
        return "Unknown"


class ImagePickerWidget(forms.Textarea):
    """
    A custom widget for selecting images from a file manager.

    This widget renders a textarea for the image URL, and provides a button
    that opens a file manager to select an image. Once an image is selected,
    the URL is inserted into the textarea. The widget also displays the
    selected image's name, size, and type (if it's an image).

    The widget uses the `filehub:browser_select` URL for the file manager
    and allows setting a callback function for handling the image selection.

    This widget is designed to work with Django's admin and forms framework.
    """

    def use_required_attribute(self, *args):
        # The html required attribute may disturb client-side browser validation.
        return False

    def render(self, name, value, attrs=None, renderer=None):
        if attrs is None:
            attrs = {}

        final_attrs = self.attrs.copy()
        final_attrs.update(attrs)

        app_url = reverse('filehub:browser_select')
        filemanager_url = f"{app_url}?callback_fnc={name}"

        file_type = final_attrs.get("data-file-type", "").strip()
        file_ext = final_attrs.get("data-file-ext", "").strip()

        if file_type and not file_ext:
            file_types = [ft.strip() for ft in file_type.split(",") if ft.strip()]
            file_ext_list = []

            for ftype in file_types:
                if not file_ext and ftype in FILE_TYPE_CATEGORIES:
                    file_ext_list.extend(FILE_TYPE_CATEGORIES[ftype])

            if not file_ext and file_ext_list:
                file_ext = ",".join(file_ext_list)

        if file_ext:
            file_exts = [ext.strip() for ext in file_ext.split(",") if ext.strip()]
            filemanager_url += "".join([f"&file_ext={ext}" for ext in file_exts])

        input_field = super().render(name, value, attrs, renderer)
        html = render_to_string("filehub/widgets/image_picker.html", {
            "value": value,
            "name": name,
            "filemanager_url": filemanager_url,
            "basename": os.path.basename(value) if value else None,
            "file_size": get_file_size(value) if value else None,
            "is_image": value and value.endswith((".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp")),
            "input_field": input_field
        })
        return mark_safe(html)

    class Media:
        css = {
            "all": [
                "https://cdnjs.cloudflare.com/ajax/libs/fancybox/3.5.7/jquery.fancybox.min.css",
                f"{settings.STATIC_URL}filehub/widget.css" if FILEMANAGER_DEBUG else
                f"{settings.STATIC_URL}filehub/widget.min.css"
            ]
        }
        js = [
            "https://cdnjs.cloudflare.com/ajax/libs/fancybox/3.5.7/jquery.fancybox.min.js",
            f"{settings.STATIC_URL}filehub/widget.js" if FILEMANAGER_DEBUG else
            f"{settings.STATIC_URL}filehub/widget.min.js"
        ]


class AdminImagePickerWidget(ImagePickerWidget, admin_widgets.AdminTextareaWidget):
    pass


def is_basename_image(value):
    if not value:
        return False
    ext = os.path.splitext(value)[1].lower()
    if not ext:
        return False

    ext = ext.lstrip('.')
    images_exts = FILE_TYPE_CATEGORIES.get("images", [])
    return ext in images_exts


class BaseFilePickerWidget(forms.Widget):
    default_class = 'file-picker'
    default_value = {}

    class Media:
        css = {
            'all': [
                "https://cdnjs.cloudflare.com/ajax/libs/fancybox/3.5.7/jquery.fancybox.min.css",
                "https://use.hugeicons.com/font/icons.css",
                f"{settings.STATIC_URL}filehub/widget.css" if FILEMANAGER_DEBUG else
                f"{settings.STATIC_URL}filehub/widget.min.css"
            ]
        }
        js = [
            "https://cdnjs.cloudflare.com/ajax/libs/fancybox/3.5.7/jquery.fancybox.min.js",
            "https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.6/Sortable.min.js",
            f"{settings.STATIC_URL}filehub/widget.js" if FILEMANAGER_DEBUG else
            f"{settings.STATIC_URL}filehub/widget.min.js"
        ]

    def __init__(self, attrs=None):
        default_attrs = {'class': self.default_class}
        if attrs:
            default_attrs.update(attrs)
        super().__init__(default_attrs)

    def load_json_value(self, value):
        if value is None:
            return self.default_value

        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return self.default_value
        elif isinstance(value, dict):
            return value
        elif isinstance(value, list):
            return value
        return self.default_value

    def format_value(self, value):
        if value is None:
            return json.dumps(self.default_value)
        if isinstance(value, str):
            if isinstance(value, str):
                try:
                    return json.dumps(json.loads(value))
                except json.JSONDecodeError:
                    try:
                        return json.dumps(ast.literal_eval(value))
                    except (ValueError, SyntaxError):
                        return json.dumps(self.default_value)
        if isinstance(value, dict):
            return json.dumps(value)
        elif isinstance(value, list):
            return json.dumps(value)
        return value

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        object_value = self.load_json_value(value)
        if not object_value:
            object_value = self.default_value

        context['widget']['object_value'] = object_value
        context['widget']['name'] = name
        context['widget']['value'] = self.format_value(object_value)

        images_exts = FILE_TYPE_CATEGORIES.get("images", [])
        file_manager_url = reverse('filehub:browser_select')
        if self.default_class == 'gallery-picker':
            file_manager_url += f"?callback_fnc={name}&multiple=true"
            if images_exts:
                file_manager_url += f"&file_ext={','.join(images_exts)}"
        else:
            file_name = object_value.get("name", "") if isinstance(object_value, dict) else ""
            context['widget']['is_image'] = is_basename_image(file_name)
            file_manager_url += f"?callback_fnc={name}"
            supported_extensions = context['widget']['attrs'].get("allowed-ext", "")
            if supported_extensions:
                file_manager_url += f"&file_ext={supported_extensions}"

        context['widget']['filemanager_url'] = file_manager_url
        return context


class FilePickerWidget(BaseFilePickerWidget):
    template_name = 'filehub/widgets/file_picker.html'
    default_class = 'file-picker'
    default_value = {}


class GalleryWidget(BaseFilePickerWidget):
    template_name = 'filehub/widgets/gallery_picker.html'
    default_class = 'gallery-picker'
    default_value = []






