from django.contrib.admin import widgets as admin_widgets
from django.db import models
from filehub import widgets as filehub_widgets


class ImagePickerField(models.TextField):
    """
    A string field for storing image URLs. This field uses the `ImagePickerWidget`
    in forms to allow users to select images through a file manager interface.

    The widget allows users to pick an image from the file manager, which will 
    then insert the image URL into the field. In the Django admin, it uses 
    `AdminImagePickerWidget` for a more integrated interface.
    """

    def formfield(self, **kwargs):
        defaults = {"widget": filehub_widgets.ImagePickerWidget}
        defaults.update(kwargs)

        # As an ugly hack, we override the admin widget
        if defaults["widget"] == admin_widgets.AdminTextareaWidget:
            defaults["widget"] = filehub_widgets.AdminImagePickerWidget

        return super().formfield(**defaults)
