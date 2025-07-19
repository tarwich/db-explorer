# View Management Restructure Task

## Overview
Redesign the table view configuration interface to provide intuitive drag-and-drop field management with flexible layouts for inline, card, and list presentations.

## High-Level Goals
- Create a visual field composer with drag-and-drop tokens
- Allow custom field positioning and line arrangements  
- Unify view management under a single, coherent interface
- Improve field sorting and organization capabilities

## Task Breakdown

### Phase 1: Core Infrastructure
- [ ] Create new `ViewComposer` component with drag-and-drop zones
- [ ] Implement field token system using `@dnd-kit/core` and `@dnd-kit/sortable`
- [ ] Design draggable field tokens with type indicators and edit capabilities
- [ ] Build drop zones for different layout areas (header, body, footer)
- [ ] Create view configuration data structure to store field arrangements

### Phase 2: Field Management System
- [ ] Implement field availability panel with all table columns
- [ ] Add field search/filter functionality for large tables
- [ ] Create field type categorization (text, numbers, dates, relationships)
- [ ] Build field property editor (display name, formatting, visibility)
- [ ] Add calculated/computed field creation interface

### Phase 3: Layout Composer Interface
- [ ] Design visual layout canvas with multiple drop zones
- [ ] Implement line-based organization (drag fields to specific lines)
- [ ] Create layout templates for common arrangements
- [ ] Add responsive layout previews for different screen sizes
- [ ] Build layout validation and conflict resolution

### Phase 4: View Type Implementation

#### Inline View Composer
- [ ] Single-line drop zone with horizontal field arrangement
- [ ] Field spacing and separator controls
- [ ] Overflow handling for too many fields
- [ ] Compact display options

#### Card View Composer  
- [ ] Multi-zone layout (header, body, footer sections)
- [ ] Grid-based field positioning within zones
- [ ] Card size and aspect ratio controls
- [ ] Field grouping and styling options

#### List View Composer
- [ ] Column-based layout with sortable headers
- [ ] Column width and alignment controls
- [ ] Row grouping and hierarchy options
- [ ] Bulk field operations (show/hide, reorder)

### Phase 5: Advanced Features
- [ ] Layout presets and templates system
- [ ] Copy/paste view configurations between tables
- [ ] Export/import view definitions
- [ ] Undo/redo for layout changes
- [ ] Real-time preview of data with current layout

### Phase 6: User Experience Enhancements
- [ ] Contextual help and field suggestions
- [ ] Layout validation with helpful error messages
- [ ] Performance optimization for large field sets
- [ ] Keyboard shortcuts for power users
- [ ] Mobile-responsive layout composer

## Technical Approach

### Component Architecture
```
ViewComposer/
├── FieldTokenPanel/          # Available fields sidebar
├── LayoutCanvas/             # Main drag-and-drop area
│   ├── DropZone/            # Configurable drop areas
│   ├── FieldToken/          # Draggable field elements
│   └── LineContainer/       # Multi-line organization
├── ViewPreview/             # Live data preview
├── ViewTypeSelector/        # Switch between view types
└── ConfigurationPanel/      # Field properties and settings
```

### Data Structure
```typescript
interface ViewConfiguration {
  id: string;
  name: string;
  type: 'inline' | 'card' | 'list';
  layout: {
    zones: {
      id: string;
      name: string;
      fields: FieldConfiguration[];
      constraints?: LayoutConstraints;
    }[];
  };
  settings: ViewSettings;
}

interface FieldConfiguration {
  columnName: string;
  displayName?: string;
  position: { line: number; order: number };
  formatting?: FieldFormatting;
  visibility: boolean;
  editable: boolean;
}
```

### Integration Points
- Extend existing `enhanced-column-editor.tsx` functionality
- Integrate with current table configuration system
- Maintain compatibility with existing view data
- Hook into `data-browser` components for preview

## Success Criteria
1. Users can drag fields from a palette onto layout areas
2. Fields can be organized into custom lines/groups
3. Real-time preview shows actual data with new layout
4. Configuration persists and loads correctly
5. Interface works smoothly with large numbers of fields (100+)
6. All three view types (inline, card, list) are fully functional

## Implementation Notes
- Use existing `@dnd-kit` libraries already in project
- Leverage current field component system in `src/components/fields/`
- Maintain type safety with TypeScript throughout
- Consider performance for tables with many columns
- Ensure accessibility compliance for drag-and-drop interactions