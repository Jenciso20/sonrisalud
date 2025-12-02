# Despliegue con Docker

## Requisitos
- Docker Desktop o Docker Engine + Docker Compose

## Levantar stack completo

```bash
docker compose up -d --build
```

- Backend API: `http://localhost:3000`
- Frontend (Angular en Nginx): `http://localhost:8080`

## Variables por defecto (docker-compose.yml)
- DB: `POSTGRES_DB=sonrisalud`, `POSTGRES_USER=sonri`, `POSTGRES_PASSWORD=sonri_pass`
- Backend: `DB_HOST=db`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=false`, `PORT=3000`
- Admin opcional: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE`

## Ciclo de vida
- Parar servicios (conservar datos):
  ```bash
  docker compose down
  ```
- Parar y borrar datos de DB:
  ```bash
  docker compose down -v
  ```

## Notas
- El frontend por defecto apunta a `http://localhost:3000/api/...`, por lo que no requiere configuración adicional cuando usas este `docker-compose`.
- Ajusta puertos publicados en `docker-compose.yml` si 3000/8080 están ocupados.
