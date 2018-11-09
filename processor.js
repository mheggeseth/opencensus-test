const core = require("@opencensus/core");
const tracing = require("@opencensus/nodejs");
const ocagent = require("@opencensus/exporter-ocagent");
const jaeger = require("@opencensus/exporter-jaeger");
const propagation = require("@opencensus/propagation-tracecontext");
const { MultiExporter } = require("./multi-exporter");

const exporter = new MultiExporter();
const tracecontext = new propagation.TraceContextFormat();
exporter.addTracingExporter(new ocagent.OCAgentExporter({
    serviceName: "my_processor",
    host: "localhost",
    port: 55678
}));
exporter.addTracingExporter(new jaeger.JaegerTraceExporter({
    serviceName: "my_processor",
    host: "localhost",
    port: 6832
}));

const tracer = tracing.start({
    exporter,
    samplingRate: 1,
    logger: core.logger.logger("debug"),
    propagation: tracecontext
}).tracer;

const express = require("express");
express()
    .use((req, _, next) => {
        const auth = tracer.startChildSpan("auth", "SERVER");
        // Check auth against revocation list
        const rev = tracer.startChildSpan("check_revocation", "SERVER");
        rev.end();
        // Perform other authorization
        auth.addAttribute("ip", req.ip);
        auth.addAnnotation("authorized", req.query);
        auth.end();
        next();
    })
    .post("/process", express.json(), (req, res) => {
        const spanContext = tracer.currentRootSpan.spanContext;
        tracer.startRootSpan({ name: req.body.name, spanContext, kind: "SERVER" }, (root) => {
            root.addAnnotation("processed", req.body);
            root.end();
            res.send();
        });
    })
    .listen(3001, () => console.log(`listening 0.0.0.0:3001, pid ${process.pid}`));
