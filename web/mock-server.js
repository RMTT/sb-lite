import http from 'http';

const mockConnections = {
  "connections": [
    {
      "chains": ["smart", "google"],
      "download": 68301,
      "id": "325627fd-42fd-46be-beeb-25d9c5f62843",
      "metadata": {
        "destinationIP": "142.250.197.106",
        "destinationPort": "443",
        "dnsMode": "normal",
        "host": "signaler-pa.clients6.google.com",
        "network": "tcp",
        "processPath": "",
        "sourceIP": "172.172.0.1",
        "sourcePort": "44600",
        "type": "tun/tun-in"
      },
      "rule": "rule_set=geosite-google => route(google)",
      "rulePayload": "",
      "start": new Date(Date.now() - 50000).toISOString(),
      "upload": 76948
    },
    {
      "chains": ["direct"],
      "download": 10094688,
      "id": "03a2ba3b-3344-4cfa-87da-caf8e9e8279b",
      "metadata": {
        "destinationIP": "183.214.153.60",
        "destinationPort": "443",
        "dnsMode": "normal",
        "host": "i1.hdslb.com",
        "network": "tcp",
        "processPath": "",
        "sourceIP": "172.172.0.1",
        "sourcePort": "49904",
        "type": "tun/tun-in"
      },
      "rule": "domain_suffix=[.cn canada.ca gc.ca...] rule_set=[geoip-cn geosite-cn] => route(direct)",
      "rulePayload": "",
      "start": new Date(Date.now() - 120000).toISOString(),
      "upload": 175375
    }
  ],
  "downloadTotal": 6818055110,
  "memory": 25034752,
  "uploadTotal": 315720095
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (req.url === '/api/sing-box/connections') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockConnections));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(8180, () => {
  console.log('Mock server running on port 8180');
});
