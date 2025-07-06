await agent.goto('https://httpbin.org/');
await agent.waitForPaintingStable();

try {
    await agent.fetch('https://httpbin.org/delay/30', {timeout: 10000});
    reject('Fetch did not timeout as expected');
}
catch (e) {
    resolve('Fetch timed out as expected');
    return;
}

reject('Fetch did not time out as expected');