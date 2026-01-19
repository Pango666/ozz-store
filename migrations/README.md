# OzzStore Supabase Migration

Scripts SQL completos para crear una nueva tienda desde cero en Supabase.

## 📋 Archivos

| Archivo | Descripción |
|---------|-------------|
| `001_schema.sql` | Tablas, índices y constraints |
| `002_functions.sql` | Funciones helper y triggers |
| `003_rls_policies.sql` | Políticas de seguridad (RLS) |
| `004_storage.sql` | Buckets de storage |

## 🚀 Instrucciones de Uso

### 1. Crear Proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto
2. Espera a que el proyecto esté listo (~2 min)

### 2. Ejecutar Migraciones
1. Ve a **SQL Editor** en tu dashboard
2. Ejecuta cada archivo **en orden numérico**:
   ```
   001_schema.sql → 002_functions.sql → 003_rls_policies.sql → 004_storage.sql
   ```

### 3. Crear Usuario Admin
1. Ve a **Authentication > Users**
2. Crea un nuevo usuario con email/password

### 4. Crear Tienda y Asignar Admin
Ejecuta este SQL reemplazando los valores:

```sql
-- Crear la tienda
INSERT INTO stores (name, slug, currency, active)
VALUES ('Mi Nueva Tienda', 'mi-tienda', 'BOB', true)
RETURNING id;

-- Copiar el ID de arriba y el user_id de Authentication
INSERT INTO store_members (store_id, user_id, role)
VALUES (
  'ID_DE_LA_TIENDA',
  'ID_DEL_USUARIO',
  'admin'
);
```

### 5. Configurar Frontend
Actualiza `public/js/env.js`:
```javascript
export const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
export const SUPABASE_ANON_KEY = "tu-anon-key";
export const STORE_SLUG = "mi-tienda";
```

## 📊 Tablas Creadas

- **stores** - Datos de la tienda
- **store_members** - Administradores
- **categories** - Categorías
- **brands** - Marcas
- **products** - Productos
- **variants** - Variantes de productos
- **inventory** - Stock
- **product_media** - Imágenes
- **option_groups** - Grupos de opciones (talla, color)
- **option_values** - Valores de opciones
- **product_option_groups** - Relación producto-opciones
- **variant_option_values** - Valores por variante
- **pages** - Páginas CMS
- **page_sections** - Secciones de páginas
- **inquiries** - Consultas de clientes
- **inquiry_items** - Items de consulta
- **settings** - Configuraciones
- **carts** - Carritos
- **cart_items** - Items del carrito

## 🔒 Seguridad

Todas las tablas tienen RLS habilitado:
- **Lectura pública**: Productos, categorías, marcas
- **Escritura restringida**: Solo miembros de la tienda
- **Carrito**: Solo el usuario propietario

## 📦 Storage Buckets

- `products` - Imágenes de productos (5MB)
- `brands` - Logos de marcas (2MB)
- `categories` - Imágenes de categorías (2MB)
- `stores` - Assets de la tienda (5MB)
- `pages` - Contenido CMS (10MB)
