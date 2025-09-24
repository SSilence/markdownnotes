<?PHP

// Start output buffering to catch any unwanted output
ob_start();

use DirectoryTree\ImapEngine\Mailbox;
use DirectoryTree\ImapEngine\Message;
use DirectoryTree\ImapEngine\Enums\ImapFetchIdentifier;
use DirectoryTree\ImapEngine\DraftMessage;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

function createImapClient() {
    return new Mailbox([
        'port' => CONFIG_IMAP_PORT,
        'username' => CONFIG_IMAP_USER,
        'password' => CONFIG_IMAP_PASSWORD,
        'encryption' => CONFIG_IMAP_ENCRYPTION,
        'host' => CONFIG_IMAP_HOST,
    ]);
}

function decodeUtf7ImapFolderName($folderName) {
    return preg_replace_callback('/&([A-Za-z0-9+\/]*)-?/', function($matches) {
        if (empty($matches[1])) {
            return '&'; // &- becomes &
        }

        // Convert IMAP UTF-7 to standard Base64
        $base64 = str_replace(',', '/', $matches[1]);

        // Add padding if needed
        $padding = strlen($base64) % 4;
        if ($padding) {
            $base64 .= str_repeat('=', 4 - $padding);
        }

        // Decode and convert to UTF-8
        $utf16 = base64_decode($base64);
        if ($utf16 === false) {
            return $matches[0]; // Return original if decode fails
        }

        // Convert UTF-16BE to UTF-8
        $utf8 = mb_convert_encoding($utf16, 'UTF-8', 'UTF-16BE');
        return $utf8 ?: $matches[0]; // Return original if conversion fails
    }, $folderName);
}

function decodeMimeHeader($header) {
    if (empty($header)) {
        return '';
    }

    // Check if the header contains encoded words
    if (!preg_match('/=\?[^?]+\?[BbQq]\?[^?]*\?=/', $header)) {
        // Not encoded, assume it's already in UTF-8 (as returned by the IMAP library)
        return $header;
    }

    // Encoded, use mb_decode_mimeheader
    if (function_exists('mb_decode_mimeheader')) {
        // Ensure internal encoding is UTF-8
        if (function_exists('mb_internal_encoding')) {
            mb_internal_encoding('UTF-8');
        }
        return mb_decode_mimeheader($header);
    }

    // Fallback to iconv_mime_decode
    if (function_exists('iconv_mime_decode')) {
        $decoded = iconv_mime_decode($header, ICONV_MIME_DECODE_CONTINUE_ON_ERROR, 'UTF-8');
        if ($decoded !== false) {
            return $decoded;
        }
    }

    // Last fallback: manual decoding
    return preg_replace_callback('/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/', function($matches) {
        $charset = $matches[1];
        $encoding = strtoupper($matches[2]);
        $text = $matches[3];

        if ($encoding === 'B') {
            // Base64 decoding
            $decoded = base64_decode($text);
        } elseif ($encoding === 'Q') {
            // Quoted-printable decoding
            $text = str_replace('_', ' ', $text); // Replace underscores with spaces
            $decoded = quoted_printable_decode($text);
        } else {
            return $matches[0]; // Unknown encoding
        }

        if ($decoded === false) {
            return $matches[0];
        }

        // Convert to UTF-8 if necessary
        if (strtolower($charset) !== 'utf-8') {
            $converted = mb_convert_encoding($decoded, 'UTF-8', $charset);
            if ($converted !== false) {
                return $converted;
            }
        }

        return $decoded;
    }, $header);
}

function findFolder($imapClient, $folderNames) {
    $folderNames = array_map('strtolower', $folderNames);
    foreach ($imapClient->folders()->get() as $folder) {
        $foldername = strtolower(decodeUtf7ImapFolderName($folder->path()));
        if (in_array($foldername, $folderNames)) {
            return $folder;
        }
    }
    return null;
}

function findMessage($folderName, $messageId) {
    $imapClient = createImapClient();
    $folder = findFolder($imapClient, [$folderName]);

    if (!$folder) {
        error(404, "Folder not found: " . htmlspecialchars($folderName));
    }

    $message = $folder->messages()
        ->withHeaders()
        ->withFlags()
        ->withBody()
        ->find($messageId, ImapFetchIdentifier::Uid);

    if (!$message) {
        error(404, "Message not found with ID: " . intval($messageId));
    }

    return $message;
}

function deleteDraft($draftId) {
    $imapClient = createImapClient();
    $draftsFolder = findFolder($imapClient, ['drafts', 'entwürfe', 'draft']);
    if (!$draftsFolder) {
        error(404, "Drafts folder not found");
    }
    $message = $draftsFolder->messages()
        ->withHeaders()
        ->withFlags()
        ->withBody()
        ->find($draftId, ImapFetchIdentifier::Uid);
    if ($message) {
        $message->delete(true);
    }
    $draftsFolder->expunge();
}

router('GET', '/imap/enabled$', function() {
    json(array('enabled' => !empty(CONFIG_IMAP_HOST) && !empty(CONFIG_IMAP_USER) && !empty(CONFIG_IMAP_PASSWORD)));
});

// load all IMAP folders with unread message count
router('GET', '/imap/folders$', function() {
    $imapClient = createImapClient();
    $folders = [];
    foreach ($imapClient->folders()->get() as $folder) {
        $folders[] = [
            'name' => decodeUtf7ImapFolderName($folder->path()),
            'unread' => (int)$folder->status()['UNSEEN'],
            'total' => (int)$folder->status()['MESSAGES'],
            'isTrash' => in_array("\\Trash", $folder->flags()),
            'isSent' => in_array("\\Sent", $folder->flags()),
            'isDraft' => in_array("\\Drafts", $folder->flags()),
            'isJunk' => in_array("\\Junk", $folder->flags()),
            'isArchive' => in_array("\\Archive", $folder->flags()),
            'isInbox' => in_array(strtolower($folder->path()), ['inbox', 'posteingang']),
        ];
    }
    json($folders);
});

// load all emails from a folder with pagination
router('GET', '/imap/folder/(?<folder>.+)$', function($params) {
    $imapClient = createImapClient();
    $folder = findFolder($imapClient, [urldecode($params['folder'])]);

    // Get pagination parameters from query string
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 30;
    $start = isset($_GET['start']) ? (int)$_GET['start'] : 0;
    $order = isset($_GET['order']) ? $_GET['order'] : 'DESC'; // DESC = newest first, ASC = oldest first

    // Validate parameters
    $limit = max(1, min($limit, 100)); // Between 1 and 100
    $start = max(0, $start); // At least 0
    $order = in_array(strtoupper($order), ['ASC', 'DESC']) ? strtoupper($order) : 'DESC';

    // First, collect all messages
    $allMessages = [];
    $folder->messages()
        ->withHeaders()
        ->withFlags()
        ->withoutBody()
        ->each(function (Message $message) use (&$allMessages) {
            // Decode MIME headers for proper display
            $from = $message->from();
            $subject = $message->subject();
            $to = $message->to();
            $cc = $message->cc();
            $bcc = $message->bcc();
            $replyTo = $message->replyTo();

            // Helper function to ensure we always work with arrays
            $ensureArray = function($value) {
                if ($value === null) return [];
                return is_array($value) ? $value : [$value];
            };

            $allMessages[] = [
                'id' => $message->uid(),
                'subject' => decodeMimeHeader($subject),
                'from' => [
                    'name' => decodeMimeHeader($from ? $from->name() : ''),
                    'email' => $from ? $from->email() : ''
                ],
                'to' => array_map(function($addr) {
                    return [
                        'name' => decodeMimeHeader($addr->name()),
                        'email' => $addr->email()
                    ];
                }, $ensureArray($to)),
                'cc' => array_map(function($addr) {
                    return [
                        'name' => decodeMimeHeader($addr->name()),
                        'email' => $addr->email()
                    ];
                }, $ensureArray($cc)),
                'bcc' => array_map(function($addr) {
                    return [
                        'name' => decodeMimeHeader($addr->name()),
                        'email' => $addr->email()
                    ];
                }, $ensureArray($bcc)),
                'replyTo' => array_map(function($addr) {
                    return [
                        'name' => decodeMimeHeader($addr->name()),
                        'email' => $addr->email()
                    ];
                }, $ensureArray($replyTo)),
                'date' => $message->date(),
                'isSeen' => $message->isSeen(),
                'isDraft' => $message->isDraft(),
                'isAnswered' => $message->isAnswered(),
                'isFlagged' => $message->isFlagged(),
                'isDeleted' => $message->isDeleted(),
                'hasAttachments' => !empty($message->attachments())
            ];
        }, chunkSize: 50);

    // Sort messages by date
    usort($allMessages, function($a, $b) use ($order) {
        $dateA = $a['date'] ? strtotime($a['date']) : 0;
        $dateB = $b['date'] ? strtotime($b['date']) : 0;

        if ($order === 'ASC') {
            return $dateA <=> $dateB;
        } else {
            return $dateB <=> $dateA; // DESC - newest first
        }
    });

    // Apply pagination
    $messages = array_slice($allMessages, $start, $limit);

    json($messages);
});

// load one email by id
router('GET', '/imap/message/(?<folder>.+)/(?<id>\d+)$', function($params) {
    $message = findMessage(urldecode($params['folder']), $params['id']);
    $folder = findFolder(createImapClient(), [urldecode($params['folder'])]);

    // Decode MIME headers for proper display
    $from = $message->from();
    $subject = $message->subject();
    $to = $message->to();
    $cc = $message->cc();
    $bcc = $message->bcc();
    $replyTo = $message->replyTo();

    // Helper function to ensure we always work with arrays
    $ensureArray = function($value) {
        if ($value === null) return [];
        return is_array($value) ? $value : [$value];
    };

    json([
        'id' => $message->uid(),
        'subject' => decodeMimeHeader($subject),
        'from' => [
            'name' => decodeMimeHeader($from ? $from->name() : ''),
            'email' => $from ? $from->email() : ''
        ],
        'to' => array_map(function($addr) {
            return [
                'name' => decodeMimeHeader($addr->name()),
                'email' => $addr->email()
            ];
        }, $ensureArray($to)),
        'cc' => array_map(function($addr) {
            return [
                'name' => decodeMimeHeader($addr->name()),
                'email' => $addr->email()
            ];
        }, $ensureArray($cc)),
        'bcc' => array_map(function($addr) {
            return [
                'name' => decodeMimeHeader($addr->name()),
                'email' => $addr->email()
            ];
        }, $ensureArray($bcc)),
        'replyTo' => array_map(function($addr) {
            return [
                'name' => decodeMimeHeader($addr->name()),
                'email' => $addr->email()
            ];
        }, $ensureArray($replyTo)),
        'date' => $message->date(),
        'isSeen' => $message->isSeen(),
        'isDraft' => in_array("\\Drafts", $folder->flags()),
        'isAnswered' => $message->isAnswered(),
        'isFlagged' => $message->isFlagged(),
        'isDeleted' => $message->isDeleted(),
        'hasAttachments' => !empty($message->attachments()),
        'bodyText' => $message->text(),
        'bodyHtml' => $message->html(),
        'attachments' => array_map(function($att) {
            return [
                'name' => decodeMimeHeader($att->filename()),
                'size' => strlen($att->contents()),
                'type' => $att->contentType(),
                'cid' => $att->contentId()
            ];
        }, $message->attachments())
    ]);
});

// mark email as seen/unseen
router('POST', '/imap/mark$', function() {
    $data = body();
    $messageId = isset($data['messageId']) ? intval($data['messageId']) : 0;
    $folderName = parseString($data, 'folder');
    $seen = isset($data['seen']) ? $data['seen'] : true;
    $message = findMessage($folderName, $messageId);
    if ($seen) {
        $message->markSeen();
    } else {
        $message->unmarkSeen();
    }
});

// mark all emails in folder as read
router('POST', '/imap/markall/(?<folder>.+)$', function($params) {
    $imapClient = createImapClient();
    $folder = findFolder($imapClient, [urldecode($params['folder'])]);

    $folder->messages()
        ->withHeaders()
        ->withFlags()
        ->withoutBody()
        ->each(function (Message $message) use (&$allMessages) {
            if (!$message->isSeen()) {
                $message->markSeen();
            }
        }, chunkSize: 50);
});

// move email to another folder
router('POST', '/imap/move$', function() {
    $data = body();
    $messageId = isset($data['messageId']) ? intval($data['messageId']) : 0;
    $sourceFolder = parseString($data, 'sourceFolder');
    $targetFolder = parseString($data, 'targetFolder');
    $message = findMessage($sourceFolder, $messageId);
    $message->move($targetFolder);
});

// purge folder (delete all messages)
router('POST', '/imap/purge$', function() {
    $imapClient = createImapClient();
    $data = body();
    $folderName = parseString($data, 'folder');
    $folder = findFolder($imapClient, [$folderName]);
    $folder
        ->messages()
        ->withFlags()
        ->each(fn (Message $message) => $message->delete(true));
    $folder->expunge();
});

// save draft
router('POST', '/imap/draft$', function() {
    $data = body();

    try {
        $imapClient = createImapClient();

        $draftsFolder = findFolder($imapClient, ['drafts', 'entwürfe', 'draft']);
        if (!$draftsFolder) {
            error(404, "Drafts folder not found");
        }

        // Parse recipients
        $to = isset($data['to']) && is_array($data['to']) ?
            implode(', ', array_map(function($addr) {
                return !empty($addr['name']) ? $addr['name'] . ' <' . $addr['email'] . '>' : $addr['email'];
            }, $data['to'])) : '';

        $cc = isset($data['cc']) && is_array($data['cc']) ?
            implode(', ', array_map(function($addr) {
                return !empty($addr['name']) ? $addr['name'] . ' <' . $addr['email'] . '>' : $addr['email'];
            }, $data['cc'])) : '';

        $bcc = isset($data['bcc']) && is_array($data['bcc']) ?
            implode(', ', array_map(function($addr) {
                return !empty($addr['name']) ? $addr['name'] . ' <' . $addr['email'] . '>' : $addr['email'];
            }, $data['bcc'])) : '';

        $from = CONFIG_SMTP_EMAIL;
        if (!empty(CONFIG_SMTP_NAME)) {
            $from = CONFIG_SMTP_NAME . ' <' . CONFIG_SMTP_EMAIL . '>';
        }

        // Create draft message
        $draftParams = [
            'from' => $from,
            'to' => $to,
            'subject' => isset($data['subject']) ? $data['subject'] : '',
            'text' => isset($data['bodyText']) ? $data['bodyText'] : '',
            'html' => isset($data['bodyHtml']) ? $data['bodyHtml'] : ''
        ];

        if (!empty($cc)) {
            $draftParams['cc'] = $cc;
        }

        if (!empty($bcc)) {
            $draftParams['bcc'] = $bcc;
        }

        // Handle attachments if present
        $attachments = [];
        if (isset($data['attachments']) && is_array($data['attachments'])) {
            foreach ($data['attachments'] as $attachment) {
                if (isset($attachment['content']) && isset($attachment['name'])) {
                    $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $attachment['name']);
                    $tempFile = sys_get_temp_dir() . '/' . $safeName;
                    @unlink($tempFile);
                    $content = base64_decode($attachment['content']);
                    if ($content !== false) {
                        file_put_contents($tempFile, $content);
                        $attachments[] = $tempFile;
                    }
                }
            }
        }

        if (!empty($attachments)) {
            $draftParams['attachments'] = $attachments;
        }

        // Create and save the draft
        $draftMessage = new DraftMessage(...$draftParams);
        $uid = $draftsFolder->messages()->append($draftMessage);

        // Clean up temporary attachment files
        foreach ($attachments as $tempFile) {
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
        }

        // delete the old draft
        if (isset($data['id']) && !empty($data['id']) && is_numeric($data['id']) && $data['id'] > 0) {
            deleteDraft($data['id']);
        }

        die("".$uid);
    } catch (Exception $e) {
        error(500, "Failed to save draft: " . $e->getMessage());
    }
});

// delete draft
router('DELETE', '/imap/draft/(?<id>.+)$', function($params) {
    deleteDraft($params['id']);
});

// get all unique contacts (for autocomplete)
router('GET', '/imap/contacts$', function() {
    $imapClient = createImapClient();
    $contacts = [];
    foreach ($imapClient->folders()->get() as $folder) {
        $folder
            ->messages()
            ->withHeaders()
            ->withFlags()
            ->withoutBody()
            ->each(function (Message $message) use (&$messages, &$contacts) {
                $addresses = [];

                // Helper function to ensure we always work with arrays
                $ensureArray = function($value) {
                    if ($value === null) return [];
                    return is_array($value) ? $value : [$value];
                };

                // Safely merge addresses, checking for null values
                $to = $message->to();
                $cc = $message->cc();
                $bcc = $message->bcc();
                $from = $message->from();
                $replyTo = $message->replyTo();

                $addresses = array_merge($addresses, $ensureArray($to));
                $addresses = array_merge($addresses, $ensureArray($cc));
                $addresses = array_merge($addresses, $ensureArray($bcc));
                $addresses = array_merge($addresses, $ensureArray($from));
                $addresses = array_merge($addresses, $ensureArray($replyTo));
                foreach ($addresses as $addr) {
                    $email = strtolower($addr->email());
                    if (!isset($contacts[$email]) && !empty($addr->email())) {
                        $contacts[$email] = [
                            'name' => decodeMimeHeader($addr->name()),
                            'email' => $addr->email()
                        ];
                    }
                }
            }, chunkSize: 20);
    }
    json(array_values($contacts));
});

// download email attachment
router('GET', '/imap/attachment/(?<folder>.+)/(?<messageId>\d+)/(?<attachmentName>.+)$', function($params) {
    $message = findMessage(urldecode($params['folder']), $params['messageId']);
    $name = urldecode($params['attachmentName']);
    $att = null;
    foreach ($message->attachments() as $a) {
        if ($a->filename() === $name) {
            $att = $a;
            break;
        }
    }
    if (!$att) {
        error(404, "Attachment not found");
    }
    $stream = $att->contentStream();
    ob_end_clean();
    header('Content-Type: ' . $att->contentType());
    header('Content-Disposition: inline; filename="' . $att->filename() . '"');
    if (method_exists($att, 'size')) {
        header('Content-Length: ' . $att->size());
    }
    header('Cache-Control: must-revalidate');
    header('Pragma: public');
    while (!$stream->eof()) {
        echo $stream->read(8192);
    }
    $stream->close();
    exit;
});

// send email
router('POST', '/imap/send$', function() {
    $data = body();
    
    try {
        if (empty($data['to']) || empty($data['subject'])) {
            error(400, "Missing required fields: to and subject");
        }

        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = CONFIG_SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = CONFIG_SMTP_USER;
        $mail->Password = CONFIG_SMTP_PASSWORD;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = CONFIG_SMTP_PORT;
        $mail->CharSet = 'UTF-8';

        $mail->setFrom(CONFIG_SMTP_EMAIL, CONFIG_SMTP_NAME);
        
        // Add TO recipients
        foreach ($data['to'] as $addr) {
            $mail->addAddress($addr['email'], $addr['name'] ?? '');
        }
        
        // Add CC recipients
        if (!empty($data['cc'])) {
            foreach ($data['cc'] as $addr) {
                $mail->addCC($addr['email'], $addr['name'] ?? '');
            }
        }
        
        // Add BCC recipients
        if (!empty($data['bcc'])) {
            foreach ($data['bcc'] as $addr) {
                $mail->addBCC($addr['email'], $addr['name'] ?? '');
            }
        }
        
        // Set reply-to if provided
        if (!empty($data['replyTo'])) {
            foreach ($data['replyTo'] as $addr) {
                $mail->addReplyTo($addr['email'], $addr['name'] ?? '');
            }
        }
        
        $mail->Subject = $data['subject'];
        
        // Set body
        $bodyHtml = $data['bodyHtml'] ?? '';
        $bodyText = $data['bodyText'] ?? '';
        if (!empty($bodyHtml)) {
            $mail->isHTML(true);
            $mail->Body = $bodyHtml;
            $mail->AltBody = !empty($bodyText) ? $bodyText : strip_tags($bodyHtml);
        } else {
            $mail->isHTML(false);
            $mail->Body = $bodyText;
        }
        
        // Handle attachments
        $tempFiles = [];
        if (!empty($data['attachments'])) {
            foreach ($data['attachments'] as $attachment) {
                if (!empty($attachment['content']) && !empty($attachment['name'])) {
                    $content = base64_decode($attachment['content']);
                    $tempFile = tempnam(sys_get_temp_dir(), 'email_att_');
                    file_put_contents($tempFile, $content);
                    $mail->addAttachment($tempFile, $attachment['name']);
                    $tempFiles[] = $tempFile;
                }
            }
        }
        
        // Attempt to send the email
        try {
            $mail->send();
        } catch (Exception $e) {
            // Clean up temp files
            foreach ($tempFiles as $tempFile) {
                if (file_exists($tempFile)) {
                    unlink($tempFile);
                }
            }
            error(500, "SMTP Error: " . $e->getMessage());
        }

        // Clean up temp files
        foreach ($tempFiles as $tempFile) {
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
        }

        // Save a copy of the sent email to the Sent folder
        try {
            $imapClient = createImapClient();

            // Find the Sent folder
            $sentFolder = findFolder($imapClient, ['sent', 'gesendet', 'sent items']);
            if ($sentFolder) {
                $emailHeader = "From: " . CONFIG_SMTP_NAME . " <" . CONFIG_SMTP_EMAIL . ">\r\n";
                $emailHeader .= "To: " . implode(', ', array_map(function($addr) { return !empty($addr['name']) ? $addr['name'] . ' <' . $addr['email'] . '>' : $addr['email']; }, $data['to'])) . "\r\n";
                if (!empty($data['cc'])) {
                    $emailHeader .= "Cc: " . implode(', ', array_map(function($addr) { return !empty($addr['name']) ? $addr['name'] . ' <' . $addr['email'] . '>' : $addr['email']; }, $data['cc'])) . "\r\n";
                }
                if (!empty($data['bcc'])) {
                    $emailHeader .= "Bcc: " . implode(', ', array_map(function($addr) { return !empty($addr['name']) ? $addr['name'] . ' <' . $addr['email'] . '>' : $addr['email']; }, $data['bcc'])) . "\r\n";
                }
                if (!empty($data['replyTo'])) {
                    $emailHeader .= "Reply-To: " . implode(', ', array_map(function($addr) { return !empty($addr['name']) ? $addr['name'] . ' <' . $addr['email'] . '>' : $addr['email']; }, $data['replyTo'])) . "\r\n";
                }
                $emailHeader .= "Subject: " . $data['subject'] . "\r\n";
                $emailHeader .= "Date: " . date('r') . "\r\n";
                $emailHeader .= "Message-ID: <" . uniqid() . "." . time() . "@" . CONFIG_SMTP_HOST . ">\r\n";
                $emailHeader .= "MIME-Version: 1.0\r\n";

                // Check if we have attachments
                $hasAttachments = !empty($data['attachments']);

                if ($hasAttachments) {
                    // Create multipart message with attachments
                    $boundary = "----=_Part_" . uniqid();
                    $emailHeader .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

                    $emailBody = "--$boundary\r\n";

                    // Add the main body part
                    if (!empty($bodyHtml)) {
                        $emailBody .= "Content-Type: text/html; charset=UTF-8\r\n";
                        $emailBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
                        $emailBody .= $bodyHtml . "\r\n\r\n";
                    } else {
                        $emailBody .= "Content-Type: text/plain; charset=UTF-8\r\n";
                        $emailBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
                        $emailBody .= $bodyText . "\r\n\r\n";
                    }

                    // Add attachments
                    foreach ($data['attachments'] as $attachment) {
                        if (!empty($attachment['content']) && !empty($attachment['name'])) {
                            $emailBody .= "--$boundary\r\n";
                            $emailBody .= "Content-Type: application/octet-stream; name=\"" . $attachment['name'] . "\"\r\n";
                            $emailBody .= "Content-Transfer-Encoding: base64\r\n";
                            $emailBody .= "Content-Disposition: attachment; filename=\"" . $attachment['name'] . "\"\r\n\r\n";
                            $emailBody .= chunk_split($attachment['content'], 76) . "\r\n";
                        }
                    }

                    $emailBody .= "--$boundary--\r\n";
                } else {
                    // Simple message without attachments
                    if (!empty($bodyHtml)) {
                        $emailHeader .= "Content-Type: text/html; charset=UTF-8\r\n";
                        $emailHeader .= "Content-Transfer-Encoding: 8bit\r\n";
                        $emailBody = $bodyHtml;
                    } else {
                        $emailHeader .= "Content-Type: text/plain; charset=UTF-8\r\n";
                        $emailHeader .= "Content-Transfer-Encoding: 8bit\r\n";
                        $emailBody = $bodyText;
                    }
                }

                // Append message to sent folder
                try {
                    $sentFolder->messages()->append($emailHeader . "\r\n" . $emailBody, ['\\Seen']);
                } catch (Exception $appendEx) {
                    // Continue even if saving to sent folder fails
                }
            }

        } catch (Exception $e) {
            // Continue even if sent folder operations fail
        }
    } catch (Exception $e) {
        error(500, "Email sending error: " . $e->getMessage());
    }
});
