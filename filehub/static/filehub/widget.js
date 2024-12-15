window.addEventListener("load", function () {
    (function ($) {
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

        window.onFileHubCallback = (selectedObj, id) => {
            try {
                const selectedFile = selectedObj.file;
                const findImageEle = $(document).find(`[name="${id}"]`);
                if (findImageEle.length > 0) {
                    findImageEle.val(selectedFile.uri).trigger("change");

                    const container = findImageEle.closest(".image_picker_container");
                    if (container) {
                        container.addClass("added");
                        container.find(".image_fill_placeholder").remove();

                        if (selectedFile.category === "images") {
                            container.append(`
                                    <div class="image_fill_placeholder mt-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512">
                                            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" 
                                                  stroke-width="32" d="M368 368L144 144M368 144L144 368"></path>
                                        </svg>
                                        <img src="${selectedFile.uri}" style="width:auto;max-width:100%;" alt="Preview File"/>
                                    </div>
                                `);
                        } else {
                            container.append(`
                                    <div class="image_fill_placeholder mt-2" style="border: 2px solid #eeeeee;border-radius: 10px;padding: 10px;">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512">
                                            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" 
                                                  stroke-width="32" d="M368 368L144 144M368 144L144 368"></path>
                                        </svg>
                                        
                                        <div class="file_card" style="display: flex;align-items: center;gap: 10px;">
                                            <img style="width:50px;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAACx0lEQVR4nO2bu2sVQRTGfzHgg2gaG41YmitYirGwFgTFFDYWuQFRY2HjK/ioJFhEbQQhGAOCCP4BaqcWtoqFiFWuNiqIYHwWBgNXBubCYVjjZvfM7sy988HhLlz2O+d8O68zuwPVYwAYBc4A55VtAthOoOgDJoFvQNuzPQUaBIRVwP0KEpf2FRghEEw6wbWAWWBa0a4DD4E/ws9HYEPdyQ84zX4OWOPRn3nqC8LfRWrGQRHMvOfkOzgufL6oaoA7BBy21xJnRTC3qggGGBI+f/h2thq4KxyOO/9fFv+Z66ogxxxv2Ag8c5wd7RUBhm2flo5u2imv6wXYA3wWDpbsSiwLXSfAEWBRkP+yIz3dLkCfk0xnobHzP/d1hQBrM5ayr4CtOe6NXoBNwHOH8AGwPuf9UQswCLxxyG4A/SvgiFqAK85If7IAR9QCzAuSEwU5ZgWH2QSJSoDfgsR0hyKD5zvBsZ/IBPggSPYVSP6OuN+UqOuITIAZZ8Ezk3Nv7rbz5I2dolqoCDAEfFpm2ymv3csok6NZB+wAXhdMfME++aqTV18J9gN77d5env2508CBivt85eVw6EgCkFoAqQtQcgy4Zuf/q/RoF1i0BOa3JwVoFyAxm6JND29+mxkbrtqxq5CMK6wc/2VGhOAFaHoUYMxz7GpdYEz5ze+05YyiC4SCJACpBZC6ADWMAcMZu0Ea9hbY5jl2FZJzHqdB87FFFC2g5SH5ViwtIBQkAUgtgNQFqKkWaKZyGC/TYCqH8dt61bpAKocDQJoGSdMgaR1AqgVIxRB1j6Q1IQ2CKDy8n4JkM/Fgi4j7exmil4LoGPFgQuvQ1CVB9CWkg4jLYLdzbO5CGbJBeyagQ2YOJT4CpjyUu2Vtysa2JOJ9r3FwcsQeQ21HZibmXSihATwJIKm89tjuTqujYU9lms/etd/+ljUTk4ltRYn/BZi9S5cZIajtAAAAAElFTkSuQmCC" alt="File Icon" />
                                            <div class="file_info">
                                                <div class="file_name">${selectedFile.display_name}</div>
                                                <div class="file_size" style="color:#ccc;">Size: ${formatSize(selectedFile.size) || 'Unknown'}</div>
                                            </div>
                                        </div>
                                    </div>
                                `);
                        }
                    }
                }
            } catch (error) {
                console.log(error);
            }
            $.fancybox.close();
        };

        const fancyboxfile = $(document).find(".openImagePicker");
        if (fancyboxfile.length > 0) {
            fancyboxfile.fancybox({
                width: 900,
                height: 300,
                type: 'iframe',
                autoScale: false
            });
        }

        $(document).on("click", ".image_picker_container svg", function () {
            const container = $(this).closest(".image_picker_container");
            container.removeClass("added");
            container.find(".image_fill_placeholder").remove();
            container.find("input,textarea").val("");
        });
    })(django.jQuery);
});
