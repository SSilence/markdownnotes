import { Page } from "src/app/models/page";

export class PageDto {
    id: string | null = null;
    title: string = "";
    icon: string = "";
    language: string = "";
    disabled: boolean = false;
    expanded: boolean = false;
    content: string = "";
    updated: number | null = null;

    constructor(page: Page | null = null) {
        if (page != null) {
            this.id = page.id;
            this.title = page.title;
            this.icon = page.icon;
            this.language = page.language;
            this.disabled = page.disabled;
            this.expanded = page.expanded;
            this.content = page.content;
        }
    }
}
