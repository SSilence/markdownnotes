import { Page } from "./page";

export class PageDto {
    id: string;
    title: string;
    icon: string;
    content: string;

    constructor(page: Page = null) {
        if (page != null) {
            this.id = page.id;
            this.title = page.title;
            this.icon = page.icon;
            this.content = page.content;
        }
    }
}
