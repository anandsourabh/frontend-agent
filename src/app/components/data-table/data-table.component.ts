import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { ExportDialogComponent } from '../export-dialog/export-dialog.component';

@Component({
  selector: 'app-data-table',
 template: `
  <div class="table-container">
    <div class="table-toolbar">
      <mat-form-field appearance="outline" class="filter-field">
        <input matInput (keyup)="applyFilter($event)" placeholder="Filter data...">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      
      <button mat-stroked-button (click)="openExportDialog()" class="export-button">
        <mat-icon>download</mat-icon>
        Export
      </button>
    </div>
    
    <div class="table-wrapper">
      <table mat-table [dataSource]="dataSource" matSort class="data-table">
        <ng-container *ngFor="let column of displayedColumns" [matColumnDef]="column">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>{{column}}</th>
          <td mat-cell *matCellDef="let element">
            <span class="cell-content" [title]="element[column]">{{element[column]}}</span>
          </td>
        </ng-container>
        
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </div>
    
    <mat-paginator 
      [pageSizeOptions]="[10, 25, 50]" 
      [pageSize]="10"
      showFirstLastButtons>
    </mat-paginator>
  </div>
`,
styles: [`
  .table-container {
    width: 100%;
    background: white;
    border-radius: 8px;
  }
  
  .table-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .filter-field {
    max-width: 250px;
  }
  
  .export-button {
    color: #2640e8 !important;
    border-color: #2640e8 !important;
    background-color: white !important;
    font-weight: 500;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .export-button:hover {
    background-color: rgba(38, 64, 232, 0.04) !important;
    border-color: #2640e8 !important;
  }
  
  .export-button mat-icon {
    color: #2640e8 !important;
    font-size: 18px;
    width: 18px;
    height: 18px;
  }
  
  .table-wrapper {
    overflow-x: auto;
    max-height: 400px;
  }
  
  .data-table {
    width: 100%;
    font-size: 13px;
  }
  
  .mat-mdc-header-cell {
    background-color: #f8f9fa;
    font-weight: 600;
    color: #293340;
    font-size: 12px;
    padding: 12px 8px;
  }
  
  .mat-mdc-cell {
    padding: 8px;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .cell-content {
    display: block;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .mat-mdc-row:hover {
    background-color: #f8f9fa;
  }
  
  .mat-mdc-paginator {
    border-top: 1px solid #e0e0e0;
    font-size: 12px;
  }
  
  @media (max-width: 768px) {
    .table-toolbar {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }
    
    .filter-field {
      max-width: none;
    }
    
    .cell-content {
      max-width: 120px;
    }
  }
`]
})
export class DataTableComponent implements OnInit {
  @Input() data: any[] = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource();
  displayedColumns: string[] = [];

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    if (this.data && this.data.length > 0) {
      this.displayedColumns = Object.keys(this.data[0]);
      this.dataSource.data = this.data;
      
      setTimeout(() => {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      });
    }
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openExportDialog(): void {
    this.dialog.open(ExportDialogComponent, {
      width: '400px',
      data: { data: this.data, columns: this.displayedColumns }
    });
  }
}