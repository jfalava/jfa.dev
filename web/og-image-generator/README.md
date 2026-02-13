# OG Image Generator

A visual editor for creating Open Graph (OG) images for social media sharing. Build templates with a drag-and-drop interface, use template variables for dynamic content, and export as PNG.

## Quick Start

```bash
cd web/og-generator
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Visual Canvas Editor** - 1200×630px canvas matching OG image specifications
- **Drag-and-Drop Elements** - Position elements freely or snap to grid
- **4 Element Types** - Text, Image, Badge, Container
- **Template Variables** - Use `{{variable}}` syntax for dynamic content
- **Grid Snapping** - Configurable grid for precise alignment
- **Google Fonts** - Load any Google Font on demand
- **Export Options** - Download as PNG or export templates as JSON
- **Preset Templates** - Start with pre-built templates
- **Persistent Storage** - Templates saved to localStorage

---

## User Interface Overview

The editor is divided into four main areas:

```
┌──────────────────────────────────────────────────────────────────┐
│                         TOOLBAR                                   │
├────────────┬─────────────────────────────────┬───────────────────┤
│            │                                 │                   │
│  TEMPLATES │           CANVAS               │   PROPERTIES      │
│  SIDEBAR   │         (1200×630)             │     PANEL         │
│            │                                 │                   │
│  ────────  │                                 │                   │
│  CANVAS    │                                 │                   │
│  SETTINGS  │                                 │                   │
│            │                                 │                   │
│  ────────  │                                 │                   │
│  VARIABLES │                                 │                   │
│            │                                 │                   │
│  ────────  │                                 │                   │
│   FONTS    │                                 │                   │
│            │                                 │                   │
└────────────┴─────────────────────────────────┴───────────────────┘
```

---

## Toolbar

The top toolbar contains the main actions:

| Section           | Controls                          | Description                                 |
| ----------------- | --------------------------------- | ------------------------------------------- |
| **Template Name** | Text input                        | Edit the current template's name            |
| **Add Elements**  | Text, Image, Badge, Container     | Add new elements to the canvas              |
| **Zoom**          | −, dropdown, +                    | Zoom in/out (50% to 150%)                   |
| **Grid**          | Snap, Grid, Size                  | Toggle snapping, grid visibility, grid size |
| **Import/Export** | Import, Export JSON, Download PNG | Template and image export                   |

### Grid Controls

- **Snap** (magnet icon) - When active (highlighted), elements snap to grid intersections when dragged
- **Grid** (grid icon) - When active, shows grid lines on canvas
- **Size dropdown** - Choose grid size: 8px, 12px, 16px, 24px, 32px, or 48px

---

## Templates Sidebar (Left Panel)

### Creating Templates

1. Enter a name in the "New template..." input
2. Press Enter or click the + button
3. The new template opens automatically

### Loading Presets

Click **Load Preset** to reveal built-in templates:

- **Page Template** - Simple title and description layout
- **Post with Image** - Social post with badges and overlay
- **Blog Post** - Article layout with title, excerpt, and metadata

### Managing Templates

Each template in the list shows:

- Template name
- Element count

Hover to reveal:

- **Copy** - Duplicate the template
- **Trash** - Delete the template

---

## Canvas Settings

Configure the template's canvas:

### Description

Add a description for the template (for your reference).

### Background

Enter any valid CSS background value:

- Solid color: `#1a1a1a` or `rgb(26, 26, 26)`
- Gradient: `linear-gradient(135deg, #000, #1a1a1a)`
- Image: `url(https://example.com/bg.jpg)`

### Presets

Quick background options:

- **Dark** - Default dark gradient
- **Light** - Light gray gradient
- **Blue** - Deep blue gradient
- **Purple** - Purple gradient
- **Green** - Forest green gradient
- **Orange** - Warm orange gradient

---

## Variables Panel

Template variables let you create reusable templates with dynamic content.

### How Variables Work

1. Define a variable with a key (e.g., `title`)
2. Use `{{title}}` in any text or badge element
3. Change the variable value to update all occurrences

### Adding Variables

1. Enter a **Key** (used in templates as `{{key}}`)
2. Enter a **Label** (displayed in the UI)
3. Enter a **Default** value
4. Click **Add Variable**

### Example

```
Key: title
Label: Page Title
Default: My Awesome Page

Then in a text element, use: {{title}}
```

---

## Font Manager

### Available Fonts

Shows all fonts currently loaded:

- **Bundled fonts** - Inter (included by default)
- **Google fonts** - Any fonts you've added

### Adding Google Fonts

**Quick add**: Click any font name in the suggested list to load it instantly:

- Roboto, Open Sans, Lato, Montserrat, Poppins, etc.

**Custom font**:

1. Enter the exact font family name from [Google Fonts](https://fonts.google.com)
2. Click the + button to load it

Fonts are saved and will be available in future sessions.

---

## Element Types

### Text Element

A text block with full typography controls.

| Property    | Description                            |
| ----------- | -------------------------------------- |
| Text        | The content (supports `{{variables}}`) |
| Font Family | Choose from loaded fonts               |
| Font Size   | Size in pixels                         |
| Font Weight | Regular, Medium, Semibold, Bold        |
| Line Height | Multiplier (e.g., 1.2)                 |
| Text Align  | Left, Center, Right                    |
| Color       | Text color (hex or color picker)       |

### Image Element

Displays an image from a URL.

| Property      | Description                |
| ------------- | -------------------------- |
| Image URL     | Full URL to the image      |
| Object Fit    | Cover, Contain, Fill, None |
| Border Radius | Corner rounding in pixels  |

**Tip**: For local images, host them or use a data URL.

### Badge Element

A styled label/tag component.

| Property         | Description                            |
| ---------------- | -------------------------------------- |
| Text             | Badge label (supports `{{variables}}`) |
| Font Family      | Choose from loaded fonts               |
| Font Size        | Size in pixels                         |
| Font Weight      | Regular, Medium, Semibold, Bold        |
| Background Color | Badge background                       |
| Text Color       | Label text color                       |
| Border Color     | Border color                           |
| Border Radius    | Corner rounding                        |
| Padding X/Y      | Horizontal/vertical padding            |

### Container Element

A rectangular shape for backgrounds or grouping.

| Property         | Description                |
| ---------------- | -------------------------- |
| Background Color | Fill color (supports rgba) |
| Border Color     | Border color               |
| Border Width     | Border thickness           |
| Border Radius    | Corner rounding            |
| Opacity          | Transparency (0 to 1)      |

---

## Properties Panel (Right Panel)

When an element is selected, the Properties Panel shows:

### Element Header

- Element type label
- Quick actions:
  - **Eye** - Toggle visibility
  - **Lock** - Lock position (prevents dragging)
  - **Up/Down arrows** - Change layer order
  - **Copy** - Duplicate element
  - **Trash** - Delete element

### Position & Size

- **X, Y** - Position from top-left corner
- **Width, Height** - Element dimensions

### Tailwind Classes

Add custom Tailwind CSS classes for additional styling:

```
shadow-lg rounded-lg opacity-80
```

### Type-Specific Properties

The remaining fields change based on element type (see Element Types above).

---

## Working with the Canvas

### Selecting Elements

- Click an element to select it
- Click empty canvas area to deselect

### Moving Elements

- Drag selected elements to reposition
- With grid snap enabled, elements align to grid intersections

### Layer Order

Elements are rendered in order—later elements appear on top.

- Use the **Up arrow** to bring an element forward
- Use the **Down arrow** to send an element backward

### Locked Elements

Locked elements cannot be moved by dragging. Useful for background containers.

### Hidden Elements

Hidden elements don't appear on canvas or in exports. Useful for temporary removal.

---

## Exporting

### Download PNG

1. Click **Download PNG** in the toolbar
2. The image exports at 2x resolution (2400×1260px) for crisp social media display
3. File downloads as `{template-name}.png`

**Note**: The grid overlay is NOT included in the export.

### Export JSON

1. Click **Export JSON** in the toolbar
2. Template exports as a `.json` file
3. Contains all elements, variables, and settings

### Import JSON

1. Click **Import** in the toolbar
2. Select a previously exported `.json` file
3. Template is added to your list and opened

---

## Tips & Best Practices

### Design Tips

1. **Use the grid** - 24px or 48px grids help maintain alignment
2. **Layer containers first** - Add background containers before foreground text
3. **Lock backgrounds** - Prevent accidental moves
4. **Test at 100% zoom** - This shows the actual export size

### Performance Tips

1. **Use web-optimized images** - Large images slow down the editor
2. **Limit Google Fonts** - Each font adds loading time
3. **Fewer elements** - Complex templates may slow rendering

### Template Organization

1. **Use descriptive names** - "Blog Post - Dark Theme" vs "Template 1"
2. **Add descriptions** - Note the intended use case
3. **Export regularly** - Back up important templates as JSON

---

## Technical Details

### Canvas Specifications

- **Width**: 1200px
- **Height**: 630px
- **Export Resolution**: 2400×1260px (2x for retina)

These dimensions match the recommended OG image size for most social platforms.

### Storage

Templates and settings are stored in `localStorage` under the key `og-generator-storage`. Persisted data includes:

- All templates (elements, variables, settings)
- Loaded fonts
- Grid preferences

### Supported Browsers

The editor uses modern browser features:

- `html-to-image` for PNG export
- Google Fonts API for font loading
- CSS Grid and Flexbox for layout

Recommended: Chrome, Firefox, Safari, Edge (latest versions)

---

## Troubleshooting

### Elements not snapping

- Ensure **Snap** button is active (highlighted) in toolbar
- Check that grid size is appropriate for your element positions

### Font not loading

- Verify the exact font name from Google Fonts
- Check browser console for errors
- Some fonts may not be available in all weights

### Export appears blank

- Ensure elements are visible (eye icon)
- Check that image URLs are accessible (no CORS issues)
- Try exporting at 100% zoom

### Template not saving

- localStorage may be full or disabled
- Export as JSON for manual backup

---

## Development

### Project Structure

```
src/
├── components/
│   ├── editor/
│   │   ├── Canvas.tsx           # Main canvas with grid overlay
│   │   ├── ElementRenderer.tsx  # Renders each element type
│   │   ├── PropertiesPanel.tsx  # Right sidebar properties
│   │   ├── Toolbar.tsx          # Top toolbar
│   │   ├── TemplatesSidebar.tsx # Left sidebar templates
│   │   ├── VariablesPanel.tsx   # Variables management
│   │   ├── CanvasSettings.tsx   # Background settings
│   │   └── FontManager.tsx      # Google Fonts loader
│   └── ui/                      # Base UI components
├── stores/
│   └── editor-store.ts          # Zustand state management
├── types/
│   └── editor.ts                # TypeScript types
├── data/
│   └── preset-templates.ts      # Built-in templates
└── routes/
    └── index.tsx                # Main editor page
```

### Commands

```bash
bun run dev      # Start development server
bun run build    # Build for production
bun run serve    # Preview production build
```

### Dependencies

- **React 19** - UI framework
- **TanStack Start** - Meta-framework
- **Zustand** - State management with persistence
- **@dnd-kit** - Drag and drop
- **html-to-image** - PNG export
- **Tailwind CSS 4** - Styling

---

## License

MIT
