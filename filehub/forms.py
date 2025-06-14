import json
from django import forms
from django.core.exceptions import ValidationError

from filehub.widgets import GalleryWidget, FilePickerWidget


class FilePickerFormField(forms.JSONField):
    widget = FilePickerWidget

    def __init__(self, *args, **kwargs):
        self.required = kwargs.get("required", False)
        self.file_ext = kwargs.pop("file_ext", [])
        super().__init__(*args, **kwargs)

    def widget_attrs(self, widget):
        attrs = super().widget_attrs(widget)
        if self.file_ext:
            attrs['allowed-ext'] = ','.join(self.file_ext)
        return attrs

    def to_python(self, value):
        if value is None or value == "":
            return {}
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                value = {}
        return value

    def validate(self, value):
        if self.required and not value.get("url", None):
            raise forms.ValidationError("This field is required.")
        return super().validate(value)


class GalleryFormField(forms.JSONField):
    widget = GalleryWidget

    def __init__(self, *args, **kwargs):
        self.required = kwargs.get("required", False)
        self.min_items = kwargs.pop("min_items", None)
        self.max_items = kwargs.pop("max_items", None)
        self.sortable = kwargs.pop("sortable", False)
        super().__init__(*args, **kwargs)

    def widget_attrs(self, widget):
        attrs = super().widget_attrs(widget)
        if self.min_items is not None:
            attrs['data-min-items'] = str(self.min_items)
        if self.max_items is not None:
            attrs['data-max-items'] = str(self.max_items)
        if self.sortable:
            attrs['sortable'] = 'sortable'
        return attrs

    def to_python(self, value):
        if value is None or value == "":
            return []
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                value = []
        return value or []

    def validate(self, value):
        if self.required and (not isinstance(value, list) or not value):
            raise forms.ValidationError("Please select at least one image.")

        length = len(value)
        if self.min_items is not None and length < self.min_items:
            raise ValidationError(f"You must select at least {self.min_items} image(s).")
        if self.max_items is not None and length > self.max_items:
            raise ValidationError(f"You can select at most {self.max_items} image(s).")
        return super().validate(value)