export class FolderDto {
    name: string;
    path: string;
    unread: number;
    total: number;
    isTrash: boolean;
    isSent: boolean;
    isDraft: boolean
    isJunk: boolean;
    isArchive: boolean;
    isInbox: boolean;

    constructor(data?: any) {
        this.name = data?.name || '';
        this.path = data?.path || '';
        this.unread = data?.unread || 0;
        this.total = data?.total || 0;
        this.isTrash = data?.isTrash || false;
        this.isSent = data?.isSent || false;
        this.isDraft = data?.isDraft || false;
        this.isJunk = data?.isJunk || false;
        this.isArchive = data?.isArchive || false;
        this.isInbox = data?.isInbox || false;
    }

    getPriority = (): number => {
        if (this.isInbox) return 1;
        if (this.isDraft) return 2;
        if (this.isSent) return 3;
        if (this.isTrash) return 4;
        if (this.isArchive) return 5;
        if (this.isJunk) return 6;
        return 7;
    };
 
}