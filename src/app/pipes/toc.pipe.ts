import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
    name: 'toc',
    standalone: true
})
export class TocPipe implements PipeTransform {

    sanitizer = inject(DomSanitizer);

    transform(value: string, args?: any): any {
        if (value && value.includes('[toc]')) {
            const toc = this.generateToc(value);
            return this.sanitizer.bypassSecurityTrustHtml(value.replace('[toc]', toc));
        }
        return this.sanitizer.bypassSecurityTrustHtml(value);
    }

    private generateToc(html: string): string {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        if (headings.length === 0) {
            return '<div class="toc"><p>no headings found</p></div>';
        }

        let tocHtml = '<div class="toc"><h3>Table of Contents</h3><ul>';

        headings.forEach((heading) => {
            const level = parseInt(heading.tagName.substring(1)); // h1 -> 1, h2 -> 2, etc.
            const text = heading.textContent || '';
            const id = heading.getAttribute('id') || text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
            
            const levelClass = `toc-level-${level}`;
            tocHtml += `<li class="${levelClass}"><a href="${ window.location.href + "#" + id}">${text}</a></li>`;
        });

        tocHtml += '</ul></div>';
        
        return tocHtml;
    }
}