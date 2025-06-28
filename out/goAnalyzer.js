"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class Logger {
    constructor() {
        this.logPath = path.join(os.tmpdir(), 'go-interface-lens.log');
        this.log(`=== Go Interface Lens Debug Log Started at ${new Date().toISOString()} ===`);
    }
    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        console.log(message);
        try {
            fs.appendFileSync(this.logPath, logEntry);
        }
        catch (error) {
            // Ignore file write errors
        }
    }
    getLogPath() {
        return this.logPath;
    }
}
const logger = new Logger();
class GoAnalyzer {
    constructor() {
        this.cache = new Map();
    }
    invalidateCache(filePath) {
        this.cache.delete(filePath);
        logger.log(`Cache invalidated for: ${filePath}`);
    }
    getLogPath() {
        return logger.getLogPath();
    }
    async analyzeDocument(document) {
        const currentVersion = document.version;
        const cached = this.cache.get(document.uri.fsPath);
        if (cached && cached.documentVersion === currentVersion) {
            logger.log(`Using cached analysis for ${document.uri.fsPath} (document version ${currentVersion} unchanged)`);
            return { ...cached, methodImplementations: cached.methodImplementations || [] };
        }
        if (cached && cached.documentVersion !== currentVersion) {
            logger.log(`Document version changed for ${document.uri.fsPath} (${cached.documentVersion} → ${currentVersion}), re-analyzing`);
        }
        const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri);
        if (!symbols) {
            return { interfaces: [], types: [], methodImplementations: [] };
        }
        const interfaces = [];
        const types = [];
        const methodImplementations = [];
        // Process all symbols recursively
        await this.processSymbols(symbols, document, interfaces, types, methodImplementations);
        const result = { interfaces, types, methodImplementations, documentVersion: currentVersion };
        this.cache.set(document.uri.fsPath, result);
        return { interfaces, types, methodImplementations };
    }
    async processSymbols(symbols, document, interfaces, types, methodImplementations) {
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
                }
                else if (symbol.kind === vscode.SymbolKind.Struct) {
                    await this.processStruct(symbol, document, implementations, types);
                }
                else if (symbol.kind === vscode.SymbolKind.Method || symbol.kind === vscode.SymbolKind.Function) {
                    await this.processMethod(symbol, document, implementations, methodImplementations);
                }
            }
            // Process children recursively
            if (symbol.children && symbol.children.length > 0) {
                await this.processSymbols(symbol.children, document, interfaces, types, methodImplementations);
            }
        }
    }
    async getImplementationsFromGopls(uri, position) {
        try {
            const implementations = await vscode.commands.executeCommand('vscode.executeImplementationProvider', uri, position);
            return implementations || [];
        }
        catch (error) {
            logger.log(`Error getting implementations from gopls: ${error}`);
            return [];
        }
    }
    async processInterface(symbol, document, implementations, interfaces) {
        const methods = [];
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
    async processStruct(symbol, document, implementations, types) {
        // For structs, the implementations represent interfaces this struct implements
        types.push({
            name: symbol.name,
            range: symbol.range,
            uri: document.uri,
            implementedInterfaces: implementations,
            methods: [] // We'll populate this if needed
        });
    }
    async processMethod(symbol, document, implementations, methodImplementations) {
        // For methods/functions, implementations might point to interface methods they implement
        // We'll take the first implementation as the interface method (if any)
        const interfaceMethod = implementations.length > 0 ? implementations[0] : undefined;
        methodImplementations.push({
            name: symbol.name,
            range: symbol.range,
            interfaceMethod: interfaceMethod
        });
    }
    getSymbolKindName(kind) {
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
    async getSymbolName(location) {
        try {
            // Use VS Code's document symbol provider to get actual symbol information
            const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', location.uri);
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
        }
        catch (error) {
            logger.log(`Error getting symbol name via symbol provider: ${error}, using fallback`);
            return this.getSymbolNameFallback(location);
        }
    }
    async getInterfaceAndMethodName(location) {
        try {
            // Use VS Code's document symbol provider to get actual symbol information
            const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', location.uri);
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
        }
        catch (error) {
            logger.log(`Error getting interface.method name: ${error}`);
            return this.getSymbolName(location); // Fall back to just method name
        }
    }
    findParentInterface(symbols, targetMethod) {
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
    findSymbolAtPosition(symbols, position) {
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
    async getSymbolNameFallback(location) {
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
        }
        catch (error) {
            logger.log(`Error in symbol name fallback: ${error}`);
            return undefined;
        }
    }
}
exports.GoAnalyzer = GoAnalyzer;
//# sourceMappingURL=goAnalyzer.js.map