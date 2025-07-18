import * as vscode from 'vscode';
import { GoInterfaceCodeLensProvider } from './codeLensProvider';
import { GoInterfaceGutterProvider } from './gutterDecorationProvider';
import { GoAnalyzer } from './goAnalyzer';

export function activate(context: vscode.ExtensionContext) {
    console.log('Go Implementation Lens - extension is now active!');

    const goAnalyzer = new GoAnalyzer();
    const codeLensProvider = new GoInterfaceCodeLensProvider(goAnalyzer);
    const gutterProvider = new GoInterfaceGutterProvider(goAnalyzer, context);
    
    // Wait a bit for gopls to initialize
    setTimeout(() => {
        if (vscode.window.activeTextEditor) {
            gutterProvider.updateDecorations(vscode.window.activeTextEditor);
        }
    }, 2000);
    
    const codeLensProviderDisposable = vscode.languages.registerCodeLensProvider(
        { language: 'go', scheme: 'file' },
        codeLensProvider
    );

    // Update decorations for the active editor
    if (vscode.window.activeTextEditor) {
        gutterProvider.updateDecorations(vscode.window.activeTextEditor);
    }
    
    // Update decorations when active editor changes
    const activeEditorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            gutterProvider.updateDecorations(editor);
        }
    });

    // Command to toggle CodeLens functionality
    const toggleCodeLensCommand = vscode.commands.registerCommand(
        'goImplementationLens.toggleCodeLens',
        () => {
            const config = vscode.workspace.getConfiguration('goImplementationLens');
            const currentValue = config.get<boolean>('enable', true);
            config.update('enable', !currentValue, vscode.ConfigurationTarget.Global);
            
            const status = !currentValue ? 'enabled' : 'disabled';
            vscode.window.showInformationMessage(`Implementation CodeLens ${status}`);
        }
    );

    // Command to toggle gutter icons functionality  
    const toggleGutterIconsCommand = vscode.commands.registerCommand(
        'goImplementationLens.toggleGutterIcons',
        () => {
            const config = vscode.workspace.getConfiguration('goImplementationLens');
            const currentValue = config.get<boolean>('showGutterIcons', true);
            config.update('showGutterIcons', !currentValue, vscode.ConfigurationTarget.Global);
            
            const status = !currentValue ? 'enabled' : 'disabled';
            vscode.window.showInformationMessage(`Implementation Gutter Icons ${status}`);
            
            // Refresh gutter decorations immediately
            vscode.window.visibleTextEditors.forEach(editor => {
                if (editor.document.languageId === 'go') {
                    gutterProvider.updateDecorations(editor);
                }
            });
        }
    );

    // Command for showing implementations using our analyzed data
    const showImplementationsCommand = vscode.commands.registerCommand(
        'goImplementationLens.showImplementations',
        async (implementations: vscode.Location[]) => {
            try {
                if (implementations && implementations.length > 0) {
                    if (implementations.length === 1) {
                        // Single implementation - navigate directly
                        const location = implementations[0];
                        await goToLocation(location);
                    } else {
                        // Multiple implementations - show quick pick
                        const items = await Promise.all(implementations.map(async (impl, index) => {
                            const doc = await vscode.workspace.openTextDocument(impl.uri);
                            const line = doc.lineAt(impl.range.start.line);
                            return {
                                label: `${index + 1}. ${vscode.workspace.asRelativePath(impl.uri)}:${impl.range.start.line + 1}`,
                                description: line.text.trim(),
                                location: impl
                            };
                        }));
                        
                        const selected = await vscode.window.showQuickPick(items, {
                            placeHolder: 'Select an implementation'
                        });
                        
                        if (selected) {
                            await goToLocation(selected.location);
                        }
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error showing implementations: ${error}`);
            }
        }
    );

    // Command for showing both implementations and references
    const showImplementationsAndReferencesCommand = vscode.commands.registerCommand(
        'goImplementationLens.showImplementationsAndReferences',
        async (implementations: vscode.Location[], references: vscode.Location[]) => {
            try {
                const allItems: Array<{label: string, description: string, location: vscode.Location, type: 'implementation' | 'reference'}> = [];
                
                // Add implementations
                if (implementations && implementations.length > 0) {
                    const implItems = await Promise.all(implementations.map(async (impl) => {
                        const doc = await vscode.workspace.openTextDocument(impl.uri);
                        const line = doc.lineAt(impl.range.start.line);
                        return {
                            label: `$(symbol-interface) ${vscode.workspace.asRelativePath(impl.uri)}:${impl.range.start.line + 1}`,
                            description: line.text.trim(),
                            location: impl,
                            type: 'implementation' as const
                        };
                    }));
                    allItems.push(...implItems);
                }
                
                // Add references
                if (references && references.length > 0) {
                    const refItems = await Promise.all(references.map(async (ref) => {
                        const doc = await vscode.workspace.openTextDocument(ref.uri);
                        const line = doc.lineAt(ref.range.start.line);
                        return {
                            label: `$(references) ${vscode.workspace.asRelativePath(ref.uri)}:${ref.range.start.line + 1}`,
                            description: line.text.trim(),
                            location: ref,
                            type: 'reference' as const
                        };
                    }));
                    allItems.push(...refItems);
                }
                
                if (allItems.length === 1) {
                    // Single item - navigate directly
                    await goToLocation(allItems[0].location);
                } else if (allItems.length > 1) {
                    // Multiple items - show quick pick
                    const selected = await vscode.window.showQuickPick(allItems, {
                        placeHolder: 'Select an implementation or reference'
                    });
                    
                    if (selected) {
                        await goToLocation(selected.location);
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error showing implementations and references: ${error}`);
            }
        }
    );

    // Command for showing only references
    const showReferencesCommand = vscode.commands.registerCommand(
        'goImplementationLens.showReferences',
        async (references: vscode.Location[]) => {
            try {
                if (references && references.length > 0) {
                    if (references.length === 1) {
                        // Single reference - navigate directly
                        const location = references[0];
                        await goToLocation(location);
                    } else {
                        // Multiple references - show quick pick
                        const items = await Promise.all(references.map(async (ref, index) => {
                            const doc = await vscode.workspace.openTextDocument(ref.uri);
                            const line = doc.lineAt(ref.range.start.line);
                            return {
                                label: `${index + 1}. ${vscode.workspace.asRelativePath(ref.uri)}:${ref.range.start.line + 1}`,
                                description: line.text.trim(),
                                location: ref
                            };
                        }));
                        
                        const selected = await vscode.window.showQuickPick(items, {
                            placeHolder: 'Select a reference'
                        });
                        
                        if (selected) {
                            await goToLocation(selected.location);
                        }
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error showing references: ${error}`);
            }
        }
    );

    // Simple command for navigating to interface definition
    const goToInterfaceCommand = vscode.commands.registerCommand(
        'goImplementationLens.goToInterface',
        async (uri: string, position: {line: number, character: number}) => {
            try {
                const documentUri = vscode.Uri.parse(uri);
                const vscodePosition = new vscode.Position(position.line, position.character);
                const document = await vscode.workspace.openTextDocument(documentUri);
                const editor = await vscode.window.showTextDocument(document);
                editor.selection = new vscode.Selection(vscodePosition, vscodePosition);
                editor.revealRange(new vscode.Range(vscodePosition, vscodePosition), vscode.TextEditorRevealType.InCenter);
            } catch (error) {
                vscode.window.showErrorMessage(`Error navigating to interface: ${error}`);
            }
        }
    );

    // Command for navigating to interface definitions from struct CodeLens
    const goToInterfaceDefinitionsCommand = vscode.commands.registerCommand(
        'goImplementationLens.goToInterfaceDefinitions',
        async (interfaceLocations: vscode.Location[]) => {
            try {
                if (interfaceLocations && interfaceLocations.length > 0) {
                    if (interfaceLocations.length === 1) {
                        // Single interface - navigate directly
                        const location = interfaceLocations[0];
                        await goToLocation(location);
                    } else {
                        // Multiple interfaces - show quick pick
                        const items = await Promise.all(interfaceLocations.map(async (location, index) => {
                            const doc = await vscode.workspace.openTextDocument(location.uri);
                            const line = doc.lineAt(location.range.start.line);
                            return {
                                label: `${index + 1}. ${vscode.workspace.asRelativePath(location.uri)}:${location.range.start.line + 1}`,
                                description: line.text.trim(),
                                location: location
                            };
                        }));
                        
                        const selected = await vscode.window.showQuickPick(items, {
                            placeHolder: 'Select an interface'
                        });
                        
                        if (selected) {
                            await goToLocation(selected.location);
                        }
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error navigating to interface definitions: ${error}`);
            }
        }
    );

    context.subscriptions.push(
        codeLensProviderDisposable,
        activeEditorChangeDisposable,
        toggleCodeLensCommand,
        toggleGutterIconsCommand,
        showImplementationsCommand,
        showImplementationsAndReferencesCommand,
        showReferencesCommand,
        goToInterfaceCommand,
        goToInterfaceDefinitionsCommand,
        gutterProvider
    );

    // Refresh both CodeLens and gutter decorations when documents change
    vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId === 'go') {
            goAnalyzer.invalidateCache(e.document.uri.fsPath);
            codeLensProvider.refresh();
            const editor = vscode.window.visibleTextEditors.find(ed => ed.document === e.document);
            if (editor) {
                gutterProvider.updateDecorations(editor);
            }
        }
    });

    vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.languageId === 'go') {
            goAnalyzer.invalidateCache(document.uri.fsPath);
            codeLensProvider.refresh();
            const editor = vscode.window.visibleTextEditors.find(ed => ed.document === document);
            if (editor) {
                gutterProvider.updateDecorations(editor);
            }
        }
    });

    // Refresh when configuration changes
    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('goImplementationLens')) {
            codeLensProvider.refresh();
            vscode.window.visibleTextEditors.forEach(editor => {
                if (editor.document.languageId === 'go') {
                    gutterProvider.updateDecorations(editor);
                }
            });
        }
    });
}

export function deactivate() {}

async function goToLocation(location: vscode.Location) {
    const document = await vscode.workspace.openTextDocument(location.uri);
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(location.range.start, location.range.start);
    editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
}