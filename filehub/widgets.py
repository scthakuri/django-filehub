import os

from django import forms
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.contrib.admin import widgets as admin_widgets
from django.conf import settings


class ImagePickerWidget(forms.Textarea):
    """
    TinyMCE widget. Set settings.TINYMCE_JS_URL to set the location of the
    javascript file. Default is "STATIC_URL + 'tinymce/tinymce.min.js'".
    You can customize the configuration with the mce_attrs argument to the
    constructor.

    In addition to the standard configuration you can set the
    'content_language' parameter. It takes the value of the 'language'
    parameter by default.

    In addition to the default settings from settings.TINYMCE_DEFAULT_CONFIG,
    this widget sets the 'language' and 'directionality' parameters by default.
    The first is derived from the current Django language, the second from the
    'content_language' parameter.
    """

    css_included = False

    def use_required_attribute(self, *args):
        # The html required attribute may disturb client-side browser validation.
        return False

    def render(self, name, value, attrs=None, renderer=None):
        app_url = reverse('filehub:browser_select')
        filemanager_url = f"{app_url}?callback_fnc={name}"

        input_field = super().render(name, value, attrs, renderer)
        html = render_to_string("filehub/widgets/image_picker.html", {
            "value": value,
            "name": name,
            "filemanager_url": filemanager_url,
            "basename": os.path.basename(value) if value else None,
            "file_size": self.get_file_size(value) if value else None,
            "is_image": value and value.endswith((".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp")),
            "input_field": input_field,
            "css_included": self.css_included
        })
        self.css_included = True
        return mark_safe(html)

    def get_file_size(self, value):
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

    class Media:
        css = {
            "all": [
                "https://cdnjs.cloudflare.com/ajax/libs/fancybox/3.5.7/jquery.fancybox.min.css"
            ]
        }
        js = [
            "https://cdnjs.cloudflare.com/ajax/libs/fancybox/3.5.7/jquery.fancybox.min.js",
            f"{settings.STATIC_URL}filehub/widget.js"
        ]


class AdminImagePickerWidget(ImagePickerWidget, admin_widgets.AdminTextareaWidget):
    pass
