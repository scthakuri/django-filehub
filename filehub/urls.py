from django.urls import path
from filehub.views import *

app_name = 'filehub'
urlpatterns = [
    path('fm/', browser_view, name='browser'),
    path('fm/select/', browser_select, name='browser_select'),
    path('fm/ajax/browse/', browser_ajax, name='browser_ajax'),
    path('fm/ajax/folder/', NewFolderView.as_view(), name='new_folder'),
    path('fm/ajax/delete/', delete_folder, name='delete_folder'),
    path('fm/ajax/upload/', upload_file, name='upload'),
]
