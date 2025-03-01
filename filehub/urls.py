from django.urls import path
from filehub.views import *

app_name = 'filehub'
urlpatterns = [
    path('filehub/', browser_view, name='browser'),
    path('filehub/select/', browser_select, name='browser_select'),
    path('filehub/ajax/browse/', browser_ajax, name='browser_ajax'),
    path('filehub/ajax/folder/', NewFolderView.as_view(), name='new_folder'),
    path('filehub/ajax/delete/', delete_folder, name='delete_folder'),
    path('filehub/ajax/upload/', upload_file, name='upload')
]
