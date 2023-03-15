await agent.goto('https://developer.mozilla.org/');
await agent.waitForPaintingStable();
await agent.waitForMillis(10000);
const response = await agent.fetch('https://developer.mozilla.org/api/v1/whoami', {timeout: 10000});
await agent.waitForMillis(10000);
resolve(await response.json());