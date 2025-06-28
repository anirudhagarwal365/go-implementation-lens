import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { log } from 'console';

class Logger {
    private logPath: string;
    
    constructor() {
        this.logPath = path.join(os.tmpdir(), 'go-interface-lens.log');
        this.log(`=== Go Interface Lens Debug Log Started at ${new Date().toISOString()} ===`);
    }
    
    log(message: string) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        console.log(message);
        try {
            fs.appendFileSync(this.logPath, logEntry);
        } catch (error) {
            // Ignore file write errors
        }
    }
    
    getLogPath(): string {
        return this.logPath;
    }
}

const logger = new Logger();

export interface InterfaceInfo {
    name: string;
    range: vscode.Range;
    uri: vscode.Uri;
    implementations: vscode.Location[];
    methods: MethodInfo[];
}

export interface MethodInfo {
    name: string;
    range: vscode.Range;
    implementations: vscode.Location[];
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

export class GoAnalyzer {
    private cache: Map<string, { interfaces: InterfaceInfo[], types: TypeInfo[], methodImplementations: TypeMethodInfo[], documentVersion: number }> = new Map();

    invalidateCache(filePath: string) {
        this.cache.delete(filePath);
        logger.log(`Cache invalidated for: ${filePath}`);
    }

    getLogPath(): string {
        return logger.getLogPath();
    }

    async analyzeDocument(document: vscode.TextDocument): Promise<{ interfaces: InterfaceInfo[], types: TypeInfo[], methodImplementations: TypeMethodInfo[] }> {
        const currentVersion = document.version;
        const cached = this.cache.get(document.uri.fsPath);
        
        if (cached && cached.documentVersion === currentVersion) {
            logger.log(`Using cached analysis for ${document.uri.fsPath} (document version ${currentVersion} unchanged)`);
            return { ...cached, methodImplementations: cached.methodImplementations || [] };
        }
        
        if (cached && cached.documentVersion !== currentVersion) {
            logger.log(`Document version changed for ${document.uri.fsPath} (${cached.documentVersion} → ${currentVersion}), re-analyzing`);
        }

        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        if (!symbols) {
            return { interfaces: [], types: [], methodImplementations: [] };
        }

        const interfaces: InterfaceInfo[] = [];
        const types: TypeInfo[] = [];
        const methodImplementations: TypeMethodInfo[] = [];
        
        // Process all symbols recursively
        await this.processSymbols(symbols, document, interfaces, types, methodImplementations);

        const result = { interfaces, types, methodImplementations, documentVersion: currentVersion };
        this.cache.set(document.uri.fsPath, result);
        return { interfaces, types, methodImplementations };
    }

    private async processSymbols(
        symbols: vscode.DocumentSymbol[], 
        document: vscode.TextDocument,
        interfaces: InterfaceInfo[],
        types: TypeInfo[],
        methodImplementations: TypeMethodInfo[]
    ) {
        for (const symbol of symbols) {
            if (symbol.name.indexOf('RedisTrackedJobPayload') >= 0) {
                logger.log(`Processing symbol: ${symbol.name} (${this.getSymbolKindName(symbol.kind)}) at ${symbol.range.start.line}:${symbol.range.start.character}`);
            }
            
            // Check if this symbol has implementations using gopls
            const implementations = await this.getImplementationsFromGopls(document.uri, symbol.selectionRange.start);
            const implementations2 = await this.getImplementationsFromGopls(document.uri, symbol.range.start);
            
            if (symbol.kind === vscode.SymbolKind.Struct || symbol.name.indexOf('Person') >= 0) {
                logger.log(`Processing struct symbol: ${symbol.name} at ${symbol.range.start.line}:${symbol.range.start.character}`);
            }
            
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
            
            // Process children recursively
            if (symbol.children && symbol.children.length > 0) {
                await this.processSymbols(symbol.children, document, interfaces, types, methodImplementations);
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
            logger.log(`Error getting implementations from gopls: ${error}`);
            return [];
        }
    }

    private async processInterface(symbol: vscode.DocumentSymbol, document: vscode.TextDocument, implementations: vscode.Location[], interfaces: InterfaceInfo[]) {
        const methods: MethodInfo[] = [];
        
        // Process interface methods
        if (symbol.children) {
            for (const child of symbol.children) {
                if (child.kind === vscode.SymbolKind.Method) {
                    const methodImplementations = await this.getImplementationsFromGopls(document.uri, child.range.start);
                    methods.push({
                        name: child.name,
                        range: child.range,
                        implementations: methodImplementations
                    });
                }
            }
        }
        
        interfaces.push({
            name: symbol.name,
            range: symbol.range,
            uri: document.uri,
            implementations: implementations,
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

    private async processMethod(symbol: vscode.DocumentSymbol, document: vscode.TextDocument, implementations: vscode.Location[], methodImplementations: TypeMethodInfo[]) {
        // For methods/functions, implementations might point to interface methods they implement
        // We'll take the first implementation as the interface method (if any)
        const interfaceMethod = implementations.length > 0 ? implementations[0] : undefined;
        
        methodImplementations.push({
            name: symbol.name,
            range: symbol.range,
            interfaceMethod: interfaceMethod
        });
    }

    private getSymbolKindName(kind: vscode.SymbolKind): string {
        const kindNames = {
            [vscode.SymbolKind.File]: 'File',
            [vscode.SymbolKind.Module]: 'Module',
            [vscode.SymbolKind.Namespace]: 'Namespace',
            [vscode.SymbolKind.Package]: 'Package',
            [vscode.SymbolKind.Class]: 'Class',
            [vscode.SymbolKind.Method]: 'Method',
            [vscode.SymbolKind.Property]: 'Property',
            [vscode.SymbolKind.Field]: 'Field',
            [vscode.SymbolKind.Constructor]: 'Constructor',
            [vscode.SymbolKind.Enum]: 'Enum',
            [vscode.SymbolKind.Interface]: 'Interface',
            [vscode.SymbolKind.Function]: 'Function',
            [vscode.SymbolKind.Variable]: 'Variable',
            [vscode.SymbolKind.Constant]: 'Constant',
            [vscode.SymbolKind.String]: 'String',
            [vscode.SymbolKind.Number]: 'Number',
            [vscode.SymbolKind.Boolean]: 'Boolean',
            [vscode.SymbolKind.Array]: 'Array',
            [vscode.SymbolKind.Object]: 'Object',
            [vscode.SymbolKind.Key]: 'Key',
            [vscode.SymbolKind.Null]: 'Null',
            [vscode.SymbolKind.EnumMember]: 'EnumMember',
            [vscode.SymbolKind.Struct]: 'Struct',
            [vscode.SymbolKind.Event]: 'Event',
            [vscode.SymbolKind.Operator]: 'Operator',
            [vscode.SymbolKind.TypeParameter]: 'TypeParameter'
        };
        return kindNames[kind] || `Unknown(${kind})`;
    }


    async getSymbolName(location: vscode.Location): Promise<string | undefined> {
        try {
            // Use VS Code's document symbol provider to get actual symbol information
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                location.uri
            );
            
            if (!symbols) {
                logger.log(`No symbols found for document: ${location.uri.fsPath}`);
                return this.getSymbolNameFallback(location);
            }
            
            // Find the symbol that contains the target position
            const targetSymbol = this.findSymbolAtPosition(symbols, location.range.start);
            
            if (targetSymbol) {
                logger.log(`Found symbol at position ${location.range.start.line}:${location.range.start.character}: ${targetSymbol.name} (${this.getSymbolKindName(targetSymbol.kind)})`);
                return targetSymbol.name;
            }
            
            logger.log(`No symbol found at position ${location.range.start.line}:${location.range.start.character}, using fallback`);
            return this.getSymbolNameFallback(location);
            
        } catch (error) {
            logger.log(`Error getting symbol name via symbol provider: ${error}, using fallback`);
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
                logger.log(`No symbols found for interface document: ${location.uri.fsPath}`);
                return this.getSymbolName(location); // Fall back to just method name
            }
            
            // Find the method symbol at the target position
            const methodSymbol = this.findSymbolAtPosition(symbols, location.range.start);
            
            if (!methodSymbol) {
                logger.log(`No method symbol found at position ${location.range.start.line}:${location.range.start.character}`);
                return this.getSymbolName(location); // Fall back to just method name
            }
            
            // Find the parent interface that contains this method
            const parentInterface = this.findParentInterface(symbols, methodSymbol);
            
            if (parentInterface) {
                logger.log(`Found interface.method: ${parentInterface.name}.${methodSymbol.name}`);
                return `${parentInterface.name}.${methodSymbol.name}`;
            }
            
            // If no parent interface found, just return the method name
            logger.log(`No parent interface found for method ${methodSymbol.name}, returning method name only`);
            return methodSymbol.name;
            
        } catch (error) {
            logger.log(`Error getting interface.method name: ${error}`);
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
            logger.log(`Error in symbol name fallback: ${error}`);
            return undefined;
        }
    }
}