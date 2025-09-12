import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';
import highlightjs from 'highlight.js';

@Pipe({
    name: 'markdown',
    standalone: true
})
export class MarkdownPipe implements PipeTransform {

    private isMarkedConfigured = false;

    transform(value: string, args?: any): any {
        if (!value) {
            return value;
        }
        this.configureMarked();
        return marked(value) as string;
    }

    private configureMarked(): void {
        if (this.isMarkedConfigured) {
            return;
        }

        marked.setOptions({
            gfm: true,
            breaks: true,
        });

        const renderer = new marked.Renderer();
        
        renderer.heading = function({ tokens, depth }: any) {
            const text = this.parser.parseInline(tokens);
            const escapedText = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
            return `<h${depth} id="${escapedText}">${text}</h${depth}>`;
        };

        renderer.code = ({ text, lang }: any) => {
            let highlighted;
            if (lang && highlightjs.getLanguage(lang)) {
                highlighted = highlightjs.highlight(text, { language: lang, ignoreIllegals: true }).value;
            } else {
                highlighted = highlightjs.highlightAuto(text).value;
            }
            return `<pre class="hljs">${highlighted}</pre>`;
        };

        marked.setOptions({ renderer });
        this.isMarkedConfigured = true;
    }
    
}
