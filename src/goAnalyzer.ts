import * as vscode from 'vscode';


export interface InterfaceInfo {
    name: string;
    range: vscode.Range;
    uri: vscode.Uri;
    implementations: vscode.Location[];
    references: vscode.Location[];
    methods: MethodInfo[];
}

export interface MethodInfo {
    name: string;
    range: vscode.Range;
    implementations: vscode.Location[];
    references: vscode.Location[];
}

export interface TypeInfo {
    name: string;
    range: vscode.Range;
    uri: vscode.Uri;
    implementedInterfaces: vscode.Location[];
    methods: TypeMethodInfo[];
}

export interface TypeMethodInfo {
    name: string;
    range: vscode.Range;
    interfaceMethod?: vscode.Location;
}

export interface SymbolReferenceInfo {
    name: string;
    range: vscode.Range;
    uri: vscode.Uri;
    references: vscode.Location[];
    kind: vscode.SymbolKind;
}

export class GoAnalyzer {
    private cache: Map<string, { interfaces: InterfaceInfo[], types: TypeInfo[], methodImplementations: TypeMethodInfo[], symbolReferences: SymbolReferenceInfo[], documentVersion: number }> = new Map();

    invalidateCache(filePath: string) {
        this.cache.delete(filePath);
    }


    async analyzeDocument(document: vscode.TextDocument): Promise<{ interfaces: InterfaceInfo[], types: TypeInfo[], methodImplementations: TypeMethodInfo[], symbolReferences: SymbolReferenceInfo[] }> {
        const currentVersion = document.version;
        const cached = this.cache.get(document.uri.fsPath);
        
        if (cached && cached.documentVersion === currentVersion) {
            return { 
                interfaces: cached.interfaces, 
                types: cached.types, 
                methodImplementations: cached.methodImplementations || [], 
                symbolReferences: cached.symbolReferences || [] 
            };
        }

        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        if (!symbols) {
            return { interfaces: [], types: [], methodImplementations: [], symbolReferences: [] };
        }

        const interfaces: InterfaceInfo[] = [];
        const types: TypeInfo[] = [];
        const methodImplementations: TypeMethodInfo[] = [];
        const symbolReferences: SymbolReferenceInfo[] = [];
        
        // Process all symbols recursively
        await this.processSymbols(symbols, document, interfaces, types, methodImplementations, symbolReferences);

        const result = { interfaces, types, methodImplementations, symbolReferences, documentVersion: currentVersion };
        this.cache.set(document.uri.fsPath, result);
        return { interfaces, types, methodImplementations, symbolReferences };
    }

    private async processSymbols(
        symbols: vscode.DocumentSymbol[], 
        document: vscode.TextDocument,
        interfaces: InterfaceInfo[],
        types: TypeInfo[],
        methodImplementations: TypeMethodInfo[],
        symbolReferences: SymbolReferenceInfo[]
    ) {
        for (const symbol of symbols) {
            
            // Check if this symbol has implementations using gopls
            const implementations = await this.getImplementationsFromGopls(document.uri, symbol.selectionRange.start);
            
            
            if (implementations.length > 0) {
                // Categorize based on symbol type
                if (symbol.kind === vscode.SymbolKind.Interface) {
                    await this.processInterface(symbol, document, implementations, interfaces);
                } else if (symbol.kind === vscode.SymbolKind.Struct) {
                    await this.processStruct(symbol, document, implementations, types);
                } else if (symbol.kind === vscode.SymbolKind.Method || symbol.kind === vscode.SymbolKind.Function) {
                    await this.processMethod(symbol, document, implementations, methodImplementations);
                }
            }
            
            // Check for references on all symbols including interfaces
            // Note: We still check functions/methods even if they implement interfaces, to show their references
            if (symbol.kind === vscode.SymbolKind.Interface ||
                 symbol.kind === vscode.SymbolKind.Function || 
                 symbol.kind === vscode.SymbolKind.Method ||
                 symbol.kind === vscode.SymbolKind.Variable ||
                 symbol.kind === vscode.SymbolKind.Constant ||
                 symbol.kind === vscode.SymbolKind.Field ||
                 symbol.kind === vscode.SymbolKind.Property ||
                 symbol.kind === vscode.SymbolKind.TypeParameter ||
                 symbol.kind === vscode.SymbolKind.Struct) {
                
                const allReferences = await this.getReferencesFromGopls(document.uri, symbol.selectionRange.start);
                
                // Filter out self-reference
                const references = allReferences.filter(ref => {
                    return !(ref.uri.toString() === document.uri.toString() && 
                             ref.range.start.line === symbol.selectionRange.start.line &&
                             ref.range.start.character === symbol.selectionRange.start.character);
                });
                
                // Add if there are references, or always show for functions/methods/interfaces
                // For other symbols (fields, variables, etc.), only show if they have references
                if (references.length > 0 || 
                    symbol.kind === vscode.SymbolKind.Interface ||
                    symbol.kind === vscode.SymbolKind.Function || 
                    symbol.kind === vscode.SymbolKind.Method) {
                    symbolReferences.push({
                        name: symbol.name,
                        range: symbol.range,
                        uri: document.uri,
                        references: references,
                        kind: symbol.kind
                    });
                }
            }
            
            // Process children recursively
            // Skip children of interfaces as they are already processed in processInterface
            if (symbol.children && symbol.children.length > 0 && symbol.kind !== vscode.SymbolKind.Interface) {
                await this.processSymbols(symbol.children, document, interfaces, types, methodImplementations, symbolReferences);
            }
        }
    }

    private async getImplementationsFromGopls(uri: vscode.Uri, position: vscode.Position): Promise<vscode.Location[]> {
        try {
            const implementations = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeImplementationProvider',
                uri,
                position
            );
            
            return implementations || [];
        } catch (error) {
            return [];
        }
    }

    private async getReferencesFromGopls(uri: vscode.Uri, position: vscode.Position): Promise<vscode.Location[]> {
        try {
            const references = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeReferenceProvider',
                uri,
                position
            );
            
            return references || [];
        } catch (error) {
            return [];
        }
    }

    private async processInterface(symbol: vscode.DocumentSymbol, document: vscode.TextDocument, implementations: vscode.Location[], interfaces: InterfaceInfo[]) {
        const methods: MethodInfo[] = [];
        
        // Get references for the interface
        const allReferences = await this.getReferencesFromGopls(document.uri, symbol.selectionRange.start);
        
        // Filter out self-reference (the interface definition itself)
        const references = allReferences.filter(ref => {
            return !(ref.uri.toString() === document.uri.toString() && 
                     ref.range.start.line === symbol.selectionRange.start.line &&
                     ref.range.start.character === symbol.selectionRange.start.character);
        });
        
        // Process interface methods
        if (symbol.children) {
            for (const child of symbol.children) {
                if (child.kind === vscode.SymbolKind.Method) {
                    const methodImplementations = await this.getImplementationsFromGopls(document.uri, child.range.start);
                    const allMethodReferences = await this.getReferencesFromGopls(document.uri, child.selectionRange.start);
                    
                    // Filter out self-reference for methods too
                    const methodReferences = allMethodReferences.filter(ref => {
                        return !(ref.uri.toString() === document.uri.toString() && 
                                 ref.range.start.line === child.selectionRange.start.line &&
                                 ref.range.start.character === child.selectionRange.start.character);
                    });
                    
                    methods.push({
                        name: child.name,
                        range: child.range,
                        implementations: methodImplementations,
                        references: methodReferences
                    });
                }
            }
        }
        
        interfaces.push({
            name: symbol.name,
            range: symbol.range,
            uri: document.uri,
            implementations: implementations,
            references: references,
            methods: methods
        });
    }

    private async processStruct(symbol: vscode.DocumentSymbol, document: vscode.TextDocument, implementations: vscode.Location[], types: TypeInfo[]) {
        // For structs, the implementations represent interfaces this struct implements
        types.push({
            name: symbol.name,
            range: symbol.range,
            uri: document.uri,
            implementedInterfaces: implementations,
            methods: [] // We'll populate this if needed
        });
    }

    private async processMethod(symbol: vscode.DocumentSymbol, _document: vscode.TextDocument, implementations: vscode.Location[], methodImplementations: TypeMethodInfo[]) {
        // For methods/functions, implementations might point to interface methods they implement
        // We'll take the first implementation as the interface method (if any)
        const interfaceMethod = implementations.length > 0 ? implementations[0] : undefined;
        
        methodImplementations.push({
            name: symbol.name,
            range: symbol.range,
            interfaceMethod: interfaceMethod
        });
    }



    async getSymbolName(location: vscode.Location): Promise<string | undefined> {
        try {
            // Use VS Code's document symbol provider to get actual symbol information
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                location.uri
            );
            
            if (!symbols) {
                return this.getSymbolNameFallback(location);
            }
            
            // Find the symbol that contains the target position
            const targetSymbol = this.findSymbolAtPosition(symbols, location.range.start);
            
            if (targetSymbol) {
                return targetSymbol.name;
            }
            
            return this.getSymbolNameFallback(location);
            
        } catch (error) {
            return this.getSymbolNameFallback(location);
        }
    }

    async getInterfaceAndMethodName(location: vscode.Location): Promise<string | undefined> {
        try {
            // Use VS Code's document symbol provider to get actual symbol information
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                location.uri
            );
            
            if (!symbols) {
                return this.getSymbolName(location); // Fall back to just method name
            }
            
            // Find the method symbol at the target position
            const methodSymbol = this.findSymbolAtPosition(symbols, location.range.start);
            
            if (!methodSymbol) {
                return this.getSymbolName(location); // Fall back to just method name
            }
            
            // Find the parent interface that contains this method
            const parentInterface = this.findParentInterface(symbols, methodSymbol);
            
            if (parentInterface) {
                return `${parentInterface.name}.${methodSymbol.name}`;
            }
            
            // If no parent interface found, just return the method name
            return methodSymbol.name;
            
        } catch (error) {
            return this.getSymbolName(location); // Fall back to just method name
        }
    }

    private findParentInterface(symbols: vscode.DocumentSymbol[], targetMethod: vscode.DocumentSymbol): vscode.DocumentSymbol | undefined {
        for (const symbol of symbols) {
            // Check if this is an interface
            if (symbol.kind === vscode.SymbolKind.Interface) {
                // Check if the method is within this interface's range
                if (symbol.range.contains(targetMethod.range.start)) {
                    return symbol;
                }
                
                // Also check children explicitly
                if (symbol.children) {
                    for (const child of symbol.children) {
                        if (child === targetMethod || 
                            (child.name === targetMethod.name && 
                             child.range.start.line === targetMethod.range.start.line)) {
                            return symbol;
                        }
                    }
                }
            }
            
            // Recursively check children
            if (symbol.children && symbol.children.length > 0) {
                const parent = this.findParentInterface(symbol.children, targetMethod);
                if (parent) {
                    return parent;
                }
            }
        }
        return undefined;
    }

    private findSymbolAtPosition(symbols: vscode.DocumentSymbol[], position: vscode.Position): vscode.DocumentSymbol | undefined {
        for (const symbol of symbols) {
            // Check if position is within this symbol's range
            if (symbol.range.contains(position)) {
                // If this symbol has children, check them first (more specific match)
                if (symbol.children && symbol.children.length > 0) {
                    const childSymbol = this.findSymbolAtPosition(symbol.children, position);
                    if (childSymbol) {
                        return childSymbol;
                    }
                }
                
                // Check if position is within the symbol's selection range (name definition)
                if (symbol.selectionRange.contains(position)) {
                    return symbol;
                }
                
                // If not in selection range but in overall range, this might still be the right symbol
                // for cases where we're targeting the symbol definition
                return symbol;
            }
        }
        return undefined;
    }

    private async getSymbolNameFallback(location: vscode.Location): Promise<string | undefined> {
        try {
            const document = await vscode.workspace.openTextDocument(location.uri);
            const line = document.lineAt(location.range.start);
            const text = line.text;
            
            // For Go type definitions, try to extract the type name
            // Pattern: "type TypeName interface" or "type TypeName struct"
            let match = text.match(/type\s+(\w+)\s+(?:interface|struct)/);
            if (match) {
                return match[1];
            }
            
            // Pattern: "func (receiver Type) MethodName" - extract Type
            match = text.match(/func\s+\([^)]*\s+\*?(\w+)\s*\)\s+\w+/);
            if (match) {
                return match[1];
            }
            
            // Pattern: "func MethodName" - extract MethodName
            match = text.match(/func\s+(\w+)/);
            if (match) {
                return match[1];
            }
            
            // Pattern: "MethodName(" for interface methods
            match = text.match(/^\s*(\w+)\s*\(/);
            if (match) {
                return match[1];
            }
            
            // General fallback - just get the first identifier on the line
            match = text.match(/\b(\w+)\b/);
            return match ? match[1] : undefined;
        } catch (error) {
            return undefined;
        }
    }
}