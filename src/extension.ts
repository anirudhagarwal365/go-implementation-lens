import * as vscode from 'vscode';
import { GoInterfaceCodeLensProvider } from './codeLensProvider';
import { GoInterfaceGutterProvider } from './gutterDecorationProvider';
import { GoAnalyzer } from './goAnalyzer';
import { GoReferenceSidebarProvider } from './sidebarProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Go Implementation Lens - extension is now active!');

    const goAnalyzer = new GoAnalyzer();
    const codeLensProvider = new GoInterfaceCodeLensProvider(goAnalyzer);
    const gutterProvider = new GoInterfaceGutterProvider(goAnalyzer, context);
    const sidebarProvider = new GoReferenceSidebarProvider(goAnalyzer);
    
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

    // Register the sidebar view
    const sidebarView = vscode.window.createTreeView('goReferencesView', {
        treeDataProvider: sidebarProvider,
        showCollapseAll: true
    });

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
        async (implementations: vscode.Location[], symbolName?: string) => {
            try {
                const config = vscode.workspace.getConfiguration('goImplementationLens');
                const useSidebar = config.get<boolean>('useSidebar', true);
                
                if (implementations && implementations.length > 0) {
                    if (implementations.length === 1) {
                        // Single implementation - navigate directly
                        await goToLocation(implementations[0]);
                    } else if (useSidebar) {
                        // Multiple implementations - update sidebar and show it
                        sidebarProvider.updateReferences(symbolName || 'Symbol', implementations, []);
                        await vscode.commands.executeCommand('workbench.view.extension.goReferences');
                    } else {
                        // Show custom quick pick for implementations
                        await showQuickPickForLocations(implementations, 'Go to Implementation');
                    }
                } else if (useSidebar) {
                    // No implementations - still update sidebar to show empty state
                    sidebarProvider.updateReferences(symbolName || 'Symbol', [], []);
                    await vscode.commands.executeCommand('workbench.view.extension.goReferences');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error showing implementations: ${error}`);
            }
        }
    );

    // Command for showing both implementations and references
    const showImplementationsAndReferencesCommand = vscode.commands.registerCommand(
        'goImplementationLens.showImplementationsAndReferences',
        async (implementations: vscode.Location[], references: vscode.Location[], symbolName?: string) => {
            try {
                const config = vscode.workspace.getConfiguration('goImplementationLens');
                const useSidebar = config.get<boolean>('useSidebar', true);
                const allLocations = [...(implementations || []), ...(references || [])];
                
                if (allLocations.length === 1) {
                    // Single item total - navigate directly
                    await goToLocation(allLocations[0]);
                } else if (allLocations.length > 1 && useSidebar) {
                    // Multiple items - update sidebar and show it
                    sidebarProvider.updateReferences(symbolName || 'Symbol', implementations || [], references || []);
                    await vscode.commands.executeCommand('workbench.view.extension.goReferences');
                } else if (allLocations.length > 1) {
                    // Show custom quick pick - prefer implementations if available
                    if (implementations && implementations.length > 0) {
                        await showQuickPickForLocations(implementations, 'Go to Implementation');
                    } else if (references && references.length > 0) {
                        await showQuickPickForLocations(references, 'Go to References');
                    }
                } else if (useSidebar) {
                    // No items - still update sidebar to show empty state
                    sidebarProvider.updateReferences(symbolName || 'Symbol', [], []);
                    await vscode.commands.executeCommand('workbench.view.extension.goReferences');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error showing implementations and references: ${error}`);
            }
        }
    );

    // Command for showing only references
    const showReferencesCommand = vscode.commands.registerCommand(
        'goImplementationLens.showReferences',
        async (references: vscode.Location[], symbolName?: string) => {
            try {
                const config = vscode.workspace.getConfiguration('goImplementationLens');
                const useSidebar = config.get<boolean>('useSidebar', true);
                
                if (references && references.length > 0) {
                    if (references.length === 1) {
                        // Single reference - navigate directly
                        await goToLocation(references[0]);
                    } else if (useSidebar) {
                        // Multiple references - update sidebar and show it
                        sidebarProvider.updateReferences(symbolName || 'Symbol', [], references);
                        await vscode.commands.executeCommand('workbench.view.extension.goReferences');
                    } else {
                        // Show custom quick pick for references
                        await showQuickPickForLocations(references, 'Go to References');
                    }
                } else if (useSidebar) {
                    // No references - still update sidebar to show empty state
                    sidebarProvider.updateReferences(symbolName || 'Symbol', [], []);
                    await vscode.commands.executeCommand('workbench.view.extension.goReferences');
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

    // Command for opening references from the sidebar
    const openReferenceCommand = vscode.commands.registerCommand(
        'goImplementationLens.openReference',
        async (location: vscode.Location) => {
            try {
                await goToLocation(location);
            } catch (error) {
                vscode.window.showErrorMessage(`Error opening reference: ${error}`);
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
        openReferenceCommand,
        gutterProvider,
        sidebarView
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

async function showQuickPickForLocations(locations: vscode.Location[], title: string) {
    if (locations.length === 0) {
        return;
    }

    if (locations.length === 1) {
        await goToLocation(locations[0]);
        return;
    }

    const items = await Promise.all(locations.map(async (location) => {
        try {
            const doc = await vscode.workspace.openTextDocument(location.uri);
            const line = doc.lineAt(location.range.start.line);
            
            // Create relative path from workspace root
            let relativePath = vscode.workspace.asRelativePath(location.uri);
            
            // Show folder structure for better context
            const pathParts = relativePath.split('/');
            const fileName = pathParts.pop() || '';
            const folderPath = pathParts.length > 0 ? pathParts.join('/') : '';
            
            return {
                label: `$(file-code) ${fileName}`,
                description: folderPath,
                detail: `Line ${location.range.start.line + 1}: ${line.text.trim()}`,
                location: location
            };
        } catch (error) {
            // Fallback if we can't read the file
            const fileName = location.uri.path.split('/').pop() || 'unknown';
            return {
                label: `$(file-code) ${fileName}`,
                description: vscode.workspace.asRelativePath(location.uri),
                detail: `Line ${location.range.start.line + 1}`,
                location: location
            };
        }
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `${title} (${locations.length} found)`,
        matchOnDescription: true,
        matchOnDetail: true
    });

    if (selected) {
        await goToLocation(selected.location);
    }
}