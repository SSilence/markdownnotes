<?PHP

# rename this file to config.php and fill in your own keys and settings

define("CONFIG_AZURE_TEXT_TO_SPEECH_API_KEY", "");
define("CONFIG_CHATGPT_URL", "");
define("CONFIG_CHATGPT_API_KEY", "");
define("CONFIG_CHATGPT_MODEL", "");
define("CONFIG_PONS_API_KEY", "");
define("CONFIG_PEXELS_API_KEY", "");
define("CONFIG_UNSPLASH_ACCESS_KEY", "");

define("CONFIG_IMAP_HOST", "");
define("CONFIG_IMAP_PORT", 993);
define("CONFIG_IMAP_ENCRYPTION", "SSL"); // SSL, TLS, NO_TLS
define("CONFIG_IMAP_USER", "");
define("CONFIG_IMAP_PASSWORD", "");

define("CONFIG_SMTP_HOST", "");
define("CONFIG_SMTP_PORT", 465);
define("CONFIG_SMTP_USER", "");
define("CONFIG_SMTP_PASSWORD", "");
define("CONFIG_SMTP_NAME", "");
define("CONFIG_SMTP_EMAIL", "");

define("CONFIG_NEWS_SOURCES", ["https://www.tagesschau.de"]);
define("CONFIG_NEWS_PROMPT", <<<EOD
* This is the homepage of a news website.
* Extract the most important news headlines and summarize them in a list.
* Only extract the absolutely most important news. I only want news about books, literature, the book market, or authors.
* Think carefully about which news items are truly important.
* You want to bother me as little as possible, so you’re very cautious about what you return to me.
* Output the news as JSON in the following format: 
    [{"title": "News headline", "summary": "Short summary of the news", "url": "Link to the news"}]
* Output only the JSON, nothing else.
    
The HTML content of the page is here:
%html%
EOD);
