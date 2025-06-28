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
exports.GoInterfaceCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
class GoInterfaceCodeLensProvider {
    constructor(goAnalyzer) {
        this.goAnalyzer = goAnalyzer;
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
    }
    async provideCodeLenses(document, token) {
        if (document.languageId !== 'go') {
            return [];
        }
        const config = vscode.workspace.getConfiguration('goInterfaceLens');
        if (!config.get('enable', true)) {
            return [];
        }
        const codeLenses = [];
        const { interfaces, types, methodImplementations } = await this.goAnalyzer.analyzeDocument(document);
        // Add code lenses for interfaces
        if (config.get('showOnInterfaces', true)) {
            for (const interfaceInfo of interfaces) {
                // Add CodeLens for the interface itself (always show)
                const implementationCount = interfaceInfo.implementations.length;
                const title = implementationCount === 0
                    ? 'No implementations'
                    : `${implementationCount} implementation${implementationCount === 1 ? '' : 's'}`;
                const lensCommand = implementationCount > 0
                    ? {
                        title: title,
                        command: 'goInterfaceLens.showImplementations',
                        arguments: [interfaceInfo.implementations]
                    }
                    : {
                        title: title,
                        command: ''
                    };
                const lens = new vscode.CodeLens(interfaceInfo.range, lensCommand);
                codeLenses.push(lens);
                // Add CodeLens for each method in the interface
                for (const method of interfaceInfo.methods) {
                    const methodImplCount = method.implementations.length;
                    const methodTitle = methodImplCount === 0
                        ? 'No implementations'
                        : `${methodImplCount} implementation${methodImplCount === 1 ? '' : 's'}`;
                    const methodLensCommand = methodImplCount > 0
                        ? {
                            title: methodTitle,
                            command: 'goInterfaceLens.showImplementations',
                            arguments: [method.implementations]
                        }
                        : {
                            title: methodTitle,
                            command: ''
                        };
                    const methodLens = new vscode.CodeLens(method.range, methodLensCommand);
                    codeLenses.push(methodLens);
                }
            }
        }
        // Add code lenses for types
        if (config.get('showOnTypes', true)) {
            for (const typeInfo of types) {
                if (typeInfo.implementedInterfaces.length > 0) {
                    const interfaceNames = [];
                    for (const location of typeInfo.implementedInterfaces) {
                        const name = await this.goAnalyzer.getSymbolName(location);
                        if (name) {
                            interfaceNames.push(name);
                        }
                    }
                    if (interfaceNames.length > 0) {
                        const title = `Implements: ${interfaceNames.join(', ')}`;
                        console.log(`Creating struct CodeLens: "${title}" at ${typeInfo.uri.fsPath}:${typeInfo.range.start.line}:${typeInfo.range.start.character}`);
                        console.log(`Struct interface locations:`, typeInfo.implementedInterfaces);
                        const lens = new vscode.CodeLens(typeInfo.range, {
                            title: title,
                            command: 'goInterfaceLens.goToInterfaceDefinitions',
                            arguments: [typeInfo.implementedInterfaces]
                        });
                        codeLenses.push(lens);
                    }
                }
            }
        }
        // Add code lenses for method implementations
        for (const methodImpl of methodImplementations) {
            if (methodImpl.interfaceMethod) {
                // Check if this method is already shown as part of an interface
                // Skip if we already have a CodeLens for this position (to avoid duplicates)
                const isDuplicatePosition = codeLenses.some(lens => lens.range.start.line === methodImpl.range.start.line &&
                    lens.range.start.character === methodImpl.range.start.character);
                if (isDuplicatePosition) {
                    continue;
                }
                const interfaceAndMethodName = await this.goAnalyzer.getInterfaceAndMethodName(methodImpl.interfaceMethod);
                const title = `Implementing: ${interfaceAndMethodName || 'Interface'}`;
                const lens = new vscode.CodeLens(methodImpl.range, {
                    title: title,
                    command: 'goInterfaceLens.goToInterface',
                    arguments: [
                        methodImpl.interfaceMethod.uri.toString(),
                        {
                            line: methodImpl.interfaceMethod.range.start.line,
                            character: methodImpl.interfaceMethod.range.start.character
                        }
                    ]
                });
                codeLenses.push(lens);
            }
        }
        return codeLenses;
    }
    refresh() {
        this._onDidChangeCodeLenses.fire();
    }
}
exports.GoInterfaceCodeLensProvider = GoInterfaceCodeLensProvider;
//# sourceMappingURL=codeLensProvider.js.map