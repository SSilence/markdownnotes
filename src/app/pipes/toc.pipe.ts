import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';

@Pipe({
    name: 'toc',
    standalone: true
})
export class TocPipe implements PipeTransform {
    private sanitizer = inject(DomSanitizer);

    transform(value: string, args?: any): SafeHtml {
        if (typeof value !== 'string' || value.length === 0) {
            return this.sanitizer.bypassSecurityTrustHtml('');
        }

        let content = value;
        if (content.includes('[toc]')) {
            const toc = this.generateToc(content);
            content = content.replace('[toc]', toc);
        }

        const sanitized = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });
        return this.sanitizer.bypassSecurityTrustHtml(sanitized);
    }

    private generateToc(html: string): string {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        if (headings.length === 0) {
            return '<div class="toc"><p>no headings found</p></div>';
        }

        let tocHtml = '<div class="toc"><h3>Table of Contents</h3><ol>';

        headings.forEach((heading) => {
            const level = parseInt(heading.tagName.substring(1)); // h1 -> 1, h2 -> 2, etc.
            const text = heading.textContent || '';
            const id = heading.getAttribute('id') || text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
            
            const levelClass = `toc-level-${level}`;
            tocHtml += `<li class="${this.escapeAttribute(levelClass)}"><a href="#${encodeURIComponent(id)}">${this.escapeHtml(text)}</a></li>`;
        });

        tocHtml += '</ol></div>';
        
        return tocHtml;
    }

    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private escapeAttribute(value: string): string {
        return this.escapeHtml(value);
    }
}
