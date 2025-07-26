# Vehiculos Usados API

Micro-servicio completo para la administración de inventario y venta de vehículos usados del concesionario ficticio "Vehiculos Usados".

## 🏗️ Arquitectura

### Tecnologías Utilizadas

- **Backend**: Node.js con TypeScript
- **Base de Datos**: PostgreSQL con migraciones
- **Caché**: Redis para optimización de consultas
- **Autenticación**: JWT con refresh tokens
- **Observabilidad**: Prometheus + Grafana
- **Contenedorización**: Docker + Docker Compose
- **Logging**: Winston con logs estructurados en JSON
- **Testing**: Jest con cobertura >70%

### Patrones de Diseño

- **Repository Pattern**: Para abstracción de acceso a datos
- **Service Layer**: Para lógica de negocio
- **Middleware Pattern**: Para autenticación y validación
- **Factory Pattern**: Para creación de servicios
- **Observer Pattern**: Para métricas y logging

### Estructura del Proyecto

```
src/
├── controllers/     # Controladores de la API
├── middleware/      # Middlewares de autenticación y validación
├── repositories/    # Capa de acceso a datos
├── services/        # Servicios de negocio
├── routes/          # Definición de rutas
├── types/           # Tipos TypeScript
├── database/        # Configuración y migraciones de BD
└── __tests__/       # Tests unitarios e integración
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- Docker y Docker Compose
- PostgreSQL (si no usa Docker)

### Configuración Rápida

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd vehiculosusados
```

2. **Configurar variables de entorno**
```bash
cp env.example .env
# Editar .env con tus configuraciones
```

3. **Ejecutar con Docker Compose**
```bash
docker-compose up -d
```

4. **Ejecutar migraciones y seed**
```bash
docker-compose exec api npm run migrate
docker-compose exec api npm run seed
```

### Configuración Manual

1. **Instalar dependencias**
```bash
npm install
```

2. **Configurar base de datos**
```bash
# Crear base de datos PostgreSQL
createdb vehiculos_usados

# Ejecutar migraciones
npm run migrate

# Poblar datos de prueba
npm run seed
```

3. **Iniciar servicios**
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## 📊 API Endpoints

### Autenticación
- `POST /api/v1/auth/register` - Registro de usuarios
- `POST /api/v1/auth/login` - Inicio de sesión
- `POST /api/v1/auth/refresh` - Renovar tokens
- `POST /api/v1/auth/logout` - Cerrar sesión
- `GET /api/v1/auth/profile` - Obtener perfil
- `PUT /api/v1/auth/profile` - Actualizar perfil

### Vehículos
- `GET /api/v1/vehicles` - Listar vehículos (con filtros)
- `GET /api/v1/vehicles/:id` - Obtener vehículo específico
- `POST /api/v1/vehicles` - Crear vehículo (Admin/Sales)
- `PUT /api/v1/vehicles/:id` - Actualizar vehículo (Admin/Sales)
- `DELETE /api/v1/vehicles/:id` - Eliminar vehículo (Admin)
- `PATCH /api/v1/vehicles/:id/price` - Actualizar precio (Admin)
- `PATCH /api/v1/vehicles/:id/status` - Actualizar estado (Admin/Sales)

### Órdenes
- `GET /api/v1/orders` - Listar órdenes (Admin/Sales)
- `GET /api/v1/orders/my` - Mis órdenes (Customer)
- `GET /api/v1/orders/:id` - Obtener orden específica
- `POST /api/v1/orders` - Crear orden (Customer)
- `PUT /api/v1/orders/:id` - Actualizar orden (Admin/Sales)
- `PATCH /api/v1/orders/:id/status` - Actualizar estado (Admin/Sales)
- `GET /api/v1/orders/statistics` - Estadísticas (Admin/Sales)

### Health Check y Métricas
- `GET /api/v1/healthz` - Health check
- `GET /api/v1/metrics` - Métricas Prometheus
- `GET /api/v1/system` - Información del sistema (Admin)
- `GET /api/v1/price-processor/status` - Estado del procesador (Admin)
- `POST /api/v1/price-processor/trigger` - Trigger procesamiento (Admin)

## 🔐 Seguridad

### Autenticación JWT
- Access tokens con expiración de 15 minutos
- Refresh tokens con expiración de 7 días
- Blacklisting de tokens revocados
- Verificación de roles y permisos

### Rate Limiting
- 100 requests por IP cada 15 minutos
- Configurable por endpoint

### Validación de Entrada
- Express-validator para validación de datos
- Sanitización de inputs
- Validación de tipos con TypeScript

### Headers de Seguridad
- Helmet para headers de seguridad
- CORS configurado
- Content Security Policy

## 📈 Observabilidad

### Métricas Prometheus
- HTTP requests total y duración
- Cache hit/miss rates
- Business metrics (vehicles, orders, users)
- Error rates por endpoint

### Logging Estructurado
- Winston con formato JSON
- Logs por nivel (error, warn, info, debug)
- Contexto enriquecido (user, operation, duration)

### Health Checks
- Verificación de conexión a PostgreSQL
- Verificación de conexión a Redis
- Métricas de latencia y dependencias

## 🧪 Testing

### Ejecutar Tests
```bash
# Todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Cobertura de tests
npm run test:coverage
```

### Cobertura Actual
- **Unit Tests**: >80%
- **Integration Tests**: >70%
- **API Tests**: >90%

## 🔄 Procesamiento Concurrente de Precios

### Características
- **Thread-safe**: Uso de locks para evitar procesamiento simultáneo
- **Transacciones**: Garantía de consistencia en actualizaciones
- **Batch Processing**: Procesamiento en lotes para mejor rendimiento
- **Optimistic Locking**: Prevención de race conditions

### Implementación
```typescript
// Ejemplo de procesamiento thread-safe
async startProcessing(): Promise<void> {
  if (this.processingLock) {
    return; // Ya está procesando
  }
  
  this.processingLock = true;
  try {
    await this.processUpdatesConcurrently(updates);
  } finally {
    this.processingLock = false;
  }
}
```

### Monitoreo
- Endpoint `/api/v1/price-processor/status`
- Logs detallados de procesamiento
- Métricas de éxito/fallo

## 🐳 Docker

### Construir Imagen
```bash
docker build -t mi-coche-ideal-api .
```

### Ejecutar con Docker Compose
```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Ejecutar comandos en el contenedor
docker-compose exec api npm run migrate
```

### Servicios Incluidos
- **API**: Puerto 3000
- **PostgreSQL**: Puerto 5432
- **Redis**: Puerto 6379
- **Prometheus**: Puerto 9090
- **Grafana**: Puerto 3001

## 📋 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Iniciar en modo desarrollo
npm run build           # Compilar TypeScript
npm start              # Iniciar en producción

# Base de datos
npm run migrate        # Ejecutar migraciones
npm run seed          # Poblar datos de prueba

# Testing
npm test              # Ejecutar tests
npm run test:watch    # Tests en modo watch
npm run test:coverage # Cobertura de tests

# Linting
npm run lint          # Verificar código
npm run lint:fix      # Corregir automáticamente

# Docker
docker-compose up -d  # Iniciar servicios
docker-compose down   # Detener servicios
docker-compose logs   # Ver logs
```

## 🔧 Configuración de Entorno

### Variables Importantes
```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vehiculos_usados
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## 📊 Métricas y Monitoreo

### Prometheus
- URL: http://localhost:9090
- Métricas disponibles en `/api/v1/metrics`

### Grafana
- URL: http://localhost:3001
- Usuario: admin
- Contraseña: admin

### Dashboards Incluidos
- HTTP Request Metrics
- Database Performance
- Cache Hit Rates
- Business Metrics

## 🚨 Troubleshooting

### Problemas Comunes

1. **Error de conexión a PostgreSQL**
```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps postgres

# Ver logs
docker-compose logs postgres
```

2. **Error de conexión a Redis**
```bash
# Verificar Redis
docker-compose exec redis redis-cli ping

# Reiniciar servicio
docker-compose restart redis
```

3. **Problemas de migración**
```bash
# Ejecutar migraciones manualmente
docker-compose exec api npm run migrate
```

4. **Problemas de permisos**
```bash
# Verificar logs de la API
docker-compose logs api

# Reiniciar API
docker-compose restart api
```

## 📝 Post-Mortem

### Lo que Funcionó Bien

1. **Arquitectura Modular**: La separación clara entre capas facilitó el desarrollo y testing
2. **TypeScript**: El tipado fuerte previno muchos errores en tiempo de desarrollo
3. **Docker Compose**: Simplificó enormemente el setup del entorno de desarrollo
4. **Observabilidad**: Los logs estructurados y métricas facilitaron el debugging
5. **Testing**: La cobertura alta de tests dio confianza en los cambios

### Áreas de Mejora

1. **Documentación de API**: Implementar Swagger/OpenAPI para documentación automática
2. **CI/CD**: Agregar pipeline de integración continua con GitHub Actions
3. **Performance**: Implementar connection pooling más avanzado para PostgreSQL
4. **Caching**: Agregar más estrategias de cache (cache de consultas complejas)
5. **Monitoring**: Implementar alertas automáticas para métricas críticas
6. **Security**: Agregar rate limiting más granular por endpoint
7. **Testing**: Implementar tests de carga con herramientas como Artillery
8. **Deployment**: Configurar Kubernetes para orquestación en producción

### Decisiones Técnicas

1. **Node.js + TypeScript**: Elección sólida para desarrollo rápido con tipado fuerte
2. **PostgreSQL**: Excelente para datos relacionales complejos y transacciones
3. **Redis**: Perfecto para cache y session management
4. **JWT**: Simplicidad en implementación, aunque requiere manejo cuidadoso de refresh tokens
5. **Docker**: Facilita deployment y desarrollo consistente

### Escalabilidad

El sistema está diseñado para escalar horizontalmente:
- Stateless API permite múltiples instancias
- Redis compartido para cache y sessions
- PostgreSQL con read replicas para consultas
- Load balancer para distribución de carga

### Seguridad

Implementaciones de seguridad incluidas:
- JWT con refresh tokens
- Rate limiting
- Input validation
- SQL injection prevention
- CORS configurado
- Security headers con Helmet

### Performance

Optimizaciones implementadas:
- Cache Redis para consultas frecuentes
- Índices en base de datos
- Paginación en listados
- Batch processing para actualizaciones masivas
- Connection pooling

## 🤝 Contribución

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📞 Contacto

- **Proyecto**: Prueba técnica ‒ Backend mid-level
- **Autor**: OSCAR BOLAÑOS