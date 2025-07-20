import * as vscode from 'vscode';
import { GoAnalyzer } from './goAnalyzer';
import * as path from 'path';

export interface ReferenceItem {
    location: vscode.Location;
    type: 'implementation' | 'reference';
    symbolName: string;
    linePreview: string;
    fileName: string;
    packageName?: string;
}

export interface FunctionGroup {
    functionName: string;
    items: ReferenceItem[];
}

export interface FileGroup {
    fileName: string;
    filePath: string;
    packageName: string;
    functions: Map<string, FunctionGroup>;
}

export class GoReferenceSidebarProvider implements vscode.TreeDataProvider<ReferenceTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ReferenceTreeItem | undefined | null | void> = new vscode.EventEmitter<ReferenceTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ReferenceTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentItems: ReferenceItem[] = [];
    private currentSymbol: string = '';

    constructor(private goAnalyzer: GoAnalyzer) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    updateReferences(symbolName: string, implementations: vscode.Location[], references: vscode.Location[]) {
        this.currentSymbol = symbolName;
        this.currentItems = [];

        // Add implementations
        implementations.forEach(impl => {
            this.currentItems.push({
                location: impl,
                type: 'implementation',
                symbolName: symbolName,
                linePreview: '',
                fileName: path.basename(impl.uri.fsPath)
            });
        });

        // Add references
        references.forEach(ref => {
            this.currentItems.push({
                location: ref,
                type: 'reference',
                symbolName: symbolName,
                linePreview: '',
                fileName: path.basename(ref.uri.fsPath)
            });
        });

        this.refresh();
    }

    getTreeItem(element: ReferenceTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ReferenceTreeItem): Promise<ReferenceTreeItem[]> {
        if (!element) {
            // Root level - show symbol name as title
            const rootItems: ReferenceTreeItem[] = [];
            
            // Determine what type of results we're showing
            const hasImplementations = this.currentItems.some(item => item.type === 'implementation');
            const hasReferences = this.currentItems.some(item => item.type === 'reference');
            
            let titlePrefix = '';
            if (hasImplementations && hasReferences) {
                titlePrefix = 'References and Implementations';
            } else if (hasImplementations) {
                titlePrefix = 'Implementations';
            } else if (hasReferences) {
                titlePrefix = 'References';
            }
            
            // Add symbol header if we have a symbol name
            if (this.currentSymbol && this.currentSymbol !== 'Symbol') {
                const title = titlePrefix ? `${titlePrefix} to` : '';
                rootItems.push(new ReferenceTreeItem(
                    title ? `${title} ${this.currentSymbol}` : this.currentSymbol,
                    vscode.TreeItemCollapsibleState.None,
                    'title',
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    'symbol'
                ));
            }
            
            // Group all items by package/module
            const packageGroups = new Map<string, FileGroup[]>();
            
            for (const item of this.currentItems) {
                const filePath = item.location.uri.fsPath;
                const packageName = this.extractPackageName(filePath);
                
                if (!packageGroups.has(packageName)) {
                    packageGroups.set(packageName, []);
                }
                
                // Find or create file group
                let fileGroup = packageGroups.get(packageName)!.find(fg => fg.filePath === filePath);
                if (!fileGroup) {
                    fileGroup = {
                        fileName: path.basename(filePath),
                        filePath: filePath,
                        packageName: packageName,
                        functions: new Map<string, FunctionGroup>()
                    };
                    packageGroups.get(packageName)!.push(fileGroup);
                }
            }
            
            // Create package nodes
            for (const [packageName, fileGroups] of packageGroups) {
                const totalRefs = this.currentItems.filter(item => {
                    const pkg = this.extractPackageName(item.location.uri.fsPath);
                    return pkg === packageName;
                }).length;
                
                rootItems.push(new ReferenceTreeItem(
                    packageName,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'package',
                    undefined,
                    undefined,
                    `${totalRefs} reference${totalRefs !== 1 ? 's' : ''}`,
                    undefined,
                    undefined,
                    packageName
                ));
            }
            
            if (rootItems.length === 0 || (rootItems.length === 1 && rootItems[0].contextValue === 'title')) {
                rootItems.push(new ReferenceTreeItem(
                    'No references found',
                    vscode.TreeItemCollapsibleState.None,
                    'empty'
                ));
            }
            
            return rootItems;
        } else if (element.contextValue === 'package') {
            // Show files under package
            const packageName = element.packageName!;
            const fileGroups: FileGroup[] = [];
            
            // Group items by file within this package
            const fileMap = new Map<string, ReferenceItem[]>();
            
            for (const item of this.currentItems) {
                const filePath = item.location.uri.fsPath;
                const itemPackage = this.extractPackageName(filePath);
                
                if (itemPackage === packageName) {
                    if (!fileMap.has(filePath)) {
                        fileMap.set(filePath, []);
                    }
                    fileMap.get(filePath)!.push(item);
                }
            }
            
            // Create file nodes
            const fileNodes: ReferenceTreeItem[] = [];
            for (const [filePath, items] of fileMap) {
                const fileName = path.basename(filePath);
                fileNodes.push(new ReferenceTreeItem(
                    fileName,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'file',
                    undefined,
                    undefined,
                    `${items.length} reference${items.length !== 1 ? 's' : ''}`,
                    filePath,
                    undefined,
                    undefined
                ));
            }
            
            return fileNodes;
        } else if (element.contextValue === 'file') {
            // Show functions under file
            const filePath = element.filePath!;
            const items = this.currentItems.filter(item => item.location.uri.fsPath === filePath);
            
            // Group items by function
            const functionGroups = new Map<string, ReferenceItem[]>();
            
            for (const item of items) {
                const doc = await vscode.workspace.openTextDocument(item.location.uri);
                const functionName = await this.extractFunctionName(doc, item.location.range.start.line);
                
                if (!functionGroups.has(functionName)) {
                    functionGroups.set(functionName, []);
                }
                functionGroups.get(functionName)!.push(item);
            }
            
            // Create function nodes
            const functionNodes: ReferenceTreeItem[] = [];
            for (const [functionName, functionItems] of functionGroups) {
                const node = new ReferenceTreeItem(
                    functionName,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'function',
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined
                );
                node.funcItems = functionItems;
                functionNodes.push(node);
            }
            
            return functionNodes;
        } else if (element.contextValue === 'function') {
            // Show actual references under function
            const items = element.funcItems || [];
            
            return Promise.all(items.map(async item => {
                const doc = await vscode.workspace.openTextDocument(item.location.uri);
                const line = doc.lineAt(item.location.range.start.line);
                const linePreview = line.text.trim();
                const lineNumber = item.location.range.start.line + 1;
                
                // Show the actual line of code
                const codeSnippet = linePreview.length > 60 ? linePreview.substring(0, 60) + '...' : linePreview;
                
                return new ReferenceTreeItem(
                    codeSnippet,
                    vscode.TreeItemCollapsibleState.None,
                    'reference',
                    item.type,
                    item.location,
                    `Line ${lineNumber}`,
                    undefined,
                    `Line ${lineNumber}`
                );
            }));
        }
        
        return [];
    }
    
    private extractPackageName(filePath: string): string {
        // Extract package name from file path
        const parts = filePath.split(path.sep);
        const srcIndex = parts.lastIndexOf('src');
        const internalIndex = parts.lastIndexOf('internal');
        const pkgIndex = parts.lastIndexOf('pkg');
        
        let startIndex = Math.max(srcIndex, internalIndex, pkgIndex);
        if (startIndex === -1) {
            // If no standard Go directory structure, use the parent directory
            return parts[parts.length - 2] || 'unknown';
        }
        
        // Build package path from the standard directory
        const packageParts = parts.slice(startIndex + 1, -1);
        return packageParts.join('/') || parts[startIndex + 1] || 'unknown';
    }
    
    private async extractFunctionName(document: vscode.TextDocument, lineNumber: number): Promise<string> {
        // Search backwards to find the containing function
        for (let i = lineNumber; i >= 0; i--) {
            const line = document.lineAt(i).text;
            const funcMatch = line.match(/^func\s+(?:\([^)]*\)\s*)?(\w+)/);
            if (funcMatch) {
                return `func ${funcMatch[1]}`;
            }
        }
        
        // If not in a function, check if it's a type definition
        const currentLine = document.lineAt(lineNumber).text;
        const typeMatch = currentLine.match(/^type\s+(\w+)/);
        if (typeMatch) {
            return `type ${typeMatch[1]}`;
        }
        
        const varMatch = currentLine.match(/^(?:var|const)\s+(\w+)/);
        if (varMatch) {
            return varMatch[1];
        }
        
        return 'global';
    }
}

export class ReferenceTreeItem extends vscode.TreeItem {
    public funcItems?: ReferenceItem[];
    
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly referenceType?: 'implementation' | 'reference',
        public readonly location?: vscode.Location,
        public readonly linePreview?: string,
        public readonly filePath?: string,
        public readonly customDescription?: string,
        public readonly packageName?: string
    ) {
        super(label, collapsibleState);

        if (contextValue === 'title') {
            // Use different icons based on what's being shown
            if (customDescription === 'symbol') {
                const hasRefs = label.includes('References');
                const hasImpl = label.includes('Implementations');
                if (hasRefs && hasImpl) {
                    this.iconPath = new vscode.ThemeIcon('references');
                } else if (hasImpl) {
                    this.iconPath = new vscode.ThemeIcon('symbol-interface');
                } else {
                    this.iconPath = new vscode.ThemeIcon('references');
                }
            } else {
                this.iconPath = new vscode.ThemeIcon('symbol-key');
            }
            this.description = '';
        } else if (contextValue === 'package') {
            this.iconPath = new vscode.ThemeIcon('package');
            this.description = linePreview || '';
        } else if (contextValue === 'file') {
            this.iconPath = new vscode.ThemeIcon('file-code');
            this.description = linePreview || '';
        } else if (contextValue === 'function') {
            this.iconPath = new vscode.ThemeIcon('symbol-method');
        } else if (contextValue === 'reference' && location) {
            this.tooltip = linePreview || '';
            this.description = customDescription || '';
            this.command = {
                command: 'goImplementationLens.openReference',
                title: 'Open',
                arguments: [location]
            };
            this.iconPath = new vscode.ThemeIcon('circle-small-filled');
        } else if (contextValue === 'empty') {
            this.iconPath = new vscode.ThemeIcon('info');
        }
    }
}