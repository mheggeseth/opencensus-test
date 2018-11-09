class MultiExporter {
    constructor() {
        this.statsExporters = [];
        this.traceExporters = [];
    }
    addStatsExporter(exporter) { this.statsExporters.push(exporter); }
    addTracingExporter(exporter) { this.traceExporters.push(exporter); }
    onRegisterView(view) { this.statsExporters.forEach((e) => e.onRegisterView(view)); }
    onRecord(views, measurement) { this.statsExporters.forEach((e) => e.onRecord(views, measurement)); }
    async publish(rootSpans) { await Promise.all(this.traceExporters.map(e => e.publish(rootSpans))); }
    onStartSpan(span) { this.traceExporters.forEach(e => e.onStartSpan(span)); }
    onEndSpan(span) { this.traceExporters.forEach(e => e.onEndSpan(span)); }
}
module.exports = { MultiExporter };
