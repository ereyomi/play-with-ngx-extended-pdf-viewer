import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  NgxExtendedPdfViewerModule,
  NgxExtendedPdfViewerService,
} from 'ngx-extended-pdf-viewer';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';

interface HistoryItem {
  id: string; // simple id
  label: string; // filename or URL
  type: 'url' | 'file';
  // for url type we store the url string; for file type we optionally store base64 (if enabled)
  url?: string;
  base64?: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxExtendedPdfViewerModule, FormsModule, NgIf, NgFor],
  providers: [NgxExtendedPdfViewerService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'angular-pdf-test';

  pdfSrc:
    | string
    | ArrayBuffer
    | Blob
    | Uint8Array
    | URL
    | {
        range: any;
      }
    | undefined = undefined;
  currentLabel = '';
  urlInput = '';
  history: HistoryItem[] = [];

  // opts
  saveFilesToHistory = false; // disabled by default to avoid blowing up localStorage

  constructor() {
    this.loadHistory();
  }

  // ---- File handling ----
  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.loadFile(file, true);
    input.value = ''; // reset so same file can be re-selected if needed
  }

  async loadFile(file: File, addToHistory = false) {
    try {
      const buffer = await file.arrayBuffer();
      // Convert to Uint8Array (ngx-extended-pdf-viewer accepts Uint8Array / ArrayBuffer / Blob / base64)
      const u8 = new Uint8Array(buffer);
      this.pdfSrc = u8;
      this.currentLabel = file.name;

      if (addToHistory) {
        // optionally store as base64 (warn: big!)
        if (this.saveFilesToHistory) {
          const base64 = this.arrayBufferToBase64(buffer);
          this.addHistoryItem({
            id: this.genId(),
            label: file.name,
            type: 'file',
            base64,
          });
        } else {
          this.addHistoryItem({
            id: this.genId(),
            label: file.name,
            type: 'file',
          });
        }
      }
    } catch (err) {
      console.error('Failed to read file', err);
      alert('Failed to read file. See console for details.');
    }
  }

  // ---- Drag & drop support ----
  onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      this.loadFile(file, true);
    }
  }

  // ---- URL handling ----
  openUrl() {
    if (!this.urlInput) return;
    // note: remote URL must allow CORS or you must proxy it; see notes below
    this.pdfSrc = this.urlInput.trim();
    this.currentLabel = this.urlInput.trim();
    this.addHistoryItem({
      id: this.genId(),
      label: this.urlInput.trim(),
      type: 'url',
      url: this.urlInput.trim(),
    });
    this.urlInput = '';
  }

  // ---- History ----
  private addHistoryItem(item: HistoryItem) {
    // push to front
    this.history = [item, ...this.history].slice(0, 20);
    this.saveHistory();
  }

  openHistory(item: HistoryItem) {
    if (item.type === 'url' && item.url) {
      this.pdfSrc = item.url;
      this.currentLabel = item.label;
    } else if (item.type === 'file') {
      if (item.base64) {
        // turn base64 into Uint8Array
        const u8 = this.base64ToUint8Array(item.base64);
        this.pdfSrc = u8;
        this.currentLabel = item.label;
      } else {
        // We didn't persist binary for files; ask user to re-upload
        alert(
          'File was not stored locally for space reasons. Please re-upload the file.',
        );
      }
    }
  }

  removeHistory(id: string) {
    this.history = this.history.filter((h) => h.id !== id);
    this.saveHistory();
  }

  // persistence: store only metadata and URLs by default
  private saveHistory() {
    try {
      localStorage.setItem('pdfPickerHistory', JSON.stringify(this.history));
    } catch (err) {
      console.warn('Could not save history', err);
    }
  }

  private loadHistory() {
    try {
      const raw = localStorage.getItem('pdfPickerHistory');
      if (raw) this.history = JSON.parse(raw) as HistoryItem[];
    } catch (err) {
      console.warn('Could not load history', err);
    }
  }

  // ---- utilities ----
  private arrayBufferToBase64(buffer: ArrayBuffer) {
    // caution: for large files this will be slow / memory heavy
    const u8 = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < u8.length; i += chunkSize) {
      binary += String.fromCharCode(...u8.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  private base64ToUint8Array(base64: string) {
    const binary = atob(base64);
    const len = binary.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      u8[i] = binary.charCodeAt(i);
    }
    return u8;
  }

  private genId() {
    return Math.random().toString(36).slice(2, 9);
  }
}
