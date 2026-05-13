# Cambiar WiFi de la Raspberry Pi

Hacer esto cuando lleves la Pi al local (o cada vez que cambies de red).

## Desde tu PC (misma red que la Pi ahora)

```bash
ssh pi@buenaburger-pi.local
```

## Una vez dentro de la Pi

```bash
sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
```

Añade la red del local al final del archivo:

```
network={
    ssid="NOMBRE_WIFI_LOCAL"
    psk="CONTRASEÑA_WIFI_LOCAL"
    priority=10
}
```

Guarda con Ctrl+O → Enter → Ctrl+X y aplica el cambio:

```bash
sudo systemctl restart networking
```

La Pi se reconectará a la nueva red. Si pierdes la SSH es normal (cambia de red).

## Verificar que el agente sigue funcionando

```bash
sudo systemctl status buenaburger-agente
sudo journalctl -u buenaburger-agente -n 20
```

Debe mostrar "active (running)" y el log "[Agente] Conectado a https://buenaburger-pos-v1.onrender.com".

## Notas

- La Pi recuerda todas las redes configuradas y se conecta a la disponible automáticamente
- Si no aparece en la red del local, reinicia la Pi desenchufando y volviendo a enchufar
- IP en casa: 10.0.0.8 | IP en el local: asignar fija en el router (ver DEPLOY_RENDER.md)
