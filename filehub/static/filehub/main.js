/**
 * File Manager Application
 * A comprehensive file management system with upload, preview, and organization features
 */
class FileManager {
    /**
     * Initialize the FileManager with default configuration
     */
    constructor() {
        this.state = {
            sortby: "date",
            sortorder: "desc",
            searchvalue: "",
            filterby: "",
            filesArray: [],
            files_list: [],
            folders_list: [],
            hasMoreData: false,
            currentIndex: 0,
            current_directory_id: "",
            current_page: 1,
            contextData: {id: 0, type: "folder or file", name: "File or Folder Name"},
            editorObject: {},
            fileUploadedrefresh: false,
            selectedFiles: [],
            selectedToDeleteFiles: [],
            loadingData: false
        };

        this.elements = this.cacheElements();
        this.lazyload = null;
        this.imageEditor = null;

        this.init();
    }

    /**
     * Cache all frequently used DOM elements for better performance
     * @returns {Object} Object containing cached jQuery elements
     */
    cacheElements() {
        return {
            body: $('body'),
            document: $(document),
            container: $("#filemanage_container"),
            tree: $("#filemanager_tree"),
            contextMenu: $(".context_menu"),
            filesContainer: $(".filemanager_files_container"),
            filesList: $("#fileUploadModal .files-list"),
            previewModal: $("#previewFileModal"),
            spinnerFull: $(".spinner.full"),
            filesSpinner: $("#filemanage_container").find(".circleLoading"),
            addFolderModal: $("#addFolderModal"),
            fileUrlModal: $("#showFileModal"),
            fileInfoModal: $("#infoFileModal"),
            uploadNotification: $(".file_uloading_corner_notification"),
            sidebar: $("#filemanager_sidebar"),
            filesScroll: $('#filemanager_files')
        };
    }

    /**
     * Initialize all components and event listeners
     */
    init() {
        this.initializePlugins();
        this.bindEvents();
        this.setupModalListeners();
        this.loadInitialData();
    }

    /**
     * Initialize third-party plugins (LazyLoad and Image Editor)
     */
    initializePlugins() {
        this.lazyload = new LazyLoad({
            callback_error: (element) => {
                element.setAttribute("style", `background-image: url(${element.getAttribute("data-original")})`);
            }
        });

        this.imageEditor = new tui.ImageEditor('#tui-image-editor', {
            includeUI: {
                initMenu: "filter", menuBarPosition: "left"
            }
        });

        window.onresize = () => {
            this.imageEditor.ui.resizeEditor();
        };

        this.elements.body.tooltip({selector: '[data-bs-title]'});
    }

    /**
     * Bind all event listeners for user interactions
     */
    bindEvents() {
        this.elements.document.on("change", "[name=sortingOrder]", (e) => this.handleSortOrderChange(e));
        this.elements.document.on("change", "[name=sortingBy]", (e) => this.handleSortByChange(e));
        this.elements.document.on("change", "[name=filterBy]", (e) => this.handleFilterChange(e));
        this.elements.document.on("click", "#searchBtn", () => this.reloadData());
        this.elements.document.on("submit", ".filesSearchForm", (e) => this.handleSearchSubmit(e));
        $('.searchFilesInput').on('search', () => this.handleSearchClear());
        this.elements.document.on("click", ".addNewUpload", () => this.showUploadModal());
        this.elements.document.on("click", ".addNewUrl", () => this.showUrlUploadModal());
        this.elements.document.on("click", ".finalUploadURL", (e) => this.handleUrlUpload(e));
        this.elements.document.on("change", "#fileDropRef", (e) => this.handleFileInputChange(e));
        this.elements.document.on("click", ".startUploadFiles", () => this.startUploadingServer());
        this.elements.document.on("click", ".clearUploadFiles", () => this.clearUploadQueue());
        this.elements.document.on("click", ".deleteFile:not(.noaction)", (e) => this.removeFileFromQueue(e));
        this.setupDragAndDrop();
        this.elements.document.on("click", ".fm-item[data-type=folder]", (e) => this.handleFolderClick(e));
        this.elements.document.on("click", "#filemanager_tree .list-group-item", (e) => this.handleTreeItemClick(e));
        this.elements.document.on("click", ".breadcrumb-item.click", (e) => this.handleBreadcrumbClick(e));
        this.elements.document.on("click", ".redirectToRoot", () => this.navigateToRoot());
        this.elements.document.on("change", ".fileSelect", (e) => this.handleFileSelection(e));
        this.elements.document.on("click", ".fm-item[data-type=file]", (e) => this.handleFileItemClick(e));
        this.elements.document.on("click", ".selectFilesForEmbed", () => this.embedSelectedFiles());
        this.elements.document.on("contextmenu", ".fm-item, .list-group-item", (e) => this.handleContextMenu(e));
        this.elements.document.on("contextmenu", "#filemanager_sidebar, #filemanager_content", (e) => this.handleWindowContextMenu(e));
        this.elements.document.click((e) => this.handleDocumentClick(e));
        this.bindContextMenuActions();
        this.elements.document.on("click", ".addNewFolder", () => this.showAddFolderModal());
        this.elements.document.on("click", ".createNewFolder", (e) => this.handleFolderCreate(e));
        this.elements.document.on("click", ".refreshBtn", () => this.refreshData());
        this.elements.document.on("click", ".deleteFiles", (e) => this.deleteSelectedFiles(e));
        this.elements.document.on("click", ".openMenuBar", () => this.toggleSidebar());
        this.elements.filesScroll.scroll(() => this.handleScroll());
    }

    /**
     * Bind all context menu action events
     */
    bindContextMenuActions() {
        this.elements.document.on("click", ".context_menu .selectall", () => this.handleSelectAll());
        this.elements.document.on("click", ".context_menu .rename", () => this.handleRename());
        this.elements.document.on("click", ".context_menu .showURL", () => this.handleShowUrl());
        this.elements.document.on("click", ".context_menu .info", () => this.handleShowInfo());
        this.elements.document.on("click", ".context_menu .createFolder", () => this.handleContextCreateFolder());
        this.elements.document.on("click", ".context_menu .edit", () => this.handleEditImage());
        this.elements.document.on("click", ".context_menu .open", () => this.handleContextOpen());
        this.elements.document.on("click", ".context_menu .delete", () => this.handleContextDelete());
        this.elements.document.on("click", ".ie_saveAsNew", () => this.saveImageAsNew());
        this.elements.document.on("click", ".ie_replaceExisting", () => this.replaceExistingImage());
    }

    /**
     * Setup modal event listeners for cleanup on hide
     */
    setupModalListeners() {
        document.getElementById('fileUploadModal').addEventListener('hidden.bs.modal', () => {
            this.clearUploadQueue();
            if (this.state.fileUploadedrefresh) {
                this.refreshData();
            }
        });

        document.getElementById('addFolderModal').addEventListener('hidden.bs.modal', () => {
            this.resetFolderModal();
        });

        document.getElementById('previewFileModal').addEventListener('hidden.bs.modal', () => {
            this.elements.previewModal.find(".modal-body").html("");
            this.resetContextData();
        });

        document.getElementById('showFileModal').addEventListener('hidden.bs.modal', () => {
            this.elements.fileUrlModal.find("input").val("");
            this.elements.fileUrlModal.find("a").attr("href", "#");
        });

        this.elements.fileInfoModal[0].addEventListener('hidden.bs.modal', () => {
            this.elements.fileInfoModal.find(".fileName, .fileDimensions, .fileSize, .filePath, .fileURL, .fileCreated, .fileModified").html("");
        });
    }

    /**
     * Setup drag and drop functionality for file uploads
     */
    setupDragAndDrop() {
        const bodyDragging = $(".body_dragging");

        $(document.body).on('dragover dragenter', (e) => {
            e.preventDefault();
            $(document.body).addClass("dragover");
        });

        bodyDragging.on('dragleave', () => {
            $(document.body).removeClass('dragover');
        });

        bodyDragging.on('drop', (e) => {
            e.preventDefault();
            $(document.body).removeClass('dragover');

            const files = e.originalEvent.dataTransfer.files;
            if ($("#fileUploadModal").hasClass('show')) {
                this.handleFileUpload(files);
            } else {
                this.handleBodyDragUpload(files);
            }
        });
    }

    /**
     * Handle sort order change event
     */
    handleSortOrderChange(e) {
        this.state.sortorder = $(e.target).val();
        this.state.current_page = 1;
        this.reloadData();
    }

    /**
     * Handle sort by change event
     */
    handleSortByChange(e) {
        this.state.sortby = $(e.target).val();
        this.state.current_page = 1;
        this.reloadData();
    }

    /**
     * Handle filter change event
     */
    handleFilterChange(e) {
        this.state.filterby = $(e.target).val();
        this.state.current_page = 1;
        this.reloadData();
    }

    /**
     * Handle search form submission
     */
    handleSearchSubmit(e) {
        e.preventDefault();
        this.state.searchvalue = $(".searchFilesInput").val();
        this.reloadData();
    }

    /**
     * Handle search input clear
     */
    handleSearchClear() {
        if ($('.searchFilesInput').val() === '') {
            this.state.searchvalue = "";
            this.reloadData();
        }
    }

    /**
     * Display toast notification message
     */
    showMessage(message, type = "success", title = "Success") {
        const colors = {
            success: {bg: "#28a745", loader: "#218838"},
            error: {bg: "#dc3545", loader: "#c82333"},
            info: {bg: "#17a2b8", loader: "#117a8b"}
        };

        const color = colors[type] || colors.info;

        $.toast({
            text: message,
            heading: title,
            showHideTransition: 'fade',
            allowToastClose: true,
            hideAfter: 3000,
            stack: 5,
            position: 'top-right',
            bgColor: color.bg,
            textColor: '#ffffff',
            textAlign: 'left',
            loader: true,
            loaderBg: color.loader
        });
    }

    /**
     * Handle AJAX errors and display appropriate messages
     */
    handleAjaxError(error) {
        try {
            let message;
            try {
                message = error.responseJSON.message;
            } catch (e) {
                message = error.responseText;
            }

            if (message) {
                this.showMessage(message, "error", "Error");
            } else {
                this.showMessage("Unable to perform action!!!", "error", "Error");
            }
        } catch (e) {
            this.showMessage("Unable to perform action!!!", "error", "Error");
        }
    }

    /**
     * Get URL query parameter value
     */
    getQueryParam(name) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if URL has specific query parameter
     */
    hasQueryParam(name) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.has(name);
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate if string is a valid HTTP/HTTPS URL
     */
    isValidHttpUrl(passedUrl) {
        try {
            const url = new URL(passedUrl);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) {
            return false;
        }
    }

    /**
     * Get file extension from filename
     */
    getFileExt(file) {
        try {
            return file.split(".").pop().toLowerCase();
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if file is a valid image format
     */
    isValidImage(file) {
        const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico"];
        const fileExtension = this.getFileExt(file);
        return imageExtensions.includes(fileExtension);
    }

    /**
     * Format file size in human-readable format
     */
    formatSize(size) {
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

    /**
     * Check if file extension can be selected based on configuration
     */
    canSelectFile(ext) {
        if (FM_SELECT_FILE) {
            if (FM_SELECT_EXTS_ONLY.length > 0) {
                return FM_SELECT_EXTS_ONLY.includes(ext);
            }
            return true;
        }
        return false;
    }

    /**
     * Generate HTML for a single file item
     */
    getFileHtml(file) {
        let faicon = "faicon";
        let filePreview = '<span class="fm-item-thumbnail hgi hgi-stroke hgi-file-02"></span>';

        const fileExt = this.getFileExt(file.name);
        const isImage = this.isValidImage(file.name);

        if (isImage) {
            faicon = "faimage";
            filePreview = `<div class="fm-item-thumbnail lazy" data-original="${file.url}" data-bg="${file.thumbnail}"></div>`;
        } else if (fileExt === 'pdf') {
            filePreview = '<span class="fm-item-thumbnail hgi hgi-stroke hgi-pdf-01"></span>';
        } else if (fileExt === 'doc' || fileExt === 'docx') {
            filePreview = '<span class="fm-item-thumbnail hgi hgi-stroke hgi-document-attachment"></span>';
        }

        let checkboxHTML = '';
        const canChooseFile = FM_SELECT_FILE && this.canSelectFile(fileExt);

        if (canChooseFile) {
            checkboxHTML = `<div class="form-check">
                <input class="form-check-input fileSelect" name="file_select" data-type="${isImage ? "image" : "file"}" type="${FM_SELECT_MULTIPLE ? 'checkbox' : 'radio'}">
            </div>`;
        }

        return `<div 
            class="fm-folder border fm-item ${faicon} ${canChooseFile ? '' : 'disabled'}"
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

    /**
     * Render files to the UI
     */
    renderFiles(files) {
        files.forEach(file => {
            this.elements.filesContainer.append(this.getFileHtml(file));
        });
    }

    /**
     * Generate breadcrumb HTML
     */
    renderBreadcrumb(folders) {
        try {
            let html = '<li class="breadcrumb-item click" data-folder=""><span class="d-flex align-items-center"><i class="hgi hgi-stroke hgi-home-01 me-2"></i> Home</span></li>';

            folders.forEach((folder, index) => {
                if (index + 1 >= folders.length) {
                    html += `<li class="breadcrumb-item active"><a>${folder.name}</a></li>`;
                } else {
                    html += `<li class="breadcrumb-item click" data-folder="${folder.id}"><a>${folder.name}</a></li>`;
                }
            });

            return html;
        } catch {

        }
    }

    /**
     * Render folders to the UI
     */
    renderFolders(folders) {
        folders.forEach(folder => {
            this.elements.filesContainer.append(`
                <div 
                    class="fm-folder fm-item border fafolder"
                    data-type="folder"
                    data-fileType="${folder.id === 1 ? "root" : "child"}"
                    data-fileName="${folder.name}"
                    data-id="${folder.id}"
                >
                    <span class="fm-item-thumbnail hgi hgi-stroke hgi-folder-02"></span>
                    <span class="fm-item-title">${folder.name}</span>
                </div>`);
        });
    }

    /**
     * Recursively render folder tree structure
     */
    renderTree(dirs, level = 0) {
        const indent = level * 0.9 + 'rem';
        let html = '';

        dirs.forEach(item => {
            const isActive = item.id === this.state.current_directory_id ? "active" : "";

            if (item.children.length > 0) {
                html += `
                    <div 
                        class="list-group-item border-0 collapsed ${isActive}" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#tree-item-${item.id}"
                        style="padding-left:${indent}" aria-level="${level}" aria-expanded="false"
                        data-type="folder"
                        data-fileName="${item.name}"
                        data-id="${item.id}"
                    >
                        <i class="state-icon hgi hgi-stroke hgi-arrow-right-01"></i>
                        <i class="item-icon hgi hgi-stroke hgi-folder-02"></i>
                        <span class="folder">${item.name}</span>
                    </div>
                    <div role="group" class="list-group collapse" id="tree-item-${item.id}">
                        ${this.renderTree(item.children, level + 1)}
                    </div>`;
            } else {
                html += `<div 
                    class="list-group-item border-0 ${isActive}" 
                    style="padding-left:${indent}" 
                    aria-level="${level}"
                    data-type="folder"
                    data-fileName="${item.name}"
                    data-id="${item.id}"
                >
                    <i class="state-icon iconSpace">&nbsp;</i>
                    <i class="item-icon hgi hgi-stroke hgi-folder-02"></i>
                    <span class="folder">${item.name}</span>
                </div>`;
            }
        });

        return html;
    }

    /**
     * Handle file upload from input or drag-drop
     */
    handleFileUpload(files) {
        Array.from(files).forEach(file => {
            const fileEle = $(`<div class="single-file">
                <div class="fileIcon">
                    <i class="hgi hgi-stroke hgi-file-upload"></i>
                </div>
                <div class="info">
                    <div class="d-flex justify-content-between align-items-center w-100 mb-1">
                        <h4 class="name">${file.name}</h4>
                        <p class="size">${this.formatSize(file.size)}</p>
                    </div>
                    <div class="progress">
                        <div class="progress-bar progress-bar-striped bg-primary" role="progressbar" style="width: 0;" aria-valuenow="10" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div>
                <div class="deleteFile"><i class="hgi hgi-stroke hgi-delete-02" data-bs-title="Remove File" data-bs-toggle="tooltip"></i></div>
            </div>`);

            this.elements.filesList.append(fileEle);
            this.state.filesArray.push({file, ele: fileEle});
        });

        this.updateFooterStatus();
    }

    /**
     * Handle drag-drop upload directly to body
     */
    handleBodyDragUpload(files) {
        this.elements.uploadNotification.addClass("uploading");
        const progressBar = this.elements.uploadNotification.find(".progress-bar");
        let currentIndex = 0;

        const uploadFile = () => {
            if (currentIndex >= files.length) {
                this.elements.uploadNotification.removeClass("uploading");
                return;
            }

            const file = files[currentIndex];
            this.elements.uploadNotification.find(".name").text(file.name);
            this.elements.uploadNotification.find(".size").text(`${currentIndex + 1}/${files.length}`);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder_id', this.state.current_directory_id);

            $.ajax({
                url: FM_REQ_URL + "ajax/upload/",
                type: 'POST',
                data: formData,
                contentType: false,
                processData: false,
                beforeSend: () => {
                    progressBar.removeClass("bg-success bg-danger").addClass("bg-primary");
                },
                xhr: () => {
                    const xhr = new window.XMLHttpRequest();
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            const percent = (e.loaded / e.total) * 100;
                            progressBar.width(percent + '%').attr('aria-valuenow', percent);
                        }
                    });
                    return xhr;
                },
                success: (response) => {
                    this.handleUploadedFile(response.data);
                    progressBar.removeClass("bg-primary").addClass("bg-success");
                },
                error: () => {
                    this.showMessage(`Unable to upload file: ${file.name}`, "error", "Error");
                },
                complete: () => {
                    currentIndex++;
                    uploadFile();
                }
            });
        };

        uploadFile();
    }

    /**
     * Start uploading files from queue to server
     */
    startUploadingServer() {
        if (this.state.currentIndex < this.state.filesArray.length) {
            this.state.fileUploadedrefresh = true;
            const fileObj = this.state.filesArray[this.state.currentIndex];
            const file = fileObj.file;
            const ele = fileObj.ele;
            const progressBar = ele.find(".progress-bar");
            const deleteFile = ele.find(".deleteFile");

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder_id', this.state.current_directory_id);

            $.ajax({
                url: FM_REQ_URL + "ajax/upload/",
                type: 'POST',
                data: formData,
                contentType: false,
                processData: false,
                beforeSend: () => {
                    deleteFile.html('<i class="fa-solid fa-spinner fa-spin" data-bs-title="Uploading . . ." data-bs-toggle="tooltip"></i>');
                    deleteFile.addClass("noaction");
                    progressBar.removeClass("bg-success bg-danger").addClass("bg-primary");
                },
                xhr: () => {
                    const xhr = new window.XMLHttpRequest();
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            const percent = (e.loaded / e.total) * 100;
                            progressBar.width(percent + '%').attr('aria-valuenow', percent);
                        }
                    });
                    return xhr;
                },
                success: () => {
                    progressBar.removeClass("bg-primary").addClass("bg-success");
                    deleteFile.html('<i class="hgi hgi-stroke hgi-tick-double-04 text-success" data-bs-title="Upload Successfully" data-bs-toggle="tooltip"></i>');
                },
                error: () => {
                    progressBar.removeClass("bg-primary").addClass("bg-danger");
                    deleteFile.html('<i class="hgi hgi-stroke hgi-alert-01 text-danger" data-bs-title="Unable to upload File" data-bs-toggle="tooltip"></i>');
                    deleteFile.attr("data-index", this.state.currentIndex);
                },
                complete: () => {
                    this.state.currentIndex++;
                    this.startUploadingServer();
                }
            });
        } else {
            if (this.state.fileUploadedrefresh) {
                this.state.current_page = 1;
                this.reloadData();
            }
            if (FM_AUTO_CLOSE_UPLOAD_MODAL) {
                $("#fileUploadModal").modal("hide");
            }
        }
    }

    /**
     * Handle uploaded file response and add to UI
     */
    handleUploadedFile(file) {
        const singleOrMultiple = FM_SELECT_FILE ? FM_SELECT_MULTIPLE ? "checkbox" : "radio" : "checkbox";
        const newFileElement = $(`<div class="fm-folder border fm-item faimage" data-type="file" data-filetype="child" data-filename="${file.basename}" data-id="${file.id}" data-ext="${file.extension}">
            <div class="form-check">
                <input class="form-check-input fileSelect" name="file_select" data-type="image" type="${singleOrMultiple}">
            </div>
            <div class="fm-item-thumbnail" style="background-image:url(${file.uri})"></div>
            <span class="fm-item-title">${file.display_name}</span>
        </div>`);

        const folders = this.elements.filesContainer.find(".fm-folder[data-type=folder]");
        if (folders.length > 0) {
            folders.last().after(newFileElement);
        } else {
            this.elements.filesContainer.prepend(newFileElement);
        }

        this.state.files_list.push(file);
    }

    /**
     * Handle URL upload submission
     */
    handleUrlUpload(e) {
        const modal = $("#uploadURLModal");
        const url = modal.find("input").val();

        if (!this.isValidHttpUrl(url)) {
            this.showMessage("Invalid URL", "error", "Error");
            return false;
        }

        const btn = $(e.target);
        const btnHtml = btn.html();

        $.ajax({
            url: FM_REQ_URL + "ajax/upload/", type: 'POST', data: {url}, beforeSend: () => {
                btn.prop("disabled", true).html('<i class="fa fa-spinner fa-spin"></i> Uploading . . .');
            }, success: (response) => {
                this.handleUploadedFile(response.data);
                modal.modal("hide");
            }, error: () => {
                this.showMessage(`Unable to upload URL`, "error", "Error");
            }, complete: () => {
                btn.prop("disabled", false).html(btnHtml);
            }
        });
    }

    /**
     * Update upload footer button states based on files in queue
     */
    updateFooterStatus() {
        const startUploadFiles = $(".startUploadFiles");
        const clearUploadFiles = $(".clearUploadFiles");

        if (this.state.filesArray.length > 0) {
            startUploadFiles.attr("disabled", false);
            clearUploadFiles.attr("disabled", false);
        } else {
            startUploadFiles.attr("disabled", true);
            clearUploadFiles.attr("disabled", true);
        }
    }

    /**
     * Clear all files from upload queue
     */
    clearUploadQueue() {
        this.state.filesArray = [];
        this.updateFooterStatus();
        this.elements.filesList.html("");
        this.state.currentIndex = 0;
    }

    /**
     * Remove a single file from upload queue
     */
    removeFileFromQueue(e) {
        const indexToRemove = $(e.target).data('index');
        $(e.target).closest(".single-file").slideUp(400, function () {
            $(this).remove();
        });
        this.state.filesArray.splice(indexToRemove, 1);
        this.updateFooterStatus();
    }

    /**
     * Handle file input change event
     */
    handleFileInputChange(e) {
        this.handleFileUpload(e.target.files);
        $(e.target).val("");
    }

    /**
     * Show upload modal
     */
    showUploadModal() {
        $("#fileUploadModal").modal("show");
    }

    /**
     * Show URL upload modal
     */
    showUrlUploadModal() {
        $("#uploadURLModal").find("input").val("");
        $("#uploadURLModal").modal("show");
    }

    /**
     * Show add folder modal
     */
    showAddFolderModal() {
        this.elements.addFolderModal.modal("show");
    }

    /**
     * Reset folder modal to initial state
     */
    resetFolderModal() {
        this.elements.addFolderModal.find("input").val("");
        this.elements.addFolderModal.find(".createNewFolder").attr("data-id", "").text("Create");
        this.resetContextData();
    }

    /**
     * Reset context data to default values
     */
    resetContextData() {
        this.state.contextData = {
            id: 0, name: "", type: ""
        };
    }

    /**
     * Handle folder click navigation
     */
    handleFolderClick(e) {
        const folderId = $(e.currentTarget).data("id");
        if (folderId !== this.state.current_directory_id) {
            this.state.current_directory_id = folderId;
            this.state.current_page = 1;
            this.reloadData();
        }
    }

    /**
     * Handle tree item click navigation
     */
    handleTreeItemClick(e) {
        const folderId = $(e.currentTarget).data("id");
        if (folderId !== this.state.current_directory_id) {
            this.state.current_directory_id = folderId;
            this.state.current_page = 1;
            this.reloadData();
        }
    }

    /**
     * Handle breadcrumb click navigation
     */
    handleBreadcrumbClick(e) {
        const folderId = $(e.currentTarget).data("folder");
        if (folderId !== this.state.current_directory_id) {
            this.state.current_directory_id = folderId;
            this.state.current_page = 1;
            this.reloadData();
        }
    }

    /**
     * Navigate to root directory
     */
    navigateToRoot() {
        this.state.current_directory_id = "";
        this.state.current_page = 1;
        this.reloadData();
    }

    /**
     * Handle file selection change
     */
    handleFileSelection(e) {
        const ele = $(e.target).closest(".fm-item");
        const fileID = parseInt(ele.attr("data-id"));
        const fileIndex = this.state.files_list.findIndex(item => item.id === fileID);

        if (fileIndex !== -1) {
            if (FM_SELECT_FILE && !FM_SELECT_MULTIPLE) {
                if ($(e.target).is(":checked")) {
                    this.state.selectedFiles = [];
                    this.state.selectedToDeleteFiles = [];
                    this.state.selectedFiles.push(this.state.files_list[fileIndex]);
                    this.state.selectedToDeleteFiles.push(fileID);
                } else {
                    const indexToRemove = this.state.selectedFiles.findIndex(item => item.id === fileID);
                    if (indexToRemove !== -1) this.state.selectedFiles.splice(indexToRemove, 1);

                    const indexIDToRemove = this.state.selectedToDeleteFiles.indexOf(fileID);
                    if (indexIDToRemove !== -1) this.state.selectedToDeleteFiles.splice(indexIDToRemove, 1);
                }
            } else {
                if ($(e.target).is(":checked")) {
                    if (!this.state.selectedFiles.some(file => file.id === fileID)) {
                        this.state.selectedFiles.push(this.state.files_list[fileIndex]);
                        this.state.selectedToDeleteFiles.push(fileID);
                    }
                } else {
                    const indexToRemove = this.state.selectedFiles.findIndex(item => item.id === fileID);
                    if (indexToRemove !== -1) this.state.selectedFiles.splice(indexToRemove, 1);

                    const indexIDToRemove = this.state.selectedToDeleteFiles.indexOf(fileID);
                    if (indexIDToRemove !== -1) this.state.selectedToDeleteFiles.splice(indexIDToRemove, 1);
                }
            }

            this.updateDeleteButton();
        }
    }

    /**
     * Handle file item click to toggle checkbox
     */
    handleFileItemClick(event) {
        const checkbox = $(event.currentTarget).find(".fileSelect");
        if (!$(event.target).is(":checkbox") && checkbox.length > 0) {
            checkbox.prop("checked", !checkbox.prop("checked")).trigger("change");
        }
    }

    /**
     * Update delete button visibility based on selected files
     */
    updateDeleteButton() {
        const deleteBtn = $(".deleteFiles");
        if (deleteBtn.length > 0) {
            if (this.state.selectedToDeleteFiles.length > 0) {
                deleteBtn.removeClass("d-none");
            } else {
                deleteBtn.addClass("d-none");
            }
        }
    }

    /**
     * Delete selected files
     */
    deleteSelectedFiles(e) {
        const btn = $(e.target);
        if (confirm("Are you sure want to delete?")) {
            $.ajax({
                url: FM_REQ_URL + "ajax/delete/", type: "POST", data: {
                    type: "file", delete_id: this.state.selectedToDeleteFiles
                }, dataType: "json", beforeSend: () => {
                    this.elements.filesSpinner.removeClass("d-none");
                }, success: (res) => {
                    this.state.selectedToDeleteFiles.forEach(item => {
                        const ele = $(`.fm-item[data-id=${item}][data-type=file]`);
                        if (ele.length > 0) {
                            ele.fadeOut("slow", function () {
                                $(this).remove();
                            });
                        }
                    });
                    this.state.selectedToDeleteFiles = [];
                    this.showMessage(res.message, "success", "Removed");
                }, error: (error) => this.handleAjaxError(error), complete: () => {
                    this.elements.filesSpinner.addClass("d-none");
                    btn.addClass("d-none");
                }
            });
        }
    }

    /**
     * Handle context menu display
     */
    handleContextMenu(e) {
        e.preventDefault();
        e.stopPropagation();
        this.handleContextMenuAction(e, $(e.currentTarget));
    }

    /**
     * Handle window context menu display
     */
    handleWindowContextMenu(e) {
        e.preventDefault();
        this.handleContextMenuAction(e, $(e.currentTarget));
    }

    /**
     * Handle document click to hide context menu
     */
    handleDocumentClick(e) {
        if (!$(e.target).closest('.context_menu').length && !$(e.target).closest('#addFolderModal').length) {
            this.hideContextMenu();
        }
    }

    /**
     * Build and display context menu based on target element
     */
    handleContextMenuAction(e, $this) {
        const fileType = $this.data("type") ?? "window";
        const id = $this.data("id") ?? 0;

        this.state.contextData = {
            type: fileType, id: id, name: $this.data("filename") ?? "window"
        };

        if (fileType === "file") {
            const file = this.state.files_list.filter(item => item.id === id);
            if (file.length > 0) {
                this.state.contextData = {...this.state.contextData, ...file[0]};
            } else {
                return false;
            }
        } else if (fileType === "folder") {
            const folder = this.state.folders_list.filter(item => item.id === id);
            if (folder.length > 0) {
                this.state.contextData = {...this.state.contextData, ...folder[0]};
            } else {
                return false;
            }
        }

        this.elements.contextMenu.find(".dropdown-item").removeClass("d-none");
        this.elements.contextMenu.find(".paste").addClass("d-none");

        if (this.state.selectedToDeleteFiles.length > 0) {
            this.elements.contextMenu.find(".selectall").html("<i class=\"hgi hgi-stroke hgi-check-unread-02\"></i> Unselect All");
        } else {
            this.elements.contextMenu.find(".selectall").html("<i class=\"hgi hgi-stroke hgi-tick-double-04\"></i> Select All");
        }

        if (fileType === 'folder') {
            this.elements.contextMenu.find(".createFolder").removeClass("d-none");
            this.elements.contextMenu.find(".showURL, .download, .filedivider, .edit").addClass("d-none");
        } else if (fileType === 'file') {
            this.elements.contextMenu.find(".createFolder").addClass("d-none");
            this.elements.contextMenu.find(".showURL, .download, .filedivider").removeClass("d-none");
            if (this.state.contextData?.category === "images") {
                this.elements.contextMenu.find(".edit").removeClass("d-none");
            } else {
                this.elements.contextMenu.find(".edit").addClass("d-none");
            }
        } else {
            this.elements.contextMenu.find(".createFolder").removeClass("d-none");
            this.elements.contextMenu.find(".open, .rename, .edit, .download, .filedivider, .showURL").addClass("d-none");

            if (fileType === "window" && this.state.current_directory_id === "") {
                this.elements.contextMenu.find(".delete, .info, .dropdown-divider").addClass("d-none");
            }
        }

        this.elements.contextMenu.css({
            position: "fixed", display: "block", left: e.pageX, top: e.pageY
        });
    }

    /**
     * Hide context menu and reset context data
     */
    hideContextMenu() {
        this.elements.contextMenu.hide();
        this.resetContextData();
    }

    /**
     * Handle select all context menu action
     */
    handleSelectAll() {
        const fileSelect = $(".fileSelect");
        if (fileSelect.length > 0) {
            if (this.state.selectedToDeleteFiles.length > 0) {
                fileSelect.prop("checked", false).trigger("change");
                this.showMessage(`Unselected (${fileSelect.length}) files`, "info", "Unselected");
            } else {
                fileSelect.prop("checked", true).trigger("change");
                this.showMessage(`Selected (${fileSelect.length}) files`, "info", "Selected");
            }
        } else {
            this.showMessage("No files to select", "info", "Select");
        }
        this.hideContextMenu();
    }

    /**
     * Handle rename context menu action
     */
    handleRename() {
        this.elements.addFolderModal.find(".folderNewName").val(this.state.contextData.basename);
        this.elements.addFolderModal.find(".createNewFolder")
            .attr("data-id", this.state.contextData.id)
            .attr("data-type", this.state.contextData.type)
            .text("Update");
        this.elements.addFolderModal.modal("show");
        this.hideContextMenu();
    }

    /**
     * Handle show URL context menu action
     */
    handleShowUrl() {
        if (this.state.contextData.type === "file") {
            this.elements.fileUrlModal.find("input").val(this.state.contextData.url);
            this.elements.fileUrlModal.find("a").attr("href", this.state.contextData.url);
            this.elements.fileUrlModal.modal("show");
            this.hideContextMenu();
        }
    }

    /**
     * Handle show info context menu action
     */
    handleShowInfo() {
        this.elements.fileInfoModal.find(".modal-title").text(this.state.contextData.type === "file" ? "File Information" : "Folder Information");
        this.elements.fileInfoModal.find(".fileName").text(this.state.contextData.name);

        const fileDimensionEle = this.elements.fileInfoModal.find(".fileDimensions");
        if (this.state.contextData?.width && this.state.contextData?.height) {
            fileDimensionEle.text(`${this.state.contextData.width}x${this.state.contextData.height}`);
            fileDimensionEle.closest("tr").removeClass("d-none");
        } else {
            fileDimensionEle.closest("tr").addClass("d-none");
        }

        this.elements.fileInfoModal.find(".fileSize").text(this.formatSize(this.state.contextData.size));

        if (this.state.contextData.type === "file") {
            this.elements.fileInfoModal.find(".filePath").text(this.state.contextData.uri);
            this.elements.fileInfoModal.find(".fileURL").html(`<a href="${this.state.contextData.url}" target="_blank">${this.state.contextData.url}</a>`);
            this.elements.fileInfoModal.find(".fileURL, .filePath").closest("tr").removeClass("d-none");
        } else {
            this.elements.fileInfoModal.find(".fileURL, .filePath").closest("tr").addClass("d-none");
        }

        this.elements.fileInfoModal.find(".fileCreated").text(this.state.contextData.uploaded_at);
        this.elements.fileInfoModal.find(".fileModified").text(this.state.contextData.modify_date);
        this.elements.fileInfoModal.modal("show");
        this.hideContextMenu();
    }

    /**
     * Handle create folder from context menu
     */
    handleContextCreateFolder() {
        this.state.contextData["createFolder"] = "menu";
        this.elements.addFolderModal.find(".folderNewName").val("");
        this.elements.addFolderModal.find(".createNewFolder").attr("data-id", "");
        this.elements.addFolderModal.modal("show");
    }

    /**
     * Handle edit image context menu action
     */
    handleEditImage() {
        if (this.state.contextData?.category === "images") {
            this.state.editorObject = this.state.contextData;
            const editImageModal = $("#editImageModal");
            editImageModal.find(".modal-title").text("Edit Image");

            $(".tui-image-editor-header-buttons").html(`
                <button type="button" class="btn btn-secondary ie_saveAsNew">Save Image as New</button>
                <button type="button" class="btn btn-primary ie_replaceExisting">Replace Existing Image</button>
            `);

            this.imageEditor.loadImageFromURL(this.state.contextData.url, this.state.contextData.name)
                .then(() => {
                    this.imageEditor.ui.activeMenuEvent();
                    this.imageEditor.ui.resizeEditor();
                    editImageModal.modal("show");
                })
                .catch(() => {
                    this.showMessage("Unable to load image", "error", "Error");
                });
        }
    }

    /**
     * Save edited image as new file
     */
    saveImageAsNew() {
        console.log("Save as new", this.state.editorObject);
    }

    /**
     * Replace existing image with edited version
     */
    replaceExistingImage() {
        console.log("Replace Existing", this.state.editorObject);
    }

    /**
     * Handle open context menu action
     */
    handleContextOpen() {
        if (this.state.contextData.type === 'folder') {
            this.state.current_directory_id = this.state.contextData.id;
            this.state.current_page = 1;
            this.reloadData();
        } else {
            this.openFilePreview(this.state.contextData.url);
        }
    }

    /**
     * Handle delete context menu action
     */
    handleContextDelete() {
        if (confirm("Are you sure want to delete?")) {
            const delete_type = this.state.contextData.type;
            const delete_id = this.state.contextData.id;

            this.hideContextMenu();

            $.ajax({
                url: FM_REQ_URL + "ajax/delete/", type: "POST", data: {
                    type: delete_type, delete_id: [delete_id]
                }, dataType: "json", beforeSend: () => {
                    this.elements.filesSpinner.removeClass("d-none");
                }, success: (res) => {
                    const ele = $(`.fm-item[data-id=${delete_id}][data-type=${delete_type}]`);
                    if (ele.length > 0) {
                        ele.fadeOut("slow", function () {
                            $(this).remove();
                        });

                        const fileIndex = this.state.files_list.findIndex(item => item.id === delete_id);
                        if (fileIndex !== -1) {
                            this.state.files_list.splice(fileIndex, 1);
                        }

                        const folderIndex = this.state.folders_list.findIndex(item => item.id === delete_id);
                        if (folderIndex !== -1) {
                            this.state.folders_list.splice(folderIndex, 1);
                        }
                    }

                    if (delete_type === 'folder') {
                        const sideEle = $(`#filemanager_tree [data-id=${delete_id}]`);
                        if (sideEle.length > 0) {
                            sideEle.fadeOut("slow", function () {
                                $(this).remove();
                            });
                        }
                    }
                    this.showMessage(res.message, "success", "Removed");
                }, error: (error) => this.handleAjaxError(error), complete: () => {
                    this.elements.filesSpinner.addClass("d-none");
                }
            });
        }
    }

    /**
     * Open file preview modal
     */
    openFilePreview(filename) {
        if (this.isValidImage(filename)) {
            const filePreview = `<img alt="Image" style="max-width:100%;" class="w-100 h-auto" src="${filename}" />`;
            this.elements.previewModal.find(".modal-body").html(filePreview);
            this.elements.previewModal.modal("show");
        }
    }

    /**
     * Handle folder create/update
     */
    handleFolderCreate(e) {
        const update_id = $(e.target).attr("data-id");
        const file_type = $(e.target).attr("data-type");
        const name = $(".folderNewName").val();
        const btn = $(e.target);
        const btnHTML = btn.html();

        $.ajax({
            url: FM_REQ_URL + "ajax/folder/", type: "POST", data: {
                update_id: update_id,
                name: name,
                current_dir: this.state.contextData.id > 0 ? this.state.contextData.id : this.state.current_directory_id,
                file_type: file_type
            }, dataType: "json", beforeSend: () => {
                this.elements.filesSpinner.removeClass("d-none");
                btn.prop("disabled", true).html('<i class="fa fa-spinner fa-spin"></i> Processing . . .');
            }, success: (data) => {
                this.elements.addFolderModal.modal("hide");
                const folder = data.data;

                if (update_id) {
                    this.updateExistingFolder(update_id, folder);
                } else {
                    this.addNewFolder(folder);
                }

                this.showMessage(data.message, "success", update_id > 0 ? "Renamed" : "Created");
            }, error: (error) => this.handleAjaxError(error), complete: () => {
                this.elements.filesSpinner.addClass("d-none");
                this.elements.addFolderModal.modal("hide");
                this.hideContextMenu();
                btn.prop("disabled", false).html(btnHTML);
            }
        });
    }

    /**
     * Update existing folder in UI
     */
    updateExistingFolder(update_id, folder) {
        const ele = $(`.fm-item[data-id=${update_id}]`);
        if (ele.length > 0) {
            ele.find(".fm-item-title").text(folder.display_name);
            const fileIndex = this.state.files_list.findIndex(f => f.id === update_id);
            if (fileIndex !== -1) {
                this.state.files_list[fileIndex] = folder;
            }
        }

        const sideEle = $(`#filemanager_tree [data-id=${update_id}]`);
        if (sideEle.length > 0) {
            sideEle.find("span.folder").text(folder.display_name);
            const folderIndex = this.state.folders_list.findIndex(f => f.id === update_id);
            if (folderIndex !== -1) {
                this.state.folders_list[folderIndex] = folder;
            }
        }
    }

    /**
     * Add new folder to UI
     */
    addNewFolder(folder) {
        this.elements.filesContainer.prepend(`
            <div 
                class="fm-folder fm-item border fafolder"
                data-type="folder"
                data-fileType="child"
                data-fileName="${folder.basename}"
                data-id="${folder.id}"
            >
                <span class="fm-item-thumbnail hgi hgi-stroke hgi-folder-02"></span>
                <span class="fm-item-title">${folder.display_name}</span>
            </div>`);
        this.state.folders_list.push(folder);

        if (this.state.current_directory_id) {
            if (this.state.contextData?.createFolder === "menu") {
                this.reloadData();
            } else {
                const sideEle = $(`#filemanager_tree [data-id=${this.state.current_directory_id}]`);
                if (sideEle.length > 0) {
                    sideEle.next().prepend(`<div class="list-group-item border-0" style="padding-left:0;" aria-level="1" data-type="folder" data-filename="${folder.basename}" data-id="${folder.id}">
                        <i class="state-icon iconSpace">&nbsp;</i>
                        <i class="item-icon hgi hgi-stroke hgi-folder-02"></i>
                        <span class="folder">${folder.display_name}</span>
                    </div>`);
                }
            }
        } else {
            if (this.state.contextData?.createFolder === "menu") {
                this.reloadData();
            } else {
                this.elements.tree.prepend(`<div class="list-group-item border-0" style="padding-left:0;" aria-level="0" data-type="folder" data-filename="${folder.basename}" data-id="${folder.id}">
                    <i class="state-icon iconSpace">&nbsp;</i>
                    <i class="item-icon hgi hgi-stroke hgi-folder-02"></i>
                    <span class="folder">${folder.display_name}</span>
                </div>`);
            }
        }
    }

    /**
     * Embed selected files (plugin callback)
     */
    embedSelectedFiles() {
        try {
            const editor_id = this.getQueryParam("editor_id") ?? "";
            let message = {
                sender: "filehub",
                html: "",
                editor_id: editor_id,
                files: this.state.selectedFiles,
                file: this.state.selectedFiles[0]
            };

            this.state.selectedFiles.forEach(file => {
                message["html"] += `<img class="img-fluid" src="${file.uri}" alt="Image" />`;
            });

            if (this.hasQueryParam("callback_fnc")) {
                console.log("Posting message to parent onFileHubCallback", message);
                window.parent.onFileHubCallback(message, this.getQueryParam("callback_fnc"));
            } else {
                console.log("Posting message to parent", message);
                window.parent.postMessage(message);
            }
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Open parent folders if they are collapsed
     */
    openParentIfClosed(ele) {
        const parentFolders = ele.parents('.list-group-item[data-type="folder"]');
        parentFolders.removeClass('collapsed').attr("aria-expanded", true);

        const listGroupFolders = ele.parents('.list-group');
        listGroupFolders.addClass('show');
    }

    /**
     * Refresh all data from server
     */
    refreshData() {
        this.elements.spinnerFull.addClass("show");
        this.reloadData();
    }

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
        this.elements.sidebar.toggleClass("d-block");
    }

    /**
     * Handle infinite scroll
     */
    handleScroll() {
        const scrollElement = this.elements.filesScroll;
        if (scrollElement.scrollTop() + scrollElement.height() >= scrollElement[0].scrollHeight - 1000) {
            if (this.state.hasMoreData && !this.state.loadingData) {
                this.state.current_page++;
                this.reloadData(false);
            }
        }
    }

    /**
     * Reload data from server
     */
    reloadData(initial = true) {
        $.ajax({
            url: FM_REQ_URL + "ajax/browse/", type: "POST", data: {
                folder: this.state.current_directory_id,
                page: this.state.current_page,
                sortby: this.state.sortby,
                sortorder: this.state.sortorder,
                search: this.state.searchvalue,
                filter: this.state.filterby
            }, dataType: "json", beforeSend: () => {
                if (!initial) {
                    this.elements.filesSpinner.removeClass("d-none");
                } else {
                    this.elements.spinnerFull.addClass("show");
                }
                this.state.loadingData = true;
            }, success: (data) => {
                this.processLoadedData(data, initial);
            }, error: (error) => this.handleAjaxError(error), complete: () => {
                this.elements.spinnerFull.removeClass("show");
                this.elements.filesSpinner.addClass("d-none");
                this.hideContextMenu();
                this.state.fileUploadedrefresh = false;
                this.state.loadingData = false;
            }
        });
    }

    /**
     * Process and render loaded data from server
     */
    processLoadedData(data, initial) {
        let html = this.renderTree(data.hiearchy);
        this.elements.tree.html(html);

        html = this.renderBreadcrumb(data.breadcrumb);
        $(".filemanager_content_top ol.breadcrumb").html(html);

        if (this.state.current_page < 2 || initial) {
            this.elements.filesContainer.html("");
        }
        this.renderFolders(data.folders);
        this.renderFiles(data.files.data);
        this.state.hasMoreData = data.files.hasMore;

        this.state.files_list = this.state.current_page === 1 ? data.files.data : [...this.state.files_list, ...data.files.data];
        this.state.folders_list = this.state.current_page === 1 ? data.folders : [...this.state.folders_list, ...data.folders];

        if (data.folders.length <= 0 && data.files.data.length <= 0) {
            if (this.elements.filesContainer.find("div").length <= 0) {
                if (this.state.searchvalue.length > 0) {
                    this.elements.filesContainer.html(`<div class="no_files_and_folder_found">
                        <span class="hgi hgi-stroke hgi-folder-02"></span>
                        <h3>No files and folder found according to your search query.</h3>
                    </div>`);
                } else {
                    this.elements.filesContainer.html(`<div class="no_files_and_folder_found">
                        <span class="hgi hgi-stroke hgi-folder-02"></span>
                        <h3>This folder is empty</h3>
                    </div>`);
                }
            }
        }

        try {
            const reqEle = $(`#filemanager_tree .list-group-item[data-id=${this.state.current_directory_id}]`);
            reqEle.addClass("active");

            if (reqEle.hasClass("collapsed")) {
                reqEle.removeClass("collapsed").attr("aria-expanded", true);
                const targetGroupID = reqEle.attr("data-bs-target");
                $(targetGroupID).removeClass("collapse");
            }

            this.openParentIfClosed(reqEle);
        } catch (error) {
        }

        try {
            this.lazyload.update();
        } catch (error) {
        }
    }

    /**
     * Load initial data when application starts
     */
    loadInitialData() {
        this.reloadData(true);
    }
}

$(document).ready(function () {
    new FileManager();
});