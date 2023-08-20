import { PageDto } from "../components/dtos/page-dto";

export class Page {
    id: string | null = null;
    title: string = "";
    icon: string = "";
    content: string = "";
    expanded: boolean = false;
    updated: Date | null = null;

    parent: Page | null = null;
    children: Page[] = [];

    constructor(pageDto: PageDto | null = null) {
        if (pageDto) {
            this.id = pageDto.id;
            this.title = pageDto.title;
            this.icon = pageDto.icon;
            this.content = pageDto.content;
            this.expanded = pageDto.expanded;
            this.parent = null;
            this.updated = new Date((pageDto.updated ??= 0) * 1000);
            this.children = [];
        }
    }
}
