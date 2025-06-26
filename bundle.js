 let isMonitoring = false;
        let requestCount = 0;
        let successCount = 0;
        let failCount = 0;
        let responseTimes = [];

        // Network connection info
        function updateConnectionInfo() {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                document.getElementById('connectionType').textContent = connection.type || 'Unknown';
                document.getElementById('effectiveType').textContent = connection.effectiveType || 'Unknown';
                document.getElementById('downlink').textContent = connection.downlink || 'Unknown';
                document.getElementById('rtt').textContent = connection.rtt || 'Unknown';
            }
        }

        // Original fetch function
        const originalFetch = window.fetch;

        // Override fetch to monitor requests
        function interceptFetch() {
            window.fetch = function(...args) {
                const startTime = performance.now();
                const url = args[0];
                const options = args[1] || {};
                const method = options.method || 'GET';

                return originalFetch.apply(this, args)
                    .then(response => {
                        const endTime = performance.now();
                        const responseTime = Math.round(endTime - startTime);
                        
                        if (isMonitoring) {
                            logRequest(method, url, response.status, responseTime);
                            updateStats(response.status, responseTime);
                        }
                        
                        return response;
                    })
                    .catch(error => {
                        const endTime = performance.now();
                        const responseTime = Math.round(endTime - startTime);
                        
                        if (isMonitoring) {
                            logRequest(method, url, 'ERROR', responseTime, error.message);
                            updateStats('ERROR', responseTime);
                        }
                        
                        throw error;
                    });
            };
        }

        function restoreFetch() {
            window.fetch = originalFetch;
        }

        function logRequest(method, url, status, responseTime, error = null) {
            const log = document.getElementById('requestLog');
            const entry = document.createElement('div');
            entry.className = 'request-entry';
            
            const timestamp = new Date().toLocaleTimeString();
            const statusClass = status >= 200 && status < 300 ? 'status-200' : 
                              status >= 400 && status < 500 ? 'status-400' : 'status-500';
            
            entry.innerHTML = `
                <span class="timestamp">[${timestamp}]</span>
                <span class="method">${method}</span>
                <span class="url">${url}</span>
                <span class="${statusClass}">${status}</span>
                <span style="color: #888;">(${responseTime}ms)</span>
                ${error ? `<span style="color: #ff0000;"> - ${error}</span>` : ''}
            `;
            
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }

        function updateStats(status, responseTime) {
            requestCount++;
            responseTimes.push(responseTime);
            
            if (status >= 200 && status < 400) {
                successCount++;
            } else {
                failCount++;
            }
            
            document.getElementById('totalRequests').textContent = requestCount;
            document.getElementById('successfulRequests').textContent = successCount;
            document.getElementById('failedRequests').textContent = failCount;
            
            const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            document.getElementById('avgResponseTime').textContent = Math.round(avgTime) + 'ms';
        }

        function toggleMonitoring() {
            const btn = document.getElementById('toggleBtn');
            const log = document.getElementById('requestLog');
            
            if (!isMonitoring) {
                isMonitoring = true;
                interceptFetch();
                btn.textContent = 'Stop Monitoring';
                btn.style.background = '#ff4444';
                log.innerHTML = '<div style="color: #00ff00;">🟢 Monitoring active - Network requests will be logged here...</div>';
                
                // Monitor resource timing
                monitorResourceTiming();
            } else {
                isMonitoring = false;
                restoreFetch();
                btn.textContent = 'Start Monitoring';
                btn.style.background = '#333';
            }
        }

        function monitorResourceTiming() {
            if (!isMonitoring) return;
            
            const entries = performance.getEntriesByType('resource');
            const timingLog = document.getElementById('timingLog');
            
            // Get new entries (simple approach for demo)
            const recentEntries = entries.slice(-5);
            
            timingLog.innerHTML = recentEntries.map(entry => {
                const loadTime = Math.round(entry.responseEnd - entry.requestStart);
                return `
                    <div style="margin-bottom: 5px; font-size: 11px;">
                        <span style="color: #ffff00;">${entry.name.split('/').pop()}</span>
                        <span style="color: #888;"> - Load: ${loadTime}ms</span>
                        <span style="color: #00ffff;"> DNS: ${Math.round(entry.domainLookupEnd - entry.domainLookupStart)}ms</span>
                        <span style="color: #ff8800;"> Connect: ${Math.round(entry.connectEnd - entry.connectStart)}ms</span>
                    </div>
                `;
            }).join('');
            
            setTimeout(monitorResourceTiming, 2000);
        }

        async function makeTestRequest(method) {
            try {
                const options = {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                };
                
                if (method === 'POST') {
                    options.body = JSON.stringify({ test: 'data', timestamp: Date.now() });
                }
                
                // Test with a public API
                const response = await fetch('https://httpbin.org/' + method.toLowerCase(), options);
                const data = await response.text();
                
                console.log('Test request completed:', method, response.status);
            } catch (error) {
                console.error('Test request failed:', error);
            }
        }

        function clearLog() {
            document.getElementById('requestLog').innerHTML = 
                '<div style="color: #888; text-align: center; margin-top: 80px;">Log cleared...</div>';
            
            // Reset stats
            requestCount = 0;
            successCount = 0;
            failCount = 0;
            responseTimes = [];
            
            document.getElementById('totalRequests').textContent = '0';
            document.getElementById('successfulRequests').textContent = '0';
            document.getElementById('failedRequests').textContent = '0';
            document.getElementById('avgResponseTime').textContent = '0ms';
        }

        // Initialize
        updateConnectionInfo();
        
        // Update connection info periodically
        setInterval(updateConnectionInfo, 5000);