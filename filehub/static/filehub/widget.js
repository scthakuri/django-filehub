/**
 * Filehub Widget Manager
 * Handles file picker, gallery picker, and image selection widgets
 */
class FilehubWidget {
    /**
     * Initialize the FilehubWidget
     */
    constructor($) {
        this.$ = $;
        this.init();
    }

    /**
     * Initialize all widget functionality
     */
    init() {
        this.extendJQuery();
        this.setupGlobalCallback();
        this.initializeFancybox();
        this.bindEvents();
        this.initializeExistingGalleries();
        this.checkGalleryLimits();
    }

    /**
     * Extend jQuery with custom methods
     */
    extendJQuery() {
        this.$.fn.hasAttr = function(name) {
            return this.attr(name) !== undefined;
        };
    }

    /**
     * Format file size in human-readable format
     */
    formatSize(size) {
        const kilobyte = 1024;
        const megabyte = kilobyte * 1024;
        const gigabyte = megabyte * 1024;

        if (size >= gigabyte) return (size / gigabyte).toFixed(2) + ' GB';
        if (size >= megabyte) return (size / megabyte).toFixed(2) + ' MB';
        if (size >= kilobyte) return (size / kilobyte).toFixed(2) + ' KB';
        return size + ' bytes';
    }

    /**
     * Get parsed gallery widget value from textarea
     */
    getGalleryWidgetValue(galleryWidget) {
        try {
            return JSON.parse(galleryWidget.val()) || [];
        } catch {
            return [];
        }
    }

    /**
     * Format file picker value object
     */
    formatFilePickerValue(v) {
        return {
            id: parseInt(v.id),
            name: v.name,
            display_name: v.display_name,
            size: v.size,
            width: v.width,
            height: v.height,
            url: v.url
        };
    }

    /**
     * Append values to textarea maintaining uniqueness by ID
     */
    appendValueToTextarea(ele, values) {
        let currentValue = this.getGalleryWidgetValue(ele);
        const filterValues = values.map(v => this.formatFilePickerValue(v));

        const merged = [...currentValue, ...filterValues];
        const uniqueById = Array.from(new Map(merged.map(item => [item.id, item])).values());
        ele.val(JSON.stringify(uniqueById)).trigger("change");
        ele[0].dispatchEvent(new Event("change", { bubbles: true }));
    }

    /**
     * Initialize Sortable.js for gallery containers
     */
    initializeGallerySortable(ele) {
        if (ele.parent().find(".gallery-picker").hasAttr("sortable")) {
            new Sortable(ele[0], {
                animation: 150,
                ghostClass: 'blue-background-class',
                onChange: (event) => {
                    const targetEle = this.$(event.item).closest(".gallery_image_container");
                    const galleryWidget = targetEle.closest(".gallery-widget");
                    const galleryPicker = galleryWidget.find(".gallery-picker");
                    const galleryValue = this.getGalleryWidgetValue(galleryPicker);
                    const orderIds = targetEle.find(".gallery_image_item").map(function() {
                        return parseInt(this.$(this).attr("data-id"));
                    }).get();
                    const orderedGalleryValue = orderIds
                        .map(id => galleryValue.find(item => item.id === id))
                        .filter(item => item !== undefined);
                    galleryPicker.val(JSON.stringify(orderedGalleryValue));
                }
            });
        }
    }

    /**
     * Render file preview in container
     */
    renderFilePreview(container, selectedFile, appendTitle = false) {
        container.addClass("added");
        container.find(".image_fill_placeholder").remove();

        if (selectedFile.category === "images") {
            container.append(`
                <div class="image_fill_placeholder image mt-2">
                    <i class="hgi hgi-stroke hgi-cancel-01"></i>
                    <img src="${selectedFile.uri}" style="width:auto;max-width:100%;" alt="Preview File"/>
                    ${appendTitle ? `<a class="file_image_title" href="${selectedFile.url}" target="_blank">${selectedFile.display_name}</a>` : ''}
                </div>
            `);
        } else {
            container.append(`
                <div class="image_fill_placeholder mt-2" style="border: 2px solid #eeeeee;border-radius: 10px;padding: 10px;">
                    <span class="hgi hgi-stroke hgi-cancel-01"></span>
                    <div class="file_card" style="display: flex;align-items: center;gap: 10px;">
                        <span class="hgi hgi-stroke hgi-files-02"></span>
                        <div class="file_info">
                            <div class="file_name">${selectedFile.name}</div>
                            <div class="file_size" style="color:#ccc;">Size: ${this.formatSize(selectedFile.size) || 'Unknown'}</div>
                        </div>
                    </div>
                </div>
            `);
        }
    }

    /**
     * Setup global callback for file selection
     */
    setupGlobalCallback() {
        window.onFileHubCallback = (selectedObj, id) => {
            try {
                const selectedFile = selectedObj.file;
                const findImageEle = this.$(document).find(`[name="${id}"]`);

                const isGallery = findImageEle.hasClass("gallery-picker");
                const isFilePicker = findImageEle.hasClass("file-picker");

                if (isGallery) {
                    this.appendValueToTextarea(findImageEle, selectedObj.files);
                } else if (isFilePicker) {
                    findImageEle.val(JSON.stringify(this.formatFilePickerValue(selectedObj.file))).trigger("change");
                    this.$(document).trigger("file_selected", [selectedFile, id]);
                    const container = findImageEle.closest(".image_picker_container");
                    if (container.length) {
                        this.renderFilePreview(container, selectedFile, true);
                    }
                } else if (findImageEle.length) {
                    findImageEle.val(selectedFile.uri).trigger("change");
                    this.$(document).trigger("file_selected", [selectedFile, id]);

                    const container = findImageEle.closest(".image_picker_container");
                    if (container.length) {
                        this.renderFilePreview(container, selectedFile);
                    }
                }
            } catch {
            }

            this.closeFancybox();
        };
    }

    /**
     * Close fancybox modal (supports multiple versions)
     */
    closeFancybox() {
        try {
            jQuery.fancybox.close();
        } catch {
        }
        try {
            this.$.fancybox.close();
        } catch {
        }
    }

    /**
     * Initialize fancybox for image picker
     */
    initializeFancybox() {
        const fancyboxfile = this.$(".openImagePicker");
        if (fancyboxfile.length) {
            try {
                fancyboxfile.fancybox({
                    width: 900,
                    height: 300,
                    type: 'iframe',
                    autoScale: false,
                    autoSize: false
                });
            } catch {
            }
        }
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        this.bindFormsetAddedEvent();
        this.bindRemoveImageEvent();
        this.bindRemoveGalleryItemEvent();
        this.bindGalleryChangeEvent();
    }

    /**
     * Bind formset:added event for dynamic forms
     */
    bindFormsetAddedEvent() {
        this.$(document).on("formset:added", (e) => {
            try {
                const targetEle = this.$(e.target);
                const imagePickerEle = targetEle.find(".image_picker_container");
                
                if (imagePickerEle.length > 0) {
                    const textAreaEle = imagePickerEle.find("textarea");
                    const openImagePickerEle = imagePickerEle.find(".openImagePicker");

                    const textAreaName = textAreaEle.attr("name");
                    const href = window.location.origin + openImagePickerEle.attr("href");
                    
                    if (href && textAreaName) {
                        const url = new URL(href);
                        url.searchParams.set("callback_fnc", textAreaName);
                        const newHref = url.pathname + url.search;
                        openImagePickerEle.attr("href", newHref);
                    }
                }
            } catch {
            }
        });
    }

    /**
     * Bind remove image button click event
     */
    bindRemoveImageEvent() {
        this.$(document).on("click", ".image_picker_container .hgi-cancel-01", (e) => {
            const container = this.$(e.target).closest(".image_picker_container");
            container.removeClass("added");
            container.find(".image_fill_placeholder").remove();
            container.find("input,textarea").each(function() {
                this.$(this).val(this.$(this).hasClass("file-picker") ? "{}" : "");
            });
        });
    }

    /**
     * Bind remove gallery item button click event
     */
    bindRemoveGalleryItemEvent() {
        this.$(document).on("click", ".remove_image_button", (e) => {
            const galleryWidget = this.$(e.target).closest(".gallery-widget");
            const gallery_image_item = this.$(e.target).closest(".gallery_image_item");
            const removeId = gallery_image_item.attr("data-id");

            gallery_image_item.remove();

            const galleryPicker = galleryWidget.find(".gallery-picker");
            const values = this.getGalleryWidgetValue(galleryPicker);
            const updatedValues = values.filter(file => String(file.id) !== removeId);

            galleryPicker.val(JSON.stringify(updatedValues)).trigger("change");
        });
    }

    /**
     * Bind gallery picker change event
     */
    bindGalleryChangeEvent() {
        this.$(document).on("change", ".gallery-picker", (e) => {
            let currentValue = this.getGalleryWidgetValue(this.$(e.target));

            const galleryContainer = this.$(e.target).closest(".gallery-widget").find(".gallery_image_container");
            
            if (galleryContainer.length > 0) {
                galleryContainer.empty();
                currentValue.forEach(file => {
                    galleryContainer.append(`
                        <div class="gallery_image_item" data-id="${file.id}">
                            <img src="${file.url}" alt="${file.display_name}">
                            <button type="button" class="remove_image_button">
                                <i class="hgi hgi-stroke hgi-cancel-01"></i>
                            </button>
                            <a href="${file.url}" target="_blank" class="gallery_image_title">${file.display_name}</a>
                        </div>
                    `);
                });
                this.initializeGallerySortable(galleryContainer);
            }

            const galleryWidget = galleryContainer.closest(".gallery-widget");
            if (galleryWidget.length > 0) {
                galleryWidget.addClass("added");
            } else {
                galleryWidget.removeClass("added");
            }

            this.checkGalleryLimit(this.$(e.target));
        });
    }

    /**
     * Initialize sortable for existing galleries on page load
     */
    initializeExistingGalleries() {
        this.$(document).find(".gallery_image_container").each((index, element) => {
            this.initializeGallerySortable(this.$(element));
        });
    }

    /**
     * Check and apply gallery limit for a specific gallery picker
     */
    checkGalleryLimit(ele) {
        ele.each((index, element) => {
            let currentValue = this.getGalleryWidgetValue(this.$(element));
            const maxItems = this.$(element).attr("data-max-items");
            
            if (maxItems && currentValue.length >= parseInt(maxItems)) {
                this.$(element).closest(".gallery-widget").addClass("limit_reached");
            } else {
                this.$(element).closest(".gallery-widget").removeClass("limit_reached");
            }
        });
    }

    /**
     * Check and apply gallery limits for all gallery pickers
     */
    checkGalleryLimits() {
        this.checkGalleryLimit(this.$(document).find(".gallery-picker"));
    }
}

/**
 * Initialize FilehubWidget when window loads
 */
window.addEventListener("load", function() {
    if (typeof jQuery !== 'undefined') {
        new FilehubWidget(jQuery);
    }
    
    if (typeof django !== 'undefined' && typeof django.jQuery !== 'undefined') {
        new FilehubWidget(django.jQuery);
    }
});