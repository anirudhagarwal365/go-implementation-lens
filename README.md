# Go Implementation Lens

A VS Code extension that shows interface implementations in Go code using gutter icons (similar to GoLand/IntelliJ), addressing the issue described in [golang/go#56695](https://github.com/golang/go/issues/56695).

## Features

- **Gutter Icons on Interface Methods**: Shows a green "i" icon next to interface methods that have implementations
- **Gutter Icons on Types**: Shows a blue "I" icon next to types that implement interfaces
- **Hover Information**: Hover over icons to see implementation details
- **Quick Navigation**: Click on links in hover tooltips to navigate to implementations
- **Real-time Updates**: Icons update automatically as you modify code

## How it Works

The extension uses VS Code's built-in `executeImplementationProvider` command which leverages gopls (Go language server) to find interface implementations. This provides accurate, bidirectional navigation without custom parsing.

## Usage

1. Open a Go file in VS Code
2. Look for CodeLens indicators:
   - Above interfaces: "N implementations" 
   - Above types: "Implements: Interface1, Interface2..."
3. Click on the CodeLens to navigate

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