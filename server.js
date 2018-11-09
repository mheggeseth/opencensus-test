const core = require("@opencensus/core");
const tracing = require("@opencensus/nodejs");
const ocagent = require("@opencensus/exporter-ocagent");
const jaeger = require("@opencensus/exporter-jaeger");
const propagation = require("@opencensus/propagation-tracecontext");
const { MultiExporter } = require("./multi-exporter");

const exporter = new MultiExporter();
const tracecontext = new propagation.TraceContextFormat();
exporter.addTracingExporter(new ocagent.OCAgentExporter({
    serviceName: "my_server",
    host: "localhost",
    port: 55678
}));
exporter.addTracingExporter(new jaeger.JaegerTraceExporter({
    serviceName: "my_server",
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
const request = require("request");
const queue = [];

express()
    .use((req, _, next) => {
        const auth = tracer.startChildSpan("auth", "SERVER");
        // Check auth against a revocation list
        const rev = tracer.startChildSpan("check_revocation", "SERVER");
        rev.end();
        // Perform other authorization
        auth.addAttribute("ip", req.ip);
        auth.addAnnotation("authorized", req.query);
        auth.end();
        next();
    })
    .post("/submit", express.json(), (req, res) => {
        const message = req.body;
        const spanContext = tracer.currentRootSpan.spanContext; // this works because of duck patching http
        tracer.propagation.inject({ setHeader(n, v) { message[n] = v; } }, spanContext);
        tracer.currentRootSpan.addAnnotation("submission", message);
        queue.push(message);
        res.send("Submitted!");
    })
    .listen(3000, () => console.log(`listening 0.0.0.0:3000, pid ${process.pid}`));

setInterval(() => {
    const message = queue.shift();
    if (message) {
        const spanContext = tracer.propagation.extract({ getHeader(name) { return message[name]; } });
        tracer.startRootSpan({ name: "dispatch", spanContext, kind: "SERVER" }, (dispatch) => {
            const child = dispatch.startChildSpan("dispatch_child", "SERVER");
            dispatch.addAttribute("name", message.name);
            request.post("http://localhost:3001/process", { json: true, body: message }, () => {
                dispatch.end();
            });
            child.end();
        });
    }
}, 500);


