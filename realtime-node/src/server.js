import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

/**
 * TrimPlate Standalone Node.js Real-Time Notification & Delivery Socket Service
 * Receives internal webhook events from CodeIgniter 4 (`POST /emit`) and broadcasts
 * live order tracking & subscription updates to connected customer and admin browsers.
 */
const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

app.post('/emit', (req, res) => {
  const { event, payload } = req.body || {};
  const msg = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
  res.json({ broadcasted: true, recipients: clients.size });
});

const PORT = Number(process.env.REALTIME_PORT) || 4001;
server.listen(PORT, () => {
  console.log(`TrimPlate Node.js Realtime Service listening on port ${PORT}`);
});
