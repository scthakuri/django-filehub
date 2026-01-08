import os
from django.http import JsonResponse
from django.shortcuts import render
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.db.models import Q

from filehub.models import MediaFolder, MediaFile
from filehub.core import FolderManager
from filehub.settings import (
    MEDIA_URL, FILES_SORTING, FILES_SORTING_ORDER, FILE_TYPE_CATEGORIES,
    FILEHUB_LOGIN_URL, FILEHUB_THEME_COLOR, FILEMANAGER_VERSION,
    FILEHUB_AUTO_CLOSE_UPLOAD_MODAL
)
from filehub.utils import file_response_format, folder_response_format, sanitize_allowed_extensions


def _context_base(select_files=True, select_multiple=True, file_picker=False, file_exts=None, cleaner_mode=False):
    """Return the common template context for all FileHub views."""
    return {
        "media_url": MEDIA_URL,
        "sorting": {"order": FILES_SORTING_ORDER, "sort": FILES_SORTING},
        "allowed_exts": FILE_TYPE_CATEGORIES,
        "select_files": str(select_files).lower(),
        "select_multiple": str(select_multiple).lower(),
        "file_picker": file_picker,
        "theme_color": FILEHUB_THEME_COLOR,
        "version": FILEMANAGER_VERSION,
        "file_exts": file_exts or [],
        "cleaner_mode": cleaner_mode,
        "auto_close_upload_modal": "true" if FILEHUB_AUTO_CLOSE_UPLOAD_MODAL else "false",
    }


def get_folder_hierarchy(parent_folder=None):
    """Recursively build the folder hierarchy starting from the given parent."""
    folders = MediaFolder.objects.filter(parent=parent_folder).order_by("folder_name")
    return [
        {
            "id": f.id,
            "name": f.folder_name,
            "path": f.get_relative_path(),
            "uri": f.get_relative_path(),
            "children": get_folder_hierarchy(f),
        }
        for f in folders
    ]


def get_folders(parent_folder=None, sortby="name", sortorder="asc", search=None, request=None):
    """Return a list of folders, sorted and optionally filtered by search query."""
    sort_prefix = "" if sortorder == "asc" else "-"
    if request and getattr(request.user, "is_authenticated", False):
        folders = MediaFolder.get_accessible_folders(request.user, parent_folder)
    else:
        folders = MediaFolder.objects.filter(parent=parent_folder)

    if search:
        folders = folders.filter(Q(folder_name__icontains=search))

    if sortby == "name":
        folders = folders.order_by(f"{sort_prefix}folder_name")
    elif sortby == "date":
        folders = folders.order_by(f"{sort_prefix}modify_date")

    result = [folder_response_format(f, request) for f in folders]
    if sortby == "size":
        result = sorted(result, key=lambda x: x["size"], reverse=(sortorder == "desc"))
    return result


def get_files(page=1, folder=None, sortby="name", sortorder="asc", search=None, filter_by=None, request=None):
    """Return a paginated and formatted list of files for a given folder."""
    sort_prefix = "" if sortorder == "asc" else "-"
    sort_map = {"name": "file_name", "date": "modify_date", "size": "file_size"}
    sort_field = sort_map.get(sortby, "file_name")

    if request and getattr(request.user, "is_authenticated", False):
        all_files = MediaFile.get_accessible_files(request.user, folder)
    else:
        all_files = MediaFile.objects.filter(folder=folder)

    if filter_by:
        all_files = all_files.filter(file_type=filter_by)
    if search:
        all_files = all_files.filter(Q(file_name__icontains=search))

    paginator = Paginator(all_files.order_by(f"{sort_prefix}{sort_field}"), 49)

    try:
        current_page = paginator.page(page)
    except (PageNotAnInteger, EmptyPage):
        current_page = paginator.page(1)

    return {
        "hasMore": current_page.has_next(),
        "data": [file_response_format(f, request) for f in current_page.object_list if f],
    }


@login_required(login_url=FILEHUB_LOGIN_URL)
def browser_view(request):
    """Render the main FileHub browser view."""
    return render(request, "filehub/filehub_list.html", context=_context_base())


@login_required(login_url=FILEHUB_LOGIN_URL)
def browser_select(request):
    """Render the FileHub view for file selection (picker) mode."""
    file_exts = sanitize_allowed_extensions(request.GET.getlist("file_ext", []))
    multiple = request.GET.get("multiple", "false").lower() == "true"
    return render(
        request,
        "filehub/filehub_list.html",
        context=_context_base(file_picker=True, select_multiple=multiple, file_exts=file_exts),
    )


@login_required(login_url=FILEHUB_LOGIN_URL)
def file_cleaner_view(request):
    """Render the file cleaner view for removing unused or orphaned files."""
    return render(request, "filehub/file_cleaner.html", context=_context_base(cleaner_mode=True))


@login_required(login_url=FILEHUB_LOGIN_URL)
@csrf_exempt
def clear_selected_files(request):
    """Delete selected files and folders via POST request."""
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid request method"}, status=400)

    file_ids = request.POST.getlist("file_ids[]", [])
    folder_ids = request.POST.getlist("folder_ids[]", [])
    if not file_ids and not folder_ids:
        return JsonResponse({"success": False, "message": "No files or folders selected"}, status=400)

    cleared_files = MediaFile.objects.filter(id__in=file_ids).count()
    MediaFile.objects.filter(id__in=file_ids).delete()

    cleared_folders = MediaFolder.objects.filter(id__in=folder_ids).count()
    MediaFolder.objects.filter(id__in=folder_ids).delete()

    return JsonResponse({
        "success": True,
        "message": f"Cleared {cleared_files} files and {cleared_folders} folders",
        "cleared_files": cleared_files,
        "cleared_folders": cleared_folders,
    })


@login_required(login_url=FILEHUB_LOGIN_URL)
@csrf_exempt
def browser_ajax(request):
    """Handle AJAX requests for listing folders and files with pagination and sorting."""
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid request method"}, status=400)

    try:
        folder_id = request.POST.get("folder")
        folder = MediaFolder.objects.filter(id=folder_id).first() if folder_id else None
        breadcrumb = folder.get_breadcrumb() if folder else {}

        folders = get_folders(folder, request.POST.get("sortby", "name"), request.POST.get("sortorder", "asc"),
                              request.POST.get("search"), request)
        files = get_files(
            page=request.POST.get("page", 1),
            folder=folder,
            sortby=request.POST.get("sortby", "name"),
            sortorder=request.POST.get("sortorder", "asc"),
            search=request.POST.get("search"),
            filter_by=request.POST.get("filter"),
            request=request,
        )

        return JsonResponse({
            "success": True,
            "message": "Data fetched successfully",
            "hiearchy": get_folder_hierarchy(),
            "folders": folders,
            "files": files,
            "folder": folder_id,
            "page": request.POST.get("page", 1),
            "breadcrumb": breadcrumb,
        })

    except (ValueError, TypeError) as e:
        return JsonResponse({"success": False, "message": str(e)}, status=400)
    except Exception as e:
        return JsonResponse({"success": False, "message": "Internal server error", "error": str(e)}, status=500)


@method_decorator([csrf_exempt, login_required(login_url=FILEHUB_LOGIN_URL)], name="dispatch")
class NewFolderView(View):
    """Create or rename folders and files."""

    def post(self, request, *args, **kwargs):
        """Handle POST request for creating or renaming a folder or file."""
        file_type = request.POST.get("file_type", "folder")
        try:
            return (
                self._handle_folder_request(request)
                if file_type == "folder"
                else self._handle_file_request(request)
            )
        except MediaFolder.DoesNotExist:
            return JsonResponse({"success": False, "message": "Folder does not exist"}, status=404)
        except MediaFile.DoesNotExist:
            return JsonResponse({"success": False, "message": "File does not exist"}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=400)

    def _handle_folder_request(self, request):
        """Handle folder create or rename request."""
        update_id = request.POST.get("update_id")
        name = request.POST.get("name")
        if not name:
            return JsonResponse({"success": False, "message": "Folder name is required"}, status=400)

        if update_id:
            folder = MediaFolder.objects.get(id=update_id)
            folder.folder_name = name
            folder.save()
            return JsonResponse({
                "success": True,
                "message": "Folder renamed successfully",
                "data": folder_response_format(folder, request),
            })

        parent_id = request.POST.get("current_dir")
        parent = MediaFolder.objects.filter(id=parent_id).first() if parent_id else None
        if MediaFolder.objects.filter(folder_name=name, parent=parent).exists():
            return JsonResponse({"success": False, "message": "Folder already exists"}, status=400)

        new_folder = MediaFolder(folder_name=name, parent=parent, upload_by=request.user)
        new_folder.save()
        FolderManager.create_folder(new_folder)
        return JsonResponse({
            "success": True,
            "message": "Folder created successfully",
            "data": folder_response_format(new_folder, request),
        })

    def _handle_file_request(self, request):
        """Handle file rename request."""
        update_id = request.POST.get("update_id")
        name = request.POST.get("name")

        if not update_id or not name:
            return JsonResponse({"success": False, "message": "Missing required fields"}, status=400)

        file_obj = MediaFile.objects.get(id=update_id)
        base, ext = os.path.splitext(file_obj.file_name)
        file_obj.file_name = f"{name}{ext}"
        FolderManager.rename_file(file_obj, file_obj)
        file_obj.save()
        return JsonResponse({
            "success": True,
            "message": "File renamed successfully",
            "data": file_response_format(file_obj, request),
        })

    def get(self, request, *args, **kwargs):
        """Reject GET requests for this view."""
        return JsonResponse({"success": False, "message": "GET not allowed"}, status=400)


@login_required(login_url=FILEHUB_LOGIN_URL)
@csrf_exempt
def delete_folder(request):
    """Delete folders or files by ID list."""
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid request method"}, status=400)

    delete_ids = request.POST.getlist("delete_id[]", [])
    if not delete_ids:
        return JsonResponse({"success": False, "message": "No IDs provided"}, status=400)

    file_type = request.POST.get("type", "folder")
    model = MediaFolder if file_type == "folder" else MediaFile
    qs = model.objects.filter(id__in=delete_ids)

    if not qs.exists():
        return JsonResponse({"success": False, "message": f"{file_type.title()} does not exist"}, status=404)

    count = qs.count()
    qs.delete()
    return JsonResponse({"success": True, "message": f"Deleted {count} {file_type}(s) successfully"})


@login_required(login_url=FILEHUB_LOGIN_URL)
@csrf_exempt
def upload_file(request):
    """Upload a new file into the specified folder."""
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid request method"}, status=400)

    folder_id = request.POST.get("folder_id")
    file = request.FILES.get("file") or request.POST.get("url")

    if not file:
        return JsonResponse({"success": False, "message": "No file uploaded"}, status=400)

    try:
        folder = MediaFolder.objects.filter(id=folder_id).first() if folder_id else None
        media_file = FolderManager.upload_to_filemanager(file, folder, request.user)
        return JsonResponse({
            "success": True,
            "message": "File uploaded successfully",
            "data": file_response_format(media_file, request),
        })
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=400)
