const os = require('os');
const { performance } = require('perf_hooks');
const fetch = require('node-fetch');
const config = require('./config');

const requestMetrics = {
  totalRequests: 0,
  methods: {
    GET: 0,
    POST: 0,
    PUT: 0,
    DELETE: 0,
  },
  endpoints: {},
  requestTimes: [],
};

function sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      try {
        const metrics = {
          requestMetrics: requestMetrics,
          systemMetrics: {
            cpuUsage: getCpuUsagePercentage(),
            memoryUsage: getMemoryUsagePercentage(),
          },
        };
  
        sendMetricToGrafana(metrics);
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
  }
  

async function sendMetricToGrafana(metricName, metricValue, attributes) {
    const metric = {
      resourceMetrics: [
        {
          scopeMetrics: [
            {
              metrics: [
                {
                  name: metricName,
                  unit: '1',
                  sum: {
                    dataPoints: [
                      {
                        asInt: metricValue,
                        timeUnixNano: Date.now() * 1000000,
                        attributes: [],
                      },
                    ],
                    aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
                    isMonotonic: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    console.log('Sending metric:', JSON.stringify(metric, null, 2));
  
    const validAttributes = attributes || {};
    
    Object.keys(validAttributes).forEach((key) => {
      metric.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes.push({
        key,
        value: { stringValue: validAttributes[key] },
      });
    });
  
    try {
      const response = await fetch(`${config.metrics.url}`, {
        method: 'POST',
        body: JSON.stringify(metric),
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.metrics.userId}:${config.metrics.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      });
  
      const text = await response.text();
      if (!response.ok) {
        console.error('Error pushing metrics:', text);
      } else {
        console.log(`Successfully pushed ${metricName} metric`);
      }
    } catch (err) {
      console.error('Error pushing metrics to Grafana:', err);
    }
  }

function requestTracker(req, res, next) {
  const start = performance.now();
  const method = req.method;
  const endpoint = req.originalUrl;
  const timestamp = new Date().toISOString();

  console.log(`Tracking request: Method - ${method}, Endpoint - ${endpoint}`);

  requestMetrics.totalRequests += 1;
  requestMetrics.methods[method] += 1;
  requestMetrics.endpoints[endpoint] = (requestMetrics.endpoints[endpoint] || 0) + 1;

  res.on('finish', () => {
    const duration = performance.now() - start;
    requestMetrics.requestTimes.push(duration);

    sendMetricToGrafana('requests_total', requestMetrics.totalRequests, {
      method,
      endpoint,
      source: config.metrics.source,
    });

    sendMetricToGrafana('requests_by_method', requestMetrics.methods[method], {
      method,
      source: config.metrics.source,
    });

    sendMetricToGrafana('requests_by_endpoint', requestMetrics.endpoints[endpoint], {
      endpoint,
      source: config.metrics.source,
    });

    const avgLatency = requestMetrics.requestTimes.reduce((acc, curr) => acc + curr, 0) / requestMetrics.requestTimes.length;
    sendMetricToGrafana('avg_latency', avgLatency, {
      endpoint,
      source: config.metrics.source,
    });
  });

  next();
}

function getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return (cpuUsage * 100).toFixed(2);
  }
  
  function getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return ((usedMemory / totalMemory) * 100).toFixed(2);
  }
  
  function trackSystemMetrics() {
    const cpuUsage = getCpuUsagePercentage();
    const memoryUsage = getMemoryUsagePercentage();
  
    sendMetricToGrafana('cpu_usage', cpuUsage, { source: config.metrics.source });
    sendMetricToGrafana('memory_usage', memoryUsage, { source: config.metrics.source });
  }

setInterval(trackSystemMetrics, 60000);

module.exports = { sendMetricsPeriodically, requestTracker };

