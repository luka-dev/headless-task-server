new Promise((resolve, reject) => {
   throw new Error('Simulated UnhandledRejection');
});

await agent.waitForMillis(10000);