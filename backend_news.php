<?php

router('GET', '/news/update$', function() {
    $filename = CONFIG_DATA_PATH . "news.md";
    
    // Load existing news
    $existingNews = [];
    $existingUrls = [];
    if (file_exists($filename)) {
        $content = @file_get_contents($filename);
        $parts = preg_split("/".CONFIG_META_SEPARATOR."/", $content);
        $existingNews = json_decode(trim($parts[1]), true) ?: [];
        foreach ($existingNews as $item) {
            if (!empty($item['url'])) {
                $existingUrls[$item['url']] = true;
            }
        }
    }
    
    // Fetch and add new news
    $addedCount = 0;
    foreach (CONFIG_NEWS_SOURCES as $url) {
        $html = file_get_contents($url);
        $html = preg_replace('/<style[^>]*>.*?<\/style>/is', '', $html);
        $html = preg_replace('/<script[^>]*>.*?<\/script>/is', '', $html);
        $html = preg_replace('/<header[^>]*>.*?<\/header>/is', '', $html);
        $html = preg_replace('/<head[^>]*>.*?<\/head>/is', '', $html);
        $html = preg_replace('/<picture[^>]*>.*?<\/picture>/is', '', $html);
        $html = preg_replace('/<source[^>]*>/is', '', $html);
        $html = preg_replace('/<svg[^>]*>.*?<\/svg>/is', '', $html);
        $html = preg_replace('/<!--.*?-->/s', '', $html);
        
        // Remove all attributes except href and title
        $html = preg_replace_callback('/<(\w+)([^>]*)>/i', function($matches) {
            $tag = $matches[1];
            $attrs = $matches[2];
            $keepAttrs = '';
            if (preg_match('/\s+(href="[^"]*")/i', $attrs, $m)) {
                $keepAttrs .= ' ' . $m[1];
            }
            if (preg_match('/\s+(title="[^"]*")/i', $attrs, $m)) {
                $keepAttrs .= ' ' . $m[1];
            }
            
            return '<' . $tag . $keepAttrs . '>';
        }, $html);

        $news = json_decode(chatgpt(str_replace('%html%', $html, CONFIG_NEWS_PROMPT)), true);
        if (is_array($news)) {
            foreach ($news as $item) {
                if (is_array($item) && !empty($item['url']) && !isset($existingUrls[$item['url']])) {
                    $item['timestamp'] = time();
                    $existingNews[] = $item;
                    $existingUrls[$item['url']] = true;
                    $addedCount++;
                }
            }
        }
    }
    
    // Delete news older than 1 week
    $oneWeekAgo = time() - (7 * 24 * 60 * 60);
    $existingNews = array_filter($existingNews, function($item) use ($oneWeekAgo) {
        return !empty($item['timestamp']) && $item['timestamp'] >= $oneWeekAgo;
    });
    // Reindex array
    $existingNews = array_values($existingNews);
    
    // Save updated news
    file_put_contents(
        $filename, 
        "title: News\nicon: help-info\ndisabled: 0\nexpanded: 1\n" . CONFIG_META_SEPARATOR . "\n" .
        json_encode($existingNews, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
    
    json(array('total' => count($existingNews), 'added' => $addedCount, 'news' => $existingNews));
});