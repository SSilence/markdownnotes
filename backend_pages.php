<?php

function sanitizeFilename($id) {
    return preg_replace("/[^A-Za-z0-9_\-\.]+/", "", strtolower(str_replace(" ", "_", basename($id))));
}

function toFilename($id) {
    return CONFIG_DATA_PATH . sanitizeFilename($id) . ".md";
}

function readPageByFilename($filename) {
    $content = @file_get_contents($filename);
    if ($content === false) {
        return false;
    }
    $parts = preg_split("/".CONFIG_META_SEPARATOR."/", $content);
    $meta = array();
    foreach (preg_split("/\n/", $parts[0]) as $element) {
        $eParts = preg_split("/\: /", $element);
        @$meta[$eParts[0]] = $eParts[1];
    }

    return array(
        'id' => basename($filename, ".md"),
        'title' => $meta['title'],
        'icon' => $meta['icon'],
        'disabled' => isset($meta['disabled']) ? $meta['disabled'] == 1 : false,
        'expanded' => isset($meta['expanded']) ? $meta['expanded'] == 1 : false,
        'content' => trim($parts[1]),
        'updated' => filemtime($filename)
    );
}

function readPageById($id) {
    return readPageByFilename(toFilename($id));
}

function writePage($id, $title, $icon, $disabled, $expanded, $content) {
    file_put_contents(toFilename($id), "title: $title\nicon: $icon\ndisabled: $disabled\nexpanded: $expanded\n" . CONFIG_META_SEPARATOR . "\n$content");
}

// add/edit page
router('POST', '/page$', function() {
    $data = body();
    $id = parseString($data, 'id');
    $title = parseString($data, 'title');
    $icon = parseString($data, 'icon');
    $disabled = $data['disabled'] === true;
    $expanded = $data['expanded'] === true;
    $content = isset($data['content']) ? $data['content'] : readPageById($id)["content"];

    if (strlen($id) == 0) {
        error(404, "invalid id");
    }

    writePage($id, $title, $icon, $disabled, $expanded, $content);
    json(readPageById($id));
});

// delete page
router('DELETE', '/page/(?<id>.+)$', function($params) {
    @unlink(toFilename($params['id']));
});

// get all pages
router('GET', '/page$', function() {
    $pages = array();
    foreach (scandir(CONFIG_DATA_PATH) as $file) {
        if (endsWith($file, ".md")) {
            $page = readPageByFilename(CONFIG_DATA_PATH . $file);
            unset($page['content']);
            $pages[] = $page;
        }
    }
    json($pages);
});

// get one page
router('GET', '/page/(?<id>.+)$', function($params) {
    $page = readPageById($params['id']);
    if ($page === false) {
        error(404, "invalid id");
    }
    json($page);
});

// rename page
router('POST', '/page/rename$', function() {
    $data = body();
    if (!is_array($data)) {
        error(400, "no valid array given");
    }

    // validate
    $parsed = array();
    foreach ($data as $entry) {
        $oldFile = toFilename(parseString($entry, 'oldid'));
        $newFile = toFilename(parseString($entry, 'newid'));
        
        if (!file_exists($oldFile)) {
            error(404, "invalid id");
        }
        if (file_exists($newFile)) {
            error(400, "new id already exists");
        }
        $parsed[] = array(
            "from" => $oldFile,
            "to" => $newFile
        );
    }

    foreach ($parsed as $entry) {
        rename($entry["from"], $entry["to"]);
    }
});

// search
router('GET', '/search$', function() {
    $q = htmlspecialchars($_GET["q"]);
    
    $pages = array();
    foreach (scandir(CONFIG_DATA_PATH) as $file) {
        if (endsWith($file, ".md")) {
            $page = readPageByFilename(CONFIG_DATA_PATH . $file);
            if (stripos($page['content'], $q) !== false || stripos($page['title'], $q) !== false) {
                $pages[] = $page;
            }
        }
    }

    json($pages);
});

// file upload
router('POST', '/file$', function() {
    move_uploaded_file($_FILES['file']['tmp_name'], CONFIG_FILES_PATH . sanitizeFilename($_FILES['file']['name']));
});

// file delete
router('DELETE', '/file/(?<filename>.+)$', function($params) {
    @unlink(CONFIG_FILES_PATH . sanitizeFilename($params["filename"]));
});

// get all files
router('GET', '/file$', function() {
    $files = array();
    foreach (scandir(CONFIG_FILES_PATH) as $file) {
        if (is_file(CONFIG_FILES_PATH . $file) && $file != '.' && $file != '..') {
            $files[] = array(
                "name" => $file,
                "size" => filesize(CONFIG_FILES_PATH . $file),
                "date" => filemtime(CONFIG_FILES_PATH . $file) * 1000
            );
        }
    }
    json($files);
});