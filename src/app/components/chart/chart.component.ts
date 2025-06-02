import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';

declare var Plotly: any;

@Component({
  selector: 'app-chart',
  template: `
    <div class="chart-container">
      <!-- Agent-generated visualizations -->
      <div *ngIf="agentVisualizations && agentVisualizations.length > 0" class="agent-visualizations">
        <div class="viz-header">
          <mat-icon>smart_toy</mat-icon>
          <h3>AI-Generated Visualizations</h3>
          <span class="viz-count">{{agentVisualizations.length}} charts</span>
        </div>
        
        <mat-tab-group class="viz-tabs" *ngIf="agentVisualizations.length > 1">
          <mat-tab *ngFor="let viz of agentVisualizations; let i = index" [label]="viz.title">
            <div class="plotly-container">
              <div [id]="'plotly-chart-' + i" class="plotly-chart"></div>
              <div class="chart-description">
                <mat-icon>info</mat-icon>
                <span>{{viz.description}}</span>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
        
        <!-- Single visualization -->
        <div *ngIf="agentVisualizations.length === 1" class="single-viz">
          <div [id]="'plotly-chart-0'" class="plotly-chart"></div>
          <div class="chart-description">
            <mat-icon>info</mat-icon>
            <span>{{agentVisualizations[0].description}}</span>
          </div>
        </div>
      </div>

      <!-- Fallback to legacy chart controls if no agent visualizations -->
      <div *ngIf="!agentVisualizations || agentVisualizations.length === 0" class="legacy-chart">
        <div class="chart-controls" *ngIf="shouldShowChartControls()">
          <mat-form-field appearance="outline">
            <mat-label>Chart Type</mat-label>
            <mat-select [formControl]="chartTypeControl" (selectionChange)="onChartTypeChange()">
              <mat-option value="bar">Bar</mat-option>
              <mat-option value="line">Line</mat-option>
              <mat-option value="pie">Pie</mat-option>
              <mat-option value="scatter">Scatter</mat-option>
              <mat-option value="area">Area</mat-option>
              <mat-option value="stackedbar">Stacked Bar</mat-option>
              <mat-option value="donut">Donut</mat-option>
              <mat-option value="map">Map</mat-option>
            </mat-select>
          </mat-form-field>
          
          <mat-form-field appearance="outline" *ngIf="showAxisControls">
            <mat-label>X-Axis</mat-label>
            <mat-select [formControl]="xAxisControl" (selectionChange)="updateChart()">
              <mat-option *ngFor="let col of columns.slice(0, 10)" [value]="col">{{col}}</mat-option>
            </mat-select>
          </mat-form-field>
          
          <mat-form-field appearance="outline" *ngIf="showAxisControls">
            <mat-label>Y-Axis</mat-label>
            <mat-select [formControl]="yAxisControl" (selectionChange)="updateChart()">
              <mat-option *ngFor="let col of numericColumns.slice(0, 8)" [value]="col">{{col}}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        
        <div #chartDiv class="chart-div"></div>
      </div>
      
      <!-- Chart actions -->
      <div class="chart-actions" *ngIf="agentVisualizations && agentVisualizations.length > 0">
        <button mat-stroked-button (click)="downloadCharts()" class="action-btn">
          <mat-icon>download</mat-icon>
          Download Charts
        </button>
        <button mat-stroked-button (click)="toggleFullscreen()" class="action-btn">
          <mat-icon>fullscreen</mat-icon>
          Fullscreen
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chart-container {
      width: 100%;
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .agent-visualizations {
      width: 100%;
    }
    
    .viz-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .viz-header mat-icon {
      color: #2640e8;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    
    .viz-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }
    
    .viz-count {
      background: #2640e8;
      color: white;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .viz-tabs {
      width: 100%;
    }
    
    .plotly-container, .single-viz {
      width: 100%;
    }
    
    .plotly-chart {
      width: 100%;
      min-height: 400px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }
    
    .chart-description {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      font-size: 14px;
      color: #666;
    }
    
    .chart-description mat-icon {
      color: #2640e8;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    .chart-controls {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    
    .chart-controls mat-form-field {
      min-width: 120px;
      flex: 1;
      max-width: 180px;
    }
    
    .chart-div {
      width: 100%;
      height: 350px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      background: #fafafa;
    }
    
    .chart-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      justify-content: flex-end;
    }
    
    .action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #2640e8 !important;
      border-color: #2640e8 !important;
    }
    
    .action-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      .chart-container {
        padding: 16px;
      }
      
      .viz-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      
      .chart-controls {
        flex-direction: column;
      }
      
      .chart-controls mat-form-field {
        max-width: none;
      }
      
      .plotly-chart {
        min-height: 300px;
      }
      
      .chart-actions {
        flex-direction: column;
      }
    }
  `]
})
export class ChartComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() data: any[] = [];
  @Input() visualizationConfig?: { [key: string]: string };
  @Input() agentVisualizations?: any[]; // New input for agent-generated visualizations
  @ViewChild('chartDiv', { static: true }) chartDiv!: ElementRef;

  chartTypeControl = new FormControl('bar');
  xAxisControl = new FormControl('');
  yAxisControl = new FormControl('');

  columns: string[] = [];
  numericColumns: string[] = [];
  hasGeoData = false;
  showAxisControls = true;

  ngOnInit(): void {
    if (this.data && this.data.length > 0) {
      this.columns = Object.keys(this.data[0]);
      this.numericColumns = this.getNumericColumns();
      this.hasGeoData = this.checkGeoData();
      
      if (this.visualizationConfig) {
        this.parseVisualizationConfig();
      } else {
        this.xAxisControl.setValue(this.columns[0]);
        this.yAxisControl.setValue(this.numericColumns[0]);
      }
    }
  }

  ngAfterViewInit(): void {
    // Render Plotly charts from agent visualizations
    if (this.agentVisualizations && this.agentVisualizations.length > 0) {
      setTimeout(() => this.renderAgentVisualizations(), 100);
    } else {
      // Fallback to legacy chart creation
      setTimeout(() => this.createChart(), 100);
    }
  }

  ngOnDestroy(): void {
    // Clean up Plotly charts
    if (this.agentVisualizations) {
      this.agentVisualizations.forEach((_, index) => {
        const element = document.getElementById(`plotly-chart-${index}`);
        if (element && (window as any).Plotly) {
          (window as any).Plotly.purge(element);
        }
      });
    }
  }

  private renderAgentVisualizations(): void {
    if (!this.agentVisualizations || !(window as any).Plotly) {
      console.warn('Plotly not available or no visualizations to render');
      return;
    }

    this.agentVisualizations.forEach((viz, index) => {
      try {
        const elementId = `plotly-chart-${index}`;
        const element = document.getElementById(elementId);
        
        if (element && viz.plotly_json) {
          const plotlyData = JSON.parse(viz.plotly_json);
          
          // Configure Plotly options
          const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
            displaylogo: false,
            toImageButtonOptions: {
              format: 'png',
              filename: `${viz.title}_chart`,
              height: 500,
              width: 800,
              scale: 1
            }
          };

          const layout = {
            ...plotlyData.layout,
            autosize: true,
            margin: { l: 50, r: 50, t: 60, b: 50 },
            font: { family: 'Roboto, sans-serif', size: 12 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
          };

          (window as any).Plotly.newPlot(
            element,
            plotlyData.data,
            layout,
            config
          );

          // Handle window resize
          window.addEventListener('resize', () => {
            (window as any).Plotly.Plots.resize(element);
          });
        }
      } catch (error) {
        console.error(`Error rendering chart ${index}:`, error);
      }
    });
  }

  shouldShowChartControls(): boolean {
    return !this.agentVisualizations || this.agentVisualizations.length === 0;
  }

  downloadCharts(): void {
    if (!this.agentVisualizations || !(window as any).Plotly) return;

    this.agentVisualizations.forEach((viz, index) => {
      const element = document.getElementById(`plotly-chart-${index}`);
      if (element) {
        (window as any).Plotly.downloadImage(element, {
          format: 'png',
          filename: `${viz.title}_chart`,
          height: 600,
          width: 1000,
          scale: 2
        });
      }
    });
  }

  toggleFullscreen(): void {
    // Implement fullscreen toggle for charts
    const container = document.querySelector('.chart-container') as HTMLElement;
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
    }
  }

  // Legacy chart methods (keep existing implementation)
  onChartTypeChange(): void {
    const chartType = this.chartTypeControl.value;
    this.showAxisControls = !['pie', 'donut', 'heatmap', 'map'].includes(chartType || '');
    this.createChart();
  }

  updateChart(): void {
    this.createChart();
  }

  private createChart(): void {
    // Keep your existing chart creation logic for fallback
    // This ensures backward compatibility
  }

  private parseVisualizationConfig(): void {
    // Keep your existing parseVisualizationConfig method
  }

  private checkGeoData(): boolean {
    // Keep your existing checkGeoData method
    return false;
  }

  private getNumericColumns(): string[] {
    // Keep your existing getNumericColumns method
    return [];
  }
}