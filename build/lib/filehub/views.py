from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from filehub.models import MediaFolder, MediaFile
from django.shortcuts import render
from filehub.core import FolderManager
from filehub.settings import MEDIA_URL, FILES_SORTING, FILES_SORTING_ORDER, FILE_TYPE_CATEGORIES
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Q
from django.contrib.auth.decorators import login_required


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


def get_folders(parent_folder=None, sortby="name", sortorder="asc", search=None):
    sortorderFinal = '' if sortorder == 'asc' else '-'
    folders = MediaFolder.objects.filter(parent=parent_folder)

    if search is not None:
        folders = folders.filter(Q(folder_name__icontains=search))

    if sortby == 'name':
        folders = folders.order_by(f"{sortorderFinal}folder_name")
    elif sortby == 'date':
        folders = folders.order_by(f"{sortorderFinal}modify_date")

    output = []
    for folder in folders:
        total_size = folder.get_size()
        output.append({
            'id': folder.id,
            "name": folder.folder_name,
            "size": total_size,
            "uri": folder.get_relative_path()
        })

    if sortby == 'size':
        output = sorted(output, key=lambda x: x['size'], reverse=(sortorder == 'desc'))

    return output


def get_files(page=1, folder=None, sortby="name", sortorder="asc", search=None, filter_by=None):
    sortorderFinal = '' if sortorder == 'asc' else '-'

    items_per_page = 50
    all_files = MediaFile.objects.filter(folder=folder)

    if filter_by is not None:
        all_files = all_files.filter(file_type=filter_by)

    if search is not None:
        all_files = all_files.filter(Q(file_name__icontains=search))

    if sortby == 'name':
        all_files = all_files.order_by(f"{sortorderFinal}file_name")
    elif sortby == 'date':
        all_files = all_files.order_by(f"{sortorderFinal}modify_date")
    elif sortby == 'size':
        all_files = all_files.order_by(f"{sortorderFinal}file_size")

    paginator = Paginator(all_files, items_per_page)

    try:
        current_page = paginator.page(page)
    except PageNotAnInteger:
        current_page = paginator.page(1)
    except EmptyPage:
        current_page = paginator.page(paginator.num_pages)

    output = []
    for file in current_page.object_list:
        if file is not None:
            output.append({
                'id': file.id,
                "name": file.file_name,
                "uri": file.get_relative_path()
            })

    return {
        "hasMore": current_page.has_next(),
        "data": output
    }


@login_required(login_url="/user/login/")
def BrowserView(request):
    context = {
        "media_url": MEDIA_URL,
        "sorting": {
            "order": FILES_SORTING_ORDER,
            "sort": FILES_SORTING
        },
        "allowed_exts": FILE_TYPE_CATEGORIES,
        "select_files": "false",
        "select_multiple": "false"
    }
    return render(request, "filehub/filehub_list.html", context=context)


@login_required(login_url="/user/login/")
def BrowserSelect(request):
    context = {
        "media_url": MEDIA_URL,
        "sorting": {
            "order": FILES_SORTING_ORDER,
            "sort": FILES_SORTING
        },
        "allowed_exts": FILE_TYPE_CATEGORIES,
        "select_files": "true",
        "select_multiple": request.GET.get("multiple", "false")
    }
    return render(request, "filehub/filehub_list.html", context=context)


@login_required(login_url="/user/login/")
@csrf_exempt
def BrowserAjax(request):
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
            folders = get_folders(folder_id, sortby, sortorder, search)
            files = get_files(page, folder_id, sortby, sortorder, search, filter_by)

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
        except Exception:
            return JsonResponse({'message': 'Internal server error'}, status=500)

    return JsonResponse({'message': 'This request is not available'}, status=500)


@login_required(login_url="/user/login/")
@csrf_exempt
def NewFolder(request):
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

                new_folder = MediaFolder(folder_name=name, parent=current_dir, upload_by=request.user)
                FolderManager.create_folder(new_folder)
                new_folder.save()
                return JsonResponse({'message': 'New folder created successfully.'})

        except Exception as e:
            return JsonResponse({'message': str(e)}, status=500)

    return JsonResponse({'message': 'This request is not available'}, status=500)


@login_required(login_url="/user/login/")
@csrf_exempt
def DeleteFolder(request):
    if request.method == 'POST':
        try:
            delete_id = request.POST.get("delete_id", None)
            delete_id = delete_id if delete_id else None

            file_type = request.POST.get("type", None)
            file_type = file_type if file_type else "folder"

            if file_type == "folder":
                try:
                    folder = MediaFolder.objects.get(id=delete_id)
                    folder.delete()
                    return JsonResponse({'message': 'Deleted Successfully'})
                except MediaFolder.DoesNotExist:
                    return JsonResponse({'message': 'Folder Doesn\'t Exists'}, status=500)
            else:
                try:
                    folder = MediaFile.objects.get(id=delete_id)
                    folder.delete()
                    return JsonResponse({'message': 'Deleted Successfully'})
                except MediaFolder.DoesNotExist:
                    return JsonResponse({'message': 'File Doesn\'t Exists'}, status=500)

        except (ValueError, TypeError) as e:
            return JsonResponse({'message': str(e)}, status=500)
        except Exception:
            return JsonResponse({'message': 'Internal server error'}, status=500)

    return JsonResponse({'message': 'This request is not available'}, status=500)


@login_required(login_url="/user/login/")
@csrf_exempt
def UploadFile(request):
    if request.method == 'POST':
        try:
            folder_id = request.POST.get('folder_id', None)
            folder_id = folder_id if folder_id else None

            file = request.FILES.get('file')

            folder_instance = None
            if folder_id is not None:
                folder_instance = MediaFolder.objects.get(id=folder_id)

            (file_size, file_name) = FolderManager.upload_file(file, folder_instance)
            file_type = FolderManager.get_file_category(file_name)

            MediaFile.objects.create(
                file_name=file_name,
                folder=folder_instance,
                file_type=file_type,
                file_size=file_size,
                upload_by=request.user
            )

            return JsonResponse({'success': True, 'message': 'File uploaded successfully'})

        except Exception as e:
            return JsonResponse({'success': False, 'error': f"Unexpected error: {str(e)}"}, status=500)
    else:
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=500)