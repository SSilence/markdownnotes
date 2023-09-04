<?PHP

include("backend_apikeys.php"); // define("CONFIG_AZURE_TEXT_TO_SPEECH_API_KEY", "...");

define("CONFIG_DATA_PATH", __DIR__ . "/data/pages/");
define("CONFIG_FILES_PATH", __DIR__ . "/data/files/");
define("CONFIG_AUDIO_PATH", __DIR__ . "/data/audio/");
define("CONFIG_META_SEPARATOR", "------------------------------------");

if (!file_exists(CONFIG_DATA_PATH)) {
    mkdir(CONFIG_DATA_PATH, 0777);
}

if (!file_exists(CONFIG_FILES_PATH)) {
    mkdir(CONFIG_FILES_PATH, 0777);
}

if (!file_exists(CONFIG_AUDIO_PATH)) {
    mkdir(CONFIG_AUDIO_PATH, 0777);
}

function endsWith($haystack, $needle) {
    $length = strlen($needle);
    if ($length == 0) {
        return true;
    }
    return (substr($haystack, -$length) === $needle);
}

// https://odan.github.io/2017/01/23/building-a-simple-web-api-with-vanilla-php.html
function router($httpMethods, $route, $callback, $exit = true) {
    static $path = null;
    if ($path === null) {
        $path = parse_url($_SERVER['REQUEST_URI'])['path'];
        $scriptName = dirname(dirname($_SERVER['SCRIPT_NAME']));
        $scriptName = str_replace('\\', '/', $scriptName);
        $len = strlen($scriptName);
        if ($len > 0 && $scriptName !== '/') {
            $path = substr($path, $len);
        }
    }
    if (!in_array($_SERVER['REQUEST_METHOD'], (array) $httpMethods)) {
        return;
    }
    $matches = null;
    $regex = '/' . str_replace('/', '\/', $route) . '/';
    if (!preg_match_all($regex, $path, $matches)) {
        return;
    }
    if (empty($matches)) {
        $callback();
    } else {
        $params = array();
        foreach ($matches as $k => $v) {
            if (!is_numeric($k) && !isset($v[1])) {
                $params[$k] = $v[0];
            }
        }
        $callback($params);
    }
    if ($exit) {
        exit;
    }
}

function parseString($data, $key) {
    if (isset($data) && isset($data[$key])) {
        return trim(htmlspecialchars($data[$key]));
    }  else {
        return '';
    }
}

function gzip($json) {
    if(strpos($_SERVER['HTTP_ACCEPT_ENCODING'],'gzip')!==FALSE) {
        header('Content-Type: application/json');
        header('Content-Encoding: gzip');
        die(gzencode($json));
    } else {
        header('Content-Type: application/json');
        die($json);
    }
}

function json($data) {
    header('Content-Type: application/json');
    gzip(json_encode($data));
}

function success() {
    die(0);
}

function error($status, $msg) {
    header("HTTP/1.0 $status Not Found");
    die($msg);
}

function body() {
    return json_decode(file_get_contents('php://input'), true);
}

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
        'expanded' => isset($meta['expanded']) ? $meta['expanded'] == 1 : false,
        'content' => trim($parts[1]),
        'updated' => filemtime($filename)
    );
}

function readPageById($id) {
    return readPageByFilename(toFilename($id));
}

function writePage($id, $title, $icon, $expanded, $content) {
    file_put_contents(toFilename($id), "title: $title\nicon: $icon\nexpanded: $expanded\n" . CONFIG_META_SEPARATOR . "\n$content");
}

function text2SpeechAuth() {
    global $azureTextToSpeechApiKey;
    $context = stream_context_create([
        'http' => [
            'header' => "Ocp-Apim-Subscription-Key: " . CONFIG_AZURE_TEXT_TO_SPEECH_API_KEY . "\r\nContent-Length: 0",
            'method' => 'POST'
        ],
    ]);
    $result = file_get_contents('https://eastus.api.cognitive.microsoft.com/sts/v1.0/issueToken', false, $context);
    if ($result === false) {
        error(500, "autherror");
    }
    return $result;
}

function text2Speech($text) {
    $data = "<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='Male' name='en-US-ChristopherNeural'>$text</voice></speak>";
    $context = stream_context_create([
        'http' => [
            'header' => "Content-type: application/ssml+xml\r\nUser-Agent: MarkdownNotes\r\nAuthorization: Bearer " . text2SpeechAuth() . "\r\nX-Microsoft-OutputFormat: audio-16khz-64kbitrate-mono-mp3\r\nContent-Length: " . strlen($data) . "\r\n",
            'method' => 'POST',
            'content' => $data,
        ],
    ]);
    $result = file_get_contents('https://eastus.tts.speech.microsoft.com/cognitiveservices/v1', false, $context);
    if ($result === false) {
        error(500, "text2speech error");
    }
    return $result;
}

// add/edit page
router('POST', '/page$', function() {
    $data = body();
    $id = parseString($data, 'id');
    $title = parseString($data, 'title');
    $icon = parseString($data, 'icon');
    $expanded = $data['expanded'] === true;
    $content = isset($data['content']) ? $data['content'] : readPageById($id)["content"];

    if (strlen($id) == 0) {
        error(404, "invalid id");
    }

    writePage($id, $title, $icon, $expanded, $content);
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

    success();
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

// text2speech
router('GET', '/text2speech$', function() {
    $text = htmlspecialchars($_GET["text"]);
    $filename = CONFIG_AUDIO_PATH . sanitizeFilename($text) . ".mp3";
    if (file_exists($filename)) {
        header('Content-Type: audio/mpeg');
        die(file_get_contents($filename));
    }
    $mp3 = text2Speech($text);
    file_put_contents($filename, $mp3);
    header('Content-Type: audio/mpeg');
    echo $mp3;
});


header("HTTP/1.0 404 Not Found");
echo '404 Not Found';