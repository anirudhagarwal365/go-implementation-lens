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
exports.GoInterfaceGutterProvider = void 0;
const vscode = __importStar(require("vscode"));
class GoInterfaceGutterProvider {
    constructor(goAnalyzer, context) {
        this.goAnalyzer = goAnalyzer;
        this.context = context;
        // Create simple colored circles in the gutter
        this.interfaceDecorationType = vscode.window.createTextEditorDecorationType({
            gutterIconPath: context.asAbsolutePath('resources/interface.svg'),
            gutterIconSize: 'auto'
        });
        this.typeDecorationType = vscode.window.createTextEditorDecorationType({
            gutterIconPath: context.asAbsolutePath('resources/type.svg'),
            gutterIconSize: 'auto'
        });
    }
    async updateDecorations(editor) {
        if (editor.document.languageId !== 'go') {
            return;
        }
        const config = vscode.workspace.getConfiguration('goInterfaceLens');
        if (!config.get('enable', true) || !config.get('showGutterIcons', true)) {
            editor.setDecorations(this.interfaceDecorationType, []);
            editor.setDecorations(this.typeDecorationType, []);
            return;
        }
        const { interfaces, types, methodImplementations } = await this.goAnalyzer.analyzeDocument(editor.document);
        const interfaceDecorations = [];
        const typeDecorations = [];
        // Add decorations for interface methods
        if (config.get('showOnInterfaces', true)) {
            for (const interfaceInfo of interfaces) {
                // Add decoration for interface header if it has implementations
                if (interfaceInfo.implementations.length > 0) {
                    interfaceDecorations.push({
                        range: new vscode.Range(interfaceInfo.range.start, interfaceInfo.range.start)
                    });
                }
                // Add decorations for each method
                for (const method of interfaceInfo.methods) {
                    if (method.implementations.length > 0) {
                        interfaceDecorations.push({
                            range: new vscode.Range(method.range.start, method.range.start)
                        });
                    }
                }
            }
        }
        // Add decorations for types that implement interfaces
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
                        typeDecorations.push({
                            range: new vscode.Range(typeInfo.range.start, typeInfo.range.start)
                        });
                    }
                }
            }
        }
        // Add decorations for method implementations
        for (const methodImpl of methodImplementations) {
            if (methodImpl.interfaceMethod) {
                typeDecorations.push({
                    range: new vscode.Range(methodImpl.range.start, methodImpl.range.start)
                });
            }
        }
        editor.setDecorations(this.interfaceDecorationType, interfaceDecorations);
        editor.setDecorations(this.typeDecorationType, typeDecorations);
    }
    dispose() {
        this.interfaceDecorationType.dispose();
        this.typeDecorationType.dispose();
    }
}
exports.GoInterfaceGutterProvider = GoInterfaceGutterProvider;
//# sourceMappingURL=gutterDecorationProvider.js.map