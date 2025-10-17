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

function chatgptStory($words) {
    $response = chatgpt("Please write an easy, short, and entertaining story with the following words: " . $words);
    if ($response === false) {
        error(500, "chatgpt story generation failed");
    }
    return $response;
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