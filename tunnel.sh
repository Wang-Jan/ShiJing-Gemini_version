#!/bin/bash
while true; do
  ssh -o ServerAliveInterval=10 -o ServerAliveCountMax=9999 -o TCPKeepAlive=yes -N -R 8000:127.0.0.1:8000 root@121.41.65.197
  sleep 2
done
