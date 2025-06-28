import * as vscode from 'vscode';
import { GoAnalyzer } from './goAnalyzer';

export class GoInterfaceGutterProvider {
    private interfaceDecorationType: vscode.TextEditorDecorationType;
    private typeDecorationType: vscode.TextEditorDecorationType;

    constructor(private goAnalyzer: GoAnalyzer, private context: vscode.ExtensionContext) {
        // Create gutter icons for interfaces and types
        this.interfaceDecorationType = vscode.window.createTextEditorDecorationType({
            gutterIconPath: context.asAbsolutePath('resources/emojione--down-arrow.svg'),
            gutterIconSize: '12px'
        });

        this.typeDecorationType = vscode.window.createTextEditorDecorationType({
            gutterIconPath: context.asAbsolutePath('resources/emojione--up-arrow.svg'),
            gutterIconSize: '12px'
        });
    }


    async updateDecorations(editor: vscode.TextEditor) {
        if (editor.document.languageId !== 'go') {
            return;
        }

        const config = vscode.workspace.getConfiguration('goInterfaceLens');
        if (!config.get<boolean>('enable', true) || !config.get<boolean>('showGutterIcons', true)) {
            editor.setDecorations(this.interfaceDecorationType, []);
            editor.setDecorations(this.typeDecorationType, []);
            return;
        }

        const { interfaces, types, methodImplementations } = await this.goAnalyzer.analyzeDocument(editor.document);
        const interfaceDecorations: vscode.DecorationOptions[] = [];
        const typeDecorations: vscode.DecorationOptions[] = [];

        // Add decorations for interface methods
        if (config.get<boolean>('showOnInterfaces', true)) {
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
        if (config.get<boolean>('showOnTypes', true)) {
            for (const typeInfo of types) {
                if (typeInfo.implementedInterfaces.length > 0) {
                    const interfaceNames: string[] = [];
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