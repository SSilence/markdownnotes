export class FolderDto {
    name: string;
    unread: number;
    total: number;

    constructor(data?: any) {
        this.name = data?.name || '';
        this.unread = data?.unread || 0;
        this.total = data?.total || 0;
    }
}