import warnings

from django.contrib.admin import widgets as admin_widgets
from django.db import models
from filehub import widgets as filehub_widgets
from filehub.forms import GalleryFormField, FilePickerFormField
from filehub.settings import FILE_TYPE_CATEGORIES


class ImagePickerField(models.TextField):
    """
    A string field for storing image URLs. This field uses the `ImagePickerWidget`
    in forms to allow users to select images through a file manager interface.

    The widget allows users to pick an image from the file manager, which will
    then insert the image URL into the field. In the Django admin, it uses
    `AdminImagePickerWidget` for a more integrated interface.
    """

    def __init__(self, *args, file_type=None, file_ext=None, **kwargs):
        self.file_type = file_type
        self.file_ext = file_ext
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs['file_type'] = self.file_type
        kwargs['file_ext'] = self.file_ext
        return name, path, args, kwargs

    def formfield(self, **kwargs):
        defaults = {"widget": filehub_widgets.ImagePickerWidget}
        defaults.update(kwargs)

        # As an ugly hack, we override the admin widget
        if defaults["widget"] == admin_widgets.AdminTextareaWidget:
            defaults["widget"] = filehub_widgets.AdminImagePickerWidget

        if self.file_type:
            if not isinstance(self.file_type, list):
                raise ValueError("file_type must be a list of allowed file types")

        if self.file_ext:
            if not isinstance(self.file_ext, list):
                raise ValueError("file_ext must be a list of allowed file extensions")

        field = super().formfield(**defaults)
        field.widget.attrs.update({
            "data-file-type": ",".join(self.file_type) if self.file_type else "",
            "data-file-ext": ",".join(self.file_ext) if self.file_ext else "",
        })
        return field


class FilePickerField(models.JSONField):
    description = "Custom JSON field for picking a single file"

    def __init__(self, *args, **kwargs):
        self.max_length = kwargs.pop('max_length', None)
        if self.max_length is not None:
            warnings.warn(
                "`max_length` has no effect on FilePickerField.",
                stacklevel=2
            )

        file_type = kwargs.pop("file_type", [])
        file_ext = kwargs.pop("file_ext", [])

        if isinstance(file_type, str):
            file_type = [file_type]
        if isinstance(file_ext, str):
            file_ext = [file_ext]

        for t in file_type:
            if t not in FILE_TYPE_CATEGORIES:
                raise ValueError(f"Invalid file_type '{t}'. Allowed keys: {list(FILE_TYPE_CATEGORIES.keys())}")

        all_allowed_exts = set(
            ext.lower() for exts in FILE_TYPE_CATEGORIES.values() for ext in exts
        )

        for ext in file_ext:
            ext_clean = ext.lower().strip()
            if ext_clean not in all_allowed_exts:
                raise ValueError(
                    f"Invalid file extension '{ext}'. Must be one of the allowed extensions in FILE_TYPE_CATEGORIES.")

        extensions_from_types = []
        for t in file_type:
            extensions_from_types.extend(FILE_TYPE_CATEGORIES[t])

        merged_exts = set(ext.lower().strip() for ext in extensions_from_types + file_ext)
        self.file_ext = sorted(merged_exts)
        super().__init__(*args, **kwargs)

    def formfield(self, **kwargs):
        defaults = {
            'form_class': FilePickerFormField,
            'file_ext': self.file_ext,
        }
        defaults.update(kwargs)
        return super().formfield(**defaults)


class GalleryPickerField(models.JSONField):
    description = "Custom JSON field for picking an image gallery (list of images)"

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('default', list)
        kwargs.setdefault('blank', True)
        self.min_items = kwargs.pop("min_items", None)
        self.min_items = kwargs.pop("min_items", None)
        self.max_items = kwargs.pop("max_items", None)
        self.sortable = kwargs.pop("sortable", False)

        self.max_length = kwargs.pop('max_length', None)
        if self.max_length is not None:
            warnings.warn(
                "`max_length` has no effect on GalleryPickerField. Use `max_items` instead.",
                stacklevel=2
            )

        super().__init__(*args, **kwargs)

    def formfield(self, **kwargs):
        defaults = {
            'form_class': GalleryFormField,
            'min_items': self.min_items,
            'max_items': self.max_items,
            'sortable': self.sortable,
        }
        defaults.update(kwargs)
        return super().formfield(**defaults)


