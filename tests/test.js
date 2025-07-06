#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');

process.on('unhandledRejection', err => { console.error(err); process.exit(1); });

(async () => {
  const hostArg = process.argv[2] || 'http://localhost:8080';
  const host = hostArg.startsWith('http') ? hostArg : `http://${hostArg}`;
  const dirPath = path.join(__dirname, 'scenarios');
  let files;
  try {
    files = fs.readdirSync(dirPath);
  } catch (err) {
    console.error(`Unable to scan directory: ${err}`);
    process.exit(1);
  }
  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const name = file.slice(0, -3);
    const script = fs.readFileSync(path.join(dirPath, file), 'utf8').trim();
    if (!script) continue;
    const optionsPath = path.join(dirPath, `${name}.json`);
    const options = fs.existsSync(optionsPath)
      ? JSON.parse(fs.readFileSync(optionsPath, 'utf8'))
      : {};
    console.log(`Running scenario: ${name}`);
    let response;
    try {
      response = await axios.post(`${host}/task`, { script, options }, { timeout: 60000 });
    } catch (err) {
      console.error(`${name} failed: ${err}`);
      process.exit(1);
    }
    const result = response.data;
    if (result.status !== 'RESOLVE') {
      console.error(`${name} failed: status ${result.status}, error ${result.error || result.output}`);
      process.exit(1);
    }
    console.log(`${name} passed, output: ${JSON.stringify(result.output)}`);
  }
})();