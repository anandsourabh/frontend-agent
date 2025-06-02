// src/app/components/sql-code/sql-code.component.ts - Fixed with Prism

import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';

declare var Prism: any;

@Component({
  selector: 'app-sql-code',
  template: `
    <mat-expansion-panel class="sql-panel">
      <mat-expansion-panel-header>
        <mat-panel-title>
          <mat-icon>code</mat-icon>
          SQL Query
        </mat-panel-title>
        <mat-panel-description>
          Click to view generated SQL
        </mat-panel-description>
      </mat-expansion-panel-header>
      
      <div class="sql-content">
        <div class="sql-toolbar">
          <button mat-icon-button (click)="copyToClipboard()" matTooltip="Copy SQL" class="copy-button">
            <mat-icon>content_copy</mat-icon>
          </button>
          <button mat-stroked-button (click)="rerunQuery()" class="rerun-button">
            <mat-icon>play_arrow</mat-icon>
            Re-run Query
          </button>
        </div>
        
        <div class="sql-code-container">
          <pre class="sql-code language-sql" #codeBlock><code class="language-sql">{{formattedSql}}</code></pre>
        </div>
      </div>
    </mat-expansion-panel>
  `,
  styles: [`
    .sql-panel {
      margin: 8px 0;
    }
    
    .sql-content {
      padding-top: 16px;
    }
    
    .sql-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .copy-button {
      color: #666;
    }
    
    .copy-button:hover {
      color: #2640e8;
      background-color: rgba(38, 64, 232, 0.04);
    }
    
    .rerun-button {
      color: #2640e8 !important;
      border-color: #2640e8 !important;
      background-color: white !important;
      font-weight: 500;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .rerun-button:hover {
      background-color: rgba(38, 64, 232, 0.04) !important;
      border-color: #2640e8 !important;
    }
    
    .rerun-button mat-icon {
      color: #2640e8 !important;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    .sql-code-container {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e0e0e0;
    }
    
    .sql-code {
      background-color: #2d2d2d !important;
      color: #f8f8f2;
      padding: 20px;
      margin: 0;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre;
      tab-size: 2;
    }
    
    .sql-code code {
      background: none !important;
      color: inherit;
      font-size: inherit;
      font-family: inherit;
      white-space: pre;
      display: block;
      padding: 0;
      margin: 0;
    }
    
    /* Prism.js SQL syntax highlighting - Override default theme */
    .sql-code .token.keyword {
      color: #66d9ef !important;
      font-weight: bold;
    }
    
    .sql-code .token.string {
      color: #a6e22e !important;
    }
    
    .sql-code .token.number {
      color: #ae81ff !important;
    }
    
    .sql-code .token.operator {
      color: #f92672 !important;
    }
    
    .sql-code .token.punctuation {
      color: #f8f8f2 !important;
    }
    
    .sql-code .token.function {
      color: #a6e22e !important;
    }
    
    .sql-code .token.boolean {
      color: #ae81ff !important;
    }
    
    .sql-code .token.comment {
      color: #75715e !important;
      font-style: italic;
    }
    
    /* Custom scrollbar */
    .sql-code::-webkit-scrollbar {
      height: 8px;
    }
    
    .sql-code::-webkit-scrollbar-track {
      background: #1e1e1e;
    }
    
    .sql-code::-webkit-scrollbar-thumb {
      background: #555;
      border-radius: 4px;
    }
    
    .sql-code::-webkit-scrollbar-thumb:hover {
      background: #777;
    }
  `]
})
export class SqlCodeComponent implements OnInit, AfterViewInit {
  @Input() sql: string = '';
  @Output() rerun = new EventEmitter<void>();
  @ViewChild('codeBlock', { static: false }) codeBlock!: ElementRef;

  formattedSql: string = '';

  constructor(
    private clipboard: Clipboard,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.formatSql();
  }

  ngAfterViewInit(): void {
    // Apply Prism highlighting after view is initialized
    this.highlightCode();
  }

  private formatSql(): void {
    if (!this.sql) {
      this.formattedSql = '';
      return;
    }

    // Format SQL with proper line breaks and indentation
    let formatted = this.sql
      .replace(/\s+/g, ' ')
      .trim()
      // Add line breaks after major keywords
      .replace(/\b(SELECT|FROM|WHERE|AND|OR|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL JOIN|GROUP BY|ORDER BY|HAVING|LIMIT|UNION)\b/gi, '\n$1')
      // Add line breaks after commas in SELECT
      .replace(/,\s*(?=\w)/g, ',\n    ')
      // Clean up formatting
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        
        // Add proper indentation
        if (trimmed.match(/^(AND|OR)/i)) {
          return '  ' + trimmed;
        } else if (trimmed.match(/^(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL JOIN)/i)) {
          return trimmed;
        } else if (trimmed.match(/^SELECT/i)) {
          return trimmed;
        } else {
          return '    ' + trimmed;
        }
      })
      .filter(line => line.length > 0)
      .join('\n');

    this.formattedSql = formatted;
  }

  private highlightCode(): void {
    if (typeof Prism !== 'undefined' && this.codeBlock) {
      // Wait for the DOM to update with the formatted SQL
      setTimeout(() => {
        Prism.highlightElement(this.codeBlock.nativeElement);
      }, 10);
    }
  }

  copyToClipboard(): void {
    this.clipboard.copy(this.sql);
    this.snackBar.open('SQL copied to clipboard', 'Close', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  rerunQuery(): void {
    this.rerun.emit();
  }
}