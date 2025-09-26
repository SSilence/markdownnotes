import { Component, Input, computed, signal, Signal, ViewChild, ElementRef, AfterViewInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MessageDto } from 'src/app/dtos/message-dto';
import { BackendService } from 'src/app/services/backend.service';

@Component({
  selector: 'app-email-message-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="email-content">
      @if (message && message.bodyHtml) {
        <iframe
          #emailFrame
          [src]="htmlContentUrl"
          frameborder="0"
          scrolling="auto"
          class="email-iframe">
        </iframe>
      }
    </div>
  `,
  styles: [`
    .email-content {
      width: 100%;
    }

    .email-iframe {
      width: 100%;
      min-height: 300px;
      border: none;
    }
  `]
})
export class EmailMessageContentComponent implements AfterViewInit, OnChanges {

  @Input() message: MessageDto | null = null;
  @Input() folder: string = '';
  @Input() loadImages!: Signal<boolean>;

  @ViewChild('emailFrame', { static: false }) emailFrame!: ElementRef<HTMLIFrameElement>;

  htmlContentUrl: SafeResourceUrl = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngAfterViewInit() {
    this.updateIframeContent();
  }

  ngOnChanges() {
    this.updateIframeContent();
  }

  private updateIframeContent() {
    if (this.message?.bodyHtml) {
      const blob = new Blob([this.message.bodyHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      this.htmlContentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);

      setTimeout(() => {
        this.adjustIframeHeight();
      }, 100);
    }
  }

  private adjustIframeHeight() {
    if (this.emailFrame?.nativeElement) {
      const iframe = this.emailFrame.nativeElement;
      iframe.onload = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const height = iframeDoc.documentElement.scrollHeight;
            iframe.style.height = height + 'px';
          }
        } catch (e) {
          console.warn('Could not access iframe content for height adjustment', e);
        }
      };
    }
  }
}