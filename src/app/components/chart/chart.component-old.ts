// src/app/components/chart/chart.component.ts - Complete updated version

import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import * as am4maps from '@amcharts/amcharts4/maps';
import am4geodata_worldLow from '@amcharts/amcharts4-geodata/worldLow';

@Component({
  selector: 'app-chart',
template: `
  <div class="chart-container">
    <!-- UPDATED: Hide chart controls when chart type is map -->
    <div class="chart-controls" *ngIf="shouldShowChartControls()">
      <mat-form-field appearance="outline">
        <mat-label>Chart</mat-label>
        <mat-select [formControl]="chartTypeControl" (selectionChange)="onChartTypeChange()">
          <mat-option value="bar">Bar</mat-option>
          <mat-option value="line">Line</mat-option>
          <mat-option value="pie">Pie</mat-option>
          <mat-option value="scatter">Scatter</mat-option>
          <mat-option value="area">Area</mat-option>
          <mat-option value="stackedbar">Stacked Bar</mat-option>
          <mat-option value="donut">Donut</mat-option>
          <mat-option value="histogram">Histogram</mat-option>
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
    
    <!-- UPDATED: Add a map indicator when showing map -->
    <div class="map-indicator" *ngIf="isMapChart()">
      <mat-icon>map</mat-icon>
      <span>Map View - {{getMapDataPointsCount()}} locations</span>
    </div>
    
    <div #chartDiv class="chart-div"></div>
  </div>
`,
styles: [`
  .chart-container {
    width: 100%;
    background: white;
    border-radius: 8px;
    padding: 16px;
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
  
  /* UPDATED: Map indicator styling */
  .map-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding: 8px 12px;
    background-color: #e3f2fd;
    border-radius: 6px;
    color: #1976d2;
    font-size: 14px;
    font-weight: 500;
  }
  
  .map-indicator mat-icon {
    color: #1976d2;
    font-size: 18px;
    width: 18px;
    height: 18px;
  }
  
  .chart-div {
    width: 100%;
    height: 350px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fafafa;
  }
  
  @media (max-width: 768px) {
    .chart-controls {
      flex-direction: column;
    }
    
    .chart-controls mat-form-field {
      max-width: none;
    }
    
    .chart-div {
      height: 280px;
    }
    
    .map-indicator {
      font-size: 13px;
    }
  }
`]
})
export class ChartComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() data: any[] = [];
  @Input() visualizationConfig?: { [key: string]: string };
  @ViewChild('chartDiv', { static: true }) chartDiv!: ElementRef;

  chartTypeControl = new FormControl('bar');
  xAxisControl = new FormControl('');
  yAxisControl = new FormControl('');

  columns: string[] = [];
  numericColumns: string[] = [];
  hasGeoData = false;
  showAxisControls = true;

  private chart: any;
  private mapDataPoints: any[] = []; // Store map data for counting

  ngOnInit(): void {
    if (this.data && this.data.length > 0) {
      this.columns = Object.keys(this.data[0]);
      this.numericColumns = this.getNumericColumns();
      this.hasGeoData = this.checkGeoData();
      
      // DEBUG: Log the data structure
      console.log('=== CHART DEBUG INFO ===');
      console.log('Data sample:', this.data.slice(0, 2));
      console.log('All columns:', this.columns);
      console.log('Numeric columns:', this.numericColumns);
      console.log('Has geo data:', this.hasGeoData);
      console.log('Visualization config from backend:', this.visualizationConfig);
      
      // Use backend visualization config if available
      if (this.visualizationConfig) {
        console.log('Using backend config...');
        this.parseVisualizationConfig();
      } else {
        console.log('No backend config, using defaults...');
        this.xAxisControl.setValue(this.columns[0]);
        this.yAxisControl.setValue(this.numericColumns[0]);
      }
      
      console.log('Final chart type:', this.chartTypeControl.value);
      console.log('Should show chart controls:', this.shouldShowChartControls());
      console.log('========================');
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.createChart(), 100);
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.dispose();
    }
  }

  // UPDATED: Method to determine if chart controls should be shown
  shouldShowChartControls(): boolean {
    const chartType = this.chartTypeControl.value;
    return chartType !== 'map';
  }

  // UPDATED: Method to check if current chart is a map
  isMapChart(): boolean {
    const chartType = this.chartTypeControl.value;
    return chartType === 'map';
  }

  // UPDATED: Method to get map data points count
  getMapDataPointsCount(): number {
    if (this.isMapChart() && this.mapDataPoints) {
      return this.mapDataPoints.length;
    }
    return 0;
  }

  private parseVisualizationConfig(): void {
    if (!this.visualizationConfig) return;
    
    // Parse the backend response format
    const chartType = this.visualizationConfig['Chart Type']?.toLowerCase().replace(/\s+/g, '') || 'bar';
    const xAxis = this.visualizationConfig['X-axis'] || this.columns[0];
    const yAxis = this.visualizationConfig['Y-axis'] || this.numericColumns[0];
    
    console.log('Backend chart type:', this.visualizationConfig['Chart Type']);
    console.log('Processed chart type:', chartType);
    
    // Handle all chart type variations
    let normalizedChartType = chartType;
    if (chartType.includes('map')) {
      normalizedChartType = 'map';
    } else if (chartType.includes('stacked') || chartType.includes('stack')) {
      normalizedChartType = 'stackedbar';
    } else if (chartType.includes('scatter')) {
      normalizedChartType = 'scatter';
    } else if (chartType.includes('area')) {
      normalizedChartType = 'area';
    } else if (chartType.includes('donut')) {
      normalizedChartType = 'donut';
    }
    
    this.chartTypeControl.setValue(normalizedChartType);
    this.xAxisControl.setValue(xAxis);
    this.yAxisControl.setValue(yAxis);
    
    // Update show axis controls logic
    this.showAxisControls = !['pie', 'donut', 'heatmap', 'map'].includes(normalizedChartType);
    
    console.log('Final chart type set:', normalizedChartType);
    console.log('Show chart controls:', this.shouldShowChartControls());
    console.log('Show axis controls:', this.showAxisControls);
  }

  onChartTypeChange(): void {
    const chartType = this.chartTypeControl.value;
    this.showAxisControls = !['pie', 'donut', 'heatmap', 'map'].includes(chartType || '');
    this.createChart();
  }

  updateChart(): void {
    this.createChart();
  }

  private createChart(): void {
    if (this.chart) {
      this.chart.dispose();
    }

    const chartType = this.chartTypeControl.value;
    console.log('Creating chart with type:', chartType);
    console.log('Should show chart controls:', this.shouldShowChartControls());
    
    switch (chartType) {
      case 'bar':
        this.createBarChart();
        break;
      case 'line':
        this.createLineChart();
        break;
      case 'pie':
        this.createPieChart();
        break;
      case 'donut':
        this.createDonutChart();
        break;
      case 'scatter':
      case 'scatterplot':
        this.createScatterChart();
        break;
      case 'stackedbar':
      case 'stacked-bar':
      case 'stacked_bar':
        this.createStackedBarChart();
        break;
      case 'areachart':
      case 'area':
        this.createAreaChart();
        break;
      case 'histogram':
        this.createHistogram();
        break;
      case 'heatmap':
        this.createHeatmap();
        break;
      case 'map':
        console.log('Creating map chart - hiding controls');
        this.createMapChart();
        break;
      default:
        console.log('Unknown chart type, defaulting to bar:', chartType);
        this.createBarChart();
    }
  }

  private createBarChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.XYChart);
    this.chart.data = this.data;

    const categoryAxis = this.chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = this.xAxisControl.value;
    categoryAxis.renderer.minGridDistance = 30;
    categoryAxis.renderer.labels.template.rotation = -45;

    const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());

    const series = this.chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = this.yAxisControl.value;
    series.dataFields.categoryX = this.xAxisControl.value;
    series.columns.template.fill = am4core.color('#2640e8');
    series.columns.template.stroke = am4core.color('#2640e8');
    
    // Add value labels on columns
    series.columns.template.tooltipText = "{categoryX}: [bold]{valueY}[/]";
  }

  private createLineChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.XYChart);
    this.chart.data = this.data;

    const categoryAxis = this.chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = this.xAxisControl.value;

    const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());

    const series = this.chart.series.push(new am4charts.LineSeries());
    series.dataFields.valueY = this.yAxisControl.value;
    series.dataFields.categoryX = this.xAxisControl.value;
    series.stroke = am4core.color('#2640e8');
    series.strokeWidth = 3;
    
    // Add bullets
    const bullet = series.bullets.push(new am4charts.CircleBullet());
    bullet.circle.fill = am4core.color('#2640e8');
    bullet.circle.strokeWidth = 2;
    bullet.circle.stroke = am4core.color('#ffffff');
  }

  private createAreaChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.XYChart);
    this.chart.data = this.data;

    const categoryAxis = this.chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = this.xAxisControl.value;

    const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());

    const series = this.chart.series.push(new am4charts.LineSeries());
    series.dataFields.valueY = this.yAxisControl.value;
    series.dataFields.categoryX = this.xAxisControl.value;
    series.stroke = am4core.color('#2640e8');
    series.fill = am4core.color('#2640e8');
    series.fillOpacity = 0.3;
    series.strokeWidth = 2;
  }

  private createPieChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.PieChart);
    this.chart.data = this.data;

    const pieSeries = this.chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = this.numericColumns[0];
    pieSeries.dataFields.category = this.columns[0];
    
    // Add labels
    pieSeries.labels.template.text = "{category}: {value}";
    pieSeries.slices.template.tooltipText = "{category}: [bold]{value}[/] ({value.percent.formatNumber('#.0')}%)";
  }

  private createDonutChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.PieChart);
    this.chart.data = this.data;
    this.chart.innerRadius = am4core.percent(40);

    const pieSeries = this.chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = this.numericColumns[0];
    pieSeries.dataFields.category = this.columns[0];
    
    pieSeries.labels.template.text = "{category}";
    pieSeries.slices.template.tooltipText = "{category}: [bold]{value}[/] ({value.percent.formatNumber('#.0')}%)";
  }

  private createScatterChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.XYChart);
    this.chart.data = this.data;

    const valueAxisX = this.chart.xAxes.push(new am4charts.ValueAxis());
    valueAxisX.title.text = this.xAxisControl.value;
    
    const valueAxisY = this.chart.yAxes.push(new am4charts.ValueAxis());
    valueAxisY.title.text = this.yAxisControl.value;

    const series = this.chart.series.push(new am4charts.LineSeries());
    series.dataFields.valueX = this.xAxisControl.value;
    series.dataFields.valueY = this.yAxisControl.value;
    series.strokeOpacity = 0;
    
    const bullet = series.bullets.push(new am4charts.CircleBullet());
    bullet.circle.fill = am4core.color('#2640e8');
    bullet.circle.strokeWidth = 0;
  }

  private createStackedBarChart(): void {
    this.chart = am4core.create(this.chartDiv.nativeElement, am4charts.XYChart);
    this.chart.data = this.data;

    const categoryAxis = this.chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = this.xAxisControl.value;

    const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());

    // Create series for each numeric column
    this.numericColumns.slice(0, 5).forEach((column, index) => {
      const series = this.chart.series.push(new am4charts.ColumnSeries());
      series.dataFields.valueY = column;
      series.dataFields.categoryX = this.xAxisControl.value;
      series.stacked = true;
      series.name = column;
      
      // Use different colors for each series
      const colors = ['#2640e8', '#293340', '#4caf50', '#ff9800', '#f44336'];
      series.fill = am4core.color(colors[index % colors.length]);
    });
    
    // Add legend
    this.chart.legend = new am4charts.Legend();
  }

  private createHistogram(): void {
    // For histogram, we'll group the data into bins
    this.createBarChart(); // Simplified approach
  }

  private createHeatmap(): void {
    // Simplified heatmap - would need more complex data transformation
    this.createBarChart(); // Fallback to bar chart
  }

  // UPDATED: Enhanced geo data detection
  private checkGeoData(): boolean {
    if (!this.data || this.data.length === 0) {
      console.log('No data available for geo check');
      return false;
    }
    
    const hasLatLng = this.columns.some(col => {
      const colLower = col.toLowerCase();
      return colLower === 'latitude' || colLower === 'longitude' || 
             colLower === 'lat' || colLower === 'lng' ||
             colLower === 'latitude_decimal' || colLower === 'longitude_decimal';
    });
    
    console.log('Columns available:', this.columns);
    console.log('Has lat/lng columns:', hasLatLng);
    
    // Also check if we have actual valid coordinate data
    if (hasLatLng) {
      const latCol = this.columns.find(col => {
        const colLower = col.toLowerCase();
        return colLower === 'latitude' || colLower === 'lat' || colLower === 'latitude_decimal';
      });
      const lngCol = this.columns.find(col => {
        const colLower = col.toLowerCase();
        return colLower === 'longitude' || colLower === 'lng' || colLower === 'longitude_decimal';
      });
      
      if (latCol && lngCol) {
        // Check if we have valid numeric coordinate data
        const validCoords = this.data.some(item => {
          const lat = parseFloat(item[latCol]);
          const lng = parseFloat(item[lngCol]);
          return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 &&
                 lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
        });
        console.log('Has valid coordinate data:', validCoords);
        return validCoords;
      }
    }
    
    return false;
  }

  // UPDATED: Enhanced createMapChart method that stores data points
  private createMapChart(): void {
    console.log('Creating map chart...');
    
    if (!this.hasGeoData) {
      console.log('No geo data available, falling back to bar chart');
      this.chartTypeControl.setValue('bar'); // Reset to bar chart
      this.createBarChart();
      return;
    }
    
    try {
      this.chart = am4core.create(this.chartDiv.nativeElement, am4maps.MapChart);
      this.chart.geodata = am4geodata_worldLow;
      this.chart.projection = new am4maps.projections.Miller();

      // Create polygon series for world map background
      const polygonSeries = this.chart.series.push(new am4maps.MapPolygonSeries());
      polygonSeries.useGeodata = true;
      polygonSeries.mapPolygons.template.fill = am4core.color("#e0e0e0");
      polygonSeries.mapPolygons.template.stroke = am4core.color("#ffffff");
      polygonSeries.mapPolygons.template.strokeWidth = 0.5;
      
      // Create point series for data locations
      const pointSeries = this.chart.series.push(new am4maps.MapImageSeries());
      
      // Configure point template
      const pointTemplate = pointSeries.mapImages.template;
      pointTemplate.propertyFields.latitude = "latitude";
      pointTemplate.propertyFields.longitude = "longitude";
      pointTemplate.nonScaling = true;
      
      // Create circle for each point
      const circle = pointTemplate.createChild(am4core.Circle);
      circle.radius = 8;
      circle.fill = am4core.color('#2640e8');
      circle.stroke = am4core.color('#ffffff');
      circle.strokeWidth = 2;
      circle.nonScaling = true;
      
      // Add tooltip
      circle.tooltipText = "{title}: Lat {latitude}, Lng {longitude}";
      
      // Prepare map data and store for counting
      this.mapDataPoints = this.prepareMapData();
      console.log('Prepared map data:', this.mapDataPoints.length, 'points');
      
      if (this.mapDataPoints.length === 0) {
        console.log('No valid map data points, falling back to bar chart');
        this.chart.dispose();
        this.chartTypeControl.setValue('bar');
        this.createBarChart();
        return;
      }
      
      // Set data to point series
      pointSeries.data = this.mapDataPoints;
      
      // Add zoom controls
      this.chart.zoomControl = new am4maps.ZoomControl();
      this.chart.zoomControl.slider.height = 100;
      
      // Set initial zoom to show all points
      this.chart.events.on("ready", () => {
        pointSeries.events.on("datavalidated", () => {
          this.chart.zoomToMapObject(pointSeries);
        });
      });
      
      console.log('Map chart created successfully with', this.mapDataPoints.length, 'points');
      
    } catch (error) {
      console.error('Error creating map chart:', error);
      console.log('Falling back to bar chart due to error');
      this.chartTypeControl.setValue('bar');
      this.createBarChart();
    }
  }

  // UPDATED: Enhanced map data preparation
  private prepareMapData(): any[] {
    if (!this.data || this.data.length === 0) return [];
    
    // Find latitude and longitude columns (case insensitive)
    const latCol = this.columns.find(col => {
      const colLower = col.toLowerCase();
      return colLower === 'latitude' || colLower === 'lat' || colLower === 'recommended_latitude';
    });
    
    const lngCol = this.columns.find(col => {
      const colLower = col.toLowerCase();
      return colLower === 'longitude' || colLower === 'lng' || colLower === 'recommended_longitude';
    });
    
    if (!latCol || !lngCol) {
      console.log('Could not find latitude/longitude columns');
      return [];
    }
    
    console.log('Using columns - Latitude:', latCol, 'Longitude:', lngCol);
    
    // Find a good column for the title (preferably location name or ID)
    const titleCol = this.columns.find(col => {
      const colLower = col.toLowerCase();
      return colLower.includes('name') || colLower.includes('location') || 
             colLower.includes('address') || colLower.includes('city') ||
             colLower.includes('id');
    }) || this.columns.find(col => !['latitude', 'longitude', 'recommended_longitude', 'recommended_latitude'].includes(col.toLowerCase()));
    
    const mapData = this.data
      .filter(item => {
        const lat = parseFloat(item[latCol]);
        const lng = parseFloat(item[lngCol]);
        const isValid = !isNaN(lat) && !isNaN(lng) && 
                       lat !== 0 && lng !== 0 &&
                       lat >= -90 && lat <= 90 && 
                       lng >= -180 && lng <= 180;
        if (!isValid) {
          console.log('Invalid coordinates:', lat, lng, 'for item:', item);
        }
        return isValid;
      })
      .map(item => ({
        latitude: parseFloat(item[latCol]),
        longitude: parseFloat(item[lngCol]),
        title: titleCol ? (item[titleCol] || 'Location') : 'Location'
      })); 
    console.log('Prepared map data sample:', mapData.slice(0, 3));
    return mapData;
  }

  private getNumericColumns(): string[] {
    if (!this.data || this.data.length === 0) return [];
    
    return this.columns.filter(col => {
      const value = this.data[0][col];
      return typeof value === 'number' || (!isNaN(Number(value)) && value !== null && value !== '');
    });
  }
}