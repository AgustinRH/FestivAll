# Pasos para instalar FestivAll en una instancia EC2 vacía (AWS)

Guía para desplegar el proyecto **FestivAll** (Angular + NestJS + MariaDB) en producción usando **Docker Compose**.

**Autores del proyecto:** Rafael Pablo García Sánchez y Agustín Rubí Hernández.

---

## Requisitos previos

- Cuenta de AWS con acceso a EC2.
- Par de claves SSH (.pem) creado en AWS.
- El código del proyecto (repositorio Git o carpeta comprimida).

---

## 1. Crear la instancia EC2

1. Entra en **AWS Console** → **EC2** → **Launch instance**.
2. Configuración recomendada:
   | Opción | Valor sugerido |
   |--------|----------------|
   | Nombre | `festivall-prod` |
   | AMI | **Ubuntu Server 24.04 LTS** (64-bit x86) |
   | Tipo | `t3.small` o `t3.medium` (mínimo `t3.small` para compilar Docker) |
   | Par de claves | Tu clave `.pem` existente o crea una nueva |
   | Almacenamiento | 20–30 GB gp3 |
3. **Security Group (firewall)** — reglas de entrada:

   | Tipo | Puerto | Origen | Descripción |
   |------|--------|--------|-------------|
   | SSH | 22 | Tu IP (`Mi IP`) | Acceso por terminal |
   | HTTP | 80 | `0.0.0.0/0` | Web FestivAll |
   | HTTPS | 443 | `0.0.0.0/0` | Opcional (si más adelante usas SSL) |

4. Lanza la instancia y anota la **IP pública** (o asigna una **Elastic IP** para que no cambie al reiniciar).

---

## 2. Conectarte por SSH

Desde tu ordenador (Linux / macOS / WSL):

```bash
chmod 400 tu-clave.pem
ssh -i tu-clave.pem ubuntu@TU_IP_PUBLICA
```

En Windows con PowerShell puedes usar el mismo comando o **PuTTY** (importando la clave .pem).

---

## 3. Instalar Docker y Docker Compose en la EC2

Ejecuta en la instancia:

```bash
sudo apt update && sudo apt upgrade -y

# Docker oficial
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Poder usar docker sin sudo (opcional)
sudo usermod -aG docker ubuntu
```

Cierra sesión y vuelve a entrar por SSH para aplicar el grupo `docker`:

```bash
exit
ssh -i tu-clave.pem ubuntu@TU_IP_PUBLICA
```

Comprueba:

```bash
docker --version
docker compose version
```

---

## 4. Subir el proyecto a la EC2

### Opción A — Git (recomendado)

```bash
sudo apt install -y git
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git festivall
cd festivall
```

### Opción B — Copiar desde tu PC con SCP

En tu máquina local (fuera de la EC2):

```bash
cd /path/to/app
# Excluir node_modules para que pese menos
tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf festivall.tar.gz .
scp -i tu-clave.pem festivall.tar.gz ubuntu@TU_IP_PUBLICA:~/
```

En la EC2:

```bash
mkdir festivall && cd festivall
tar -xzf ../festivall.tar.gz
```

---

## 5. Configurar variables de entorno

```bash
cd ~/festivall   # o la ruta donde esté el proyecto
cp .env.example .env
nano .env
```

Edita al menos estas variables:

```env
APP_PORT=80
DB_PASSWORD=una_contraseña_segura_aqui
DB_DATABASE=FestivAll
JWT_SECRET=genera_un_secreto_largo_y_aleatorio_minimo_32_caracteres
JWT_EXPIRES_IN=7d
```

Guarda (`Ctrl+O`, `Enter`, `Ctrl+X` en nano).

> **Importante:** no subas el archivo `.env` a GitHub. Contiene secretos.

---

## 6. Levantar la aplicación con Docker

```bash
cd ~/festivall
docker compose up -d --build
```

La primera vez puede tardar **10–20 minutos** (descarga de imágenes + compilación de frontend y backend).

Comprueba el estado:

```bash
docker compose ps
```

Deberías ver **Up** en:
- `festivall-web` (frontend + nginx)
- `festivall-api` (backend NestJS)
- `festivall-db` (MariaDB)

Ver logs si algo falla:

```bash
docker compose logs -f
# Ctrl+C para salir
```

Solo backend o base de datos:

```bash
docker compose logs backend --tail 50
docker compose logs mariadb --tail 30
```

---

## 7. Ver la aplicación en el navegador

Abre:

```
http://TU_IP_PUBLICA
```

Rutas principales:

| URL | Descripción |
|-----|-------------|
| `http://TU_IP/` | Inicio |
| `http://TU_IP/eventos` | Explorar festivales |
| `http://TU_IP/login` | Login usuario |
| `http://TU_IP/register` | Registro |
| `http://TU_IP/sobre-nosotros` | Sobre nosotros |
| `http://TU_IP/festivall-admin` | Panel administrador |

**Credenciales admin** (se crean al arrancar el backend):

- Email: `info@festivall.club`
- Contraseña: `Admin123!`

Cámbialas en producción creando otro admin o actualizando la contraseña en base de datos.

---

## 8. Comandos útiles en el servidor

```bash
cd ~/festivall

# Parar todo
docker compose down

# Parar y borrar datos de la BD (¡cuidado!)
docker compose down -v

# Reiniciar tras cambios en el código
git pull
docker compose up -d --build

# Ver uso de recursos
docker stats
```

---

## 9. (Opcional) Dominio y HTTPS

1. Compra o usa un dominio y crea un registro **A** apuntando a la IP pública de la EC2.
2. Instala **Certbot** con nginx o usa un proxy inverso (Caddy / Traefik) delante del contenedor.
3. Para un despliegue sencillo con Certbot en el host, puedes mapear el puerto 443 en `docker-compose.yml` y configurar nginx con certificados Let's Encrypt (documentación aparte).

---

## 10. Solución de problemas

### La web no carga

1. Comprueba el Security Group: puerto **80** abierto a `0.0.0.0/0`.
2. `docker compose ps` — los tres servicios deben estar **Up**.
3. `curl http://localhost` dentro de la EC2; si responde HTML, el problema es el firewall AWS.

### Error de conexión a la base de datos

```bash
docker compose logs backend
```

Espera a que MariaDB esté healthy antes de que el backend arranque. Si reinicias:

```bash
docker compose restart backend
```

### Falta de memoria al compilar (`npm` / Docker build killed)

Usa una instancia más grande (`t3.medium`) o añade **swap**:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Recrear el usuario admin

```bash
docker compose exec backend node dist/scripts/seed-admin.js
```

---

## 11. Resumen rápido (checklist)

- [ ] EC2 Ubuntu creada con puertos 22 y 80 abiertos  
- [ ] SSH funcionando  
- [ ] Docker + Docker Compose instalados  
- [ ] Proyecto clonado o copiado en `~/festivall`  
- [ ] Archivo `.env` configurado con `JWT_SECRET` y `DB_PASSWORD` seguros  
- [ ] `docker compose up -d --build` sin errores  
- [ ] `http://TU_IP_PUBLICA` muestra FestivAll  

---

## Contacto del proyecto

FestivAll Almería — plataforma de eventos y entradas en la provincia de Almería.

Desarrollado por **Rafael Pablo García Sánchez** y **Agustín Rubí Hernández**.
