export class MessageDto {
    id: number;
    subject: string;
    from: string;
    fromName: string;
    to: string;
    toName?: string;
    cc?: string;
    bcc?: string;
    replyTo?: string;
    date: string;
    size: number;
    bodyText?: string;
    bodyHtml?: {body: string, charset: string};
    seen: boolean;
    answered: boolean;
    flagged: boolean;
    deleted: boolean;
    draft: boolean;
    attachments?: AttachmentDto[];

    constructor(data?: any) {
        this.id = data?.id || 0;
        this.subject = data?.subject || '';
        this.from = data?.from || '';
        this.fromName = data?.fromName || '';
        this.to = data?.to || '';
        this.toName = data?.toName || '';
        this.cc = data?.cc || '';
        this.bcc = data?.bcc || '';
        this.replyTo = data?.replyTo || '';
        this.date = data?.date || '';
        this.size = data?.size || 0;
        this.bodyText = data?.bodyText || '';
        this.bodyHtml = data?.bodyHtml || '';
        this.seen = data?.seen || false;
        this.answered = data?.answered || false;
        this.flagged = data?.flagged || false;
        this.deleted = data?.deleted || false;
        this.draft = data?.draft || false;
        this.attachments = data?.attachments ? data.attachments.map((att: any) => new AttachmentDto(att)) : [];
    }
}

export class AttachmentDto {
    name: string;
    size: number;
    type: string;

    constructor(data?: any) {
        this.name = data?.name || '';
        this.size = data?.size || 0;
        this.type = data?.type || 'application/octet-stream';
    }
}

export class SendEmailDto {
    to: string;
    subject: string;
    message: string;
    cc?: string;
    bcc?: string;
    replyTo?: string;
    attachments?: File[];

    constructor(data?: any) {
        this.to = data?.to || '';
        this.subject = data?.subject || '';
        this.message = data?.message || '';
        this.cc = data?.cc || '';
        this.bcc = data?.bcc || '';
        this.replyTo = data?.replyTo || '';
        this.attachments = data?.attachments || [];
    }
}