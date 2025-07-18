# Go Implementation Lens

A VS Code extension that enhances Go development by providing instant visibility into interface-implementation relationships. Navigate seamlessly between interfaces and their implementations with visual indicators and smart navigation - bringing GoLand/IntelliJ-style functionality to VS Code.

![Go Implementation Lens Example](example.png)

## Key Features

### 🔍 Interface Implementation Discovery
- **Instant Visibility**: See how many implementations an interface has directly in your code
- **Bidirectional Navigation**: Jump from interface → implementations or implementation → interfaces
- **Visual Indicators**: Gutter icons provide at-a-glance awareness of relationships

### 🎯 Smart Navigation
- **Direct Jump**: Single implementation? Go straight to it with one click
- **Quick Pick Menu**: Multiple implementations? Choose from an organized list with file locations

![Multiple Implementations Navigation](multi_impl.png)

### ⚡ Performance Optimized
- **Intelligent Caching**: Document-level cache minimizes gopls calls
- **Real-time Updates**: Changes reflect immediately without manual refresh
- **Lightweight**: No performance impact on large codebases

### 🎨 Customizable Display
- **CodeLens**: "N implementations" above interfaces, "Implements: X, Y" above types
- **Gutter Icons**: Visual markers for quick identification
- **Flexible Configuration**: Enable/disable features to match your workflow

## How It Works

The extension leverages gopls (Go language server) through VS Code's `executeImplementationProvider` API, ensuring accurate and up-to-date results. This approach provides:
- **Accuracy**: Uses the same implementation detection as Go's compiler
- **Reliability**: No custom parsing means fewer edge cases
- **Compatibility**: Works seamlessly with all Go project structures

## Usage

1. **Open any Go file** - The extension activates automatically
2. **Look for indicators**:
   - 📍 Above interfaces: "N implementations" link
   - 📍 Above structs: "Implements: Interface1, Interface2..." link
   - 📍 Gutter icons marking interfaces and implementations
3. **Click to navigate**:
   - Single target: Direct navigation
   - Multiple targets: Selection menu with preview

## Requirements

- VS Code 1.74.0 or higher
- Go extension for VS Code (with gopls enabled)

## Configuration

- `goImplementationLens.enable`: Enable/disable the extension
- `goImplementationLens.showOnInterfaces`: Show implementations on interface definitions
- `goImplementationLens.showOnTypes`: Show implemented interfaces on type definitions

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch
```

## Testing

Press F5 in VS Code to launch a new Extension Development Host window with the extension loaded.