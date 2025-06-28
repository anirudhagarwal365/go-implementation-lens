#!/bin/bash

echo "=== Go Interface Lens Status Check ==="
echo

echo "1. Extension Structure:"
echo "----------------------"
ls -la src/extension.ts src/goAnalyzer.ts src/goInterfaceLensProvider.ts 2>/dev/null | head -3
echo

echo "2. Compiled Output:"
echo "------------------"
ls -la out/*.js 2>/dev/null | head -3
echo

echo "3. Test Files:"
echo "-------------"
ls -la test/*.go | wc -l
echo "Total test files: $(ls -la test/*.go | wc -l | tr -d ' ')"
echo

echo "4. Critical Test Cases:"
echo "----------------------"
echo "TC10.2 - Struct Implementation (line 172):"
sed -n '172p' test/test_cases.go
echo
echo "TC12.3 - Multiple Interfaces (line 212):"
sed -n '212p' test/test_cases.go
echo

echo "5. Gopls Status:"
echo "---------------"
if ps aux | grep -v grep | grep -q gopls; then
    echo "✅ gopls is running"
else
    echo "❌ gopls is NOT running"
fi
echo

echo "6. VS Code Status:"
echo "-----------------"
if ps aux | grep -v grep | grep -q "Visual Studio Code"; then
    echo "✅ VS Code is running"
else
    echo "❌ VS Code is NOT running"
fi
echo

echo "7. Recent Changes:"
echo "-----------------"
echo "Last modified files:"
find src -name "*.ts" -type f -exec stat -f "%m %N" {} \; 2>/dev/null | sort -rn | head -5 | while read timestamp file; do
    echo "  $(date -r $timestamp '+%Y-%m-%d %H:%M:%S') - $file"
done
echo

echo "8. Gopls Integration Summary:"
echo "----------------------------"
grep -l "gopls\|executeCommand\|hover\|symbol" src/*.ts 2>/dev/null | while read file; do
    count=$(grep -c "executeCommand\|Hover\|Symbol" "$file" 2>/dev/null || echo 0)
    echo "  $file: $count gopls API calls"
done
echo

echo "=== Ready for Testing ==="
echo "To test the extension:"
echo "1. Open VS Code in this directory"
echo "2. Press F5 to launch Extension Development Host"
echo "3. Open test/test_cases.go"
echo "4. Check line 172 and 212 for CodeLens"