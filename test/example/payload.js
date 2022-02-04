await agent.goto('https://example.com/');
agent.output.title = (await agent.document.title);