/**
 * Optimized plugin.min.js
 */
let activeEditor = null;
tinymce.PluginManager.add('filehub', function (editor) {
    function filehub_onMessage(event) {
        if (event.data.sender === 'filehub' && activeEditor === editor.id) {
            editor.insertContent(event.data.html);
            editor.windowManager.close();
            window.removeEventListener('message', filehub_onMessage, false);
        }
    }

    window.addEventListener('message', (event) => filehub_onMessage(event, editor), false);

    function openmanager() {
        let width = Math.min(window.innerWidth - 20, 1800);
        let height = Math.min(window.innerHeight - 40, 1200);
        if (width > 600) width -= (width - 20) % 138 - 10;

        editor.focus(true);
        const title = editor.getParam("filemanager_title", "File Manager");
        const sort_by = editor.getParam("filemanager_sort_by", "");
        const descending = editor.getParam("filemanager_descending", "false");
        const fileUrl = `${editor.getParam("external_filemanager_path")}?multiple=true&editor_id=${editor.id}&type=image&sortorder=${descending}&sort_by=${sort_by}`;
        activeEditor = editor.id;
        editor.windowManager[tinymce.majorVersion < 5 ? 'open' : 'openUrl']({
            title, url: fileUrl, width, height,
            inline: 1, resizable: true, maximizable: true
        });
    }

    function registerButton(name, options) {
        if (tinymce.majorVersion < 5) {
            editor.addButton(name, options);
            editor.addMenuItem(name, {...options, context: 'insert'});
        } else {
            editor.ui.registry.addButton(name, options);
            editor.ui.registry.addMenuItem(name, {...options, context: 'insert'});
        }
    }

    registerButton('filehub', {
        icon: 'browse',
        tooltip: 'Insert file',
        shortcut: 'Ctrl+E',
        onAction: openmanager
    });

    editor.addShortcut('Ctrl+E', '', openmanager);

    return {
        getMetadata: () => ({
            name: 'File Manager',
            url: 'https://sureshchand.com.np/filehub/docs/'
        })
    };
});
