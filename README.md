# SonriSalud

Aplicacion full-stack para gestion odontologica (pacientes, odontologos y administradores).

- Backend: Node.js + Express 5 + Sequelize (PostgreSQL)
- Frontend: Angular 18 (standalone components)
- Autenticacion: JWT con rate limiting y CORS configurables
- Agenda: vista semanal con drag & drop, filtros por estado/paciente y badges de hoy/mañana
- Citas: duracion dinamica por odontologo + gap configurable entre citas (APPOINTMENT_GAP_MINUTES)
- Validaciones: password fuerte (8+ con mayus/minus/digito), DNI Peru (8 digitos), celular Peru (9 digitos iniciando en 9), limite de citas activas por paciente y bloqueo de fines de semana/anticipacion minima
- Recordatorios: job opcional con WhatsApp/email y adjunto .ics X horas antes de la cita

## Requisitos
- Node.js 18+
- PostgreSQL 13+
- npm 9+

## Estructura
```
sonrisalud-backend/   # API REST (Express + Sequelize)
sonrisalud-frontend/  # SPA Angular
```

## Backend - Configuracion
1. Variables de entorno: copia `sonrisalud-backend/.env.example` a `.env` y ajusta credenciales.
2. Instalar dependencias y arrancar:
   ```bash
   cd sonrisalud-backend
   npm install
   npm start
   ```
3. Migraciones SQL (evita solapes de citas con constraint GIST):
   ```bash
   npm run migrate
   ```
4. Crear/promover admin:
   ```bash
   npm run seed:admin
   ```
   Usa `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env`. Si existe, lo promueve a admin y actualiza clave.

### Variables clave
- `CORS_ORIGINS` (lista separada por comas) controla origenes permitidos. Si queda vacio, acepta todos.
- `RATE_LIMIT_WINDOW_MS` y `RATE_LIMIT_MAX` limitan intentos en rutas de auth.
- `INSTITUTION_DOMAIN` fuerza el dominio de correo en el registro (por defecto `@unajma.edu.pe`).
- `WHATSAPP_*` habilita recordatorios via WhatsApp Cloud API (opcional).
- `APPOINTMENT_GAP_MINUTES` define el buffer entre citas.
- `MAX_ACTIVE_CITAS_PACIENTE` limita citas activas por paciente, `MIN_HOURS_BEFORE` define anticipacion minima para crear/reprogramar y `BLOCK_WEEKENDS` bloquea fines de semana si es true.
- Recordatorios automaticos (opcionales):
  - `REMINDER_ENABLED=true`
  - `REMINDER_HOURS_BEFORE=24` (horas antes para enviar)
  - `REMINDER_INTERVAL_MS=300000` (cada cuanto corre el job)

### Endpoints principales
- Auth: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/recover`, `POST /api/auth/reset-password`
- Paciente (autenticado):
  - Citas: `GET /api/citas`, `POST /api/citas`, `PATCH /api/citas/:id/cancelar`, `PATCH /api/citas/:id/reprogramar`
  - Disponibilidad: `GET /api/citas/disponibilidad?odontologoId&fecha`
- Admin (rol=admin):
  - Pacientes: `GET /api/admin/pacientes`, `PATCH /api/admin/pacientes/:id`, `DELETE /api/admin/pacientes/:id`
  - Odontologos: `PATCH /api/admin/odontologos/:id`, `DELETE /api/admin/odontologos/:id`
  - Citas: `GET /api/admin/citas`, `POST /api/admin/citas`, `PATCH /api/admin/citas/:id`, `PATCH /api/admin/citas/:id/cancelar`
  - Usuarios/Roles: `GET /api/admin/usuarios`, `PATCH /api/admin/usuarios/:id/rol`

## Frontend - Configuracion
1. Instalar y arrancar:
   ```bash
   cd sonrisalud-frontend
   npm install
   npm run start   # http://localhost:4200
   ```
2. El frontend apunta a `http://localhost:3000/api` por defecto. Interceptor JWT adjunta `Authorization: Bearer <token>` en cada request.

## Flujo rapido de uso
1. Ejecuta migraciones y crea admin (`npm run migrate` y `npm run seed:admin` en backend).
2. Inicia sesion en el frontend con el admin.
3. En Administrador: gestiona usuarios (roles), pacientes, odontologos y citas.
4. En Pacientes: reservar, cancelar y reprogramar citas.
5. En Odontologos: agenda semanal con drag&drop para reprogramar, filtros por estado/paciente y badges de hoy/mañana.

## Calidad y pruebas
- Backend: `npm test` ejecuta pruebas ligeras de validacion (Node test runner).
- Constraint de solape: migracion `001_avoid_overlap.sql` agrega exclusion GIST para evitar citas traslapadas por odontologo en estados activos.

## Problemas comunes
- Build Angular falla por presupuesto de CSS: ajustar budgets en `angular.json` o reducir estilos globales.
- Error DB por `sync alter`: dejar `DB_SYNC_ALTER=false` en produccion y usar `npm run migrate`.
- Zona horaria: las fechas se normalizan con UTC al guardarse; enviar siempre ISO con zona para evitar desfases.
- Recordatorios: requieren `REMINDER_ENABLED=true` y correo/WhatsApp configurados; el adjunto .ics se envia por email como fallback si falla WhatsApp.
- Validaciones: password con mayus/minus/digito (8+), DNI 8 digitos, celular peruano 9 digitos (empieza en 9), max citas activas por paciente y sin fines de semana/anticipacion minima.

## Git - Flujo basico
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
