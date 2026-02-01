<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Hero Header -->
    <div
      class="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white dark:border-gray-800 dark:from-gray-900 dark:to-gray-900"
    >
      <div class="container mx-auto px-4 py-6 sm:py-8">
        <!-- Breadcrumb -->
        <nav class="mb-4 flex items-center gap-1.5 text-sm">
          <NuxtLink
            to="/"
            class="hover:text-primary-600 text-gray-500 transition-colors dark:text-gray-400"
          >
            Accueil
          </NuxtLink>
          <UIcon name="i-heroicons-chevron-right-20-solid" class="h-4 w-4 text-gray-400" />
          <NuxtLink
            to="/dashboard"
            class="hover:text-primary-600 text-gray-500 transition-colors dark:text-gray-400"
          >
            Dashboard
          </NuxtLink>
          <UIcon name="i-heroicons-chevron-right-20-solid" class="h-4 w-4 text-gray-400" />
          <span class="font-medium text-gray-900 dark:text-white">Démo D3.js</span>
        </nav>

        <!-- Title -->
        <div>
          <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            Démo D3.js Charts
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Exemples de visualisations de données avec D3.js v7
          </p>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <!-- Line Chart -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">Line Chart</h2>
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Évolution des Revenus
          </h3>
          <div ref="lineChartContainer" class="w-full">
            <svg ref="lineChartSvg" class="w-full"></svg>
          </div>
        </div>
      </section>

      <!-- Bar Chart -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">Bar Chart</h2>
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Ventes par Mois</h3>
          <div ref="barChartContainer" class="w-full">
            <svg ref="barChartSvg" class="w-full"></svg>
          </div>
        </div>
      </section>

      <!-- Pie & Donut Charts -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">
          Pie & Donut Charts
        </h2>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Pie Chart -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Répartition Budget (Pie)
            </h3>
            <div ref="pieChartContainer" class="flex w-full justify-center"></div>
          </div>

          <!-- Donut Chart -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Parts de Marché (Donut)
            </h3>
            <div ref="donutChartContainer" class="flex w-full justify-center"></div>
          </div>
        </div>
      </section>

      <!-- Area Chart -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">Area Chart</h2>
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Trafic Web Mensuel
          </h3>
          <div ref="areaChartContainer" class="w-full">
            <svg ref="areaChartSvg" class="w-full"></svg>
          </div>
        </div>
      </section>

      <!-- Stacked Bar Chart -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">Stacked Bar Chart</h2>
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Revenus par Catégorie
          </h3>
          <div ref="stackedBarContainer" class="w-full">
            <svg ref="stackedBarSvg" class="w-full"></svg>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';

// SEO: Désindexer la page
useHead({
  title: 'Démo D3.js Charts - Vision 2050',
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
  ],
});

// Data
const lineData = [
  { month: 'Jan', value: 30 },
  { month: 'Fév', value: 45 },
  { month: 'Mar', value: 60 },
  { month: 'Avr', value: 55 },
  { month: 'Mai', value: 75 },
  { month: 'Jun', value: 90 },
  { month: 'Jul', value: 85 },
];

const barData = [
  { month: 'Jan', value: 120 },
  { month: 'Fév', value: 150 },
  { month: 'Mar', value: 180 },
  { month: 'Avr', value: 140 },
  { month: 'Mai', value: 200 },
  { month: 'Jun', value: 220 },
];

const pieData = [
  { label: 'Éducation', value: 350 },
  { label: 'Santé', value: 280 },
  { label: 'Infrastructure', value: 450 },
  { label: 'Agriculture', value: 220 },
];

const areaData = [
  { month: 'Jan', value: 3000 },
  { month: 'Fév', value: 4200 },
  { month: 'Mar', value: 3800 },
  { month: 'Avr', value: 5100 },
  { month: 'Mai', value: 4800 },
  { month: 'Jun', value: 6200 },
];

const stackedData = [
  { month: 'Jan', desktop: 120, mobile: 80, tablet: 40 },
  { month: 'Fév', desktop: 150, mobile: 100, tablet: 50 },
  { month: 'Mar', desktop: 180, mobile: 120, tablet: 60 },
  { month: 'Avr', desktop: 140, mobile: 90, tablet: 45 },
  { month: 'Mai', desktop: 200, mobile: 130, tablet: 65 },
];

// Refs
const lineChartContainer = ref<HTMLDivElement | null>(null);
const lineChartSvg = ref<SVGElement | null>(null);
const barChartContainer = ref<HTMLDivElement | null>(null);
const barChartSvg = ref<SVGElement | null>(null);
const pieChartContainer = ref<HTMLDivElement | null>(null);
const donutChartContainer = ref<HTMLDivElement | null>(null);
const areaChartContainer = ref<HTMLDivElement | null>(null);
const areaChartSvg = ref<SVGElement | null>(null);
const stackedBarContainer = ref<HTMLDivElement | null>(null);
const stackedBarSvg = ref<SVGElement | null>(null);

// Line Chart
const drawLineChart = () => {
  if (!lineChartContainer.value || !lineChartSvg.value) return;

  d3.select(lineChartSvg.value).selectAll('*').remove();

  const containerWidth = lineChartContainer.value.offsetWidth;
  const margin = { top: 20, right: 30, bottom: 50, left: 50 };
  const width = containerWidth - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = d3
    .select(lineChartSvg.value)
    .attr('width', containerWidth)
    .attr('height', 300);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3
    .scalePoint()
    .domain(lineData.map((d) => d.month))
    .range([0, width])
    .padding(0.5);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(lineData, (d) => d.value) || 0])
    .nice()
    .range([height, 0]);

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .style('fill', '#6B7280');

  g.append('g').call(d3.axisLeft(y)).selectAll('text').style('fill', '#6B7280');

  // Line
  const line = d3
    .line<(typeof lineData)[0]>()
    .x((d) => x(d.month) || 0)
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  g.append('path')
    .datum(lineData)
    .attr('fill', 'none')
    .attr('stroke', '#3B82F6')
    .attr('stroke-width', 3)
    .attr('d', line);

  // Points
  g.selectAll('circle')
    .data(lineData)
    .enter()
    .append('circle')
    .attr('cx', (d) => x(d.month) || 0)
    .attr('cy', (d) => y(d.value))
    .attr('r', 5)
    .attr('fill', '#3B82F6');
};

// Bar Chart
const drawBarChart = () => {
  if (!barChartContainer.value || !barChartSvg.value) return;

  d3.select(barChartSvg.value).selectAll('*').remove();

  const containerWidth = barChartContainer.value.offsetWidth;
  const margin = { top: 20, right: 30, bottom: 50, left: 50 };
  const width = containerWidth - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = d3
    .select(barChartSvg.value)
    .attr('width', containerWidth)
    .attr('height', 300);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleBand()
    .domain(barData.map((d) => d.month))
    .range([0, width])
    .padding(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(barData, (d) => d.value) || 0])
    .nice()
    .range([height, 0]);

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .style('fill', '#6B7280');

  g.append('g').call(d3.axisLeft(y)).selectAll('text').style('fill', '#6B7280');

  // Bars
  g.selectAll('.bar')
    .data(barData)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', (d) => x(d.month) || 0)
    .attr('y', (d) => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', (d) => height - y(d.value))
    .attr('fill', '#10B981')
    .attr('rx', 4);
};

// Pie Chart
const drawPieChart = () => {
  if (!pieChartContainer.value) return;

  d3.select(pieChartContainer.value).selectAll('*').remove();

  const width = 300;
  const height = 300;
  const radius = Math.min(width, height) / 2;

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
  const color = d3.scaleOrdinal().domain(pieData.map((d) => d.label)).range(colors);

  const svg = d3
    .select(pieChartContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

  const pie = d3
    .pie<(typeof pieData)[0]>()
    .value((d) => d.value)
    .sort(null);

  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  const arcs = svg
    .selectAll('arc')
    .data(pie(pieData))
    .enter()
    .append('g');

  arcs
    .append('path')
    .attr('d', arc as any)
    .attr('fill', (d) => color(d.data.label) as string)
    .attr('stroke', 'white')
    .attr('stroke-width', 2);

  arcs
    .append('text')
    .attr('transform', (d) => `translate(${arc.centroid(d as any)})`)
    .attr('text-anchor', 'middle')
    .attr('fill', 'white')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .text((d) => d.data.label);
};

// Donut Chart
const drawDonutChart = () => {
  if (!donutChartContainer.value) return;

  d3.select(donutChartContainer.value).selectAll('*').remove();

  const width = 300;
  const height = 300;
  const radius = Math.min(width, height) / 2;

  const colors = ['#8B5CF6', '#EC4899', '#F59E0B', '#14B8A6'];
  const color = d3.scaleOrdinal().domain(pieData.map((d) => d.label)).range(colors);

  const svg = d3
    .select(donutChartContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

  const pie = d3
    .pie<(typeof pieData)[0]>()
    .value((d) => d.value)
    .sort(null);

  const arc = d3
    .arc()
    .innerRadius(radius * 0.6)
    .outerRadius(radius);

  const arcs = svg
    .selectAll('arc')
    .data(pie(pieData))
    .enter()
    .append('g');

  arcs
    .append('path')
    .attr('d', arc as any)
    .attr('fill', (d) => color(d.data.label) as string)
    .attr('stroke', 'white')
    .attr('stroke-width', 2);
};

// Area Chart
const drawAreaChart = () => {
  if (!areaChartContainer.value || !areaChartSvg.value) return;

  d3.select(areaChartSvg.value).selectAll('*').remove();

  const containerWidth = areaChartContainer.value.offsetWidth;
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  const width = containerWidth - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = d3
    .select(areaChartSvg.value)
    .attr('width', containerWidth)
    .attr('height', 300);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3
    .scalePoint()
    .domain(areaData.map((d) => d.month))
    .range([0, width])
    .padding(0.5);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(areaData, (d) => d.value) || 0])
    .nice()
    .range([height, 0]);

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .style('fill', '#6B7280');

  g.append('g').call(d3.axisLeft(y)).selectAll('text').style('fill', '#6B7280');

  // Area
  const area = d3
    .area<(typeof areaData)[0]>()
    .x((d) => x(d.month) || 0)
    .y0(height)
    .y1((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  g.append('path')
    .datum(areaData)
    .attr('fill', 'url(#areaGradient)')
    .attr('d', area);

  // Gradient
  const defs = svg.append('defs');
  const gradient = defs
    .append('linearGradient')
    .attr('id', 'areaGradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%');

  gradient.append('stop').attr('offset', '0%').attr('stop-color', '#8B5CF6').attr('stop-opacity', 0.8);

  gradient.append('stop').attr('offset', '100%').attr('stop-color', '#8B5CF6').attr('stop-opacity', 0.1);

  // Line on top
  const line = d3
    .line<(typeof areaData)[0]>()
    .x((d) => x(d.month) || 0)
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  g.append('path')
    .datum(areaData)
    .attr('fill', 'none')
    .attr('stroke', '#8B5CF6')
    .attr('stroke-width', 2)
    .attr('d', line);
};

// Stacked Bar Chart
const drawStackedBarChart = () => {
  if (!stackedBarContainer.value || !stackedBarSvg.value) return;

  d3.select(stackedBarSvg.value).selectAll('*').remove();

  const containerWidth = stackedBarContainer.value.offsetWidth;
  const margin = { top: 20, right: 100, bottom: 50, left: 50 };
  const width = containerWidth - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = d3
    .select(stackedBarSvg.value)
    .attr('width', containerWidth)
    .attr('height', 300);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const keys = ['desktop', 'mobile', 'tablet'];
  const colors = { desktop: '#3B82F6', mobile: '#10B981', tablet: '#F59E0B' };

  const stack = d3.stack().keys(keys);
  const series = stack(stackedData as any);

  const x = d3
    .scaleBand()
    .domain(stackedData.map((d) => d.month))
    .range([0, width])
    .padding(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(series, (d) => d3.max(d, (d) => d[1])) || 0])
    .nice()
    .range([height, 0]);

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .style('fill', '#6B7280');

  g.append('g').call(d3.axisLeft(y)).selectAll('text').style('fill', '#6B7280');

  // Stacked bars
  g.selectAll('g.series')
    .data(series)
    .enter()
    .append('g')
    .attr('class', 'series')
    .attr('fill', (d) => colors[d.key as keyof typeof colors])
    .selectAll('rect')
    .data((d) => d)
    .enter()
    .append('rect')
    .attr('x', (d) => x((d.data as any).month) || 0)
    .attr('y', (d) => y(d[1]))
    .attr('height', (d) => y(d[0]) - y(d[1]))
    .attr('width', x.bandwidth())
    .attr('rx', 2);

  // Legend
  const legend = svg
    .append('g')
    .attr('transform', `translate(${width + margin.left + 10},${margin.top})`);

  keys.forEach((key, i) => {
    const legendRow = legend.append('g').attr('transform', `translate(0, ${i * 25})`);

    legendRow
      .append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', colors[key as keyof typeof colors])
      .attr('rx', 2);

    legendRow
      .append('text')
      .attr('x', 20)
      .attr('y', 12)
      .attr('fill', '#6B7280')
      .attr('font-size', '12px')
      .text(key.charAt(0).toUpperCase() + key.slice(1));
  });
};

// Initialize charts
onMounted(() => {
  drawLineChart();
  drawBarChart();
  drawPieChart();
  drawDonutChart();
  drawAreaChart();
  drawStackedBarChart();

  // Redraw on resize
  window.addEventListener('resize', () => {
    drawLineChart();
    drawBarChart();
    drawAreaChart();
    drawStackedBarChart();
  });
});
</script>
