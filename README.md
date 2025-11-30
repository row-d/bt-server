# MKR IoT Alarma Musical

Este proyecto consiste en una alarma musical inteligente construida con un Arduino MKR WiFi 1010 y el MKR IoT Carrier, controlada a través de una aplicación web mediante Bluetooth Low Energy (BLE).

## Características

*   **Sincronización de Hora**: La hora del Arduino se sincroniza automáticamente con la del dispositivo conectado (teléfono/PC) al configurar la alarma.
*   **Melodías Personalizables**: Puedes componer melodías usando notación musical estándar (ej. `C4`, `G#3`) y enviarlas al Arduino.
*   **Luces Rítmicas**: Los LEDs del MKR IoT Carrier se iluminan en diferentes colores según la frecuencia de la nota que suena.
*   **Interfaz Web**: Aplicación web moderna construida con Astro, Alpine.js y Tailwind CSS para controlar la alarma.
*   **Optimización de Datos**: Protocolo eficiente para enviar melodías largas a través de las limitaciones de tamaño de paquete de BLE.

## Estructura del Proyecto

*   `app/`: Código fuente de la aplicación web (Astro).
*   `arduino/`: Código fuente para el microcontrolador (Arduino Sketch).

## Requisitos de Hardware

*   Arduino MKR WiFi 1010 (o similar con soporte BLE).
*   Arduino MKR IoT Carrier.
*   Cable USB para programación y alimentación.

## Configuración

### 1. Arduino

1.  Abre el archivo `arduino/main/main.ino` en el Arduino IDE.
2.  Instala las siguientes librerías desde el Gestor de Librerías:
    *   `ArduinoBLE`
    *   `Arduino_MKRIoTCarrier`
    *   `Time`
3.  Conecta tu placa Arduino MKR al PC.
4.  Selecciona la placa y el puerto correctos en el IDE.
5.  Sube el sketch a la placa.
6.  Una vez subido, la pantalla del Carrier debería encenderse y mostrar la hora (inicialmente 00:00:00 hasta que se sincronice).

### 2. Aplicación Web

Necesitas tener [Node.js](https://nodejs.org/) y [pnpm](https://pnpm.io/) instalados.

1.  Navega a la carpeta `app`:
    ```bash
    cd app
    ```
2.  Instala las dependencias:
    ```bash
    pnpm install
    ```
3.  Inicia el servidor de desarrollo:
    ```bash
    pnpm dev
    ```
4.  Abre tu navegador en `http://localhost:4321` (o la dirección que indique la consola).

**Nota sobre Web Bluetooth**: La API de Web Bluetooth requiere un contexto seguro (HTTPS) o `localhost`. Si quieres probar la app desde tu móvil, necesitarás exponer tu servidor local vía HTTPS (por ejemplo, usando `ngrok`) o desplegar la app en un servicio como Vercel o Netlify.

## Uso

1.  **Conectar**:
    *   Abre la aplicación web.
    *   Haz clic en el botón "Conectar".
    *   Selecciona "ARDUINO ALARMA" en la lista de dispositivos Bluetooth.
    *   **Sincronización Automática**: Al conectarse, la aplicación sincronizará automáticamente la hora local con el Arduino y cargará la configuración de alarma y melodía existente en la placa.

2.  **Programar Alarma**:
    *   **Hora**: Selecciona la hora a la que quieres que suene la alarma.
    *   **Melodía**: Escribe tu melodía usando el formato `NOTA@DURACION`.
        *   Ejemplo: `C4@1 E4@0.5 G4@2`
        *   Las notas son en notación científica (ej. `C4`, `A#3`).
        *   La duración es un multiplicador de la duración base (500ms).
            *   `@1` = 500ms (negra)
            *   `@0.5` = 250ms (corchea)
            *   `@2` = 1000ms (blanca)
        *   Si omites la duración (ej. solo `C4`), se asume `@1`.
    *   **Leer Configuración**: Si deseas recargar los datos guardados en la placa, usa el enlace "Leer configuración actual de la placa".
    *   Puedes usar el botón "Escuchar" para previsualizar la melodía en el navegador.
    *   Haz clic en "Enviar a la placa" para guardar la configuración.

3.  **Funcionamiento**:
    *   Cuando llegue la hora programada, el Arduino comenzará a reproducir la melodía.
    *   **Luces LED**: Los LEDs se iluminarán según la frecuencia de la nota:
        *   🔴 Rojo: Graves (≤ 110Hz)
        *   🟢 Verde: Medios-Graves (111-220Hz)
        *   🔵 Azul: Medios (221-440Hz)
        *   🟡 Amarillo: Medios-Agudos (441-880Hz)
        *   🟣 Púrpura: Agudos (> 880Hz)
    *   La alarma sonará una vez por minuto si no se detiene.
    *   Para detener la alarma mientras suena, puedes apagar el interruptor desde la app (enviando una nueva configuración o desconectando).

## Solución de Problemas

*   **No encuentro el dispositivo**: Asegúrate de que el sketch de Arduino se haya subido correctamente y que el monitor serie muestre "BLE ALARM SERVICE ADVERTISED". Verifica que el Bluetooth de tu ordenador/móvil esté encendido.
*   **Error de conexión**: Si la conexión falla, intenta recargar la página web y reiniciar el Arduino (botón Reset).
*   **La melodía no suena completa**: Asegúrate de no exceder el límite de caracteres. Aunque hemos optimizado el protocolo, hay un límite físico en la memoria y el buffer BLE.
