import { Page } from "./page";

export class PageDto {
    id: string | null = null;
    title: string = "";
    icon: string = "";
    expanded: boolean = false;
    content: string = "";

    constructor(page: Page | null = null) {
        if (page != null) {
            this.id = page.id;
            this.title = page.title;
            this.icon = page.icon;
            this.expanded = page.expanded;
            this.content = page.content;
        }
    }
}
