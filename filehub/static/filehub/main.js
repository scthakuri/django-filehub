$(document).ready(function () {
    let sortby = "date", sortorder = "desc", searchvalue = "", filterby = "";
    let filesArray = [];
    let hasMoreData = false;
    let currentIndex = 0;
    var clipboard = {
        'empty': true,
        'path': 'full path will come here',
        'mode': 'cut or copy',
        'type': 'file or dir'
    }
    let current_directory_id = "";
    let current_page = 1;
    let contextData = {
        id: 0,
        type: "folder or file",
        name: "File or Folder Name"
    }
    let fileUploadedrefresh = false;
    let selectedFiles = [];

    $('body').tooltip({
        selector: '[data-bs-title]'
    });

    const FILEMANAGER_CONTAINER = $(document).find("#filemanage_container");
    const FILEMANAGER_TREE = $(document).find("#filemanager_tree");
    const CONTEXTMENU = $(document).find(".context_menu");
    const DROPZONE = $(document).find("#fileUploadModal .dropZone");
    const FILELISTS_CONTAINER = $(document).find(".filemanager_files_container");
    const FILELISTS = $(document).find("#fileUploadModal .files-list");
    const PREVIEWMODAL = $(document).find("#previewFileModal");
    const SPINNER_FULL = $(document).find(".spinner.full");
    const FILES_SPINNER = FILEMANAGER_CONTAINER.find(".circleLoading");
    const ADD_FOLDER_MODAL = $(document).find("#addFolderModal");

    $(document).on("change", "[name=sortingOrder]", function () {
        sortorder = $(this).val();
        page = 1;
        reloadData();
    });

    $(document).on("change", "[name=sortingBy]", function () {
        sortby = $(this).val();
        page = 1;
        reloadData();
    });

    $(document).on("change", "[name=filterBy]", function () {
        filterby = $(this).val();
        page = 1;
        reloadData();
    });

    function showMessage(message, type = "success", title = "Success") {
        new Notify({
            title: title,
            text: message,
            autoclose: true,
            autotimeout: 3000,
            status: type
        })
    }

    function checkhasInQuery(name) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.has(name);
        } catch (error) {

        }
        return false;
    }

    function getFromSearchQuery(name) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        } catch (error) {

        }
        return false;
    }

    function handleAjaxError(error) {
        try {
            let message = '';
            try {
                message = error.responseJSON.message;
            } catch (error) {
                message = error.responseText;
            }

            if (message.length > 0) {
                showMessage(message, "error", "Error")
            }
        } catch (error) {
            console.warn(error);
        }
    }

    // Function to recursively render the tree
    function renderTree(dirs, level = 0) {
        const indent = level * 0.9 + 'rem';
        let html = '';

        for (let i = 0; i < dirs.length; i++) {
            const item = dirs[i];
            if (item.children.length > 0) {
                html += `
                    <div 
                        class="list-group-item border-0 collapsed ${item.id == current_directory_id ? "active" : ""}" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#tree-item-${item.id}"
                        style="padding-left:${indent}" aria-level="${level}" aria-expanded="false"
                        data-type="folder"
                        data-fileName="${item.name}"
                        data-id="${item.id}"
                    >
                        <i class="state-icon fa fa-angle-right fa-fw"></i>
                        <i class="item-icon fa fa-folder"></i>
                        <span class="folder">${item.name}</span>
                    </div>
                    <div role="group" class="list-group collapse" id="tree-item-${item.id}">
                `;
                html += renderTree(dirs[i].children, level + 1);
                html += '</div>';
            } else {
                html += `<div 
                    class="list-group-item border-0 ${item.id == current_directory_id ? "active" : ""}" 
                    style="padding-left:${indent}" 
                    aria-level="${level}"

                    data-type="folder"
                    data-fileName="${item.name}"
                    data-id="${item.id}"
                >
                    <i class="state-icon iconSpace">&nbsp;</i>
                    <i class="item-icon fa fa-folder"></i>
                    <span class="folder">${item.name}</span>
                </div>`;
            }
        }

        return html;
    }

    function getFileExt(file) {
        try {
            return file.split(".").pop().toLowerCase();
        } catch (error) {
            return false;
        }
    }

    function isValidImage(file) {
        const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico",];
        const fileExtension = getFileExt(file);
        return imageExtensions.includes(fileExtension);
    }

    function getFileHtml(file, dir_id) {
        let faicon = "faicon";
        let filePreview = '<span class="fm-item-thumbnail fas fa-file"></span>';

        const fileExt = getFileExt(file.name);
        const isImage = isValidImage(file.name);
        if (isImage) {
            faicon = "faimage";
            const getFileURL = FM_MEDIA_URL + encodeURIComponent(file.uri);
            filePreview = `<div class="fm-item-thumbnail" style="background-image:url(${getFileURL})"></div>`;
        } else if (fileExt == 'pdf') {
            filePreview = '<span class="fm-item-thumbnail fas fa-file-pdf"></span>';
        } else if (fileExt == 'doc' || fileExt == 'docx') {
            filePreview = '<span class="fm-item-thumbnail fas fa-file-word"></span>';
        }

        let checkboxHTML = '';
        if (FM_SELECT_FILE && FM_SELECT_MULTIPLE) {
            checkboxHTML = `<div class="form-check">
                <input class="form-check-input fileSelect" data-type="${isImage ? "image" : "file"}" data type="checkbox">
            </div>`;
        }

        return `<div 
            class="fm-folder border fm-item ${faicon}"
            data-type="file"
            data-fileType="child"
            data-fileName="${file.uri}"
            data-id="${file.id}"
            data-ext="${fileExt}"
        >
            ${checkboxHTML}
            ${filePreview}
            <span class="fm-item-title">${file.name}</span>
        </div>`;
    }

    function renderFiles(files) {
        for (let i = 0; i < files.length; i++) {
            FILELISTS_CONTAINER.append(getFileHtml(files[i]));
        }
    }

    function renderBeadcrumb(folders) {
        html = '<li class="breadcrumb-item click" data-folder=""><span class="d-flex align-items-center"><i class="fas fa-home me-1"></i> Home</span></li>';
        for (let i = 0; i < folders.length; i++) {
            if (i + 1 >= folders.length) {
                html += `<li class="breadcrumb-item active"><a>${folders[i].name}</a></li>`;
            } else {
                html += `<li class="breadcrumb-item click" data-folder="${folders[i].id}"><a>${folders[i].name}</a></li>`;
            }
        }
        return html
    }

    function renderFolders(folders) {
        for (let i = 0; i < folders.length; i++) {
            FILELISTS_CONTAINER.append(`
                <div 
                    class="fm-folder fm-item border fafolder"
                    data-type="folder"
                    data-fileType="${folders[i].id === 1 ? "root" : "child"}"
                    data-fileName="${folders[i].name}"
                    data-id="${folders[i].id}"
                >
                    <span class="fm-item-thumbnail fas fa-folder"></span>
                    <span class="fm-item-title">${folders[i].name}</span>
                </div>`);
        }
    }

    function formatSize(size) {
        const kilobyte = 1024;
        const megabyte = kilobyte * 1024;
        const gigabyte = megabyte * 1024;

        if (size >= gigabyte) {
            return (size / gigabyte).toFixed(2) + ' GB';
        } else if (size >= megabyte) {
            return (size / megabyte).toFixed(2) + ' MB';
        } else if (size >= kilobyte) {
            return (size / kilobyte).toFixed(2) + ' KB';
        } else {
            return size + ' bytes';
        }
    }

    function updateFooterStatus() {
        const startUploadFiles = $(".startUploadFiles");
        const clearUploadFiles = $(".clearUploadFiles");
        if (filesArray.length > 0) {
            startUploadFiles.attr("disabled", false);
            clearUploadFiles.attr("disabled", false);
        } else {
            startUploadFiles.attr("disabled", true);
            clearUploadFiles.attr("disabled", true);
        }
    }

    function startUploadingServer() {
        if (currentIndex < filesArray.length) {
            fileUploadedrefresh = true;
            const fileObj = filesArray[currentIndex];
            const file = fileObj.file;
            const ele = fileObj.ele;
            const progressBar = ele.find(".progress-bar");
            const deleteFile = ele.find(".deleteFile");

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder_id', current_directory_id);

            $.ajax({
                url: FM_REQ_URL + "ajax/upload/",
                type: 'POST',
                data: formData,
                contentType: false,
                processData: false,
                beforeSend: function () {
                    deleteFile.html('<i class="fa-solid fa-spinner fa-spin" data-bs-title="Uploading . . ." data-bs-toggle="tooltip"></i>');
                    deleteFile.addClass("noaction");
                    progressBar.removeClass("bg-success bg-danger").addClass("bg-primary");
                },
                xhr: function () {
                    const xhr = new window.XMLHttpRequest();
                    xhr.upload.addEventListener('progress', function (e) {
                        if (e.lengthComputable) {
                            const percent = (e.loaded / e.total) * 100;
                            progressBar.width(percent + '%');
                            progressBar.attr('aria-valuenow', percent);
                        }
                    });
                    return xhr;
                },
                success: function (response) {
                    progressBar.removeClass("bg-primary").addClass("bg-success");
                    deleteFile.html('<i class="fa-solid fa-circle-check text-success" data-bs-title="Upload Successfully" data-bs-toggle="tooltip"></i>');
                },
                error: function (error) {
                    progressBar.removeClass("bg-primary").addClass("bg-danger");
                    deleteFile.html('<i class="fa-solid fa-triangle-exclamation text-danger" data-bs-title="Unable to upload File" data-bs-toggle="tooltip"></i>');
                    deleteFile.attr("data-index", currentIndex);
                },
                complete: function () {
                    currentIndex++;
                    startUploadingServer();
                }
            });
        } else {
            if (fileUploadedrefresh) {
                page = 1;
                reloadData();
            }
        }
    }

    function handleFileUpload(files) {
        for (var i = 0; i < files.length; i++) {
            const file = files[i];

            fileEle = $(`<div class="single-file">
                <div class="fileIcon"><i class="fa-solid fa-file-lines"></i></div>
                <div class="info">
                    <div class="d-flex justify-content-between align-items-center w-100 mb-1">
                        <h4 class="name">${file.name}</h4>
                        <p class="size">${formatSize(file.size)}</p>
                    </div>

                    <div class="progress">
                        <div class="progress-bar progress-bar-striped bg-primary" role="progressbar" style="width: 0%;" aria-valuenow="10" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div>
                <div class="deleteFile"><i class="fa-solid fa-trash" data-bs-title="Remove File" data-bs-toggle="tooltip"></i></div>
            </div>`);

            FILELISTS.append(fileEle);
            filesArray.push({
                file: file,
                ele: fileEle
            });
        }

        updateFooterStatus();
    }

    function refreshDirsFiles() {
        SPINNER_FULL.addClass("show");
        reloadData();
    }

    $(document).on("click", ".addNewUpload", function () {
        $(document).find("#fileUploadModal").modal("show");
    })

    $(document).on("click", "#searchBtn", function () {
        reloadData();
    });

    $(document).on("click", ".startUploadFiles", startUploadingServer);
    $(document).on("click", ".clearUploadFiles", function () {
        filesArray = [];
        updateFooterStatus();
        FILELISTS.html("");
        currentIndex = 0;
    });

    $(document).on("click", ".deleteFile:not(.noaction)", function () {
        const indexToRemove = $(this).data('index');
        $(this).closest(".single-file").slideUp(400, function () {
            $(this).remove();
        });
        filesArray.splice(indexToRemove, 1);
        updateFooterStatus();
    });

    console.log(DROPZONE)
    DROPZONE.on({
        dragover: function (e) {
            e.stopPropagation();
            e.preventDefault();
            $(this).css("border-color", "var(--primary)")
        },
        dragleave: function (e) {
            e.stopPropagation();
            e.preventDefault();
            $(this).css("border-color", "#ccc")
        },
        drop: function (e) {
            e.stopPropagation();
            e.preventDefault();
            $(this).css("border-color", "#ccc")

            const files = e.originalEvent.dataTransfer.files;
            handleFileUpload(files);
        }
    });

    $(document).on("change", "#fileDropRef", function () {
        handleFileUpload(this.files);
        $(this).val("");
    });

    const uploadModal = document.getElementById('fileUploadModal');
    uploadModal.addEventListener('hidden.bs.modal', function () {
        filesArray = [];
        updateFooterStatus();
        FILELISTS.html("");
        currentIndex = 0;

        if (fileUploadedrefresh) {
            refreshDirsFiles()
        }
    });
    $(document).on("click", ".refreshBtn", refreshDirsFiles);

    const addFolderModal = document.getElementById('addFolderModal');
    addFolderModal.addEventListener('hidden.bs.modal', function () {
        $("#addFolderModal").find("input").val("");
        $("#addFolderModal").find(".createNewFolder").attr("data-id", "").text("Create");
        contextData = {
            id: 0,
            name: "",
            type: ""
        }
    });

    const previewFileModal = document.getElementById('previewFileModal');
    previewFileModal.addEventListener('hidden.bs.modal', function () {
        contextData = {
            id: 0,
            name: "",
            type: ""
        }
    });

    $(document).on("click", ".context_menu .rename", function () {
        ADD_FOLDER_MODAL.find(".folderNewName").val(contextData.name);
        ADD_FOLDER_MODAL.find(".createNewFolder").attr("data-id", contextData.id).text("Update");
        ADD_FOLDER_MODAL.modal("show");
    });

    $(document).on("click", ".context_menu .createFolder", function () {
        ADD_FOLDER_MODAL.find(".folderNewName").val("");
        ADD_FOLDER_MODAL.find(".createNewFolder").attr("data-id", "");
        ADD_FOLDER_MODAL.modal("show");
    });

    $(document).on("click", ".context_menu .open", function () {
        if (contextData.type == 'folder') {
            current_directory_id = contextData.id;
            page = 1;
            reloadData();
        } else {
            openFilePreview(contextData.name, contextData.id);
        }
    });

    $(document).on("click", ".context_menu .delete", function () {
        if (confirm("Are you sure want to delete?")) {
            $.ajax({
                url: FM_REQ_URL + "ajax/delete-folder/",
                type: "POST",
                data: {
                    type: contextData.type,
                    delete_id: contextData.id
                },
                dataType: "json",
                beforeSend: function () {
                    FILES_SPINNER.removeClass("d-none");
                },
                success: function (res) {
                    const ele = $(document).find(`.fm-item[data-id=${contextData.id}][data-type=${contextData.type}]`);
                    if (ele.length > 0) {
                        ele.fadeOut("slow", function () {
                            $(this).remove();
                        })
                    }

                    if (contextData.type == 'folder') {
                        const sideEle = $(document).find(`#filemanager_tree [data-id=${contextData.id}]`);
                        if (sideEle.length > 0) {
                            sideEle.fadeOut("slow", function () {
                                $(this).remove();
                            })
                        }
                    }
                    showMessage(res.message, "success", "Removed")
                },
                error: handleAjaxError,
                complete: function () {
                    FILES_SPINNER.addClass("d-none");
                    hideContextMenu();
                }
            });
        }
    });

    function hideContextMenu() {
        CONTEXTMENU.hide();
        contextData = {
            id: 0,
            name: "",
            type: ""
        }
    }

    $(document).on("contextmenu", ".fm-item, .list-group-item", function (e) {
        e.preventDefault();
        contextData = {
            id: $(this).data("id"),
            type: $(this).data("type"),
            name: $(this).data("filename")
        }

        if (contextData.type == 'folder') {
            CONTEXTMENU.find(".createFolder").removeClass("d-none");
            CONTEXTMENU.find(".showURL").addClass("d-none");
        } else {
            CONTEXTMENU.find(".createFolder").addClass("d-none");
            CONTEXTMENU.find(".showURL").removeClass("d-none");
        }

        if (clipboard['empty']) {
            CONTEXTMENU.find(".paste").addClass("d-none");
        } else {
            CONTEXTMENU.find(".paste").removeClass("d-none");
        }

        CONTEXTMENU.css({
            position: "fixed",
            display: "block",
            left: e.pageX,
            top: e.pageY,
        });
    });

    $(document).click(function (e) {
        if (
            !$(e.target).closest('.context_menu').length
            && !$(e.target).closest('#addFolderModal').length
        ) {
            hideContextMenu()
        }
    });

    function openFilePreview(filename, id) {
        if (isValidImage(filename)) {
            const getFileURL = FM_MEDIA_URL + encodeURIComponent(filename);
            const filePreview = `<img style="max-width:100%;" class="w-100 h-auto" src="${getFileURL}" />`;

            PREVIEWMODAL.find(".modal-body").html(filePreview);
            PREVIEWMODAL.modal("show");
        }
    }

    function pluginReplySingle(filename) {
        try {
            const filePath = FM_MEDIA_URL + filename;
            const imageData = `<img style="max-width:100%;" class="img-fluid" src='${filePath}' alt='Image'>`;
            const message = {
                sender: 'filehub',
                html: imageData,
                uri: filePath
            };

            if (checkhasInQuery("callback_fnc")) {
                window.parent.onFileHubCallback(message, getFromSearchQuery("callback_fnc"));
            } else {
                window.parent.postMessage(message);
            }
        } catch (error) {
            console.log(error);
        }
    }

    function pluginReplyMultiple() {
        try {
            let html = '';
            for (let i = 0; i < selectedFiles.length; i++) {
                html += `<img class="img-fluid" src="${selectedFiles[i]}" alt="Image" />`;
            }

            const message = {
                sender: 'filehub',
                urls: selectedFiles,
                html: html
            };

            if (checkhasInQuery("callback_fnc")) {
                window.parent.onFileHubCallback(message, getFromSearchQuery("callback_fnc"));
            } else {
                window.parent.postMessage(message);
            }
        } catch (error) {

        }
    }

    $(document).on("click", ".selectFilesForEmbed", pluginReplyMultiple);

    $(document).on("change", ".fileSelect", function () {
        const ele = $(this).closest(".fm-item");
        const fileURI = FM_MEDIA_URL + ele.data("filename");

        if ($(this).is(":checked")) {
            if (!selectedFiles.includes(fileURI)) {
                selectedFiles.push(fileURI);
            }
        } else {
            const indexToRemove = selectedFiles.indexOf(fileURI);
            if (indexToRemove !== -1) {
                selectedFiles.splice(indexToRemove, 1);
            }
        }
    })

    $(document).on("click", ".fm-item[data-type=file]", function () {
        if (FM_SELECT_FILE) {
            if (FM_SELECT_MULTIPLE) {
                const checkBox = $(this).find("[type=checkbox]");
                checkBox.prop("checked", !checkBox.prop("checked")).trigger("change");
            } else {
                pluginReplySingle($(this).data("filename"));
            }
        } else {
            const filename = $(this).data("filename");
            openFilePreview(filename, $(this).data("id"));
        }
    });

    function openParentIfClosed(ele) {
        var parentFolders = ele.parents('.list-group-item[data-type="folder"]');
        parentFolders.removeClass('collapsed').attr("aria-expanded", true);

        var listGroupFolders = ele.parents('.list-group');
        listGroupFolders.addClass('show');
    }

    $(document).on("click", ".fm-item[data-type=folder]", function () {
        if ($(this).data("id") != current_directory_id) {
            current_directory_id = $(this).data("id");
            current_page = 1;
            reloadData();
        }
    });

    $(document).on("click", "#filemanager_tree .list-group-item", function () {
        if ($(this).data("id") != current_directory_id) {
            current_directory_id = $(this).data("id");
            current_page = 1;
            reloadData();
        }
    });

    $(document).on("click", ".breadcrumb-item.click", function () {
        if ($(this).data("folder") != current_directory_id) {
            current_directory_id = $(this).data("folder");
            page = 1;
            reloadData();
        }
    });

    $(document).on("click", ".redirectToRoot", function () {
        current_directory_id = "";
        page = 1;
        reloadData();
    })

    $(document).on("click", ".createNewFolder", function () {
        const update_id = $(this).data("id");
        const name = $(document).find(".folderNewName").val();

        $.ajax({
            url: FM_REQ_URL + "ajax/new-folder/",
            type: "POST",
            data: {
                update_id: update_id,
                name: name,
                current_dir: contextData.id > 0 ? contextData.id : current_directory_id
            },
            dataType: "json",
            beforeSend: function () {
                FILES_SPINNER.removeClass("d-none");
            },
            success: function (data) {
                if (update_id) {
                    const ele = $(document).find(`.fm-item[data-id=${update_id}]`);
                    if (ele.length > 0) {
                        ele.find(".fm-item-title").text(name);
                    }

                    const sideEle = $(document).find(`#filemanager_tree [data-id=${update_id}]`);
                    if (sideEle.length > 0) {
                        sideEle.find("span.folder").text(name);
                    }
                } else {
                    reloadData();
                }

                showMessage(data.message, "success", update_id > 0 ? "Renamed" : "Created")
            },
            error: handleAjaxError,
            complete: function () {
                FILES_SPINNER.addClass("d-none");
                ADD_FOLDER_MODAL.modal("hide");
                hideContextMenu();
            }
        });
    })

    $(document).on("click", ".addNewFolder", function () {
        ADD_FOLDER_MODAL.modal("show");
    })

    $(document).on("submit", ".filesSearchForm", function (e) {
        e.preventDefault();
        searchvalue = $(".searchFilesInput").val();
        reloadData();
    });

    $('.searchFilesInput').on('search', function () {
        if ($(this).val() === '') {
            searchvalue = "";
            reloadData();
        }
    });

    let loadingData = false;
    function reloadData() {
        $.ajax({
            url: FM_REQ_URL + "ajax/browse/",
            type: "POST",
            data: {
                folder: current_directory_id,
                page: current_page,
                sortby: sortby,
                sortorder: sortorder,
                search: searchvalue,
                filter: filterby
            },
            dataType: "json",
            beforeSend: function () {
                SPINNER_FULL.removeClass("d-none");
                loadingData = true;
            },
            success: function (data) {
                let html = renderTree(data.hiearchy);
                FILEMANAGER_TREE.html(html);

                //generate beadcrumb
                html = renderBeadcrumb(data.breadcrumb)
                $(document).find(".filemanager_content_top ol.breadcrumb").html(html);

                //Render Folder and Files
                if( current_page < 2 ){
                    FILELISTS_CONTAINER.html("");
                }
                renderFolders(data.folders);
                renderFiles(data.files.data);
                hasMoreData = data.files.hasMore

                if (data.folders.length <= 0 && data.files.data.length <= 0) {
                    if (FILELISTS_CONTAINER.find("div").length <= 0) {
                        if (searchvalue.length > 0) {
                            FILELISTS_CONTAINER.html(`<div class="no_files_and_folder_found">
                                <span class="fas fa-folder"></span>
                                <h3>No files and folder found according to your search query.</h3>
                            </div>`);
                        } else {
                            FILELISTS_CONTAINER.html(`<div class="no_files_and_folder_found">
                                <span class="fas fa-folder"></span>
                                <h3>This folder is empty</h3>
                            </div>`);
                        }
                    }
                }

                try {
                    const reqEle = $(document).find(`#filemanager_tree .list-group-item[data-id=${current_directory_id}]`);
                    reqEle.addClass("active");

                    if (reqEle.hasClass("collapsed")) {
                        reqEle.removeClass("collapsed").attr("aria-expanded", true);
                        const targetGroupID = reqEle.attr("data-bs-target");
                        $(document).find(targetGroupID).removeClass("collapse")
                    }

                    openParentIfClosed(reqEle);
                } catch (error) {

                }
            },
            error: handleAjaxError,
            complete: function () {
                SPINNER_FULL.removeClass("show");
                FILES_SPINNER.addClass("d-none");
                hideContextMenu();
                fileUploadedrefresh = false;
                loadingData = false;
            }
        });
    }

    reloadData();
    $(window).scroll(function () {
        if ($(window).scrollTop() + $(window).height() >= $(document).height() - 1000) {
            if( hasMoreData && !loadingData ){
                current_page++;
                reloadData();
            }
        }
    });

    $(document).on("click", ".openMenuBar", function () {
        const filemanager_sidebar = $(document).find("#filemanager_sidebar");
        filemanager_sidebar.toggleClass("d-block");
    });
});