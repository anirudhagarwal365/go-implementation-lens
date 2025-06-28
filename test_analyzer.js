const path = require('path');

// Mock VS Code API for testing
const vscode = {
    Uri: {
        file: (filePath) => ({ fsPath: filePath, toString: () => `file://${filePath}` }),
        parse: (uri) => ({ fsPath: uri.replace('file://', '') })
    },
    Range: class {
        constructor(startLine, startChar, endLine, endChar) {
            this.start = { line: startLine, character: startChar };
            this.end = { line: endLine, character: endChar };
        }
        contains(position) {
            return position.line >= this.start.line && position.line <= this.end.line;
        }
    },
    Position: class {
        constructor(line, character) {
            this.line = line;
            this.character = character;
        }
    },
    Location: class {
        constructor(uri, range) {
            this.uri = uri;
            this.range = range;
        }
    },
    SymbolKind: {
        File: 0,
        Module: 1,
        Namespace: 2,
        Package: 3,
        Class: 4,
        Method: 5,
        Property: 6,
        Field: 7,
        Constructor: 8,
        Enum: 9,
        Interface: 10,
        Function: 11,
        Variable: 12,
        Constant: 13,
        String: 14,
        Number: 15,
        Boolean: 16,
        Array: 17,
        Object: 18,
        Key: 19,
        Null: 20,
        EnumMember: 21,
        Struct: 22,
        Event: 23,
        Operator: 24,
        TypeParameter: 25
    },
    Hover: class {
        constructor(contents) {
            this.contents = contents;
        }
    },
    workspace: {
        openTextDocument: async (uri) => {
            const fs = require('fs');
            const content = fs.readFileSync(uri.fsPath || uri, 'utf8');
            const lines = content.split('\n');
            return {
                uri: typeof uri === 'string' ? vscode.Uri.file(uri) : uri,
                lineAt: (lineNumber) => ({
                    text: lines[lineNumber] || '',
                    range: new vscode.Range(lineNumber, 0, lineNumber, lines[lineNumber]?.length || 0)
                }),
                lineCount: lines.length,
                version: 1
            };
        },
        findFiles: async () => []
    },
    commands: {
        executeCommand: async (command, ...args) => {
            console.log(`Mock command: ${command}`, args);
            
            // Mock document symbols for test_cases.go
            if (command === 'vscode.executeDocumentSymbolProvider') {
                return [
                    // Test Case 1: Writer interface
                    {
                        name: 'Writer',
                        kind: vscode.SymbolKind.Interface,
                        range: new vscode.Range(5, 5, 8, 1),
                        children: [
                            { name: 'Write', kind: vscode.SymbolKind.Method, range: new vscode.Range(6, 1, 6, 30) },
                            { name: 'Close', kind: vscode.SymbolKind.Method, range: new vscode.Range(7, 1, 7, 20) }
                        ]
                    },
                    // FileWriter struct
                    {
                        name: 'FileWriter',
                        kind: vscode.SymbolKind.Struct,
                        range: new vscode.Range(10, 5, 10, 20),
                        children: []
                    },
                    // Test Case 10: StructImplExample
                    {
                        name: 'StructInterfaceExample',
                        kind: vscode.SymbolKind.Interface,
                        range: new vscode.Range(166, 5, 169, 1),
                        children: [
                            { name: 'DoWork', kind: vscode.SymbolKind.Method, range: new vscode.Range(167, 1, 167, 20) },
                            { name: 'GetStatus', kind: vscode.SymbolKind.Method, range: new vscode.Range(168, 1, 168, 20) }
                        ]
                    },
                    {
                        name: 'StructImplExample',
                        kind: vscode.SymbolKind.Struct,
                        range: new vscode.Range(171, 5, 171, 25),
                        children: []
                    },
                    // Methods as separate symbols (Go style)
                    {
                        name: 'Write',
                        kind: vscode.SymbolKind.Method,
                        range: new vscode.Range(12, 0, 14, 1)
                    },
                    {
                        name: 'Close', 
                        kind: vscode.SymbolKind.Method,
                        range: new vscode.Range(16, 0, 18, 1)
                    },
                    {
                        name: 'DoWork',
                        kind: vscode.SymbolKind.Method,
                        range: new vscode.Range(173, 0, 175, 1)
                    },
                    {
                        name: 'GetStatus',
                        kind: vscode.SymbolKind.Method,
                        range: new vscode.Range(177, 0, 179, 1)
                    }
                ];
            }
            
            // Mock hover provider
            if (command === 'vscode.executeHoverProvider') {
                const [uri, position] = args;
                if (position.line === 12) { // Write method
                    return [new vscode.Hover(['func (f FileWriter) Write(data []byte) (int, error)'])];
                }
                if (position.line === 173) { // DoWork method
                    return [new vscode.Hover(['func (s StructImplExample) DoWork() string'])];
                }
                return [];
            }
            
            // Mock implementation provider
            if (command === 'vscode.executeImplementationProvider') {
                const [uri, position] = args;
                if (position.line === 6) { // Write interface method
                    return [new vscode.Location(uri, new vscode.Range(12, 0, 14, 1))];
                }
                if (position.line === 167) { // DoWork interface method
                    return [new vscode.Location(uri, new vscode.Range(173, 0, 175, 1))];
                }
                return [];
            }
            
            return [];
        }
    }
};

// Make vscode available globally for the module
global.vscode = vscode;

// Now load and test the GoAnalyzer
try {
    const { GoAnalyzer } = require('./out/goAnalyzer.js');
    
    console.log('=== Testing Go Interface Lens Analyzer ===\n');
    
    async function runTests() {
        const analyzer = new GoAnalyzer();
        const testFile = path.join(__dirname, 'test', 'test_cases.go');
        const document = await vscode.workspace.openTextDocument(testFile);
        
        console.log('Analyzing test_cases.go...\n');
        
        const result = await analyzer.analyzeDocument(document);
        
        console.log('=== CRITICAL TEST RESULTS ===\n');
        
        // TC1.1: Writer interface should show implementations
        const writerInterface = result.interfaces.find(i => i.name === 'Writer');
        console.log(`TC1.1 - Writer interface:`);
        console.log(`  Expected: "2 implementations"`);
        console.log(`  Actual: "${writerInterface?.implementations?.length || 0} implementations"`);
        console.log(`  Status: ${writerInterface?.implementations?.length === 2 ? '✅ PASS' : '❌ FAIL'}\n`);
        
        // TC10.2: StructImplExample should show implemented interfaces (CRITICAL)
        const structImpl = result.types.find(t => t.name === 'StructImplExample');
        console.log(`TC10.2 - StructImplExample struct (CRITICAL):`);
        console.log(`  Expected: "Implements: StructInterfaceExample"`);
        console.log(`  Actual: ${structImpl?.implementedInterfaces?.length ? `"Implements: ${structImpl.implementedInterfaces.length} interfaces"` : 'NO CodeLens'}`);
        console.log(`  Status: ${structImpl?.implementedInterfaces?.length > 0 ? '✅ PASS' : '❌ FAIL'}\n`);
        
        // TC1.3: Write method should show interface implementation
        const writeMethod = result.methodImplementations.find(m => m.name === 'Write');
        console.log(`TC1.3 - Write method:`);
        console.log(`  Expected: "Implements: Writer.Write"`);
        console.log(`  Actual: ${writeMethod?.interfaceMethod ? '"Has interface method"' : 'NO CodeLens'}`);
        console.log(`  Status: ${writeMethod?.interfaceMethod ? '✅ PASS' : '❌ FAIL'}\n`);
        
        // Summary
        console.log('=== ANALYSIS SUMMARY ===');
        console.log(`Interfaces found: ${result.interfaces.length}`);
        console.log(`Types found: ${result.types.length}`);
        console.log(`Method implementations found: ${result.methodImplementations.length}`);
        
        // Debug output
        console.log('\n=== DEBUG: All Types Found ===');
        result.types.forEach(type => {
            console.log(`- ${type.name}: ${type.implementedInterfaces.length} interfaces implemented`);
        });
        
        console.log('\n=== DEBUG: All Method Implementations ===');
        result.methodImplementations.forEach(method => {
            console.log(`- ${method.name}: ${method.interfaceMethod ? 'has interface' : 'no interface'}`);
        });
    }
    
    runTests().catch(console.error);
    
} catch (error) {
    console.error('Failed to load GoAnalyzer:', error);
    console.error('Make sure to run "npm run compile" first');
}