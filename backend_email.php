<?PHP

use SSilence\ImapClient\ImapClient;
use SSilence\ImapClient\ImapClientException;
use SSilence\ImapClient\OutgoingMessage; 

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

function createImapClient() {
    try {        
        $encryption = null;
        if (CONFIG_IMAP_ENCRYPTION == 'SSL') {
            $encryption = ImapClient::ENCRYPT_SSL;
        } elseif (CONFIG_IMAP_ENCRYPTION == 'TLS') {
            $encryption = ImapClient::ENCRYPT_TLS;
        }
        return new ImapClient(CONFIG_IMAP_HOST, CONFIG_IMAP_USER, CONFIG_IMAP_PASSWORD, $encryption);
    } catch (ImapClientException $e) {
        error(500, "IMAP connection error: " . $e->getMessage());
    } catch (Exception $e) {
        error(500, "IMAP error: " . $e->getMessage());
    }
}

function parseRecipients($recipientString) {
    if (empty($recipientString)) {
        return array();
    }
    
    $recipients = array();
    // Split by comma, but not inside angle brackets or quotes
    $parts = preg_split('/,(?![^<]*>)(?=(?:[^"]*"[^"]*")*[^"]*$)/', $recipientString);
    
    foreach ($parts as $part) {
        $part = trim($part);
        if (empty($part)) continue;
        
        // Check if format is "Name <email@domain.com>" or just "Name<email@domain.com>"
        if (preg_match('/^(.+?)\s*<([^>]+)>$/', $part, $matches)) {
            $name = trim($matches[1], ' "');
            $email = trim($matches[2]);
            if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $recipients[] = array('name' => $name, 'email' => $email);
            }
        } else {
            // Simple email format
            $email = trim($part);
            if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $recipients[] = array('name' => '', 'email' => $email);
            }
        }
    }
    
    return $recipients;
}

function formatImapAddress($imapAddress) {
    if (!isset($imapAddress->mailbox) || !isset($imapAddress->host)) {
        return null;
    }
    
    $email = $imapAddress->mailbox . '@' . $imapAddress->host;
    $name = isset($imapAddress->personal) ? $imapAddress->personal : '';
    
    if (!empty($name) && $name !== $email) {
        return $name . ' <' . $email . '>';
    }
    return $email;
}

function formatImapAddressList($imapAddresses) {
    if (!is_array($imapAddresses)) {
        return '';
    }
    
    $formattedAddresses = array();
    foreach ($imapAddresses as $address) {
        $formatted = formatImapAddress($address);
        if ($formatted) {
            $formattedAddresses[] = $formatted;
        }
    }
    return implode(', ', $formattedAddresses);
}

function findDraftsFolder($imapClient) {
    $folders = $imapClient->getFolders(null, 1);
    foreach ($folders as $folder) {
        $folderLower = strtolower($folder);
        if ($folderLower === 'drafts' || $folderLower === 'draft' || 
            $folderLower === 'entwurf' || strpos($folderLower, 'draft') !== false) {
            return $folder;
        }
    }
    return null;
}

function getAttachmentMimeType($attachment) {
    $type = 'application/octet-stream';
    if (isset($attachment->info) && isset($attachment->info->structure)) {
        $struct = $attachment->info->structure;
        if (isset($struct->type) && isset($struct->subtype)) {
            $types = [
                0 => 'text', 1 => 'multipart', 2 => 'message', 3 => 'application',
                4 => 'audio', 5 => 'image', 6 => 'video', 7 => 'model', 8 => 'other'
            ];
            $mainType = isset($types[$struct->type]) ? $types[$struct->type] : 'application';
            $subType = strtolower($struct->subtype);
            $type = $mainType . '/' . $subType;
        }
    }
    return $type;
}

function getAttachmentSize($attachment) {
    $size = 0;
    if (isset($attachment->info) && isset($attachment->info->structure)) {
        if (isset($attachment->info->structure->bytes)) {
            $size = $attachment->info->structure->bytes;
        } elseif (isset($attachment->info->structure->dparameters)) {
            foreach ($attachment->info->structure->dparameters as $param) {
                if (strtolower($param->attribute) === 'size') {
                    $size = intval($param->value);
                    break;
                }
            }
        }
    }
    if ($size == 0 && isset($attachment->body) && !empty($attachment->body)) {
        $size = strlen($attachment->body);
    }
    return $size;
}

function processContactAddresses($addresses, &$contacts, $type = 'from') {
    if (!is_array($addresses)) {
        return;
    }
    
    foreach ($addresses as $address) {
        if (isset($address->mailbox) && isset($address->host)) {
            $email = $address->mailbox . '@' . $address->host;
            $name = isset($address->personal) && !empty($address->personal) ? $address->personal : '';
            
            if (isset($contacts[$email])) {
                $contacts[$email]['count']++;
                // Update name if we have a better one (not empty)
                if (!empty($name) && empty($contacts[$email]['name'])) {
                    $contacts[$email]['name'] = $name;
                }
            } else {
                $contacts[$email] = array(
                    'email' => $email,
                    'name' => $name,
                    'type' => $type,
                    'count' => 1
                );
            }
        }
    }
}

function parseEmailInput() {
    // Check if this is a multipart form request (with attachments or FormData)
    $isMultipart = !empty($_POST) || (isset($_FILES) && !empty($_FILES));
    
    if ($isMultipart) {
        // Handle multipart form data (with or without file attachments)
        return array(
            'to' => isset($_POST['to']) ? trim($_POST['to']) : '',
            'subject' => parseString($_POST, 'subject'),
            'message' => isset($_POST['message']) ? $_POST['message'] : '',
            'cc' => isset($_POST['cc']) ? trim($_POST['cc']) : '',
            'bcc' => isset($_POST['bcc']) ? trim($_POST['bcc']) : '',
            'replyTo' => isset($_POST['replyTo']) ? trim($_POST['replyTo']) : '',
            'isMultipart' => true
        );
    } else {
        // Handle JSON data (without attachments)
        $data = body();
        return array(
            'to' => isset($data['to']) ? trim($data['to']) : '',
            'subject' => parseString($data, 'subject'),
            'message' => isset($data['message']) ? $data['message'] : '',
            'cc' => isset($data['cc']) ? trim($data['cc']) : '',
            'bcc' => isset($data['bcc']) ? trim($data['bcc']) : '',
            'replyTo' => isset($data['replyTo']) ? trim($data['replyTo']) : '',
            'isMultipart' => false
        );
    }
}

// load all IMAP folders with unread message count
router('GET', '/imap/enabled$', function() {
    json(array('enabled' => !empty(CONFIG_IMAP_HOST) && !empty(CONFIG_IMAP_USER) && !empty(CONFIG_IMAP_PASSWORD)));
});

// load all IMAP folders with unread message count
router('GET', '/imap/folders$', function() {
    try {
        $imap = createImapClient();
        $folders = $imap->getFolders(null, 1);
        $folderList = array();
        
        foreach ($folders as $folder) {
            $folderName = trim($folder);
            if (empty($folderName)) continue;
            
            // Select the folder to count unread messages
            $imap->selectFolder($folderName);
            $unreadCount = $imap->countUnreadMessages();
            $totalCount = $imap->countMessages();
            
            $folderList[] = array(
                'name' => $folderName,
                'unread' => $unreadCount,
                'total' => $totalCount
            );
        }
        json($folderList);
    } catch (Exception $e) {
        error(500, "IMAP error: " . $e->getMessage());
    }
});

// load all emails from a folder
router('GET', '/imap/folder/(?<folder>.+)$', function($params) {
    try {
        $imap = createImapClient();
        $folderName = urldecode($params['folder']);
        $imap->selectFolder($folderName);
        
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
        $start = isset($_GET['start']) ? intval($_GET['start']) : 0;
        $order = isset($_GET['order']) ? $_GET['order'] : 'DESC';
        
        $messages = $imap->getMessages($limit, $start, $order);
        $messageList = array();
        
        foreach ($messages as $message) {
            $toDisplay = formatImapAddressList($message->header->details->to ?? array());
            
            $messageList[] = array(
                'id' => $message->header->uid,
                'subject' => isset($message->header->subject) ? $message->header->subject : '',
                'from' => isset($message->header->details->from[0]->mailbox) && isset($message->header->details->from[0]->host) 
                    ? $message->header->details->from[0]->mailbox . '@' . $message->header->details->from[0]->host : '',
                'fromName' => isset($message->header->details->from[0]->personal) ? $message->header->details->from[0]->personal : '',
                'to' => $toDisplay,
                'date' => isset($message->header->date) ? $message->header->date : '',
                'size' => isset($message->header->size) ? $message->header->size : 0,
                'seen' => isset($message->header->seen) ? $message->header->seen == 1 : false,
                'answered' => isset($message->header->answered) ? $message->header->answered == 1 : false,
                'flagged' => isset($message->header->flagged) ? $message->header->flagged == 1 : false,
                'deleted' => isset($message->header->deleted) ? $message->header->deleted == 1 : false,
                'draft' => isset($message->header->draft) ? $message->header->draft == 1 : false
            );
        }
        json($messageList);
    } catch (Exception $e) {
        error(500, "IMAP error: " . $e->getMessage());
    }
});

// load one email by id
router('GET', '/imap/message/(?<folder>.+)/(?<id>\d+)$', function($params) {
    try {
        $imap = createImapClient();
        $folderName = urldecode($params['folder']);
        $messageId = intval($params['id']);
        
        $imap->selectFolder($folderName);
        
        // Convert UID to message number for getMessage()
        $messageNumber = $imap->getId($messageId);
        if (!$messageNumber) {
            error(404, "Message with UID $messageId not found");
        }
        
        $message = $imap->getMessage($messageNumber);
        
        $messageData = array(
            'id' => $message->header->uid,
            'subject' => isset($message->header->subject) ? $message->header->subject : '',
            'from' => isset($message->header->details->from[0]->mailbox) && isset($message->header->details->from[0]->host) 
                ? $message->header->details->from[0]->mailbox . '@' . $message->header->details->from[0]->host : '',
            'fromName' => isset($message->header->details->from[0]->personal) ? $message->header->details->from[0]->personal : '',
            'to' => '',
            'toName' => '',
            'cc' => '',
            'bcc' => '',
            'replyTo' => isset($message->header->details->reply_to[0]->mailbox) && isset($message->header->details->reply_to[0]->host)
                ? $message->header->details->reply_to[0]->mailbox . '@' . $message->header->details->reply_to[0]->host : '',
            'date' => isset($message->header->date) ? $message->header->date : '',
            'size' => isset($message->header->size) ? $message->header->size : 0,
            'bodyText' => isset($message->message->text) ? $message->message->text : '',
            'bodyHtml' => isset($message->message->html) ? $message->message->html : '',
            'seen' => isset($message->header->seen) ? $message->header->seen == 1 : false,
            'answered' => isset($message->header->answered) ? $message->header->answered == 1 : false,
            'flagged' => isset($message->header->flagged) ? $message->header->flagged == 1 : false,
            'deleted' => isset($message->header->deleted) ? $message->header->deleted == 1 : false,
            'draft' => isset($message->header->draft) ? $message->header->draft == 1 : false,
            'attachments' => array()
        );
        
        // Process recipients using helper function
        $messageData['to'] = formatImapAddressList($message->header->details->to ?? array());
        $messageData['cc'] = formatImapAddressList($message->header->details->cc ?? array());
        $messageData['bcc'] = formatImapAddressList($message->header->details->bcc ?? array());
        
        // Set toName for backward compatibility (first TO recipient name)
        if (isset($message->header->details->to[0]->personal) && !empty($message->header->details->to[0]->personal)) {
            $messageData['toName'] = $message->header->details->to[0]->personal;
        }
        
        // Get attachments info
        if (isset($message->attachments) && is_array($message->attachments)) {
            foreach ($message->attachments as $attachment) {
                $messageData['attachments'][] = array(
                    'name' => isset($attachment->name) ? $attachment->name : 'attachment',
                    'size' => getAttachmentSize($attachment),
                    'type' => getAttachmentMimeType($attachment)
                );
            }
        }
        json($messageData);
    } catch (Exception $e) {
        error(500, "IMAP error: " . $e->getMessage());
    }
});

// mark email as seen/unseen
router('POST', '/imap/mark$', function() {
    $data = body();
    
    try {
        $messageId = isset($data['messageId']) ? intval($data['messageId']) : 0;
        $folder = parseString($data, 'folder');
        $seen = isset($data['seen']) ? $data['seen'] : true;
        
        if ($messageId <= 0 || empty($folder)) {
            error(400, "Missing required fields: messageId and folder");
        }
        
        $imap = createImapClient();
        
        // Select the folder containing the message
        $imap->selectFolder($folder);
        
        // Convert UID to message number for mark operations
        $messageNumber = $imap->getId($messageId);
        if (!$messageNumber) {
            error(404, "Message with UID $messageId not found");
        }
        
        // Mark the message as seen or unseen
        if ($seen) {
            $result = $imap->setSeenMessage($messageNumber);
        } else {
            $result = $imap->setUnseenMessage($messageNumber);
        }
        
        if ($result) {
            json(array('success' => true, 'seen' => $seen));
        } else {
            error(500, "Failed to mark email");
        }
        
    } catch (Exception $e) {
        error(500, "IMAP mark error: " . $e->getMessage());
    }
});

// move email to another folder
router('POST', '/imap/move$', function() {
    $data = body();
    
    try {
        $messageId = isset($data['messageId']) ? intval($data['messageId']) : 0;
        $sourceFolder = parseString($data, 'sourceFolder');
        $targetFolder = parseString($data, 'targetFolder');
        
        if ($messageId <= 0 || empty($sourceFolder) || empty($targetFolder)) {
            error(400, "Missing required fields: messageId, sourceFolder, and targetFolder");
        }
        
        $imap = createImapClient();
        
        // Select the source folder first
        $imap->selectFolder($sourceFolder);
        
        // Use the library method directly with UID (fixed library handles UIDs correctly now)
        $result = $imap->moveMessage($messageId, $targetFolder);
        
        if ($result) {
            try {
                // Verify target folder exists by selecting it
                $imap->selectFolder($targetFolder);
                $imap->selectFolder($sourceFolder); // Switch back to source folder
                json(array('success' => true));
            } catch (Exception $folderError) {
                error(400, "Target folder '$targetFolder' does not exist or cannot be accessed: " . $folderError->getMessage());
            }
        } else {
            error(500, "Failed to move email");
        }  
    } catch (Exception $e) {
        error(500, "IMAP move error: " . $e->getMessage());
    }
});

// purge folder (delete all messages)
router('POST', '/imap/purge$', function() {
    $data = body();
    
    try {
        $folderName = parseString($data, 'folder');
        
        if (empty($folderName)) {
            error(400, "Missing required field: folder");
        }
        
        $imap = createImapClient();
        
        // Select the folder to purge
        $imap->selectFolder($folderName);
        
        // Purge all messages in the folder
        $result = $imap->purge();
        
        if ($result) {
            json(array('success' => true));
        } else {
            error(500, "Failed to purge folder");
        }
    } catch (Exception $e) {
        error(500, "IMAP purge error: " . $e->getMessage());
    }
});

// send email
router('POST', '/imap/send$', function() {
    $input = parseEmailInput();
    
    try {
        // Debug: Log request type and data
        error_log("DEBUG: isMultipart: " . ($input['isMultipart'] ? 'true' : 'false'));
        error_log("DEBUG: _POST keys: " . json_encode(array_keys($_POST)));
        error_log("DEBUG: _FILES keys: " . json_encode(array_keys($_FILES)));
        error_log("DEBUG: to field: '{$input['to']}', subject field: '{$input['subject']}'");
        
        if (empty($input['to']) || empty($input['subject'])) {
            error(400, "Missing required fields: to and subject. Received: to='{$input['to']}', subject='{$input['subject']}'");
        }
        
        // Debug: Log the raw TO field
        error_log("DEBUG: Raw TO field: " . $input['to']);
        
        // Parse recipients
        $toRecipients = parseRecipients($input['to']);
        $ccRecipients = parseRecipients($input['cc']);
        $bccRecipients = parseRecipients($input['bcc']);
        
        // Debug: Log parsed recipients
        error_log("DEBUG: Parsed TO recipients: " . json_encode($toRecipients));
        
        if (empty($toRecipients)) {
            error(400, "No valid recipients found in TO field. Raw input: '{$input['to']}'");
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
        foreach ($toRecipients as $recipient) {
            $mail->addAddress($recipient['email'], $recipient['name']);
        }
        
        // Add CC recipients
        foreach ($ccRecipients as $recipient) {
            $mail->addCC($recipient['email'], $recipient['name']);
        }
        
        // Add BCC recipients
        foreach ($bccRecipients as $recipient) {
            $mail->addBCC($recipient['email'], $recipient['name']);
        }
        
        // Set reply-to if provided
        if (!empty($input['replyTo'])) {
            $replyToRecipients = parseRecipients($input['replyTo']);
            if (!empty($replyToRecipients)) {
                $mail->addReplyTo($replyToRecipients[0]['email'], $replyToRecipients[0]['name']);
            }
        }
        
        $mail->Subject = $input['subject'];
        
        // Check if message contains HTML
        if (strip_tags($input['message']) != $input['message']) {
            $mail->isHTML(true);
            $mail->Body = $input['message'];
            $mail->AltBody = strip_tags($input['message']);
        } else {
            $mail->isHTML(false);
            $mail->Body = $input['message'];
        }
        
        // Handle attachments if this is a multipart request
        if ($input['isMultipart'] && !empty($_FILES)) {
            foreach ($_FILES as $key => $file) {
                if (strpos($key, 'attachment_') === 0) {
                    // Check for file upload errors
                    if ($file['error'] !== UPLOAD_ERR_OK) {
                        error_log("Attachment upload error for key '$key': " . $file['error']);
                        continue;
                    }
                    
                    // Validate file exists and is readable
                    if (!file_exists($file['tmp_name']) || !is_readable($file['tmp_name'])) {
                        error_log("Attachment file not found or not readable: " . $file['tmp_name']);
                        continue;
                    }
                    
                    // Validate file size
                    $fileSize = filesize($file['tmp_name']);
                    if ($fileSize === false || $fileSize === 0) {
                        error_log("Attachment file is empty or size cannot be determined: " . $file['name']);
                        continue;
                    }
                    
                    // Determine MIME type
                    $mimeType = 'application/octet-stream'; // Default fallback
                    if (function_exists('mime_content_type')) {
                        $detectedType = mime_content_type($file['tmp_name']);
                        if ($detectedType !== false) {
                            $mimeType = $detectedType;
                        }
                    }
                    
                    // Add attachment with proper MIME type
                    try {
                        $mail->addAttachment($file['tmp_name'], $file['name'], 'base64', $mimeType);
                        error_log("Added attachment: " . $file['name'] . " (Size: $fileSize bytes, MIME: $mimeType, Temp: " . $file['tmp_name'] . ")");
                    } catch (Exception $e) {
                        error_log("Failed to add attachment " . $file['name'] . ": " . $e->getMessage());
                    }
                }
            }
        }
        

        
        // Attempt to send the email
        $sendResult = false;
        try {
            $sendResult = $mail->send();
        } catch (Exception $e) {
            error_log("Email send failed: " . $e->getMessage());
            $sendResult = false;
        }
        
        if (!$sendResult) {
            error(500, "Failed to send email: " . $mail->ErrorInfo);
        } else {
            // Save a copy of the sent email to the Sent folder
            try {
                $imapClient = createImapClient();
                
                $emailHeader = "From: " . CONFIG_SMTP_NAME . " <" . CONFIG_SMTP_EMAIL . ">\r\n";
                $emailHeader .= "To: " . $input['to'] . "\r\n";
                if (!empty($input['cc'])) {
                    $emailHeader .= "Cc: " . $input['cc'] . "\r\n";
                }
                if (!empty($input['bcc'])) {
                    $emailHeader .= "Bcc: " . $input['bcc'] . "\r\n";
                }
                if (!empty($input['replyTo'])) {
                    $emailHeader .= "Reply-To: " . $input['replyTo'] . "\r\n";
                }
                $emailHeader .= "Subject: " . $input['subject'] . "\r\n";
                $emailHeader .= "Date: " . date('r') . "\r\n";
                $emailHeader .= "Message-ID: <" . uniqid() . "." . time() . "@" . CONFIG_SMTP_HOST . ">\r\n";
                $emailHeader .= "MIME-Version: 1.0\r\n";
                
                if (strip_tags($input['message']) != $input['message']) {
                    $emailHeader .= "Content-Type: text/html; charset=UTF-8\r\n";
                    $emailHeader .= "Content-Transfer-Encoding: 8bit\r\n";
                    $emailBody = $input['message'];
                } else {
                    $emailHeader .= "Content-Type: text/plain; charset=UTF-8\r\n";
                    $emailHeader .= "Content-Transfer-Encoding: 8bit\r\n";
                    $emailBody = $input['message'];
                }
                $imapClient->saveMessageInSent($emailHeader, $emailBody);
                
            } catch (Exception $e) {
                error_log("Failed to save email to Sent folder: " . $e->getMessage());
            }
            
            json(array(
                'success' => true,
                'toCount' => count($toRecipients),
                'ccCount' => count($ccRecipients),
                'bccCount' => count($bccRecipients)
            ));
        }
    } catch (Exception $e) {
        error(500, "Email sending error: " . $e->getMessage());
    }
});

// save draft
router('POST', '/imap/draft$', function() {
    // Always handle as JSON data - attachments are ignored for drafts
    $data = body();
    $to = isset($data['to']) ? trim($data['to']) : '';
    $subject = parseString($data, 'subject');
    $message = isset($data['message']) ? $data['message'] : '';
    $cc = isset($data['cc']) ? trim($data['cc']) : '';
    $bcc = isset($data['bcc']) ? trim($data['bcc']) : '';
    $replyTo = isset($data['replyTo']) ? trim($data['replyTo']) : '';
    $draftId = parseString($data, 'draftId'); // Unique ID for this draft
    
    try {
        
        // Generate draft ID if not provided
        if (empty($draftId)) {
            $draftId = 'draft_' . uniqid() . '_' . time();
        }
        
        $imapClient = createImapClient();
        
        // Find or create drafts folder
        $draftsFolder = findDraftsFolder($imapClient);
        if (!$draftsFolder) {
            $imapClient->addFolder('Drafts');
            $draftsFolder = 'Drafts';
        }
        
        // Select drafts folder
        if (!$imapClient->selectFolder($draftsFolder)) {
            error(500, "Could not select drafts folder: " . $draftsFolder);
        }
        
        // Delete existing draft with same ID if it exists
        try {
            $messages = $imapClient->getMessages(0, 0, 'DESC');
            if ($messages && is_array($messages)) {
                foreach ($messages as $msg) {
                    try {
                        // $msg is an IncomingMessage object, check message_id directly in header
                        if (isset($msg->header->message_id) && 
                            strpos($msg->header->message_id, $draftId) !== false) {
                            $imapClient->deleteMessage($msg->header->uid);
                            break;
                        }
                    } catch (Exception $e) {
                        // Continue if we can't read a specific message
                        continue;
                    }
                }
                $imapClient->purge(); // Expunge deleted messages
            }
        } catch (Exception $e) {
            // Continue even if we can't clean up old drafts
            error_log("Warning: Could not clean up old drafts: " . $e->getMessage());
        }
        
        // Build the email header for draft storage
        $emailHeader = "From: " . CONFIG_SMTP_NAME . " <" . CONFIG_SMTP_EMAIL . ">\r\n";
        if (!empty($to)) {
            $emailHeader .= "To: " . $to . "\r\n";
        }
        if (!empty($cc)) {
            $emailHeader .= "Cc: " . $cc . "\r\n";
        }
        if (!empty($bcc)) {
            $emailHeader .= "Bcc: " . $bcc . "\r\n";
        }
        if (!empty($replyTo)) {
            $emailHeader .= "Reply-To: " . $replyTo . "\r\n";
        }
        $emailHeader .= "Subject: " . $subject . "\r\n";
        $emailHeader .= "Date: " . date('r') . "\r\n";
        $emailHeader .= "Message-ID: <" . $draftId . "@" . CONFIG_SMTP_HOST . ">\r\n";
        $emailHeader .= "MIME-Version: 1.0\r\n";
        $emailHeader .= "X-Draft-ID: " . $draftId . "\r\n"; // Custom header for draft tracking
        
        // Simple message content (attachments are ignored for drafts)
        if (strip_tags($message) != $message) {
            // HTML message
            $emailHeader .= "Content-Type: text/html; charset=UTF-8\r\n";
            $emailHeader .= "Content-Transfer-Encoding: 8bit\r\n";
            $emailBody = $message;
        } else {
            // Plain text message
            $emailHeader .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $emailHeader .= "Content-Transfer-Encoding: 8bit\r\n";
            $emailBody = $message;
        }
        
        // Use ImapClient's saveMessageInSent method as template - but we need to save in drafts
        // We'll use the low-level IMAP function but get the mailbox info properly
        $imapConnection = $imapClient->getImap();
        
        // Get mailbox info - we need to construct the full mailbox path
        $mailboxInfo = imap_check($imapConnection);
        if (!$mailboxInfo) {
            error(500, "Could not get mailbox info");
        }
        
        // Get the base mailbox name from current selection
        $currentBox = imap_check($imapConnection);
        $mailboxPath = '{' . CONFIG_IMAP_HOST . ':993/imap/ssl}' . $draftsFolder;
        
        // Save new draft using imap_append
        $result = imap_append($imapConnection, 
                            $mailboxPath, 
                            $emailHeader . "\r\n" . $emailBody . "\r\n", 
                            "\\Draft \\Seen");
        
        if ($result) {
            json(array(
                'success' => true,
                'draftId' => $draftId,
                'message' => 'Draft saved successfully'
            ));
        } else {
            $imapError = imap_last_error();
            error(500, "Failed to save draft: " . ($imapError ? $imapError : "Unknown IMAP error"));
        }
        
    } catch (Exception $e) {
        error(500, "Draft saving error: " . $e->getMessage());
    }
});

// delete draft
router('DELETE', '/imap/draft/(?<draftId>.+)$', function($params) {
    try {
        $draftId = urldecode($params['draftId']);
        
        $imapClient = createImapClient();
        
        // Find drafts folder
        $draftsFolder = findDraftsFolder($imapClient);
        if (!$draftsFolder) {
            json(array('success' => true, 'message' => 'No drafts folder found'));
            return;
        }
        
        // Select drafts folder
        if (!$imapClient->selectFolder($draftsFolder)) {
            error(500, "Could not select drafts folder: " . $draftsFolder);
        }
        
        // Find and delete the draft
        $deleted = false;
        
        try {
            $messages = $imapClient->getMessages(0, 0, 'DESC');
            if ($messages && is_array($messages)) {
                foreach ($messages as $msg) {
                    try {
                        // $msg is an IncomingMessage object, check message_id directly in header
                        if (isset($msg->header->message_id) && 
                            strpos($msg->header->message_id, $draftId) !== false) {
                            $imapClient->deleteMessage($msg->header->uid);
                            $deleted = true;
                            break;
                        }
                    } catch (Exception $e) {
                        // Continue if we can't read a specific message
                        continue;
                    }
                }
                
                if ($deleted) {
                    $imapClient->purge(); // Expunge deleted messages
                }
            }
        } catch (Exception $e) {
            error_log("Warning: Could not process draft messages: " . $e->getMessage());
            // Don't error out, just log it
        }
        
        json(array(
            'success' => true,
            'message' => $deleted ? 'Draft deleted successfully' : 'Draft not found (may have been already deleted)'
        ));
        
    } catch (Exception $e) {
        error(500, "Draft deletion error: " . $e->getMessage());
    }
});



// get all unique contacts (for autocomplete)
router('GET', '/imap/contacts$', function() {
    try {
        $imap = createImapClient();
        $contacts = array();
        $limit = 30; // Only get last 30 emails for performance
        
        // Find the Sent folder
        $folders = $imap->getFolders(null, 1);
        $sentFolder = null;
        
        foreach ($folders as $folder) {
            $folderLower = strtolower($folder);
            if ($folderLower === 'sent' || $folderLower === 'gesendet' || 
                $folderLower === 'sent items' || strpos($folderLower, 'sent') !== false) {
                $sentFolder = $folder;
                break;
            }
        }
        
        // If no sent folder found, fall back to INBOX (but still only last 30)
        if (!$sentFolder) {
            $sentFolder = 'INBOX';
        }
        
        try {
            $imap->selectFolder($sentFolder);
            
            // Get only the last 30 messages for better performance
            $messages = $imap->getMessages($limit, 0, 'DESC');
            
            foreach ($messages as $message) {
                // For sent emails, focus on TO, CC, BCC recipients (who we sent emails to)
                processContactAddresses($message->header->details->to ?? array(), $contacts, 'to');
                processContactAddresses($message->header->details->cc ?? array(), $contacts, 'cc');
                processContactAddresses($message->header->details->bcc ?? array(), $contacts, 'bcc');
            }
        } catch (Exception $folderException) {
            // If we can't access the sent folder, return empty contacts
            error_log("Could not access folder '$sentFolder': " . $folderException->getMessage());
        }
        
        // Convert associative array to indexed array and sort by frequency (most used first), then by email
        $contactList = array_values($contacts);
        usort($contactList, function($a, $b) {
            // First sort by count (descending - highest first)
            if ($a['count'] !== $b['count']) {
                return $b['count'] - $a['count'];
            }
            // If count is same, sort alphabetically by email
            return strcmp(strtolower($a['email']), strtolower($b['email']));
        });
        
        json($contactList);
    } catch (Exception $e) {
        error(500, "IMAP contacts error: " . $e->getMessage());
    }
});

// download email attachment
router('GET', '/imap/attachment/(?<folder>.+)/(?<messageId>\d+)/(?<attachmentIndex>\d+)$', function($params) {
    try {
        $folderName = urldecode($params['folder']);
        $messageId = intval($params['messageId']);
        $attachmentIndex = intval($params['attachmentIndex']);
        
        if ($messageId <= 0 || $attachmentIndex < 0) {
            error(400, "Invalid messageId or attachmentIndex");
        }
        
        $imap = createImapClient();
        $imap->selectFolder($folderName);
        
        // Convert UID to message number for getMessage()
        $messageNumber = $imap->getId($messageId);
        if (!$messageNumber) {
            error(404, "Message with UID $messageId not found");
        }
        
        $message = $imap->getMessage($messageNumber);
        
        // Check if attachments exist
        if (!isset($message->attachments) || !is_array($message->attachments)) {
            error(404, "No attachments found");
        }
        
        // Check if the requested attachment index exists
        if ($attachmentIndex >= count($message->attachments)) {
            error(404, "Attachment not found");
        }
        
        $attachment = $message->attachments[$attachmentIndex];
        
        // Get attachment name
        $filename = isset($attachment->name) && !empty($attachment->name) ? 
            $attachment->name : 'attachment_' . $attachmentIndex;
        
        // Get MIME type using helper function
        $contentType = getAttachmentMimeType($attachment);
        
        // Set headers for inline display
        header('Content-Type: ' . $contentType);
        header('Content-Disposition: inline; filename="' . addslashes($filename) . '"');
        header('Content-Transfer-Encoding: binary');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        
        // Decode and output attachment content
        if (isset($attachment->body) && !empty($attachment->body)) {
            // Decode base64 encoded attachment data
            $decodedBody = base64_decode($attachment->body);
            
            // Fallback: if base64_decode fails or returns empty, try the original body
            if ($decodedBody === false || empty($decodedBody)) {
                $decodedBody = $attachment->body;
            }
            
            header('Content-Length: ' . strlen($decodedBody));
            echo $decodedBody;
        } else {
            error(404, "Attachment body not found");
        }
        
    } catch (Exception $e) {
        error(500, "Attachment download error: " . $e->getMessage());
    }
});