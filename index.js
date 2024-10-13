import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { createBareServer } from "@tomphttp/bare-server-node";
import wisp from "wisp-server-node";
import request from '@cypress/request';
import chalk from 'chalk';
import packageJson from './package.json' assert { type: 'json' };

// Set up path resolution
const __dirname = path.resolve();
const server = http.createServer();
const bareServer = createBareServer('/bear/');
const app = express(server);
const version = packageJson.version;
const discord = 'https://discord.gg/unblocking';
const routes = [
  { route: '/app', file: './static/index.html' },
  { route: '/portal', file: './static/loader.html' },
  { route: '/apps', file: './static/apps.html' },
  { route: '/gms', file: './static/gms.html' },
  { route: '/lessons', file: './static/agloader.html' },
  { route: '/info', file: './static/info.html' },
  { route: '/edu', file: './static/loading.html' }
];

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'static')));
app.use("/libcurl/", express.static(libcurlPath));
app.use("/baremux/", express.static(baremuxPath));

// Define routes
routes.forEach(({ route, file }) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, file));
  });
});

// Redirect /student to /portal
app.get('/student', (req, res) => {
  res.redirect('/portal');
});

// Fetch worker.js from an external source
app.get('/worker.js', (req, res) => {
  request('https://cdn.surfdoge.pro/worker.js', (error, response, body) => {
    if (!error && response.statusCode === 200) {
      res.setHeader('Content-Type', 'text/javascript');
      res.send(body);
    } else {
      res.status(500).send('Error fetching worker script');
    }
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, './static/404.html'));
});

// Handle incoming requests
server.on("request", (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

// Handle WebSocket upgrades
server.on("upgrade", (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else if (req.url.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.end();
  }
});

// Log server status on startup
server.on('listening', () => {
  console.log(chalk.bgBlue.white.bold(`  Welcome to Doge V4, user!  `) + '\n');
  console.log(chalk.cyan('-----------------------------------------------'));
  console.log(chalk.green('  🌟 Status: ') + chalk.bold('Active'));
  console.log(chalk.green('  🌍 Port: ') + chalk.bold(chalk.yellow(server.address().port)));
  console.log(chalk.green('  🕒 Time: ') + chalk.bold(new Date().toLocaleTimeString()));
  console.log(chalk.cyan('-----------------------------------------------'));
  console.log(chalk.magenta('📦 Version: ') + chalk.bold(version));
  console.log(chalk.magenta('🔗 URL: ') + chalk.underline('http://localhost:' + server.address().port));
  console.log(chalk.cyan('-----------------------------------------------'));
  console.log(chalk.blue('💬 Discord: ') + chalk.underline(discord));
  console.log(chalk.cyan('-----------------------------------------------'));
});

// Graceful shutdown function
function shutdown(signal) {
  console.log(chalk.bgRed.white.bold(`  Shutting Down (Signal: ${signal})  `) + '\n');
  console.log(chalk.red('-----------------------------------------------'));
  console.log(chalk.yellow('  🛑 Status: ') + chalk.bold('Shutting Down'));
  console.log(chalk.yellow('  🕒 Time: ') + chalk.bold(new Date().toLocaleTimeString()));
  console.log(chalk.red('-----------------------------------------------'));
  console.log(chalk.blue('  Performing graceful exit...'));
  server.close(() => {
    console.log(chalk.blue('  Doge has been closed.'));
    process.exit(0);
  });
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server
server.listen(8000, () => {
  console.log(`Server is running on http://localhost:8000`);
});
