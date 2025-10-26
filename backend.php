<?PHP

include("config.php");
require_once("vendor/autoload.php");

define("CONFIG_DATA_PATH", __DIR__ . "/data/pages/");
define("CONFIG_FILES_PATH", __DIR__ . "/data/files/");
define("CONFIG_AUDIO_PATH", __DIR__ . "/data/audio/");
define("CONFIG_ATTACHMENT_PATH", __DIR__ . "/data/attachments/");
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
    if(isset($_SERVER['HTTP_ACCEPT_ENCODING']) && strpos($_SERVER['HTTP_ACCEPT_ENCODING'],'gzip')!==FALSE) {
        header('Content-Type: application/json');
        header('Content-Encoding: gzip');
        die(gzencode($json));
    } else {
        header('Content-Type: application/json');
        die($json);
    }
}

function json($data) {
    header('Content-Type: application/json; charset=utf-8');
    gzip(json_encode($data, JSON_UNESCAPED_UNICODE));
}

function error($status, $msg) {
    header("HTTP/1.0 $status Not Found");
    die($msg);
}

function body() {
    return json_decode(file_get_contents('php://input'), true);
}

function chatgpt($prompt) {
    $context = stream_context_create([
        'http' => [
            'header' => "api-key: " . CONFIG_CHATGPT_API_KEY . "\r\nContent-Type: application/json",
            'method' => 'POST',
            'content' => json_encode(array(
                "model" => CONFIG_CHATGPT_MODEL,
                "messages" => array(
                    array(
                        "role" => "user",
                        "content" => $prompt
                    )
                )
            )),
            'ignore_errors' => true
        ],
    ]);
    
    $result = file_get_contents(CONFIG_CHATGPT_URL, false, $context);
    if ($result === false) {
        if (isset($http_response_header) && is_array($http_response_header)) {
            $status_line = $http_response_header[0];
            if (preg_match('/HTTP\/\d+\.\d+ (\d+)/', $status_line, $matches)) {
                $status_code = $matches[1];
                error(500, "HTTP Error: " . $status_code);
            } else {
                error(500, "Unknown HTTP error");
            }
        } else {
            error(500, "Connection error");
        }
    }
    
    $responseArray = json_decode($result, true);
    if ($responseArray !== null && isset($responseArray['choices'][0]['message']['content'])) {
        $content = $responseArray['choices'][0]['message']['content'];
        return $content;
    } else if ($responseArray !== null && isset($responseArray['choices'][0]['content_filter_results'])) {
        return false;
    } else {
        error(500, "invalid response from chatgpt" . json_encode($responseArray));
    }
}

// time
router('GET', '/$', function() {
    die("".time());
});

include("backend_pages.php");
include("backend_vocabulary.php");
include("backend_email.php");
include("backend_news.php");

header("HTTP/1.0 404 Not Found");
echo '404 Not Found';