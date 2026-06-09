# Guía de Estilos - Frontend

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Paleta de Colores](#paleta-de-colores)
3. [Tipografía](#tipografía)
4. [Espaciamiento](#espaciamiento)
5. [Componentes](#componentes)
6. [Breakpoints y Responsive](#breakpoints-y-responsive)
7. [Efectos y Transiciones](#efectos-y-transiciones)
8. [Iconografía](#iconografía)

---

## Introducción

Esta guía de estilos define los principios de diseño, componentes reutilizables y estándares visuales para el frontend de Proyecto X. El objetivo es garantizar consistencia, coherencia y una experiencia de usuario uniforme en toda la aplicación.

### Principios de Diseño

- **Consistencia**: Todos los elementos deben seguir los estilos definidos
- **Accesibilidad**: Garantizar legibilidad y contraste apropiados
- **Responsive**: Diseño adaptable a todos los dispositivos
- **Rendimiento**: Optimizar estilos y transiciones
- **Mantenibilidad**: Código SCSS limpio y reutilizable

---

## Paleta de Colores

### CSS Custom Properties (Variables Globales)

Todos los colores se definen como CSS custom properties en el archivo `styles.scss`:

```scss
:root {
  --bg-dark: #0a0a12;           // Fondo oscuro principal
  --bg-card: #12121f;            // Fondo de tarjetas
  --bg-input: #d8dce3;           // Fondo de inputs
  --accent: #e85d3b;             // Color accent/naranja
  --accent-hover: #ff7043;       // Color accent con hover
  --text: #ffffff;               // Texto principal
  --text-muted: #a8a8b8;         // Texto secundario/muted
  --border: rgba(255, 255, 255, 0.85); // Color de bordes
  --radius-pill: 999px;          // Bordes redondeados (pill)
  --radius-card: 16px;           // Bordes redondeados (cards)
  --font: 'Inter', system-ui, sans-serif; // Tipografía
}
```

### Descripción de Colores

| Variable | Hexadecimal | RGB | Uso |
|----------|------------|-----|-----|
| `--bg-dark` | #0a0a12 | 10, 10, 18 | Fondo principal de la aplicación |
| `--bg-card` | #12121f | 18, 18, 31 | Fondos de tarjetas y paneles |
| `--bg-input` | #d8dce3 | 216, 220, 227 | Fondos de inputs y campos |
| `--accent` | #e85d3b | 232, 93, 59 | Color principal (naranja) |
| `--accent-hover` | #ff7043 | 255, 112, 67 | Hover del color accent |
| `--text` | #ffffff | 255, 255, 255 | Texto principal |
| `--text-muted` | #a8a8b8 | 168, 168, 184 | Texto secundario |
| `--border` | rgba(255, 255, 255, 0.85) | - | Bordes |

### Colores Secundarios

```scss
// Colores específicos (admin)
--admin-surface: #181b24;          // Superficie de admin
--admin-border: rgba(255, 255, 255, 0.08); // Bordes admin
--admin-radius: 12px;              // Radio admin

// Estados
Success: #22c55e (rgba(34, 197, 94, 0.12) bg)
Error:   #ef4444 (rgba(239, 68, 68, 0.12) bg)
Success Text: #86efac
Error Text:   #fca5a5

// Bordes específicos
#1a1a28 - Border oscuro
#222    - Border muy oscuro
#555    - Border medio
```

---

## Tipografía

### Fuente Principal

```scss
Font Family: 'Inter', system-ui, sans-serif
```

**Inter** es una tipografía sans-serif moderna, altamente legible en pantalla y optimizada para interfaces de usuario.

### Escalas de Tipografía

| Tamaño | Peso | Uso | Ejemplo |
|--------|------|-----|---------|
| `clamp(1.75rem, 5.5vw, 3rem)` | 800 | Títulos principales (hero) | Títulos de página |
| `1.75rem` | 700 | Títulos de sección | Section titles |
| `1.35rem` | 700 | Subtítulos | Móvil |
| `1rem` | 600-700 | Títulos de card | Títulos de eventos |
| `0.95rem` | 600 | Texto normal | Body text |
| `0.9rem` | 500 | Texto secundario | Descripciones |
| `0.85rem` | 700 | Botones | CTA |
| `0.8rem` | 400 | Metadatos | Fechas, locaciones |
| `0.78rem` | 600 | Etiquetas pequeñas | Social links |

### Ejemplos de Uso

```scss
// Titular principal
.section-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

// Titular grande con responsive
&__headline {
  font-size: clamp(1.75rem, 5.5vw, 3rem);
  font-weight: 800;
  line-height: 1.15;
}

// Texto body
body {
  font-family: var(--font);
  font-size: 0.95rem;
  line-height: 1.5;
}
```

---

## Espaciamiento

### Sistema de Espaciado

Se utiliza un sistema de espaciado basado en rem (1rem = 16px). Las medidas comunes son:

| Unidad | Valor en px | Uso |
|--------|------------|-----|
| `0.25rem` | 4px | Espacios muy pequeños |
| `0.35rem` | 5-6px | Gaps pequeños |
| `0.5rem` | 8px | Espacios pequeños |
| `0.65rem` | 10-11px | Padding de botones |
| `0.75rem` | 12px | Gaps medianos |
| `0.85rem` | 13-14px | Spacing medianos |
| `1rem` | 16px | Padding estándar |
| `1.1rem` | 18px | Padding cards |
| `1.25rem` | 20px | Padding grande |
| `1.5rem` | 24px | Margin grande |
| `2rem` | 32px | Header padding |
| `2.5rem` | 40px | Footer padding |

### Padding y Margin Comunes

```scss
// Botones
.btn-primary {
  padding: 0.65rem 1.5rem;  // Vertical Horizontal
}

.btn-outline {
  padding: 0.5rem 1.2rem;
}

// Cards
.card-body {
  padding: 1rem 1.1rem 1.25rem;
}

// Contenedor principal
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;  // Mobile
  
  @media (min-width: 768px) {
    padding: 2rem;  // Desktop
  }
}

// Header
.header-inner {
  padding: 0.65rem 2rem;
}

// Footer
.site-footer {
  padding: 1.25rem 2.5rem;
}
```

---

## Componentes

### Botones

#### Botón Primario (.btn-primary)

```scss
.btn-primary {
  background: var(--accent);           // #e85d3b
  color: #fff;
  border: 2px solid #fff;
  border-radius: var(--radius-pill);   // 999px
  padding: 0.65rem 1.5rem;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: var(--accent-hover);   // #ff7043
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

**Características:**
- Fondo naranja con border blanco
- Borde redondeado (pill shaped)
- Transición suave en hover
- Estado deshabilitado con opacidad

#### Botón Outline (.btn-outline)

```scss
.btn-outline {
  background: transparent;
  color: var(--accent);              // #e85d3b
  border: 2px solid #fff;
  border-radius: var(--radius-pill);
  padding: 0.5rem 1.2rem;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;

  &:hover {
    background: var(--accent);
    color: #fff;
  }
}
```

**Características:**
- Fondo transparente con border blanco
- Color de texto en accent
- Invierte colores en hover

---

### Cards / Tarjetas

#### Event Card (.fest-card)

```scss
.fest-card {
  background: var(--bg-card);        // #12121f
  border: 1px solid var(--border);   // rgba(255, 255, 255, 0.85)
  border-radius: var(--radius-card); // 16px
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-3px);      // Elevación en hover
    box-shadow: 0 8px 24px rgba(232, 93, 59, 0.15);
  }

  .card-image {
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border-radius: var(--radius-card) var(--radius-card) 0 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .card-body {
    padding: 1rem 1.1rem 1.25rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .card-top {
    flex: 1 1 auto;
    
    h3 {
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;      // Máximo 2 líneas
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .meta {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }
  }

  .card-footer {
    flex-shrink: 0;
    margin-top: 0.75rem;
  }

  .precio-zone {
    min-height: 3.5rem;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    margin-bottom: 0.75rem;
  }

  .precio {
    font-weight: 700;

    &.descuento {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;

      .original {
        text-decoration: line-through;
        color: var(--text-muted);
        font-weight: 500;
        font-size: 0.9rem;
      }
    }
  }
}
```

**Características:**
- Fondo card oscuro con border sutil
- Elevación (transform) en hover
- Shadow con color accent
- Imagen con aspect ratio 16:10
- Layout flex para contenido fluido
- Título limitado a 2 líneas

---

### Navbar

```scss
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #050508;
  border-bottom: 1px solid #1a1a28;
  transition: transform 0.28s ease;
}

.header-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.65rem 2rem;
  min-height: 72px;
}

.logo {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  line-height: 0;
  z-index: 2;

  img {
    height: 64px;
    width: auto;
  }
}

.main-nav {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 1rem;
  font-weight: 600;
  z-index: 1;

  a {
    color: var(--text);
    transition: color 0.3s ease;

    &:hover,
    &.active {
      color: var(--accent);
    }
  }

  .nav-dropdown {
    position: relative;

    .nav-dropdown-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--text);
      transition: color 0.3s ease;

      .caret {
        font-size: 0.75rem;
        transition: transform 0.2s ease;
      }
    }
  }
}
```

**Características:**
- Sticky positioning (pegado al top)
- Logo de 64px de altura
- Navegación centrada con logo a la izquierda
- Dropdown interactivo
- Z-index alto para visibilidad

---

### Footer

```scss
.site-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1.25rem 2.5rem;
  background: #050508;
  border-top: 1px solid #222;
  font-size: 0.8rem;
  color: var(--text-muted);

  .links {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    a:hover {
      color: var(--text);
    }
  }

  .social {
    display: flex;
    gap: 0.75rem;

    .social-instagram {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.75rem;
      border: 1px solid #555;
      border-radius: var(--radius-pill);
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
      white-space: nowrap;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--accent);
        color: var(--accent);
      }
    }
  }
}
```

**Características:**
- Flexbox responsive
- Enlaces y redes sociales
- Border top sutil
- Transiciones en hover

---

### Toast/Notificaciones

```scss
.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  margin-bottom: 1.25rem;
  border-radius: var(--admin-radius, 12px);
  background: rgba(34, 197, 94, 0.12);    // Success
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #86efac;
  font-size: 0.9rem;

  &.error {
    background: rgba(239, 68, 68, 0.12);   // Error
    border-color: rgba(239, 68, 68, 0.35);
    color: #fca5a5;
  }
}

.toast-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
}
```

**Estados:**
- **Success**: Verde con borde y texto verdes
- **Error**: Rojo con borde y texto rojos

---

### Admin Stats

```scss
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--admin-surface, #181b24);
  border: 1px solid var(--admin-border, rgba(255, 255, 255, 0.08));
  border-radius: var(--admin-radius, 12px);
  padding: 1.1rem 1.25rem;

  .stat-label {
    display: block;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text);
  }
}
```

---

## Breakpoints y Responsive

### Sistema de Breakpoints

```scss
// _breakpoints.scss
$bp-mobile: 480px;
$bp-tablet: 768px;
$bp-desktop: 900px;

@mixin mobile {
  @media (max-width: $bp-mobile) {
    @content;
  }
}

@mixin tablet-down {
  @media (max-width: $bp-tablet) {
    @content;
  }
}

@mixin desktop-down {
  @media (max-width: $bp-desktop) {
    @content;
  }
}
```

### Puntos de Quiebre

| Breakpoint | Ancho | Dispositivo |
|-----------|-------|-----------|
| Mobile | ≤ 480px | Teléfonos pequeños |
| Tablet | 481px - 768px | Tablets, teléfonos grandes |
| Desktop | > 768px | Escritorio |

### Ejemplos de Uso

```scss
// Versión móvil por defecto
.page-wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding-top: 68px;
  }
}

// Usando mixins
.section-title {
  font-size: 1.75rem;

  @include bp.tablet-down {
    font-size: 1.35rem;
  }
}

// Stats grid responsive
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);

  @include bp.tablet-down {
    grid-template-columns: repeat(2, 1fr);
  }

  @include bp.mobile {
    grid-template-columns: 1fr;
  }
}
```

---

## Efectos y Transiciones

### Transiciones Estándar

```scss
// Transiciones comunes
transition: background 0.2s;              // Fondo
transition: color 0.3s ease;              // Color
transition: transform 0.2s, box-shadow 0.2s; // Transform + shadow
transition: transform 0.28s ease;         // Navbar
transition: all 0.3s ease;                // Todo
```

### Efectos de Hover

#### Elevación de Cards
```scss
.fest-card:hover {
  transform: translateY(-3px);             // Sube 3px
  box-shadow: 0 8px 24px rgba(232, 93, 59, 0.15);
}
```

#### Color Accent
```scss
a:hover,
a.active {
  color: var(--accent);                    // Cambia a naranja
}
```

#### Botones
```scss
.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);         // Naranja más claro
}

.btn-outline:hover {
  background: var(--accent);
  color: #fff;
}
```

### Transformaciones

```scss
// Elevación en hover
transform: translateY(-3px);

// Rotación (caretas)
.caret {
  transition: transform 0.2s ease;
}

// Escalado
transform: scale(1.05);

// Centro con transform
transform: translate(-50%, -50%);
```

---

## Iconografía

### Tamaños Estándar

| Tamaño | Uso |
|--------|-----|
| 0.75rem | Caretas, iconos muy pequeños |
| 1rem | Iconos pequeños |
| 1.25rem | Iconos medianos |
| 1.5rem | Iconos grandes |
| 2rem | Iconos muy grandes (hero) |

### Uso de Iconos

```scss
.caret {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
  
  // En dropdown abierto
  .open & {
    transform: rotate(180deg);
  }
}

.social-instagram {
  // SVG o font icon aquí
  font-size: 0.78rem;
}
```

---

## Implementación en Componentes

### Ejemplo 1: Crear un Card Personalizado

```typescript
// evento-card.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-evento-card',
  template: `
    <div class="fest-card">
      <div class="card-image">
        <img [src]="evento.imagen" [alt]="evento.nombre" />
      </div>
      <div class="card-body">
        <div class="card-top">
          <h3>{{ evento.nombre }}</h3>
          <p class="meta">{{ evento.fecha | date: 'dd/MM/yyyy' }}</p>
          <p class="meta">{{ evento.locacion }}</p>
        </div>
        <div class="card-footer">
          <div class="precio-zone">
            <p class="precio" [class.descuento]="evento.descuento">
              {{ evento.precioOriginal | currency }}
              <span class="original" *ngIf="evento.descuento">
                {{ evento.precioDescuento | currency }}
              </span>
            </p>
          </div>
          <button class="btn-primary">Ver Detalles</button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './evento-card.component.scss'
})
export class EventoCardComponent {
  @Input() evento: any;
}
```

```scss
// evento-card.component.scss
// Importar breakpoints
@use '../../../breakpoints' as bp;

:host {
  display: block;
  height: 100%;
}

// Reutilizar estilos de styles.scss
// O crear estilos adicionales específicos
```

---

### Ejemplo 2: Crear un Botón Personalizado

```typescript
// custom-button.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-custom-button',
  template: `
    <button 
      [class.btn-primary]="variant === 'primary'"
      [class.btn-outline]="variant === 'outline'"
      [disabled]="disabled"
    >
      <ng-content></ng-content>
    </button>
  `,
  styleUrl: './custom-button.component.scss'
})
export class CustomButtonComponent {
  @Input() variant: 'primary' | 'outline' = 'primary';
  @Input() disabled: boolean = false;
}
```

```scss
// custom-button.component.scss
:host {
  display: inline-block;
}

button {
  font-family: var(--font);
}
```

---

### Ejemplo 3: Hero Section Responsive

```scss
.home-welcome {
  position: relative;
  width: 100vw;
  max-width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0;
  min-height: clamp(440px, 56vh, 600px);  // Responsive height

  &__media {
    position: absolute;
    inset: 0;
    width: 100%;
    overflow: hidden;
    line-height: 0;
  }

  &__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 42%;
  }

  &__overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      rgba(10, 10, 18, 0.45) 0%,
      rgba(10, 10, 18, 0.65) 45%,
      rgba(10, 10, 18, 0.88) 100%
    );
  }

  &__inner {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.35rem;
    min-height: clamp(440px, 56vh, 600px);
    max-width: min(1100px, 94vw);
    margin: 0 auto;
    padding: clamp(1.25rem, 3.5vw, 2.25rem) clamp(1rem, 4vw, 2rem);
    text-align: center;
    box-sizing: border-box;
  }

  &__headline {
    margin: 0 0 0.5rem;
    font-size: clamp(1.75rem, 5.5vw, 3rem);
    font-weight: 800;
    line-height: 1.15;
    color: var(--text);
    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.8);
  }
}
```

---

## Best Practices

### 1. **Usar CSS Custom Properties**
```scss
// ✅ Bien
background: var(--accent);
color: var(--text);

// ❌ Mal
background: #e85d3b;
color: #ffffff;
```

### 2. **Mantener Consistencia de Espaciado**
```scss
// ✅ Bien
padding: 1rem 1.1rem 1.25rem;  // Múltiplos de 0.25rem

// ❌ Mal
padding: 17px 18px 22px;       // Valores arbitrarios
```

### 3. **Usar Breakpoints Consistentes**
```scss
// ✅ Bien
@include bp.tablet-down {
  font-size: 1.35rem;
}

// ❌ Mal
@media (max-width: 750px) {
  font-size: 20px;
}
```

### 4. **Mantener Transiciones Rápidas**
```scss
// ✅ Bien (200-300ms)
transition: background 0.2s;
transition: color 0.3s ease;

// ❌ Mal (muy lentas)
transition: all 1s ease;
```

### 5. **Usar BEM para Clases**
```scss
// ✅ Bien
.fest-card { }
.fest-card__image { }
.fest-card--hover { }

// ❌ Mal
.card { }
.img { }
.hover { }
```

---

## Checklist de Implementación

Al crear nuevos componentes o páginas, asegúrate de:

- [ ] Usar variables CSS del root (colores, espaciamiento)
- [ ] Respetar los breakpoints definidos
- [ ] Aplicar transiciones suaves (0.2s - 0.3s)
- [ ] Mantener consistencia de espaciado
- [ ] Testear en móvil, tablet y desktop
- [ ] Usar tipografía Inter para texto
- [ ] Aplicar border-radius consistente
- [ ] Agregar estados hover/focus
- [ ] Documentar estilos complejos
- [ ] Validar contraste de colores

---

## Archivo de Variables Global

Para referencias rápidas, todos los valores están centralizados en:

**Ubicación:** `/frontend/src/styles.scss`
**Breakpoints:** `/frontend/src/_breakpoints.scss`

### Importar en Componentes

```scss
// En cualquier archivo de componente
@use '../../../breakpoints' as bp;

// Usar variables del root
.my-element {
  color: var(--text);
  background: var(--bg-card);
  border-radius: var(--radius-card);
}
```

---

## Recursos Adicionales

- **Tipografía Inter:** https://fonts.google.com/specimen/Inter
- **Sistema de Diseño Angular:** https://material.angular.io/
- **Responsividad CSS:** https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design
- **SCSS Documentation:** https://sass-lang.com/documentation

---

## Versión del Documento

- **Versión:** 1.0
- **Última actualización:** 2026-06-09
- **Responsable:** Frontend Team
- **Próxima revisión:** 2026-09-09

---

*Esta guía debe ser revisada y actualizada regularmente conforme evolucionan los estilos y componentes del proyecto.*
