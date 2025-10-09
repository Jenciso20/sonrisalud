# SonriSalud

Aplicación full‑stack para gestión odontológica (pacientes, odontólogos y admin).

- Backend: Node.js + Express 5 + Sequelize (PostgreSQL)
- Frontend: Angular 18 (standalone components)
- Autenticación: JWT

## Requisitos
- Node.js 18+
- PostgreSQL 13+
- npm 9+

## Estructura
```
sonrisalud-backend/   # API REST (Express + Sequelize)
sonrisalud-frontend/  # SPA Angular
```

## Backend – Configuración
1. Variables de entorno: `sonrisalud-backend/.env`
   - Ejemplo (ya incluido localmente):
     ```env
     PORT=3000
     DB_NAME=sonrisalud
     DB_USER=postgres
     DB_PASSWORD=***
     DB_HOST=localhost
     DB_SYNC_ALTER=false
     JWT_SECRET=clave_secreta
     FRONTEND_URL=http://localhost:4200
     EMAIL_HOST=smtp.gmail.com
     EMAIL_PORT=587
     EMAIL_SECURE=false
     EMAIL_USER=tu_correo@gmail.com
     EMAIL_PASS=tu_contrasena_de_aplicacion
     ADMIN_EMAIL=admin@local.test
     ADMIN_PASSWORD=Admin123!
     ADMIN_NOMBRE=Administrador
     ```

2. Instalar dependencias y arrancar:
   ```bash
   cd sonrisalud-backend
   npm install
   npm start
   ```

3. Crear/Promover admin (opción manual por CLI):
   ```bash
   npm run seed:admin
   ```
   - Usa `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env`. Si existe el correo, lo promueve a admin y actualiza clave.

### Endpoints principales
- Auth: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/recover`, `POST /api/auth/reset-password`
- Paciente (autenticado):
  - Citas: `GET /api/citas`, `POST /api/citas`, `PATCH /api/citas/:id/cancelar`, `PATCH /api/citas/:id/reprogramar`
  - Disponibilidad: `GET /api/citas/disponibilidad?odontologoId&fecha`
- Admin (require rol=admin):
  - Pacientes: `GET /api/admin/pacientes`, `PATCH /api/admin/pacientes/:id`, `DELETE /api/admin/pacientes/:id`
  - Odontólogos: `PATCH /api/admin/odontologos/:id`, `DELETE /api/admin/odontologos/:id`
  - Citas: `GET /api/admin/citas`, `POST /api/admin/citas`, `PATCH /api/admin/citas/:id`, `PATCH /api/admin/citas/:id/cancelar`
  - Usuarios/Roles: `GET /api/admin/usuarios`, `PATCH /api/admin/usuarios/:id/rol`

## Frontend – Configuración
1. Instalar y arrancar:
   ```bash
   cd sonrisalud-frontend
   npm install
   npm run start   # http://localhost:4200
   ```

2. Notas
- El frontend busca el backend en `http://localhost:3000` por defecto.
- Interceptor de JWT adjunta `Authorization: Bearer <token>` en cada request.
- Menú lateral aparece una vez autenticado; opciones se muestran según rol del usuario.

## Flujo rápido de uso
1. Crear admin: `npm run seed:admin` en backend.
2. Iniciar sesión en frontend con el admin.
3. En Administrador: gestionar usuarios (roles), pacientes, odontólogos y citas.
4. En Pacientes: reservar, cancelar y reprogramar citas.

## Problemas comunes
- Build Angular falla por presupuesto de CSS (Google Fonts inline): ajustar budgets en `angular.json` o remover fuente inline.
- Error DB en arranque por `sync alter`: asegurar `DB_SYNC_ALTER=false` en producción y usar migraciones al escalar.
- Zona horaria: los horarios usan time local del servidor; para producción se recomienda normalizar a UTC.

## Git – Flujo básico
- Commit habitual:
  ```bash
  git add -A
  git commit -m "feat: descripcion clara"
  git push
  ```
- Crear rama de desarrollo y subirla:
  ```bash
  git checkout -b develop
  git push -u origin develop
  ```

## Roadmap sugerido
- Migraciones (sequelize-cli/umzug) y seeds formales.
- Reagendar drag&drop (agenda semanal odontólogo).
- Catálogo de servicios (nombre, duración, precio) y reportería.
- Recordatorios automáticos (BullMQ/Redis) + adjunto .ics.
- Validación de entrada con Zod/Joi + rate limiting + CORS por entorno.

---
Para dudas puntuales (login/registro/roles), revisa la consola del backend: los mensajes de error ahí ayudan a diagnosticar rápido.

