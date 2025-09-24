export class MessageDto {
    id: number;
    subject: string;
    from: AddressDto;
    to: AddressDto[];
    cc?: AddressDto[];
    bcc?: AddressDto[];
    replyTo?: AddressDto[];
    date: string;
    isSeen: boolean;
    isDraft: boolean;
    isAnswered: boolean;
    isFlagged: boolean
    isDeleted: boolean;

    attachments?: AttachmentDto[];
    bodyText?: string;
    bodyHtml?: string;

    constructor(data?: any) {
        this.id = data?.id || 0;
        this.subject = data?.subject || '';
        this.from = data?.from ? new AddressDto(data.from) : new AddressDto();
        this.to = Array.isArray(data?.to) ? data.to.map((addr: any) => new AddressDto(addr)) : (data?.to ? [new AddressDto(data.to)] : []);
        this.cc = Array.isArray(data?.cc) ? data.cc.map((addr: any) => new AddressDto(addr)) : (data?.cc ? [new AddressDto(data.cc)] : []);
        this.bcc = Array.isArray(data?.bcc) ? data.bcc.map((addr: any) => new AddressDto(addr)) : (data?.bcc ? [new AddressDto(data.bcc)] : []);
        this.replyTo = Array.isArray(data?.replyTo) ? data.replyTo.map((addr: any) => new AddressDto(addr)) : (data?.replyTo ? [new AddressDto(data.replyTo)] : []);
        this.date = data?.date || '';
        this.isSeen = data?.isSeen || false;
        this.isDraft = data?.isDraft || false;
        this.isAnswered = data?.isAnswered || false;
        this.isFlagged = data?.isFlagged || false;
        this.isDeleted = data?.isDeleted || false;
        this.attachments = Array.isArray(data?.attachments) ? data.attachments.map((att: any) => new AttachmentDto(att)) : [];
        this.bodyText = data?.bodyText || '';
        this.bodyHtml = data?.bodyHtml || '';
    }
}

export class AttachmentDto {
    name: string;
    size: number;
    type: string;
    content?: string;
    cid?: string;

    constructor(data?: any) {
        this.name = data?.name || '';
        this.size = data?.size || 0;
        this.type = data?.type || 'application/octet-stream';
        this.content = data?.content || '';
        this.cid = data?.cid || '';
    }
}

export class AddressDto {
    email: string;
    name?: string;

    constructor(data?: any) {
        this.email = data?.email || '';
        this.name = data?.name || '';
    }
}