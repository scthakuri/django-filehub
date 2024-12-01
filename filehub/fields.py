from django import forms
from django.db import models
from django.urls import reverse
from django.utils.safestring import mark_safe


class ImagePickerField(models.CharField):
    def formfield(self, **kwargs):
        kwargs['widget'] = ImagePickerWidget
        return super().formfield(**kwargs)


class ImagePickerWidget(forms.widgets.TextInput):
    def render(self, name, value, attrs=None, renderer=None):
        app_url = reverse('filehub:browser_select')
        filemanagerurl = f"{app_url}?callback_fnc=" + name
        attrs = attrs or {}
        attrs['class'] = "form-control"

        html = '<div class="input-group">'
        html += super().render(name, value, attrs, renderer)
        html += ('<div class="input-group-append"><a href="{url}" class="btn btn-outline-secondary '
                 'imagePickerFancybox" type="button">Choose Image</a></div></div>')
        html = html.format(url=filemanagerurl)
        return mark_safe(html)