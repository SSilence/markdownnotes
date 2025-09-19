import { Component, AfterViewInit, Output, EventEmitter, Input, ViewChildren, inject } from '@angular/core';
import EasyMDE from 'easymde/dist/easymde.min.js';
import { MarkdownPipe } from 'src/app/pipes/markdown.pipe';
import { CdsModule } from '@cds/angular';
import { highlightAll } from '@speed-highlight/core';

@Component({
    selector: 'markdown-editor',
    imports: [CdsModule],
    template: `
        <div>
            <textarea #markdown></textarea>
        </div>
    `,
    styles: [`
        ::ng-deep .editor-toolbar {
            padding:0.4em;
        }
        ::ng-deep h1 {
            font-size: 0.7em;
        }
        ::ng-deep .editor-toolbar button cds-icon {
            width: 16px;
            height: 16px;
            color: #6c757d;
            vertical-align: middle;
        }
        ::ng-deep .editor-toolbar button:hover cds-icon {
            color: #495057;
        }
        ::ng-deep .editor-toolbar button.active cds-icon {
            color: #007bff;
        }
        ::ng-deep .editor-toolbar button span {
            font-size: 12px;
            font-weight: bold;
            color: #6c757d;
            vertical-align: middle;
            display: inline-block;
            width: 16px;
            text-align: center;
        }
        ::ng-deep .editor-toolbar button:hover span {
            color: #495057;
        }
        ::ng-deep .editor-toolbar button.active span {
            color: #007bff;
        }

        ::ng-deep .editor-toolbar button.heading-1:after,
        ::ng-deep .editor-toolbar button.heading-2:after,
        ::ng-deep .editor-toolbar button.heading-3:after {
            content:""
        }
    `]
})
export class MarkdownEditorComponent implements AfterViewInit {

    @ViewChildren('markdown') markdown: any;

    private editor: any = null;
    _content = '';

    @Output() contentChange = new EventEmitter();

    private markdownPipe = inject(MarkdownPipe);

    @Input()
    get content() {
        return this._content;
    }

    set content(val) {
        this._content = val;
        this.contentChange.emit(val);
    }

    ngAfterViewInit() {
        this.editor = new EasyMDE({
            element: this.markdown.first.nativeElement,
            showIcons: [],
            hideIcons: ['side-by-side', 'fullscreen'],
            toolbar: [
                {
                    name: "bold",
                    action: EasyMDE.toggleBold,
                    className: "fa fa-bold",
                    title: "Bold",
                    default: true
                },
                {
                    name: "italic", 
                    action: EasyMDE.toggleItalic,
                    className: "fa fa-italic",
                    title: "Italic",
                    default: true
                },
                {
                    name: "strikethrough",
                    action: EasyMDE.toggleStrikethrough,
                    className: "fa fa-strikethrough",
                    title: "Strikethrough",
                    default: true
                },
                "|",
                {
                    name: "heading-1",
                    action: EasyMDE.toggleHeading1,
                    className: "fa fa-header fa-header-1",
                    title: "Heading 1",
                    default: true
                },
                {
                    name: "heading-2",
                    action: EasyMDE.toggleHeading2,
                    className: "fa fa-header fa-header-2",
                    title: "Heading 2",
                    default: true
                },
                {
                    name: "heading-3",
                    action: EasyMDE.toggleHeading3,
                    className: "fa fa-header fa-header-3",
                    title: "Heading 3",
                    default: true
                },
                "|",
                {
                    name: "code",
                    action: EasyMDE.toggleCodeBlock,
                    className: "fa fa-code",
                    title: "Code",
                    default: true
                },
                {
                    name: "quote",
                    action: EasyMDE.toggleBlockquote,
                    className: "fa fa-quote-left", 
                    title: "Quote",
                    default: true
                },
                {
                    name: "unordered-list",
                    action: EasyMDE.toggleUnorderedList,
                    className: "fa fa-list-ul",
                    title: "Generic List",
                    default: true
                },
                {
                    name: "ordered-list",
                    action: EasyMDE.toggleOrderedList,
                    className: "fa fa-list-ol",
                    title: "Numbered List",
                    default: true
                },
                "|",
                {
                    name: "link",
                    action: EasyMDE.drawLink,
                    className: "fa fa-link",
                    title: "Create Link",
                    default: true
                },
                {
                    name: "image",
                    action: EasyMDE.drawImage,
                    className: "fa fa-picture-o",
                    title: "Insert Image",
                    default: true
                },
                {
                    name: "table",
                    action: EasyMDE.drawTable,
                    className: "fa fa-table",
                    title: "Insert Table",
                    default: true
                },
                "|",
                {
                    name: "undo",
                    action: (editor: any) => {
                        editor.codemirror.undo();
                    },
                    className: "fa fa-undo",
                    title: "Undo",
                    default: true
                },
                {
                    name: "redo",
                    action: (editor: any) => {
                        editor.codemirror.redo();
                    },
                    className: "fa fa-redo",
                    title: "Redo",
                    default: true
                },
                "|",
                {
                    name: "preview",
                    action: EasyMDE.togglePreview,
                    className: "fa fa-eye no-disable",
                    title: "Toggle Preview",
                    default: true
                }
            ],
            autoDownloadFontAwesome: false,
            spellChecker: false,
            status: false,
            previewRender: (plainText: any) =>  this.markdownPipe.transform(plainText)
        });
        
        setTimeout(() => this.replaceFontAwesomeWithClarityIcons(), 0);
        
        this.editor.value(this._content);
        this.editor.codemirror.on('change', () => this.content = this.editor.value());
    }

    private replaceFontAwesomeWithClarityIcons() {
        const toolbar = document.querySelector('.editor-toolbar');
        if (!toolbar) return;

        const iconMapping = {
            'fa-undo': 'undo',
            'fa-redo': 'redo',
            'fa-bold': 'bold',
            'fa-italic': 'italic',
            'fa-strikethrough': 'strikethrough',
            'fa-header-1': 'text',
            'fa-header-2': 'text',
            'fa-header-3': 'text',
            'fa-code': 'code',
            'fa-quote-left': 'block-quote',
            'fa-list-ul': 'bullet-list',
            'fa-list-ol': 'number-list',
            'fa-link': 'link',
            'fa-picture-o': 'image',
            'fa-table': 'table',
            'fa-eye': 'eye',
            'fa-question-circle': 'help'
        };

        Object.entries(iconMapping).forEach(([faClass, clarityIcon]) => {
            const buttons = toolbar.querySelectorAll(`i.fa.${faClass}`);
            buttons.forEach(button => {
                if (faClass.includes('fa-header-')) {
                    const headingLevel = faClass.split('-')[2];
                    const headingElement = document.createElement('span');
                    headingElement.textContent = `H${headingLevel}`;
                    headingElement.style.cssText = 'font-size: 15px; font-weight: bold; color: #6c757d;';
                    button.parentNode?.replaceChild(headingElement, button);
                } else {
                    const clarityIconElement = document.createElement('cds-icon');
                    clarityIconElement.setAttribute('shape', clarityIcon);
                    clarityIconElement.setAttribute('size', '22');
                    button.parentNode?.replaceChild(clarityIconElement, button);
                }
            });
        });
    }

}
