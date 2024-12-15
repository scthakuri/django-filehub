$(document).ready(function () {
    let sortby = "date", sortorder = "desc", searchvalue = "", filterby = "";
    let filesArray = [];
    let files_list = [];
    let folders_list = [];

    let hasMoreData = false;
    let currentIndex = 0;
    const clipboard = {
        'empty': true,
        'path': 'full path will come here',
        'mode': 'cut or copy',
        'type': 'file or dir'
    };
    let current_directory_id = "";
    let current_page = 1;
    let contextData = {
        id: 0,
        type: "folder or file",
        name: "File or Folder Name"
    }
    let fileUploadedrefresh = false;
    let selectedFiles = [];
    let selectedToDeleteFiles = [];
    let page = 1;

    $('body').tooltip({
        selector: '[data-bs-title]'
    });

    const FILEMANAGER_CONTAINER = $(document).find("#filemanage_container");
    const FILEMANAGER_TREE = $(document).find("#filemanager_tree");
    const CONTEXTMENU = $(document).find(".context_menu");
    const FILELISTS_CONTAINER = $(document).find(".filemanager_files_container");
    const FILELISTS = $(document).find("#fileUploadModal .files-list");
    const PREVIEWMODAL = $(document).find("#previewFileModal");
    const SPINNER_FULL = $(document).find(".spinner.full");
    const FILES_SPINNER = FILEMANAGER_CONTAINER.find(".circleLoading");
    const ADD_FOLDER_MODAL = $(document).find("#addFolderModal");
    const FILE_URL_MODAL = $(document).find("#showFileModal");
    const FILE_INFO_MODAL = $(document).find("#infoFileModal");

    $(document).on("change", "[name=sortingOrder]", function () {
        sortorder = $(this).val();
        page = 1;
        reloadData()
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
            let message;
            try {
                message = error.responseJSON.message;
            } catch (error) {
                message = error.responseText;
            }

            if (message) {
                showMessage(message, "error", "Error")
            } else {
                showMessage("Unable to perform action!!!", "error", "Error")
            }
        } catch (error) {
            showMessage("Unable to perform action!!!", "error", "Error")
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
                        class="list-group-item border-0 collapsed ${item.id === current_directory_id ? "active" : ""}" 
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
                    class="list-group-item border-0 ${item.id === current_directory_id ? "active" : ""}" 
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

    function getFileHtml(file) {
        let faicon = "faicon";
        let filePreview = '<span class="fm-item-thumbnail fas fa-file"></span>';

        const fileExt = getFileExt(file.name);
        const isImage = isValidImage(file.name);
        if (isImage) {
            faicon = "faimage";
            const getFileURL = file.uri;
            filePreview = `<div class="fm-item-thumbnail" style="background-image:url(${getFileURL})"></div>`;
        } else if (fileExt === 'pdf') {
            filePreview = '<span class="fm-item-thumbnail fas fa-file-pdf"></span>';
        } else if (fileExt === 'doc' || fileExt === 'docx') {
            filePreview = '<span class="fm-item-thumbnail fas fa-file-word"></span>';
        }

        let checkboxHTML = '';
        if (FM_SELECT_FILE) {
            checkboxHTML = `<div class="form-check">
                <input class="form-check-input fileSelect" name="file_select" data-type="${isImage ? "image" : "file"}" type="${FM_SELECT_MULTIPLE ? 'checkbox' : 'radio'}">
            </div>`;
        }

        return `<div 
            class="fm-folder border fm-item ${faicon}"
            data-type="file"
            data-fileType="child"
            data-fileName="${file.basename}"
            data-id="${file.id}"
            data-ext="${fileExt}"
        >
            ${checkboxHTML}
            ${filePreview}
            <span class="fm-item-title">${file.display_name}</span>
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

    const FILE_UPLOAD_CORNER_NOTI = $(document).find(".file_uloading_corner_notification");

    function handleBodyDragUpload(files) {
        FILE_UPLOAD_CORNER_NOTI.addClass("uploading");
        const progressBar = FILE_UPLOAD_CORNER_NOTI.find(".progress-bar");

        function uploadFile(index) {
            if (index >= files.length) {
                FILE_UPLOAD_CORNER_NOTI.removeClass("uploading");
                return;
            }

            const file = files[index];
            FILE_UPLOAD_CORNER_NOTI.find(".name").text(file.name);
            FILE_UPLOAD_CORNER_NOTI.find(".size").text(`${index + 1}/${files.length}`);

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
                    const file = response.data;

                    const singleOrMultiple = FM_SELECT_FILE ? FM_SELECT_MULTIPLE ? "checkbox" : "radio" : "checkbox";
                    const newFileElement = $(`<div class="fm-folder border fm-item faimage" data-type="file" data-filetype="child" data-filename="${file.basename}" data-id="${file.id}" data-ext="${file.extension}">
                        <div class="form-check">
                            <input class="form-check-input fileSelect" name="file_select" data-type="image" type="${singleOrMultiple}">
                        </div>
                        <div class="fm-item-thumbnail" style="background-image:url(${file.uri})"></div>
                        <span class="fm-item-title">${file.display_name}</span>
                    </div>`);

                    const folders = FILELISTS_CONTAINER.find(".fm-folder[data-type=folder]");
                    if (folders.length > 0) {
                        folders.last().after(newFileElement);
                    } else {
                        FILELISTS_CONTAINER.prepend(newFileElement);
                    }
                    progressBar.removeClass("bg-primary").addClass("bg-success");
                    files_list.push(file);
                },
                error: function () {
                    showMessage(`Unable to upload file: ${file.name}`, "error", "Error");
                },
                complete: function () {
                    uploadFile(index + 1);
                }
            });
        }

        uploadFile(0);
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
                success: function () {
                    progressBar.removeClass("bg-primary").addClass("bg-success");
                    deleteFile.html('<i class="fa-solid fa-circle-check text-success" data-bs-title="Upload Successfully" data-bs-toggle="tooltip"></i>');
                },
                error: function () {
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
        let fileEle;
        for (let i = 0; i < files.length; i++) {
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

    const BODY_DRAGGING_ELE = $(document).find(".body_dragging");
    $(document.body).on('dragover dragenter', function (event) {
        event.preventDefault();
        $(document.body).addClass("dragover");
    });

    BODY_DRAGGING_ELE.on('dragleave', function (event) {
        $(document.body).removeClass('dragover');
    });

    BODY_DRAGGING_ELE.on('drop', function (event) {
        event.preventDefault();
        $(document.body).removeClass('dragover');

        const files = event.originalEvent.dataTransfer.files;
        if ($(document).find("#fileUploadModal").hasClass('show')) {
            handleFileUpload(files);
        } else {
            handleBodyDragUpload(files);
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
        const addFolderModalEle = $(document).find("#addFolderModal")
        addFolderModalEle.find("input").val("");
        addFolderModalEle.find(".createNewFolder").attr("data-id", "").text("Create");
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
        ADD_FOLDER_MODAL.find(".folderNewName").val(contextData.basename);
        ADD_FOLDER_MODAL.find(".createNewFolder")
            .attr("data-id", contextData.id)
            .attr("data-type", contextData.type)
            .text("Update");
        ADD_FOLDER_MODAL.modal("show");
        hideContextMenu();
    });

    $(document).on("click", ".context_menu .showURL", function () {
        if (contextData.type === "file") {
            FILE_URL_MODAL.find("input").val(contextData.url);
            FILE_URL_MODAL.find("a").attr("href", contextData.url);
            FILE_URL_MODAL.modal("show");
            hideContextMenu();
        }
    });

    $(document).on("click", ".context_menu .info", function () {
        FILE_INFO_MODAL.find(".modal-title").text(contextData.type === "file" ? "File Information" : "Folder Information");
        FILE_INFO_MODAL.find(".fileName").text(contextData.name);

        const fileDimensionEle = FILE_INFO_MODAL.find(".fileDimensions");
        if (contextData?.width && contextData?.height) {
            fileDimensionEle.text(`${contextData.width}x${contextData.height}`);
            fileDimensionEle.closest("tr").removeClass("d-none");
        } else {
            fileDimensionEle.closest("tr").addClass("d-none");
        }
        FILE_INFO_MODAL.find(".fileSize").text(formatSize(contextData.size));
        if (contextData.type === "file") {
            FILE_INFO_MODAL.find(".filePath").text(contextData.uri);
            FILE_INFO_MODAL.find(".fileURL").html(`<a href="${contextData.url}" target="_blank">${contextData.url}</a>`);
            FILE_INFO_MODAL.find(".fileURL, .filePath").closest("tr").removeClass("d-none");
        } else {
            FILE_INFO_MODAL.find(".fileURL, .filePath").closest("tr").addClass("d-none");
        }
        FILE_INFO_MODAL.find(".fileCreated").text(contextData.uploaded_at);
        FILE_INFO_MODAL.find(".fileModified").text(contextData.modify_date);

        FILE_INFO_MODAL.modal("show");
        hideContextMenu();
    });

    FILE_INFO_MODAL[0].addEventListener("bs.modal.hide", function () {
        FILE_INFO_MODAL.find(".fileName, .fileDimensions, .fileSize, .filePath, .fileURL, .fileCreated, .fileModified").html("");
    })

    document.getElementById("showFileModal").addEventListener('hidden.bs.modal', function () {
        FILE_URL_MODAL.find("input").val("");
        FILE_URL_MODAL.find("a").attr("href", "#");
    });

    $(document).on("click", ".context_menu .createFolder", function () {
        contextData["createFolder"] = "menu";
        ADD_FOLDER_MODAL.find(".folderNewName").val("");
        ADD_FOLDER_MODAL.find(".createNewFolder").attr("data-id", "");
        ADD_FOLDER_MODAL.modal("show");
    });

    $(document).on("click", ".context_menu .open", function () {
        if (contextData.type === 'folder') {
            current_directory_id = contextData.id;
            page = 1;
            reloadData();
        } else {
            openFilePreview(contextData.url);
        }
    });

    $(document).on("click", ".deleteFiles", function () {
        const btn = $(this);
        if (confirm("Are you sure want to delete?")) {
            $.ajax({
                url: FM_REQ_URL + "ajax/delete/",
                type: "POST",
                data: {
                    type: "file",
                    delete_id: selectedToDeleteFiles
                },
                dataType: "json",
                beforeSend: function () {
                    FILES_SPINNER.removeClass("d-none");
                },
                success: function (res) {
                    selectedToDeleteFiles.forEach((item) => {
                        const ele = $(document).find(`.fm-item[data-id=${item}][data-type=file]`);
                        if (ele.length > 0) {
                            ele.fadeOut("slow", function () {
                                $(this).remove();
                            })
                        }
                    });
                    selectedToDeleteFiles = [];
                    showMessage(res.message, "success", "Removed")
                },
                error: handleAjaxError,
                complete: function () {
                    FILES_SPINNER.addClass("d-none");
                    btn.addClass("d-none");
                }
            });
        }
    })

    $(document).on("click", ".context_menu .delete", function () {
        if (confirm("Are you sure want to delete?")) {
            const delete_type = contextData.type;
            const delete_id = contextData.id;

            hideContextMenu();

            $.ajax({
                url: FM_REQ_URL + "ajax/delete/",
                type: "POST",
                data: {
                    type: delete_type,
                    delete_id: [delete_id]
                },
                dataType: "json",
                beforeSend: function () {
                    FILES_SPINNER.removeClass("d-none");
                },
                success: function (res) {
                    const ele = $(document).find(`.fm-item[data-id=${delete_id}][data-type=${delete_type}]`);
                    if (ele.length > 0) {
                        ele.fadeOut("slow", function () {
                            $(this).remove();
                        })
                        const fileIndex = files_list.findIndex((item) => item.id === delete_id);
                        if (fileIndex !== -1) {
                            files_list.splice(fileIndex, 1);
                        }

                        const folderIndex = folders_list.findIndex((item) => item.id === delete_id);
                        if (folderIndex !== -1) {
                            folders_list.splice(folderIndex, 1);
                        }
                    }

                    if (delete_type === 'folder') {
                        const sideEle = $(document).find(`#filemanager_tree [data-id=${delete_id}]`);
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
        const fileType = $(this).data("type");
        const id = $(this).data("id");
        contextData = {
            type: fileType,
            id: id,
            name: $(this).data("filename")
        }
        if (fileType === "file") {
            const file = files_list.filter((item) => item.id === id);
            if (file.length > 0) {
                contextData = {...contextData, ...file[0]};
            } else {
                return false;
            }
        } else {
            const folder = folders_list.filter((item) => item.id === id);
            if (folder.length > 0) {
                contextData = {...contextData, ...folder[0]};
            } else {
                return false;
            }
        }

        if (contextData.type === 'folder') {
            CONTEXTMENU.find(".createFolder").removeClass("d-none");
            CONTEXTMENU.find(".showURL").addClass("d-none");
            CONTEXTMENU.find(".download").addClass("d-none");
            CONTEXTMENU.find(".filedivider").addClass("d-none");
        } else {
            CONTEXTMENU.find(".createFolder").addClass("d-none");
            CONTEXTMENU.find(".showURL").removeClass("d-none");
            CONTEXTMENU.find(".download").removeClass("d-none");
            CONTEXTMENU.find(".filedivider").removeClass("d-none");
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

    function openFilePreview(filename) {
        if (isValidImage(filename)) {
            const filePreview = `<img alt="Image" style="max-width:100%;" class="w-100 h-auto" src="${filename}" />`;

            PREVIEWMODAL.find(".modal-body").html(filePreview);
            PREVIEWMODAL.modal("show");
        }
    }

    PREVIEWMODAL[0].addEventListener('hidden.bs.modal', function () {
        PREVIEWMODAL.find(".modal-body").html("");
    })

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
            let message = {
                sender: "filehub",
                html: "",
                files: selectedFiles,
                file: selectedFiles[0]
            }
            for (let i = 0; i < selectedFiles.length; i++) {
                message["html"] += `<img class="img-fluid" src="${selectedFiles[i].uri}" alt="Image" />`;
            }

            if (checkhasInQuery("callback_fnc")) {
                window.parent.onFileHubCallback(message, getFromSearchQuery("callback_fnc"));
            } else {
                window.parent.postMessage(message);
            }
        } catch (error) {

        }
    }

    $(document).on("click", ".selectFilesForEmbed", pluginReplyMultiple);

    function updateDeleteButton() {
        const deleteBtn = $(document).find(".deleteFiles");
        if (deleteBtn.length > 0) {
            if (selectedToDeleteFiles.length > 0) {
                deleteBtn.removeClass("d-none");
            } else {
                deleteBtn.addClass("d-none");
            }
        }
    }

    updateDeleteButton();

    $(document).on("change", ".fileSelect", function () {
        const ele = $(this).closest(".fm-item");
        const fileID = parseInt(ele.attr("data-id"));
        const fileIndex = files_list.findIndex((item) => item.id === fileID);

        if (fileIndex !== -1) {
            if (FM_SELECT_FILE && !FM_SELECT_MULTIPLE) {
                if ($(this).is(":checked")) {
                    selectedFiles.length = 0;
                    selectedToDeleteFiles.length = 0;
                    selectedFiles.push(files_list[fileIndex]);
                    selectedToDeleteFiles.push(fileID);
                } else {
                    const indexToRemove = selectedFiles.findIndex((item) => item.id === fileID);
                    if (indexToRemove !== -1) selectedFiles.splice(indexToRemove, 1);

                    const indexIDToRemove = selectedToDeleteFiles.indexOf(fileID);
                    if (indexIDToRemove !== -1) selectedToDeleteFiles.splice(indexIDToRemove, 1);
                }
            } else {
                if ($(this).is(":checked")) {
                    if (!selectedFiles.some(file => file.id === fileID)) {
                        selectedFiles.push(files_list[fileIndex]);
                        selectedToDeleteFiles.push(fileID);
                    }
                } else {
                    const indexToRemove = selectedFiles.findIndex((item) => item.id === fileID);
                    if (indexToRemove !== -1) selectedFiles.splice(indexToRemove, 1);

                    const indexIDToRemove = selectedToDeleteFiles.indexOf(fileID);
                    if (indexIDToRemove !== -1) selectedToDeleteFiles.splice(indexIDToRemove, 1);
                }
            }
            
            updateDeleteButton();
        }
    });


    $(document).on("click", ".fm-item[data-type=file]", function (event) {
        if (!$(event.target).is(":checkbox")) {
            const filename = $(this).data("filename");
            openFilePreview(filename, $(this).data("id"));
        }
    });

    function openParentIfClosed(ele) {
        const parentFolders = ele.parents('.list-group-item[data-type="folder"]');
        parentFolders.removeClass('collapsed').attr("aria-expanded", true);

        const listGroupFolders = ele.parents('.list-group');
        listGroupFolders.addClass('show');
    }

    $(document).on("click", ".fm-item[data-type=folder]", function () {
        if ($(this).data("id") !== current_directory_id) {
            current_directory_id = $(this).data("id");
            current_page = 1;
            reloadData();
        }
    });

    $(document).on("click", "#filemanager_tree .list-group-item", function () {
        if ($(this).data("id") !== current_directory_id) {
            current_directory_id = $(this).data("id");
            current_page = 1;
            reloadData();
        }
    });

    $(document).on("click", ".breadcrumb-item.click", function () {
        if ($(this).data("folder") !== current_directory_id) {
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
        const file_type = $(this).data("type");
        const name = $(document).find(".folderNewName").val();

        const btn = $(this);
        const btnHTML = btn.html();

        $.ajax({
            url: FM_REQ_URL + "ajax/folder/",
            type: "POST",
            data: {
                update_id: update_id,
                name: name,
                current_dir: contextData.id > 0 ? contextData.id : current_directory_id,
                file_type: file_type
            },
            dataType: "json",
            beforeSend: function () {
                FILES_SPINNER.removeClass("d-none");
                btn.prop("disabled", true).html('<i class="fa fa-spinner fa-spin"></i> Processing . . .');
            },
            success: function (data) {
                ADD_FOLDER_MODAL.modal("hide");
                const folder = data.data;

                if (update_id) {
                    const ele = $(document).find(`.fm-item[data-id=${update_id}]`);
                    if (ele.length > 0) {
                        ele.find(".fm-item-title").text(folder.display_name);
                        const fileIndex = files_list.findIndex(f => f.id === update_id);
                        if (fileIndex !== -1) {
                            files_list[fileIndex] = folder;
                        }
                    }

                    const sideEle = $(document).find(`#filemanager_tree [data-id=${update_id}]`);
                    if (sideEle.length > 0) {
                        sideEle.find("span.folder").text(folder.display_name);
                        const folderIndex = folders_list.findIndex(f => f.id === update_id);
                        if (folderIndex !== -1) {
                            folders_list[folderIndex] = folder;
                        }
                    }
                } else {
                    FILELISTS_CONTAINER.prepend(`
                        <div 
                            class="fm-folder fm-item border fafolder"
                            data-type="folder"
                            data-fileType="child"
                            data-fileName="${folder.basename}"
                            data-id="${folder.id}"
                        >
                            <span class="fm-item-thumbnail fas fa-folder"></span>
                            <span class="fm-item-title">${folder.display_name}</span>
                        </div>`);
                    folders_list.push(folder);

                    if (current_directory_id) {
                        if (contextData?.createFolder === "menu") {
                            reloadData();
                        } else {
                            const sideEle = $(document).find(`#filemanager_tree [data-id=${current_directory_id}]`);
                            if (sideEle.length > 0) {
                                sideEle.next().prepend(`<div class="list-group-item border-0 " style="padding-left:0;" aria-level="1" data-type="folder" data-filename="${folder.basename}" data-id="${folder.id}">
                                    <i class="state-icon iconSpace">&nbsp;</i>
                                    <i class="item-icon fa fa-folder"></i>
                                    <span class="folder">${folder.display_name}</span>
                                </div>`);
                            }
                        }
                    } else {
                        if (contextData?.createFolder === "menu") {
                            reloadData();
                        } else {
                            FILEMANAGER_TREE.prepend(`<div class="list-group-item border-0 " style="padding-left:0;" aria-level="0" data-type="folder" data-filename="${folder.basename}" data-id="${folder.id}">
                                <i class="state-icon iconSpace">&nbsp;</i>
                                <i class="item-icon fa fa-folder"></i>
                                <span class="folder">${folder.display_name}</span>
                            </div>`);
                        }
                    }
                }

                showMessage(data.message, "success", update_id > 0 ? "Renamed" : "Created")
            },
            error: handleAjaxError,
            complete: function () {
                FILES_SPINNER.addClass("d-none");
                ADD_FOLDER_MODAL.modal("hide");
                hideContextMenu();
                btn.prop("disabled", false).html(btnHTML);
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

    function reloadData(initial = true) {
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
                if (!initial) {
                    FILES_SPINNER.removeClass("d-none");
                } else {
                    SPINNER_FULL.addClass("show");
                }
                loadingData = true;
            },
            success: function (data) {
                let html = renderTree(data.hiearchy);
                FILEMANAGER_TREE.html(html);

                //generate beadcrumb
                html = renderBeadcrumb(data.breadcrumb)
                $(document).find(".filemanager_content_top ol.breadcrumb").html(html);

                //Render Folder and Files
                if (current_page < 2) {
                    FILELISTS_CONTAINER.html("");
                }
                renderFolders(data.folders);
                renderFiles(data.files.data);
                hasMoreData = data.files.hasMore

                files_list = page === 1 ? data.files.data : [...files_list, ...data.files.data];
                folders_list = page === 1 ? data.folders : [...folders_list, ...data.folders];

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

    reloadData(true);
    const filemanager_files = $('#filemanager_files');
    filemanager_files.scroll(function () {
        if (filemanager_files.scrollTop() + filemanager_files.height() >= filemanager_files[0].scrollHeight - 1000) {
            if (hasMoreData && !loadingData) {
                current_page++;
                reloadData(false);
            }
        }
    });

    $(document).on("click", ".openMenuBar", function () {
        const filemanager_sidebar = $(document).find("#filemanager_sidebar");
        filemanager_sidebar.toggleClass("d-block");
    });
});
