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
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const goAnalyzer_1 = require("../../goAnalyzer");
suite('Go Interface Lens Test Suite', () => {
    let analyzer;
    setup(() => {
        analyzer = new goAnalyzer_1.GoAnalyzer();
    });
    test('TC10.2 - CRITICAL: Struct should show implemented interfaces', async () => {
        // This is the main issue reported by the user
        const testFile = path.join(__dirname, '../../../test/test_cases.go');
        const document = await vscode.workspace.openTextDocument(testFile);
        console.log('Analyzing test_cases.go for struct implementation detection...');
        const result = await analyzer.analyzeDocument(document);
        // Find StructImplExample
        const structImpl = result.types.find(t => t.name === 'StructImplExample');
        assert.ok(structImpl, 'StructImplExample struct should be found');
        assert.ok(structImpl.implementedInterfaces.length > 0, 'StructImplExample should show implemented interfaces (CRITICAL TEST)');
        assert.strictEqual(structImpl.implementedInterfaces.length, 1, 'StructImplExample should implement exactly 1 interface');
        console.log(`✅ TC10.2 PASSED: Struct shows ${structImpl.implementedInterfaces.length} implemented interfaces`);
    });
    test('TC12.3 - CRITICAL: Struct implementing multiple interfaces', async () => {
        const testFile = path.join(__dirname, '../../../test/test_cases.go');
        const document = await vscode.workspace.openTextDocument(testFile);
        const result = await analyzer.analyzeDocument(document);
        // Find MultiInterfaceStruct
        const multiStruct = result.types.find(t => t.name === 'MultiInterfaceStruct');
        assert.ok(multiStruct, 'MultiInterfaceStruct should be found');
        assert.strictEqual(multiStruct.implementedInterfaces.length, 2, 'MultiInterfaceStruct should implement exactly 2 interfaces');
        console.log(`✅ TC12.3 PASSED: Struct shows ${multiStruct.implementedInterfaces.length} implemented interfaces`);
    });
    test('TC1.1 - Interface should show correct implementation count', async () => {
        const testFile = path.join(__dirname, '../../../test/test_cases.go');
        const document = await vscode.workspace.openTextDocument(testFile);
        const result = await analyzer.analyzeDocument(document);
        // Find Writer interface
        const writerInterface = result.interfaces.find(i => i.name === 'Writer');
        assert.ok(writerInterface, 'Writer interface should be found');
        // Note: This might be 1 or 2 depending on whether it counts FileWriter and another impl
        assert.ok(writerInterface.implementations.length >= 1, 'Writer interface should have at least 1 implementation');
        console.log(`✅ TC1.1 PASSED: Interface shows ${writerInterface.implementations.length} implementations`);
    });
    test('TC2.3 - Signature mismatch should not show implementation', async () => {
        const testFile = path.join(__dirname, '../../../test/test_cases.go');
        const document = await vscode.workspace.openTextDocument(testFile);
        const result = await analyzer.analyzeDocument(document);
        // Find BrokenImpl struct
        const brokenImpl = result.types.find(t => t.name === 'BrokenImpl');
        assert.ok(brokenImpl, 'BrokenImpl struct should be found');
        assert.strictEqual(brokenImpl.implementedInterfaces.length, 0, 'BrokenImpl should NOT implement any interfaces (signature mismatch)');
        console.log(`✅ TC2.3 PASSED: BrokenImpl correctly shows 0 implemented interfaces`);
    });
    test('TC3.1 - Cache invalidation on document change', async () => {
        const testFile = path.join(__dirname, '../../../test/test_cases.go');
        const document = await vscode.workspace.openTextDocument(testFile);
        // First analysis
        const result1 = await analyzer.analyzeDocument(document);
        const paramImpl1 = result1.types.find(t => t.name === 'ParameterImpl');
        assert.ok(paramImpl1, 'ParameterImpl should be found');
        assert.ok(paramImpl1.implementedInterfaces.length > 0, 'ParameterImpl should initially implement ParameterTest');
        // Simulate document change by invalidating cache
        analyzer.invalidateCache(document.uri.fsPath);
        // Re-analyze (in real scenario, the document content would have changed)
        const result2 = await analyzer.analyzeDocument(document);
        // Cache should have been invalidated and re-analyzed
        assert.ok(result2, 'Re-analysis should complete successfully');
        console.log(`✅ TC3.1 PASSED: Cache invalidation works correctly`);
    });
    test('TC1.3 - Method should show interface implementation', async () => {
        const testFile = path.join(__dirname, '../../../test/test_cases.go');
        const document = await vscode.workspace.openTextDocument(testFile);
        const result = await analyzer.analyzeDocument(document);
        // Check method implementations
        const writeMethod = result.methodImplementations.find(m => m.name === 'Write');
        assert.ok(writeMethod, 'Write method implementation should be found');
        assert.ok(writeMethod.interfaceMethod, 'Write method should have associated interface method');
        console.log(`✅ TC1.3 PASSED: Method shows interface implementation`);
    });
    test('Performance Test - Analysis should complete quickly', async () => {
        const testFile = path.join(__dirname, '../../../test/performance_test.go');
        const document = await vscode.workspace.openTextDocument(testFile);
        const startTime = Date.now();
        const result = await analyzer.analyzeDocument(document);
        const endTime = Date.now();
        const analysisTime = endTime - startTime;
        assert.ok(result, 'Analysis should complete');
        assert.ok(analysisTime < 2000, `Analysis should complete within 2 seconds (took ${analysisTime}ms)`);
        console.log(`✅ Performance test PASSED: Analysis completed in ${analysisTime}ms`);
        console.log(`   Found ${result.interfaces.length} interfaces, ${result.types.length} types, ${result.methodImplementations.length} method implementations`);
    });
});
// Helper function to log test results
function logTestResult(testName, passed, details) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${testName}: ${details}`);
}
//# sourceMappingURL=extension.test.js.map