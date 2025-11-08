<?php

function text2SpeechAuth() {
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

function text2Speech($text, $lang) {
    $voice = "en-US-ChristopherNeural";
    if ($lang == "fr-FR") {
        $voice = "fr-FR-HenriNeural";
    } else if ($lang == "de-DE") {
        $voice = "de-DE-ChristophNeural";
    } else if ($lang == "hr-HR") {
        $voice = "hr-HR-GabrijelaNeural";
    }

    $data = "<speak version='1.0' xml:lang='$lang'><voice xml:lang='$lang' xml:gender='Male' name='$voice'>$text</voice></speak>";
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

function chatgptStory($words) {
    $response = chatgpt("Please write an easy, short, and entertaining story with the following words: " . $words);
    if ($response === false) {
        error(500, "chatgpt story generation failed");
    }
    return $response;
}

function fetchPexelsImages($query, $perPage) {
    $url = "https://api.pexels.com/v1/search?query=" . urlencode($query) . "&per_page=" . $perPage;

    $context = stream_context_create([
        'http' => [
            'header' => "Authorization: " . CONFIG_PEXELS_API_KEY . "\r\nAccept: application/json",
            'method' => 'GET',
            // don't emit warnings on HTTP 4xx/5xx; allow reading error body
            'ignore_errors' => true
        ],
    ]);

    // suppress warnings from file_get_contents (e.g., 403) and handle via headers
    $result = @file_get_contents($url, false, $context);

    // Check HTTP status code if available
    if ($result === false || (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m) && (int)$m[1] >= 400)) {
        // Gracefully degrade: no images from this provider
        return [];
    }

    $response = json_decode($result, true);
    if ($response === null || !isset($response['photos']) || !is_array($response['photos'])) {
        return [];
    }

    $images = [];
    foreach ($response['photos'] as $photo) {
        if (!is_array($photo) || !isset($photo['src']) || !is_array($photo['src'])) {
            continue;
        }

        $src = $photo['src'];
        $chosen = isset($src['large']) ? $src['large'] : (isset($src['medium']) ? $src['medium'] : (isset($src['original']) ? $src['original'] : null));
        if ($chosen === null && isset($photo['url'])) {
            $chosen = $photo['url'];
        }

        if ($chosen !== null) {
            $images[] = $chosen;
        }
    }

    return $images;
}

function fetchUnsplashImages($query, $perPage) {
    if (!defined("CONFIG_UNSPLASH_ACCESS_KEY") || CONFIG_UNSPLASH_ACCESS_KEY === "") {
        return [];
    }

    $url = "https://api.unsplash.com/search/photos?query=" . urlencode($query) . "&per_page=" . $perPage;
    $context = stream_context_create([
        'http' => [
            'header' => "Authorization: Client-ID " . CONFIG_UNSPLASH_ACCESS_KEY . "\r\nAccept: application/json",
            'method' => 'GET',
            // don't emit warnings on HTTP 4xx/5xx; allow reading error body
            'ignore_errors' => true
        ],
    ]);

    // suppress warnings from file_get_contents (e.g., 403) and handle via headers
    $result = @file_get_contents($url, false, $context);

    // Check HTTP status code if available
    if ($result === false || (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m) && (int)$m[1] >= 400)) {
        // Gracefully degrade: no images from this provider
        return [];
    }

    $response = json_decode($result, true);
    if ($response === null || !isset($response['results']) || !is_array($response['results'])) {
        return [];
    }

    $images = [];
    foreach ($response['results'] as $photo) {
        if (!is_array($photo) || !isset($photo['urls']) || !is_array($photo['urls'])) {
            continue;
        }

        $urls = $photo['urls'];
        $chosen = isset($urls['regular']) ? $urls['regular'] : (isset($urls['small']) ? $urls['small'] : (isset($urls['full']) ? $urls['full'] : null));
        if ($chosen !== null) {
            $images[] = $chosen;
        }
    }

    return $images;
}

function fetchPixabayImages($query, $perPage) {
    if (!defined("CONFIG_PIXABAY_API_KEY") || CONFIG_PIXABAY_API_KEY === "") {
        return [];
    }

    $url = "https://pixabay.com/api/?key=" . urlencode(CONFIG_PIXABAY_API_KEY) . "&q=" . urlencode($query) . "&image_type=photo&per_page=" . $perPage . "&safesearch=true";
    $context = stream_context_create([
        'http' => [
            'header' => "Accept: application/json",
            'method' => 'GET',
            'ignore_errors' => true
        ],
    ]);

    $result = @file_get_contents($url, false, $context);

    if ($result === false || (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m) && (int)$m[1] >= 400)) {
        return [];
    }

    $response = json_decode($result, true);
    if ($response === null || !isset($response['hits']) || !is_array($response['hits'])) {
        return [];
    }

    $images = [];
    foreach ($response['hits'] as $hit) {
        if (!is_array($hit)) {
            continue;
        }

        $chosen = isset($hit['largeImageURL']) ? $hit['largeImageURL'] : (isset($hit['webformatURL']) ? $hit['webformatURL'] : (isset($hit['previewURL']) ? $hit['previewURL'] : null));
        if ($chosen !== null) {
            $images[] = $chosen;
        }
    }

    return $images;
}

// text2speech
router('GET', '/text2speech$', function() {
    $text = htmlspecialchars($_GET["text"]);
    $lang = strtolower(isset($_GET["language"]) ? htmlspecialchars($_GET["language"]) : "en");
    if ($lang == "en") {
        $lang = "en-US";
    } else if ($lang == "de") {
        $lang = "de-DE";
    } else {
        $lang = "en-US";
    }

    if ($lang == "de-DE") {
        $text = preg_replace('/\betw\b/u', 'etwas', $text);
        $text = preg_replace('/\bjdn\b/u', 'jemanden', $text);
    } else if ($lang == "en-US") {
        $text = preg_replace('/\bsth\b/u', 'something', $text);
        $text = preg_replace('/\bsb\b/u', 'somebody', $text);
    }

    $path = CONFIG_AUDIO_PATH . $lang . "/";
    if (!file_exists($path)) {
        mkdir($path, 0777);
    }

    $filename = $path . sanitizeFilename($text) . ".mp3";
    if (file_exists($filename)) {
        header('Content-Type: audio/mpeg');
        die(file_get_contents($filename));
    }
    $mp3 = text2Speech($text, $lang);
    file_put_contents($filename, $mp3);
    header('Content-Type: audio/mpeg');
    echo $mp3;
});

// chatgptStory
router('POST', '/story$', function() {
    $words = file_get_contents('php://input');
    die(chatgptStory($words));
});

// enrich vocabulary
router('GET', '/vocabulary/enrich$', function() {
    $english = htmlspecialchars($_GET["english"]);
    $german = htmlspecialchars($_GET["german"]);
    $score = chatgpt("You are an expert for the English language. Rate the word $english (in German $german) between 1 and 10. 10 means it is a very useful and often used. 1 means it is very rarely used and not useful. Please only return the number, nothing else.");
    $score = $score === false ? 5 : $score;
    $example = chatgpt("You are an expert for the English language. You are a English teacher. Create a short and simple sentence with the word $english (the German meaning $german) to show how it is used in a sentence. The example sentence should use the word in the meaning it has in German. Mark the used word as **bold**. Please only return the sentence, nothing else.");
    $example = $example === false ? "" : $example;
    json(array(
        "score" => (int)$score,
        "example" => $example
    ));
});

// dictionary
router('GET', '/vocabulary/dictionary$', function() {
    $q = htmlspecialchars($_GET["q"]);

    $context = stream_context_create([
        'http' => [
            'header' => "X-Secret: " . CONFIG_PONS_API_KEY . "\r\nContent-Type: application/json",
            'method' => 'GET'
        ],
    ]);
    
    try {
        $result = file_get_contents("https://api.pons.com/v1/dictionary?l=deen&q=" . urlencode($q) . "&language=en", false, $context);
    } catch (Exception $e) {
        error(500, "dictionary error: " . $e->getMessage());
    }

    if ($result === false) {
        error(500, "error");
    }
    
    $responseArray = json_decode($result, true);
    if ($responseArray !== null && isset($responseArray)) {
        $result = [];
        foreach ($responseArray as $lang) {
            $sourceLang = $lang['lang'];
            foreach ((isset($lang['hits']) ? $lang['hits'] : []) as $entry) {
                foreach ((isset($entry['roms']) ? $entry['roms'] : []) as $rom) {
                    $headword = $rom['headword'];
                    $wordclass = isset($rom['wordclass']) ? $rom['wordclass'] : "";
                    foreach ((isset($rom['arabs']) ? $rom['arabs'] : []) as $arab) {
                        $header = $arab['header'];
                        foreach ((isset($arab['translations']) ? $arab['translations'] : []) as $translation) {
                            $result[] = array(
                                "lang" => $sourceLang,
                                "headword" => trim(strip_tags(html_entity_decode($headword))),
                                "wordclass" => trim(strip_tags(html_entity_decode($wordclass))),
                                "header" => trim(strip_tags(html_entity_decode($header))),
                                "source" => trim(strip_tags(html_entity_decode(($translation["source"])))),
                                "target" => trim(strip_tags(html_entity_decode($translation["target"])))
                            );
                        }
                    }
                }
            }
        }
        json($result);
    } else {
        json([]);
    }    
});

router('GET', '/images$', function() {
    $qParam = isset($_GET["q"]) ? trim($_GET["q"]) : "";
    if ($qParam === "") {
        json([]);
    }
    $q = htmlspecialchars($qParam);

    $perPage = isset($_GET["per_page"]) ? (int)$_GET["per_page"] : 30;
    if ($perPage < 1) {
        $perPage = 1;
    } else if ($perPage > 80) {
        $perPage = 80;
    }

    try {
        $pexelsImages = fetchPexelsImages($q, $perPage);
    } catch (Exception $e) {
        $pexelsImages = [];    
    }

    try {
        $unsplashImages = fetchUnsplashImages($q, $perPage);
    } catch (Exception $e) {
        $unsplashImages = [];
    }

    try {
        $pixabayImages = fetchPixabayImages($q, $perPage);
    } catch (Exception $e) {
        $pixabayImages = [];
    }

    $merged = array_merge($pexelsImages, $unsplashImages, $pixabayImages);
    $images = array_values(array_unique($merged));

    json($images);
});

router('POST', '/image$', function() {
    $data = body();
    $vocabulary = isset($data['vocabulary']) ? trim($data['vocabulary']) : "";
    $imageBase64 = isset($data['image']) ? $data['image'] : "";

    if ($vocabulary === "" || $imageBase64 === "") {
        error(400, "invalid payload");
    }

    $sanitizedName = sanitizeFilename($vocabulary);
    if ($sanitizedName === "") {
        error(400, "invalid vocabulary");
    }

    $imageBase64 = preg_replace('/^data:image\/[a-zA-Z0-9\+\-\.]+;base64,/', '', $imageBase64);
    $imageData = base64_decode($imageBase64, true);
    if ($imageData === false) {
        error(400, "invalid image");
    }

    if (!file_exists(CONFIG_IMAGES_PATH)) {
        mkdir(CONFIG_IMAGES_PATH, 0777, true);
    }

    $filename = CONFIG_IMAGES_PATH . $sanitizedName . ".jpg";
    if (file_put_contents($filename, $imageData) === false) {
        error(500, "unable to save image");
    }
});

router('GET', '/image/(?<vocabulary>.+)$', function($params) {
    $vocabulary = isset($params['vocabulary']) ? urldecode($params['vocabulary']) : "";
    $sanitizedName = sanitizeFilename($vocabulary);
    if ($sanitizedName === "") {
        error(404, "image not found");
    }

    $filename = CONFIG_IMAGES_PATH . $sanitizedName . ".jpg";
    if (!file_exists($filename)) {
        error(404, "image not found");
    }

    header('Content-Type: image/jpeg');
    readfile($filename);
});

router('DELETE', '/image/(?<vocabulary>.+)$', function($params) {
    $vocabulary = isset($params['vocabulary']) ? urldecode($params['vocabulary']) : "";
    $sanitizedName = sanitizeFilename($vocabulary);
    if ($sanitizedName === "") {
        error(404, "image not found");
    }

    $filename = CONFIG_IMAGES_PATH . $sanitizedName . ".jpg";
    if (!file_exists($filename)) {
        error(404, "image not found");
    }

    if (!unlink($filename)) {
        error(500, "unable to delete image");
    }
});

router('POST', '/image_has$', function() {
    $data = body();
    if (!is_array($data)) {
        error(400, "invalid payload");
    }

    $result = array();
    foreach ($data as $item) {
        if (!is_string($item)) {
            continue;
        }

        $sanitizedName = sanitizeFilename($item);
        if ($sanitizedName === "") {
            $result[$item] = false;
            continue;
        }

        $filename = CONFIG_IMAGES_PATH . $sanitizedName . ".jpg";
        $result[$item] = file_exists($filename);
    }

    json($result);
});
