import * as vscode from 'vscode';
import { GoAnalyzer } from './goAnalyzer';

export class GoInterfaceCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor(private goAnalyzer: GoAnalyzer) {}

    private hasCodeLensOfType(codeLenses: vscode.CodeLens[], range: vscode.Range, commandType: 'refs' | 'implementations'): boolean {
        return codeLenses.some(lens => {
            if (lens.range.start.line !== range.start.line || 
                lens.range.start.character !== range.start.character) {
                return false;
            }
            
            const title = lens.command?.title || '';
            if (commandType === 'refs') {
                return title.includes('ref');
            } else {
                return title.includes('implementation');
            }
        });
    }

    async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        if (document.languageId !== 'go') {
            return [];
        }

        const config = vscode.workspace.getConfiguration('goImplementationLens');
        if (!config.get<boolean>('enable', true)) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const { interfaces, types, methodImplementations, symbolReferences } = await this.goAnalyzer.analyzeDocument(document);

        // FIRST PASS: Add all reference counts (to ensure refs always appear first)
        // Add code lenses for symbol references (functions, variables, constants, etc.)
        for (const symbolRef of symbolReferences) {
            // Check if we already have a refs CodeLens at this position
            if (!this.hasCodeLensOfType(codeLenses, symbolRef.range, 'refs')) {
                const refCount = symbolRef.references.length;
                const refTitle = refCount === 0 ? '0 refs' : (refCount === 1 ? '1 ref' : `${refCount} refs`);
                const refCommand = refCount > 0
                    ? {
                        title: refTitle,
                        command: 'goImplementationLens.showReferences',
                        arguments: [symbolRef.references]
                    }
                    : {
                        title: refTitle,
                        command: ''  // No command when 0 refs
                    };
                const refLens = new vscode.CodeLens(symbolRef.range, refCommand);
                codeLenses.push(refLens);
            }
        }

        // SECOND PASS: Add all other CodeLens items
        // Add code lenses for interfaces
        if (config.get<boolean>('showOnInterfaces', true)) {
            for (const interfaceInfo of interfaces) {
                // Add CodeLens for the interface itself (always show)
                const implementationCount = interfaceInfo.implementations.length;
                // Note: References are now handled in the first pass for ALL symbols including interfaces
                
                // Add implementation CodeLens (always show, even if 0)
                if (!this.hasCodeLensOfType(codeLenses, interfaceInfo.range, 'implementations')) {
                    const implTitle = implementationCount === 0 ? '0 implementations' : (implementationCount === 1 ? '1 implementation' : `${implementationCount} implementations`);
                    const implCommand = implementationCount > 0
                        ? {
                            title: implTitle,
                            command: 'goImplementationLens.showImplementations',
                            arguments: [interfaceInfo.implementations]
                        }
                        : {
                            title: implTitle,
                            command: ''  // No command when 0 implementations
                        };
                    const implLens = new vscode.CodeLens(interfaceInfo.range, implCommand);
                    codeLenses.push(implLens);
                }
                
                // Add CodeLens for each method in the interface
                for (const method of interfaceInfo.methods) {
                    const methodImplCount = method.implementations.length;
                    const methodRefCount = method.references.length;
                    
                    // Add reference CodeLens for method (always show, even if 0)
                    if (!this.hasCodeLensOfType(codeLenses, method.range, 'refs')) {
                        const refTitle = methodRefCount === 0 ? '0 refs' : (methodRefCount === 1 ? '1 ref' : `${methodRefCount} refs`);
                        const refCommand = methodRefCount > 0
                            ? {
                                title: refTitle,
                                command: 'goImplementationLens.showReferences',
                                arguments: [method.references]
                            }
                            : {
                                title: refTitle,
                                command: ''  // No command when 0 refs
                            };
                        const refLens = new vscode.CodeLens(method.range, refCommand);
                        codeLenses.push(refLens);
                    }
                    
                    // Add implementation CodeLens for method (always show, even if 0)
                    if (!this.hasCodeLensOfType(codeLenses, method.range, 'implementations')) {
                        const implTitle = methodImplCount === 0 ? '0 implementations' : (methodImplCount === 1 ? '1 implementation' : `${methodImplCount} implementations`);
                        const implCommand = methodImplCount > 0
                            ? {
                                title: implTitle,
                                command: 'goImplementationLens.showImplementations',
                                arguments: [method.implementations]
                            }
                            : {
                                title: implTitle,
                                command: ''  // No command when 0 implementations
                            };
                        const implLens = new vscode.CodeLens(method.range, implCommand);
                        codeLenses.push(implLens);
                    }
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
        // Add these after references so "Implementing:" appears after refs
        for (const methodImpl of methodImplementations) {
            if (methodImpl.interfaceMethod) {
                // Check if we already have an "Implementing:" CodeLens at this position
                const hasImplementingLens = codeLenses.some(lens => 
                    lens.range.start.line === methodImpl.range.start.line &&
                    lens.range.start.character === methodImpl.range.start.character &&
                    lens.command?.title?.includes('Implementing:')
                );
                
                if (hasImplementingLens) {
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