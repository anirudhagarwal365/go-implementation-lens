import * as vscode from 'vscode';
import { GoAnalyzer } from './goAnalyzer';

export class GoInterfaceCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor(private goAnalyzer: GoAnalyzer) {}

    async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        if (document.languageId !== 'go') {
            return [];
        }

        const config = vscode.workspace.getConfiguration('goImplementationLens');
        if (!config.get<boolean>('enable', true)) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const { interfaces, types, methodImplementations } = await this.goAnalyzer.analyzeDocument(document);

        // Add code lenses for interfaces
        if (config.get<boolean>('showOnInterfaces', true)) {
            for (const interfaceInfo of interfaces) {
                // Add CodeLens for the interface itself (always show)
                const implementationCount = interfaceInfo.implementations.length;
                const title = implementationCount === 0 
                    ? 'No implementations' 
                    : `${implementationCount} implementation${implementationCount === 1 ? '' : 's'}`;

                const lensCommand: vscode.Command = implementationCount > 0 
                    ? {
                        title: title,
                        command: 'goImplementationLens.showImplementations',
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

                    const methodLensCommand: vscode.Command = methodImplCount > 0 
                        ? {
                            title: methodTitle,
                            command: 'goImplementationLens.showImplementations',
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
                        const title = `Implements: ${interfaceNames.join(', ')}`;
                        const lens = new vscode.CodeLens(typeInfo.range, {
                            title: title,
                            command: 'goImplementationLens.goToInterfaceDefinitions',
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
                const isDuplicatePosition = codeLenses.some(lens => 
                    lens.range.start.line === methodImpl.range.start.line &&
                    lens.range.start.character === methodImpl.range.start.character
                );
                
                if (isDuplicatePosition) {
                    continue;
                }
                
                const interfaceAndMethodName = await this.goAnalyzer.getInterfaceAndMethodName(methodImpl.interfaceMethod);
                const title = `Implementing: ${interfaceAndMethodName || 'Interface'}`;
                const lens = new vscode.CodeLens(methodImpl.range, {
                    title: title,
                    command: 'goImplementationLens.goToInterface',
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

    refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }
}