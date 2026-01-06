#!/bin/bash
cd /home/user/webapp
npx wrangler pages dev dist \
  --d1=real-estate-200units-db \
  --local \
  --ip 0.0.0.0 \
  --port 3000 \
  > /tmp/wrangler-dev.log 2>&1 &
echo $! > /tmp/wrangler-dev.pid
echo "✅ Dev server started (PID: $(cat /tmp/wrangler-dev.pid))"
