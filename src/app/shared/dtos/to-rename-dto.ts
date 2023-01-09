export class ToRenameDto {
    oldid: string;
    newid: string;

    constructor(oldid: string, newid: string) {
        this.oldid = oldid;
        this.newid = newid;
    }
}
