import * as vscode from 'vscode';
import { GoAnalyzer } from './goAnalyzer';
import * as path from 'path';

export interface ReferenceItem {
    location: vscode.Location;
    type: 'implementation' | 'reference';
    symbolName: string;
    linePreview: string;
    fileName: string;
}

export interface FileGroup {
    fileName: string;
    filePath: string;
    items: ReferenceItem[];
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
            // Root level - show symbol header and categories
            const hasImplementations = this.currentItems.some(item => item.type === 'implementation');
            const hasReferences = this.currentItems.some(item => item.type === 'reference');
            
            const categories: ReferenceTreeItem[] = [];
            
            // Add symbol header if we have a symbol name
            if (this.currentSymbol && this.currentSymbol !== 'Symbol') {
                categories.push(new ReferenceTreeItem(
                    `📍 ${this.currentSymbol}`,
                    vscode.TreeItemCollapsibleState.None,
                    'symbol-header'
                ));
            }
            
            if (hasImplementations) {
                const implCount = this.currentItems.filter(item => item.type === 'implementation').length;
                categories.push(new ReferenceTreeItem(
                    `Implementations (${implCount})`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'category',
                    'implementation'
                ));
            }
            
            if (hasReferences) {
                const refCount = this.currentItems.filter(item => item.type === 'reference').length;
                categories.push(new ReferenceTreeItem(
                    `References (${refCount})`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'category',
                    'reference'
                ));
            }

            if (categories.length === 0 || (categories.length === 1 && categories[0].contextValue === 'symbol-header')) {
                categories.push(new ReferenceTreeItem(
                    'No references or implementations found',
                    vscode.TreeItemCollapsibleState.None,
                    'empty'
                ));
            }

            return categories;
        } else if (element.contextValue === 'category') {
            // Show file groups under category
            const categoryType = element.referenceType;
            const items = this.currentItems.filter(item => item.type === categoryType);
            
            // Group items by file
            const fileGroups = new Map<string, FileGroup>();
            
            for (const item of items) {
                const filePath = item.location.uri.fsPath;
                const fileName = path.basename(filePath);
                
                if (!fileGroups.has(filePath)) {
                    fileGroups.set(filePath, {
                        fileName: fileName,
                        filePath: filePath,
                        items: []
                    });
                }
                fileGroups.get(filePath)!.items.push(item);
            }
            
            // Create file group tree items
            const fileGroupItems: ReferenceTreeItem[] = [];
            for (const [filePath, group] of fileGroups) {
                const relativePath = vscode.workspace.asRelativePath(filePath);
                fileGroupItems.push(new ReferenceTreeItem(
                    `${group.fileName} (${group.items.length})`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'filegroup',
                    categoryType,
                    undefined,
                    relativePath,
                    filePath
                ));
            }
            
            return fileGroupItems;
        } else if (element.contextValue === 'filegroup') {
            // Show individual references/implementations under file group
            const categoryType = element.referenceType;
            const filePath = element.filePath;
            const items = this.currentItems.filter(item => 
                item.type === categoryType && item.location.uri.fsPath === filePath
            );
            
            return Promise.all(items.map(async item => {
                const doc = await vscode.workspace.openTextDocument(item.location.uri);
                const line = doc.lineAt(item.location.range.start.line);
                const linePreview = line.text.trim();
                
                const lineNumber = item.location.range.start.line + 1;
                
                // Extract function/method/type name from the line
                let displayName = 'unknown';
                let prefix = '';
                
                // Extract meaningful names from the code
                if (linePreview.includes('type ') && linePreview.includes('struct')) {
                    const typeMatch = linePreview.match(/type\s+(\w+)\s+struct/);
                    if (typeMatch) {
                        displayName = typeMatch[1];
                        prefix = 'type ';
                    }
                } else if (linePreview.includes('type ') && linePreview.includes('interface')) {
                    const typeMatch = linePreview.match(/type\s+(\w+)\s+interface/);
                    if (typeMatch) {
                        displayName = typeMatch[1];
                        prefix = 'interface ';
                    }
                } else if (linePreview.includes('func ')) {
                    const methodMatch = linePreview.match(/func\s+(?:\([^)]*\)\s*)?(\w+)/);
                    if (methodMatch) {
                        displayName = methodMatch[1];
                        prefix = 'func ';
                    }
                } else if (linePreview.includes('var ')) {
                    const varMatch = linePreview.match(/var\s+(\w+)/);
                    if (varMatch) {
                        displayName = varMatch[1];
                        prefix = 'var ';
                    }
                } else if (linePreview.includes('const ')) {
                    const constMatch = linePreview.match(/const\s+(\w+)/);
                    if (constMatch) {
                        displayName = constMatch[1];
                        prefix = 'const ';
                    }
                } else if (linePreview.includes('return ')) {
                    const returnMatch = linePreview.match(/return\s+[&*]*(\w+)/);
                    if (returnMatch) {
                        displayName = returnMatch[1];
                        prefix = 'return ';
                    }
                } else {
                    // Try to find function call or variable usage
                    const callMatch = linePreview.match(/(\w+)\s*\(/);
                    if (callMatch) {
                        displayName = callMatch[1];
                        prefix = 'call ';
                    } else {
                        const identifierMatch = linePreview.match(/(\w+)/);
                        if (identifierMatch) {
                            displayName = identifierMatch[1];
                        } else {
                            displayName = `line ${lineNumber}`;
                        }
                    }
                }
                
                // Create the tree item with better descriptions
                const itemLabel = `${prefix}${displayName}`;
                let itemDescription = '';
                
                if (item.type === 'reference') {
                    // For references, show the actual code context
                    const codeSnippet = linePreview.length > 50 ? linePreview.substring(0, 50) + '...' : linePreview;
                    itemDescription = `${codeSnippet}`;
                } else {
                    // For implementations, show line info
                    itemDescription = `Line ${lineNumber}`;
                }
                
                return new ReferenceTreeItem(
                    itemLabel,
                    vscode.TreeItemCollapsibleState.None,
                    'reference',
                    item.type,
                    item.location,
                    `Line ${lineNumber}: ${linePreview}`,
                    undefined,
                    itemDescription
                );
            }));
        }
        
        return [];
    }
}

export class ReferenceTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly referenceType?: 'implementation' | 'reference',
        public readonly location?: vscode.Location,
        public readonly linePreview?: string,
        public readonly filePath?: string,
        public readonly customDescription?: string
    ) {
        super(label, collapsibleState);

        if (contextValue === 'symbol-header') {
            this.iconPath = new vscode.ThemeIcon('symbol-key');
            this.tooltip = `Symbol: ${label}`;
            // Make it look like a header with styling
            this.description = '';
        } else if (contextValue === 'category') {
            this.iconPath = new vscode.ThemeIcon(
                referenceType === 'implementation' ? 'symbol-interface' : 'references'
            );
        } else if (contextValue === 'filegroup') {
            this.iconPath = new vscode.ThemeIcon('file-code');
            this.tooltip = linePreview || ''; // This will be the relative path
            this.description = linePreview || '';
        } else if (contextValue === 'reference' && location) {
            this.tooltip = linePreview || '';
            this.description = customDescription || (linePreview ? linePreview.substring(0, 60) + (linePreview.length > 60 ? '...' : '') : '');
            this.command = {
                command: 'goImplementationLens.openReference',
                title: 'Open',
                arguments: [location]
            };
            this.iconPath = new vscode.ThemeIcon('symbol-method');
        }
    }
}