from django.contrib.admin import widgets as admin_widgets
from django.db import models
from filehub import widgets as filehub_widgets


class ImagePickerField(models.TextField):
    """
    A large string field for HTML content. It uses the TinyMCE widget in
    forms.
    """

    def formfield(self, **kwargs):
        defaults = {"widget": filehub_widgets.ImagePickerWidget}
        defaults.update(kwargs)

        # As an ugly hack, we override the admin widget
        if defaults["widget"] == admin_widgets.AdminTextareaWidget:
            defaults["widget"] = filehub_widgets.AdminImagePickerWidget

        return super().formfield(**defaults)
