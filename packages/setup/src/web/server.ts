/**
 * Web UI Server for Authrim Setup
 *
 * Provides a web-based interface for configuring and deploying Authrim.
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import chalk from 'chalk';
import { createApiRoutes, generateSessionToken, getSessionToken } from './api.js';
import { getHtmlTemplate } from './ui.js';

// =============================================================================
// Types
// =============================================================================

export interface WebServerOptions {
  port?: number;
  host?: string;
  openBrowser?: boolean;
  /** Start in manage-only mode (skip to environment management) */
  manageOnly?: boolean;
}

// =============================================================================
// Server
// =============================================================================

export async function startWebServer(options: WebServerOptions = {}): Promise<void> {
  const { port: preferredPort = 3456, host = 'localhost', manageOnly = false } = options;

  // Try to find an available port
  const port = await findAvailablePort(preferredPort, host);

  // Generate session token for this server instance
  generateSessionToken();

  const app = new Hono();

  // CORS for API requests (localhost only)
  app.use(
    '/api/*',
    cors({
      origin: [`http://localhost:${port}`, `http://127.0.0.1:${port}`],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowHeaders: ['Content-Type', 'X-Session-Token'],
    })
  );

  // API routes
  const apiRoutes = createApiRoutes();
  app.route('/api', apiRoutes);

  // Serve UI with embedded session token
  app.get('/', (c) => {
    return c.html(getHtmlTemplate(getSessionToken(), manageOnly));
  });

  // Static assets (if needed in the future)
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // Start server
  console.log(chalk.bold('\n🌐 Authrim Setup Web UI\n'));
  console.log(`Server running at ${chalk.cyan(`http://${host}:${port}`)}`);
  if (port !== preferredPort) {
    console.log(chalk.gray(`(Port ${preferredPort} was in use, using ${port} instead)`));
  }
  console.log(chalk.gray('\nPress Ctrl+C to stop\n'));

  // Open browser if requested
  if (options.openBrowser !== false) {
    const url = `http://${host}:${port}`;
    openBrowser(url);
  }

  serve({
    fetch: app.fetch,
    port,
    hostname: host,
  });
}

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number, host: string): Promise<boolean> {
  const net = await import('node:net');

  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, host);
  });
}

/**
 * Find an available port, starting from the preferred port
 */
async function findAvailablePort(preferredPort: number, host: string): Promise<number> {
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    const port = preferredPort + i;
    if (await isPortAvailable(port, host)) {
      return port;
    }
  }

  // If no port found after maxAttempts, throw a helpful error
  console.log(chalk.red('\n❌ Could not find an available port'));
  console.log('');
  console.log(
    chalk.yellow(`  Ports ${preferredPort}-${preferredPort + maxAttempts - 1} are all in use.`)
  );
  console.log('');
  console.log(chalk.gray('  To free up the port, you can:'));
  console.log('');
  console.log(chalk.cyan(`    lsof -i :${preferredPort}      # Find process using the port`));
  console.log(chalk.cyan(`    kill <PID>                # Kill the process`));
  console.log('');
  process.exit(1);
}

// =============================================================================
// Browser Opening
// =============================================================================

/**
 * Validate that the URL is a safe localhost URL
 * Only allows http://localhost:PORT or http://127.0.0.1:PORT
 */
function validateLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http protocol (not https for local dev server)
    if (parsed.protocol !== 'http:') {
      return false;
    }
    // Only allow localhost or 127.0.0.1
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return false;
    }
    // Port must be a valid number
    const port = parseInt(parsed.port || '80', 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return false;
    }
    // Path should only be simple (no shell metacharacters)
    if (/[;&|`$(){}[\]<>!#*?'"]/.test(parsed.pathname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function openBrowser(url: string): Promise<void> {
  // Security: Validate URL to prevent command injection
  if (!validateLocalhostUrl(url)) {
    console.log(chalk.yellow(`\nInvalid URL for browser opening: ${url}`));
    console.log(chalk.gray('Only localhost URLs are allowed for automatic browser opening.'));
    return;
  }

  const { platform } = process;

  try {
    const { execa } = await import('execa');

    switch (platform) {
      case 'darwin':
        await execa('open', [url]);
        break;
      case 'win32':
        // On Windows, use 'start' command with empty title to avoid shell expansion issues
        await execa('cmd', ['/c', 'start', '""', url]);
        break;
      default:
        // Linux and others
        await execa('xdg-open', [url]);
        break;
    }
  } catch {
    console.log(chalk.yellow(`\nCould not open browser automatically.`));
    console.log(`Please open ${chalk.cyan(url)} in your browser.\n`);
  }
}
