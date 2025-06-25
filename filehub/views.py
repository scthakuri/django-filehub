import os.path
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from filehub.models import MediaFolder, MediaFile
from django.shortcuts import render
from filehub.core import FolderManager
from filehub.settings import MEDIA_URL, FILES_SORTING, FILES_SORTING_ORDER, FILE_TYPE_CATEGORIES, FILEHUB_LOGIN_URL, \
    FILEHUB_THEME_COLOR, FILEMANAGER_DEBUG, FILEMANAGER_VERSION
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Q
from django.contrib.auth.decorators import login_required
from filehub.utils import file_response_format, folder_response_format, sanitize_allowed_extensions


def get_folder_hierarchy(parent_folder=None):
    folders = MediaFolder.objects.filter(parent=parent_folder).order_by("folder_name")
    hierarchy = []
    for folder in folders:
        hierarchy.append({
            'id': folder.id,
            "name": folder.folder_name,
            "path": folder.get_relative_path(),
            "uri": folder.get_relative_path(),
            "children": get_folder_hierarchy(folder)
        })
    return hierarchy


def get_folders(parent_folder=None, sortby="name", sortorder="asc", search=None, request=None):
    sortorderFinal = '' if sortorder == 'asc' else '-'

    if request and hasattr(request, 'user') and request.user.is_authenticated:
        folders = MediaFolder.get_accessible_folders(request.user, parent_folder)
    else:
        folders = MediaFolder.objects.filter(parent=parent_folder)

    if search is not None:
        folders = folders.filter(Q(folder_name__icontains=search))

    if sortby == 'name':
        folders = folders.order_by(f"{sortorderFinal}folder_name")
    elif sortby == 'date':
        folders = folders.order_by(f"{sortorderFinal}modify_date")

    output = []
    for folder in folders:
        output.append(folder_response_format(folder, request))

    if sortby == 'size':
        output = sorted(output, key=lambda x: x['size'], reverse=(sortorder == 'desc'))

    print(output)

    return output


def get_files(page=1, folder=None, sortby="name", sortorder="asc", search=None, filter_by=None, request=None):
    sortorder_prefix = '' if sortorder == 'asc' else '-'
    items_per_page = 49

    if request and hasattr(request, 'user') and request.user.is_authenticated:
        all_files = MediaFile.get_accessible_files(request.user, folder)
    else:
        all_files = MediaFile.objects.filter(folder=folder)

    if filter_by:
        all_files = all_files.filter(file_type=filter_by)

    if search:
        all_files = all_files.filter(Q(file_name__icontains=search))

    # Sorting
    sort_field_map = {
        'name': 'file_name',
        'date': 'modify_date',
        'size': 'file_size'
    }
    sort_field = sort_field_map.get(sortby, 'file_name')
    all_files = all_files.order_by(f"{sortorder_prefix}{sort_field}")

    # Pagination
    paginator = Paginator(all_files, items_per_page)

    try:
        current_page = paginator.page(page)
    except PageNotAnInteger:
        current_page = paginator.page(1)
    except EmptyPage:
        current_page = paginator.page(paginator.num_pages)

    # Prepare output data
    output = []
    for file in current_page.object_list:
        if file is not None:
            file_object = file_response_format(file, request)
            output.append(file_object)

    return {
        "hasMore": current_page.has_next(),
        "data": output
    }


@login_required(login_url=FILEHUB_LOGIN_URL)
def browser_view(request):
    context = {
        "media_url": MEDIA_URL,
        "sorting": {
            "order": FILES_SORTING_ORDER,
            "sort": FILES_SORTING
        },
        "allowed_exts": FILE_TYPE_CATEGORIES,
        "select_files": "true",
        "select_multiple": "true",
        "file_picker": False,
        "theme_color": FILEHUB_THEME_COLOR,
        "debug": FILEMANAGER_DEBUG,
        "version": FILEMANAGER_VERSION,
        "file_exts": []
    }
    return render(request, "filehub/filehub_list.html", context=context)

@login_required(login_url=FILEHUB_LOGIN_URL)
def browser_select(request):
    file_exts = sanitize_allowed_extensions(request.GET.getlist("file_ext", []))
    context = {
        "media_url": MEDIA_URL,
        "sorting": {
            "order": FILES_SORTING_ORDER,
            "sort": FILES_SORTING
        },
        "allowed_exts": FILE_TYPE_CATEGORIES,
        "select_files": "true",
        "select_multiple": request.GET.get("multiple", "false"),
        "file_picker": True,
        "theme_color": FILEHUB_THEME_COLOR,
        "debug": FILEMANAGER_DEBUG,
        "version": FILEMANAGER_VERSION,
        "file_exts": file_exts
    }
    return render(request, "filehub/filehub_list.html", context=context)


@login_required(login_url=FILEHUB_LOGIN_URL)
@csrf_exempt
def browser_ajax(request):
    if request.method == 'POST':
        try:
            folder_id = request.POST.get("folder", None)
            folder_id = folder_id if folder_id else None

            breadcrumb = {}
            if folder_id is not None:
                folder = MediaFolder.objects.get(id=folder_id)
                if not folder:
                    return JsonResponse({'message': 'Folder doesn\'t exists!!!'}, status=500)
                breadcrumb = folder.get_breadcrumb()

            page = request.POST.get("page", 1)
            page = page if page else 1

            sortby = request.POST.get("sortby", None)
            sortby = sortby if sortby else "name"

            search = request.POST.get("search", None)
            search = search if search else None

            filter_by = request.POST.get("filter", None)
            filter_by = filter_by if filter_by else None

            sortorder = request.POST.get("sortorder", None)
            sortorder = sortorder if sortorder else "asc"

            folder_hiearchy = get_folder_hierarchy()
            folders = get_folders(folder_id, sortby, sortorder, search, request)
            files = get_files(page, folder_id, sortby, sortorder, search, filter_by, request)

            return JsonResponse({
                "hiearchy": folder_hiearchy,
                "folders": folders,
                "files": files,
                "folder": folder_id,
                "page": page,
                "breadcrumb": breadcrumb
            })

        except (ValueError, TypeError) as e:
            return JsonResponse({'message': str(e)}, status=500)
        except Exception as e:
            return JsonResponse({'message': 'Internal server error', 'error': e}, status=500)

    return JsonResponse({'message': 'This request is not available'}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(login_required(login_url=FILEHUB_LOGIN_URL), name='dispatch')
class NewFolderView(View):
    def post(self, request, *args, **kwargs):
        try:
            file_type = request.POST.get("file_type", "folder")
            if file_type == "folder":
                return self.handle_folder_request(request)
            else:
                return self.handle_file_request(request)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=500)

    def handle_folder_request(self, request):
        update_id = request.POST.get("update_id", None)
        name = request.POST.get("name", None)

        if update_id:
            return self.update_folder(update_id, name, request)
        else:
            current_dir = request.POST.get("current_dir", None)
            return self.create_folder(name, current_dir, request)

    def update_folder(self, update_id, name, request):
        try:
            folder_to_update = MediaFolder.objects.get(id=update_id)
            folder_to_update.folder_name = name
            folder_to_update.save()
            return JsonResponse({
                'message': 'Folder renamed successfully.',
                'data': folder_response_format(folder_to_update, request)
            })
        except MediaFolder.DoesNotExist:
            return JsonResponse({'error': 'Folder does not exist.'}, status=500)

    def create_folder(self, name, current_dir_id, request):
        try:
            current_dir = None
            if current_dir_id:
                current_dir = MediaFolder.objects.get(id=current_dir_id)
        except MediaFolder.DoesNotExist:
            current_dir = None

        exists = MediaFolder.objects.filter(
            folder_name=name,
            parent=current_dir
        ).exists()
        if exists:
            raise Exception("Folder already exists")

        new_folder_obj = MediaFolder(folder_name=name, parent=current_dir, upload_by=request.user)
        new_folder_obj.save()
        FolderManager.create_folder(new_folder_obj)
        return JsonResponse({
            'success': True,
            'message': 'New folder created successfully.',
            'data': folder_response_format(new_folder_obj, request)
        })

    def get(self, request, *args, **kwargs):
        return JsonResponse({'message': 'This request is not available'}, status=500)

    def handle_file_request(self, request):
        update_id = request.POST.get("update_id", None)
        name = request.POST.get("name", None)

        if not update_id:
            raise Exception("Invalid request")

        if not name:
            raise Exception("New Filename is required")

        old_folder = MediaFile.objects.get(id=update_id)
        basename, extension = os.path.splitext(old_folder.file_name)
        file_to_update = MediaFile.objects.get(id=update_id)
        file_to_update.file_name = name + extension
        FolderManager.rename_file(old_folder, file_to_update)
        file_to_update.save()
        return JsonResponse({
            'message': 'File renamed successfully.',
            'data': file_response_format(file_to_update, request)
        })


@login_required(login_url=FILEHUB_LOGIN_URL)
@csrf_exempt
def new_folder(request):
    if request.method == 'POST':
        try:
            update_id = request.POST.get("update_id", None)
            update_id = update_id if update_id else None
            name = request.POST.get("name", None)

            if update_id is not None:
                try:
                    old_folder = MediaFolder.objects.get(id=update_id)
                    folder_to_update = MediaFolder.objects.get(id=update_id)
                    folder_to_update.folder_name = name
                    FolderManager.rename_folder(old_folder, folder_to_update)
                    folder_to_update.save()
                    return JsonResponse({'message': 'Folder updated successfully.'})
                except MediaFolder.DoesNotExist:
                    return JsonResponse({'error': 'Folder does not exist.'}, status=500)
            else:
                try:
                    current_dir = request.POST.get("current_dir", None)
                    current_dir = current_dir if current_dir else None
                    current_dir = MediaFolder.objects.get(id=current_dir)
                except Exception:
                    current_dir = None

                new_folder_obj = MediaFolder(folder_name=name, parent=current_dir, upload_by=request.user)
                FolderManager.create_folder(new_folder_obj)
                new_folder_obj.save()
                return JsonResponse({'message': 'New folder created successfully.'})

        except Exception as e:
            return JsonResponse({'message': str(e)}, status=500)

    return JsonResponse({'message': 'This request is not available'}, status=500)


@login_required(login_url=FILEHUB_LOGIN_URL)
@csrf_exempt
def delete_folder(request):
    if request.method == 'POST':
        try:
            delete_id = request.POST.getlist("delete_id[]", [])
            if not delete_id:
                return JsonResponse({'message': 'No Files/Folder selected to delete'}, status=400)

            file_type = request.POST.get("type", None)
            file_type = file_type if file_type else "folder"

            if file_type == "folder":
                folder = MediaFolder.objects.filter(id__in=delete_id)
                if not folder.exists():
                    return JsonResponse({'message': 'Folder Doesn\'t Exist'}, status=404)
                folder.delete()
                return JsonResponse({'message': 'Deleted Successfully'})
            elif file_type == "file":
                files = MediaFile.objects.filter(id__in=delete_id)
                total_counts = files.count()
                if not files.exists():
                    return JsonResponse({'message': 'File Doesn\'t Exist'}, status=404)
                files.delete()
                return JsonResponse({'message': 'Deleted Successfully', "count": total_counts})
            else:
                return JsonResponse({'message': 'Invalid Operation'}, status=400)

        except (ValueError, TypeError) as e:
            return JsonResponse({'message': str(e)}, status=500)
        except Exception as e:
            return JsonResponse({'message': 'Internal server error'}, status=500)

    return JsonResponse({'message': 'This request is not available'}, status=500)


@login_required(login_url=FILEHUB_LOGIN_URL)
@csrf_exempt
def upload_file(request):
    if request.method == 'POST':
        try:
            folder_id = request.POST.get('folder_id', None)
            folder_id = folder_id if folder_id else None

            file = request.FILES.get('file', None) or request.POST.get("url", None)
            if not file:
                return JsonResponse({'success': False, 'error': 'No file uploaded'}, status=400)

            folder_instance = None
            if folder_id is not None:
                folder_instance = MediaFolder.objects.get(id=folder_id)
            media_file = FolderManager.upload_to_filemanager(file, folder_instance, request.user)
            return JsonResponse({
                'success': True,
                'message': 'File uploaded successfully',
                'data': file_response_format(media_file, request)
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': f"Unexpected error: {str(e)}"}, status=500)
    else:
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=500)


