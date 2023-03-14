#!/bin/bash

# This script is used to simulate a load test on the task server
# We have 2 parameters, the first one is the host, second Authorization token

if [[ ! -n $1 ]];
then
    echo "No HOST provided"
    exit 1
fi

for i in `seq 1 40`
do
  curl \
  -X POST "$1/task" \
  -H 'Content-Type: application/json' \
  -H "Authorization: $2" \
  -d '{"script": "await agent.goto(\"https://example.com/\"); await agent.waitForMillis(10000); resolve(await agent.document.title);"}' \
  > /dev/null &
done
