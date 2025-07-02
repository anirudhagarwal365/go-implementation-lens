#!/bin/bash

# Go Interface Lens Test Runner
echo "🧪 Go Interface Lens Test Validation"
echo "====================================="

# Check if VS Code is available
if ! command -v code &> /dev/null; then
    echo "❌ VS Code not found. Please install VS Code to run tests."
    exit 1
fi

# Check if Go is available
if ! command -v go &> /dev/null; then
    echo "❌ Go not found. Please install Go to run tests."
    exit 1
fi

# Compile the extension
echo "📦 Compiling extension..."
npm run compile
if [ $? -ne 0 ]; then
    echo "❌ Extension compilation failed"
    exit 1
fi

echo "✅ Extension compiled successfully"

# Check if test files are valid Go
echo "🔍 Validating test files..."
for file in test/*.go; do
    if [ -f "$file" ]; then
        go fmt "$file" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "✅ $file is valid"
        else
            echo "❌ $file has syntax errors"
            go fmt "$file"
        fi
    fi
done

echo ""
echo "🎯 Test Files Created:"
echo "   • test/test_cases.go      - Main test cases (1-9)"
echo "   • test/interfaces.go      - Cross-file interfaces (10-12)"
echo "   • test/implementations.go - Cross-file implementations (10-13)"
echo "   • TEST_VALIDATION.md      - Expected behavior guide"
echo ""
echo "📋 Manual Testing Instructions:"
echo "1. Open VS Code in this directory: code ."
echo "2. Open test/test_cases.go"
echo "3. Check that interfaces show implementation counts"
echo "4. Check that implementations show 'Implements: Interface.Method'"
echo "5. Try changing method signatures and verify CodeLens updates"
echo "6. Follow TEST_VALIDATION.md for detailed test cases"
echo ""
echo "💡 Debug Commands:"
echo "   • View → Output → Select 'Go Implementation Lens'"
echo "   • Cmd+Shift+P -> 'Developer: Toggle Developer Tools'"
echo ""
echo "🚀 Ready for testing!"