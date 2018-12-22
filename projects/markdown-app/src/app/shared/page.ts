import { PageDto } from "./page-dto";

export class Page {
    id: string;
    title: string;
    icon: string;
    content: string;

    parent: Page;
    children: Page[];

    constructor(pageDto: PageDto = null) {
        if (pageDto) {
            this.id = pageDto.id;
            this.title = pageDto.title;
            this.icon = pageDto.icon;
            this.content = pageDto.content;
            this.parent = null;
            this.children = [];
        }
    }
}
