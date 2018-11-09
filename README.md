# opencensus-test

## Application Layout
`POST`ing a JSON object with a `name` property to `localhost:3000/submit` submits a job to the system and the job is put on a "queue".

A "background daemon" runs every 500ms and `POST`s the contents of the first item in the queue (such as there is one) to `localhost:3001/process` where the job is "processed".

The intention is for tracing should track the lifetime of a job through the system across execution and service boundaries.

## Setup

### Install dependencies
```
$ npm install
```

### Build and start [Local-Forwarder](https://github.com/Microsoft/ApplicationInsights-LocalForwarder)

```
$ docker build -t local-forwarder https://raw.githubusercontent.com/Microsoft/ApplicationInsights-LocalForwarder/master/examples/opencensus/local-forwarder/Dockerfile

$ docker run -d --rm --name local-forwarder -e APPINSIGHTS_INSTRUMENTATIONKEY=<KEY> -p 55678:55678 local-forwarder
```

### Start [Jaeger](https://www.jaegertracing.io/docs/1.7/getting-started/)
```
$ docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HTTP_PORT=9411 \
  -p 5775:5775/udp \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14268:14268 \
  -p 9411:9411 \
  jaegertracing/all-in-one:1.7
```
The Jaeger frontend will be available at http://localhost:16686

### Required Hacks to `@opencensus/exporter-ocagent`
https://github.com/census-instrumentation/opencensus-node/issues/174

* Export the contents of `https://github.com/census-instrumentation/opencensus-node/tree/master/packages/opencensus-exporter-ocagent/src/protos` to `./node_modules/@opencensus/exporter-ocagent/src/protos`
* Edit `./node_modules/@opencensus/exporter-ocagent/build/src/ocagent.js` like this:
    ``` diff
    @@ -55,7 +55,7 @@ class OCAgentExporter {
            */
            this.exporterVersion = require('../../package.json').version;
            this.coreVersion =
    -            require('../../node_modules/@opencensus/core/package.json').version;
    +            require('@opencensus/core/package.json').version;
            this.hostName = os.hostname();
            this.processStartTimeMillis = Date.now() - (process.uptime() * 1000);
            /**
    @@ -66,7 +66,7 @@ class OCAgentExporter {
                // opencensus.proto
                __dirname + '../../../src/protos',
                // google.proto
    -            __dirname + '../../../node_modules/google-proto-files'
    +            __dirname + '../../../../../google-proto-files'
            ];
            // tslint:disable-next-line:no-any
            const proto = grpc.loadPackageDefinition(protoLoader.loadSync(traceServiceProtoPath, {
    ```

## Start It Up

* In separate terminals, run `node server.js` and `node processor.js`.
* Perform a `POST http://localhost:3000/submit` using curl, Postman, or whatever with the body `{ "name": "operation_name" }`. Processor will use `.name` as a span name.


