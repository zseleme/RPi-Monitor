#!/bin/bash
# Deploy RPi-Monitor configs to Raspberry Pi
# Usage: ./deploy.sh

PI_USER="dietpi"
PI_HOST="192.168.5.100"
PI_PORT="2222"
SSH_KEY="$HOME/.ssh/rpi_key"
TEMPLATES_SRC="src/etc/rpimonitor/template"
TEMPLATES_DST="/etc/rpimonitor/template"
DATA_CONF_SRC="src/etc/rpimonitor/data.conf"
DATA_CONF_DST="/etc/rpimonitor/data.conf"

SCP="scp -i $SSH_KEY -o StrictHostKeyChecking=no -P $PI_PORT"
SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no -p $PI_PORT $PI_USER@$PI_HOST"

echo "Deploying configs to $PI_HOST..."

$SCP "$DATA_CONF_SRC" "$PI_USER@$PI_HOST:$DATA_CONF_DST.tmp"
$SCP "$TEMPLATES_SRC/"*.conf "$PI_USER@$PI_HOST:/tmp/"

$SSH "sudo cp $DATA_CONF_DST.tmp $DATA_CONF_DST && \
      sudo cp /tmp/*.conf $TEMPLATES_DST/ && \
      sudo find $TEMPLATES_DST -name '*.conf' -exec sed -i 's/\r//' {} \; && \
      sudo systemctl restart rpimonitor && \
      echo Deploy concluido com sucesso!"
