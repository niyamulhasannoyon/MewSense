import 'dotenv/config';
import { createApp } from './app.js';
import { prisma } from './infrastructure/database/prisma.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const { app } = createApp();

const server = app.listen(PORT, () => {
  console.log(`🐾 MewSense API Server listening on http://localhost:${PORT}`);
  console.log(`📋 Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log(`🐈 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful Shutdown
async function shutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connections closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcefully terminating process due to shutdown timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
