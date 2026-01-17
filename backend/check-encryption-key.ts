import * as dotenv from 'dotenv';

dotenv.config();

const key = process.env.ENCRYPTION_KEY;

console.log('Encryption key:', key);
console.log('Key length:', key?.length);
console.log('Expected length: 32');
console.log('Match:', key?.length === 32 ? '✅' : '❌');
