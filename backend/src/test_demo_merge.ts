import { getOrInitSubscription } from './routes/data';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const userId = 'a75350f7-2648-4403-aaf8-03c3554c27a6'; // user pt5302138@gmail.com
  console.log(`Running getOrInitSubscription for ${userId} with demoCount = 7...`);
  try {
    const sub = await getOrInitSubscription(userId, undefined, 7);
    console.log('Returned subscription details:', sub);
  } catch (err: any) {
    console.error('Error running function:', err.message);
  }
}

run();
