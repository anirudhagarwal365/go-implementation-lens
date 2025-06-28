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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const codeLensProvider_1 = require("./codeLensProvider");
const gutterDecorationProvider_1 = require("./gutterDecorationProvider");
const goAnalyzer_1 = require("./goAnalyzer");
function activate(context) {
    console.log('Go Interface Lens extension is now active!');
    const goAnalyzer = new goAnalyzer_1.GoAnalyzer();
    const codeLensProvider = new codeLensProvider_1.GoInterfaceCodeLensProvider(goAnalyzer);
    const gutterProvider = new gutterDecorationProvider_1.GoInterfaceGutterProvider(goAnalyzer, context);
    // Wait a bit for gopls to initialize
    setTimeout(() => {
        if (vscode.window.activeTextEditor) {
            gutterProvider.updateDecorations(vscode.window.activeTextEditor);
        }
    }, 2000);
    const codeLensProviderDisposable = vscode.languages.registerCodeLensProvider({ language: 'go', scheme: 'file' }, codeLensProvider);
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
    const toggleCodeLensCommand = vscode.commands.registerCommand('goInterfaceLens.toggleCodeLens', () => {
        const config = vscode.workspace.getConfiguration('goInterfaceLens');
        const currentValue = config.get('enable', true);
        config.update('enable', !currentValue, vscode.ConfigurationTarget.Global);
        const status = !currentValue ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(`Interface CodeLens ${status}`);
    });
    // Command to toggle gutter icons functionality  
    const toggleGutterIconsCommand = vscode.commands.registerCommand('goInterfaceLens.toggleGutterIcons', () => {
        const config = vscode.workspace.getConfiguration('goInterfaceLens');
        const currentValue = config.get('showGutterIcons', true);
        config.update('showGutterIcons', !currentValue, vscode.ConfigurationTarget.Global);
        const status = !currentValue ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(`Interface Gutter Icons ${status}`);
        // Refresh gutter decorations immediately
        vscode.window.visibleTextEditors.forEach(editor => {
            if (editor.document.languageId === 'go') {
                gutterProvider.updateDecorations(editor);
            }
        });
    });
    // Command for showing implementations using our analyzed data
    const showImplementationsCommand = vscode.commands.registerCommand('goInterfaceLens.showImplementations', async (implementations) => {
        console.log(`CodeLens clicked - showImplementations with ${implementations.length} implementations`);
        try {
            if (implementations && implementations.length > 0) {
                if (implementations.length === 1) {
                    // Single implementation - navigate directly
                    const location = implementations[0];
                    console.log(`Navigating to single implementation: ${location.uri.fsPath}:${location.range.start.line}:${location.range.start.character}`);
                    await goToLocation(location);
                }
                else {
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
                        console.log(`Navigating to selected implementation: ${selected.location.uri.fsPath}:${selected.location.range.start.line}:${selected.location.range.start.character}`);
                        await goToLocation(selected.location);
                    }
                }
            }
        }
        catch (error) {
            console.error('Error in showImplementations:', error);
            vscode.window.showErrorMessage(`Error showing implementations: ${error}`);
        }
    });
    // Simple command for navigating to interface definition
    const goToInterfaceCommand = vscode.commands.registerCommand('goInterfaceLens.goToInterface', async (uri, position) => {
        console.log(`CodeLens clicked - goToInterface: URI: ${uri}, Position: ${position.line}:${position.character}`);
        try {
            const documentUri = vscode.Uri.parse(uri);
            const vscodePosition = new vscode.Position(position.line, position.character);
            const document = await vscode.workspace.openTextDocument(documentUri);
            const editor = await vscode.window.showTextDocument(document);
            editor.selection = new vscode.Selection(vscodePosition, vscodePosition);
            editor.revealRange(new vscode.Range(vscodePosition, vscodePosition), vscode.TextEditorRevealType.InCenter);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error navigating to interface: ${error}`);
        }
    });
    // Command for navigating to interface definitions from struct CodeLens
    const goToInterfaceDefinitionsCommand = vscode.commands.registerCommand('goInterfaceLens.goToInterfaceDefinitions', async (interfaceLocations) => {
        console.log(`CodeLens clicked - goToInterfaceDefinitions with ${interfaceLocations.length} interfaces`);
        try {
            if (interfaceLocations && interfaceLocations.length > 0) {
                if (interfaceLocations.length === 1) {
                    // Single interface - navigate directly
                    const location = interfaceLocations[0];
                    console.log(`Navigating to single interface: ${location.uri.fsPath}:${location.range.start.line}:${location.range.start.character}`);
                    await goToLocation(location);
                }
                else {
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
                        console.log(`Navigating to selected interface: ${selected.location.uri.fsPath}:${selected.location.range.start.line}:${selected.location.range.start.character}`);
                        await goToLocation(selected.location);
                    }
                }
            }
        }
        catch (error) {
            console.error('Error in goToInterfaceDefinitions:', error);
            vscode.window.showErrorMessage(`Error navigating to interface definitions: ${error}`);
        }
    });
    context.subscriptions.push(codeLensProviderDisposable, activeEditorChangeDisposable, toggleCodeLensCommand, toggleGutterIconsCommand, showImplementationsCommand, goToInterfaceCommand, goToInterfaceDefinitionsCommand, gutterProvider);
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
        if (e.affectsConfiguration('goInterfaceLens')) {
            codeLensProvider.refresh();
            vscode.window.visibleTextEditors.forEach(editor => {
                if (editor.document.languageId === 'go') {
                    gutterProvider.updateDecorations(editor);
                }
            });
        }
    });
}
function deactivate() { }
async function goToLocation(location) {
    const document = await vscode.workspace.openTextDocument(location.uri);
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(location.range.start, location.range.start);
    editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
}
//# sourceMappingURL=extension.js.map