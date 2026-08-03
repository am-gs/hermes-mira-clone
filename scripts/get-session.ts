#!/usr/bin/env tsx
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { config } from '../src/config.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🔐 Telegram Session Generator\n');
  console.log('This will create a session string for MTProto access.\n');

  const client = new TelegramClient(
    new StringSession(''),
    config.telegramApiId,
    config.telegramApiHash,
    {
      connectionRetries: 5,
      useWSS: false,
    }
  );

  await client.start({
    phoneNumber: async () => await question('📱 Enter your phone number (with country code): '),
    password: async () => await question('🔑 Enter your 2FA password (if enabled): '),
    phoneCode: async () => await question('📲 Enter the code you received: '),
    onError: (err) => console.error('Error:', err),
  });

  console.log('\n✅ Successfully authenticated!\n');

  const sessionString = client.session.save() as unknown as string;
  console.log('📋 Copy this session string to your .env file:\n');
  console.log(`TELEGRAM_SESSION_STRING=${sessionString}\n`);

  console.log('⚠️  Keep this string secure! It provides full access to your Telegram account.\n');

  await client.disconnect();
  rl.close();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
