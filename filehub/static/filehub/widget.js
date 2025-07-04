window.addEventListener("load", function () {
    function formatSize(size) {
        const kilobyte = 1024;
        const megabyte = kilobyte * 1024;
        const gigabyte = megabyte * 1024;

        if (size >= gigabyte) return (size / gigabyte).toFixed(2) + ' GB';
        if (size >= megabyte) return (size / megabyte).toFixed(2) + ' MB';
        if (size >= kilobyte) return (size / kilobyte).toFixed(2) + ' KB';
        return size + ' bytes';
    }

    const getGalleryWidgetValue = (galleryWidget) => {
        try {
            return JSON.parse(galleryWidget.val()) || []
        } catch {
            return [];
        }
    }

    function formatFilePickerValue(v) {
        return {
            id: parseInt(v.id),
            name: v.name,
            display_name: v.display_name,
            size: v.size,
            width: v.width,
            height: v.height,
            url: v.url
        }
    }

    function appendValueToTextarea(ele, values) {
        let currentValue = getGalleryWidgetValue(ele);
        const filterValues = values.map(v => formatFilePickerValue(v));

        const merged = [...currentValue, ...filterValues];
        const uniqueById = Array.from(new Map(merged.map(item => [item.id, item])).values());
        ele.val(JSON.stringify(uniqueById)).trigger("change");
        ele[0].dispatchEvent(new Event("change", {bubbles: true}));
    }

    function initializeFilehubWidget($) {
        $.fn.hasAttr = function (name) {
            return this.attr(name) !== undefined;
        };

        function initializeGallerySortable(ele) {
            if (ele.parent().find(".gallery-picker").hasAttr("sortable")) {
                new Sortable(ele[0], {
                    animation: 150,
                    ghostClass: 'blue-background-class',
                    onChange: function (event) {
                        const targetEle = $(event.item).closest(".gallery_image_container");
                        const galleryWidget = targetEle.closest(".gallery-widget");
                        const galleryPicker = galleryWidget.find(".gallery-picker");
                        const galleryValue = getGalleryWidgetValue(galleryPicker);
                        const orderIds = targetEle.find(".gallery_image_item").map(function () {
                            return parseInt($(this).attr("data-id"));
                        }).get();
                        const orderedGalleryValue = orderIds
                            .map(id => galleryValue.find(item => item.id === id))
                            .filter(item => item !== undefined);
                        galleryPicker.val(JSON.stringify(orderedGalleryValue));
                    }
                });
            }
        }

        function renderFilePreview(container, selectedFile, appendTitle=false) {
            container.addClass("added");
            container.find(".image_fill_placeholder").remove();

            if (selectedFile.category === "images") {
                container.append(`
                    <div class="image_fill_placeholder image mt-2">
                        <i class="hgi hgi-stroke hgi-cancel-01"></i>
                        <img src="${selectedFile.uri}" style="width:auto;max-width:100%;" alt="Preview File"/>
                        ${appendTitle && `<a class="file_image_title" href="${selectedFile.url}" target="_blank">${selectedFile.display_name}</a>`}
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
                                <div class="file_size" style="color:#ccc;">Size: ${formatSize(selectedFile.size) || 'Unknown'}</div>
                            </div>
                        </div>
                    </div>
                `);
            }
        }

        window.onFileHubCallback = (selectedObj, id) => {
            try {
                const selectedFile = selectedObj.file;
                const findImageEle = $(document).find(`[name="${id}"]`);

                const isGallery = findImageEle.hasClass("gallery-picker");
                const isFilePicker = findImageEle.hasClass("file-picker");
                if (isGallery) {
                    appendValueToTextarea(findImageEle, selectedObj.files);
                } else if (isFilePicker) {
                    findImageEle.val(JSON.stringify(formatFilePickerValue(selectedObj.file))).trigger("change");
                    $(document).trigger("file_selected", [selectedFile, id]);
                    const container = findImageEle.closest(".image_picker_container");
                    if (container.length) {
                        renderFilePreview(container, selectedFile, true);
                    }
                } else if (findImageEle.length) {
                    findImageEle.val(selectedFile.uri).trigger("change");
                    $(document).trigger("file_selected", [selectedFile, id]);

                    const container = findImageEle.closest(".image_picker_container");
                    if (container.length) {
                        renderFilePreview(container, selectedFile);
                    }
                }
            } catch {
            }
            try {
                jQuery.fancybox.close();
            } catch {
            }
            try {
                $.fancybox.close();
            } catch {
            }
        };

        const fancyboxfile = $(".openImagePicker");
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

        $(document).on("click", ".image_picker_container .hgi-cancel-01", function () {
            const container = $(this).closest(".image_picker_container");
            container.removeClass("added");
            container.find(".image_fill_placeholder").remove();
            container.find("input,textarea").each(function () {
                $(this).val($(this).hasClass("file-picker") ? "{}" : "");
            })
        });

        $(document).find(".gallery_image_container").each(function () {
            initializeGallerySortable($(this));
        })

        $(document).on("click", ".remove_image_button", function () {
            const galleryWidget = $(this).closest(".gallery-widget");
            const gallery_image_item = $(this).closest(".gallery_image_item");
            const removeId = gallery_image_item.attr("data-id");

            gallery_image_item.remove();

            const galleryPicker = galleryWidget.find(".gallery-picker");
            const values = getGalleryWidgetValue(galleryPicker);
            const updatedValues = values.filter(file => String(file.id) !== removeId);

            galleryPicker.val(JSON.stringify(updatedValues)).trigger("change");
        })

        function galleryLimiCheck(ele) {
            ele.each(function () {
                let currentValue = getGalleryWidgetValue(ele);
                const maxItems = $(this).attr("data-max-items");
                if (maxItems && currentValue.length >= parseInt(maxItems)) {
                    $(this).closest(".gallery-widget").addClass("limit_reached");
                } else {
                    $(this).closest(".gallery-widget").removeClass("limit_reached");
                }
            })
        }

        $(document).on("change", ".gallery-picker", function () {
            let currentValue = getGalleryWidgetValue($(this));

            const galleryContainer = $(this).closest(".gallery-widget").find(".gallery_image_container");
            if (galleryContainer.length > 0) {
                galleryContainer.empty();
                currentValue.forEach(file => {
                    galleryContainer.append(`<div class="gallery_image_item" data-id="${file.id}">
                    <img src="${file.url}" alt="${file.display_name}">
                    <button type="button" class="remove_image_button">
                        <i class="hgi hgi-stroke hgi-cancel-01"></i>
                    </button>
                    <a href="${file.url}" target="_blank" class="gallery_image_title">${file.display_name}</a>
                </div>`)
                })
                initializeGallerySortable(galleryContainer);
            }

            const galleryWidget = galleryContainer.closest(".gallery-widget");
            if (galleryWidget.length > 0) {
                galleryWidget.addClass("added");
            } else {
                galleryWidget.removeClass("added");
            }

            galleryLimiCheck($(this));
        });

        galleryLimiCheck($(document).find(".gallery-picker"));
    }

    (function ($) {
        initializeFilehubWidget($);
    })(jQuery);

    (function ($) {
        initializeFilehubWidget($);
    })(django.jQuery);
});

