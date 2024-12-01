from django.urls import path
from filehub.views import *

app_name = 'filehub'
urlpatterns = [
    path('fm/', BrowserView, name='browser'),
    path('fm/select/', BrowserSelect, name='browser_select'),
    path('fm/ajax/browse/', BrowserAjax, name='browser_ajax'),
    path('fm/ajax/new-folder/', NewFolder, name='new_folder'),
    path('fm/ajax/delete-folder/', DeleteFolder, name='delete_folder'),
    path('fm/ajax/upload/', UploadFile, name='upload'),
]
